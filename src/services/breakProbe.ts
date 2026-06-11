import { buildSimGraph, buildTrafficCurveFromSources } from "@/stores/architectureStoreHelpers"
import { runSimulation } from "@/engine/simulationEngine"
import { computeSimStats } from "@/lib/simulationStats"
import type { ArchieNode, ArchieEdge } from "@/stores/architectureStore"
import type { Challenge } from "@/lib/challengeTypes"

/**
 * Break-loop probes (D101, 2026-06-11 owner fork). Two questions the break economy needs answered
 * about the PLAYER'S build, both via the same engine the live run used:
 *
 * 1. minBreakingRps — the smallest total demand at which this build first fails the quest's metric
 *    targets. The RPS break pays only within 2× of this boundary (precision-gated, no dial cap):
 *    the expert point is for FINDING the failure boundary, not for typing 10 million.
 * 2. isCategoricalCausal — for a Shape/Workload/Origin break (rps may co-deviate — the owner's
 *    "combination" semantics), the dial must be LOAD-BEARING: the same demand with the authored
 *    value must pass while the deviated value fails. "It would have broken anyway" pays nothing.
 *
 * Parity: probes mirror the post-3★ canvas-wins seam (simulationLaunch) — curve from the canvas
 * sources, multiRegion from the canvas origin dial, authored events/duration/chaos. The pass
 * predicate mirrors rubricScorer's passedMetrics MINUS the cost-per-request term (cost integration
 * needs the full scoring pipeline; uptime/p99/p95/consistency are the physical failure axes).
 * V1 scope: single-source quests (positional restore is ambiguous across heterogeneous sources);
 * multi-source quests keep the legacy single-attribute rule in the hook.
 */

type ProbeChallenge = Pick<
  Challenge,
  "durationSeconds" | "scheduledEvents" | "chaosIntensity" | "targetMetrics" | "consistencyTargetMs" | "crossRegionRttMs" | "trafficSources"
>

const isTraffic = (n: ArchieNode) => n.data.componentCategory === "traffic"

/** The player's raw dial total — data.trafficRps directly, NOT capacity-resolved via the library. */
export function rawTrafficRps(nodes: readonly ArchieNode[]): number {
  return nodes.reduce((sum, n) => sum + (isTraffic(n) ? (n.data.trafficRps ?? 0) : 0), 0)
}

function probePasses(nodes: readonly ArchieNode[], edges: readonly ArchieEdge[], c: ProbeChallenge): boolean {
  const simOpts = {
    crossRegionRttMs: c.crossRegionRttMs,
    multiRegion: nodes.some((n) => isTraffic(n) && n.data.trafficOrigin === "multi-region"),
  }
  const graph = buildSimGraph(nodes as ArchieNode[], edges as ArchieEdge[], simOpts)
  const curve = buildTrafficCurveFromSources(nodes as ArchieNode[], c.durationSeconds)
  if (curve.length === 0) return true // no rate-bearing source — nothing to probe
  const result = runSimulation(graph, curve, undefined, c.durationSeconds, c.scheduledEvents, c.chaosIntensity)
  const stats = computeSimStats(result.ticks, result.ticks.length - 1)
  const tm = c.targetMetrics
  const consistencyOk =
    c.consistencyTargetMs === undefined ||
    (stats.maxStalenessMs !== undefined && stats.maxStalenessMs <= c.consistencyTargetMs)
  return (
    stats.uptimePercent >= tm.uptimePercent &&
    stats.p99LatencyMs <= tm.p99LatencyMs &&
    (tm.p95LatencyMs === undefined || (stats.p95LatencyMs !== undefined && stats.p95LatencyMs <= tm.p95LatencyMs)) &&
    consistencyOk
  )
}

/** Clone the canvas with each traffic node's data patched. */
function withTrafficPatch(nodes: readonly ArchieNode[], patch: (n: ArchieNode) => Partial<ArchieNode["data"]>): ArchieNode[] {
  return nodes.map((n) => (isTraffic(n) ? { ...n, data: { ...n.data, ...patch(n) } } : n)) as ArchieNode[]
}

/**
 * The smallest total demand (rps, all sources scaled proportionally from AUTHORED values, other
 * dials as the player set them) at which the build first fails — or null when the probe can't
 * bracket a boundary (it never fails up to the player's value: probe/live drift — callers treat
 * null as "collect", never punishing on drift). ~3% precision, ≤12 sims.
 */
export function minBreakingRps(
  nodes: readonly ArchieNode[],
  edges: readonly ArchieEdge[],
  c: ProbeChallenge,
): number | null {
  const authored = c.trafficSources ?? []
  if (authored.length !== 1) return null
  const authoredRps = authored[0].rps
  const playerRps = rawTrafficRps(nodes)
  if (playerRps <= authoredRps) return null
  const at = (rps: number) => withTrafficPatch(nodes, () => ({ trafficRps: rps }))
  if (!probePasses(at(authoredRps), edges, c)) return authoredRps // build fails even at authored demand
  if (probePasses(at(playerRps), edges, c)) return null // can't reproduce the failure — drift, don't punish
  let lo = authoredRps
  let hi = playerRps
  let guard = 0
  while (hi - lo > Math.max(5, lo * 0.03) && guard++ < 12) {
    const mid = Math.round((lo + hi) / 2)
    if (probePasses(at(mid), edges, c)) lo = mid
    else hi = mid
  }
  return hi
}

/**
 * Counterfactual test for a categorical break (kind/workload/origin): restore THAT dial to the
 * authored value (everything else — including a co-deviated rps — stays as the player set it) and
 * re-probe. Causal ⟺ the restored run PASSES (the dial change is what felled the build).
 * Single-source quests only (callers gate).
 */
export function isCategoricalCausal(
  nodes: readonly ArchieNode[],
  edges: readonly ArchieEdge[],
  c: ProbeChallenge,
  attribute: "kind" | "workload" | "origin",
): boolean {
  const authored = c.trafficSources ?? []
  if (authored.length !== 1) return false
  const spec = authored[0]
  const restore: Partial<ArchieNode["data"]> =
    attribute === "kind" ? { trafficKind: spec.kind } :
    attribute === "workload" ? { trafficWorkload: spec.workload } :
    { trafficOrigin: spec.origin }
  return probePasses(withTrafficPatch(nodes, () => restore), edges, c)
}

/** Per-dial feasibility for the invite chips (D101 follow-up, 2026-06-11). */
export interface BreakFeasibility {
  rps: boolean
  kind: boolean
  workload: boolean
  origin: boolean
  /** The authored-config failure boundary used for the categorical checks (null = none found). */
  boundary: number | null
}

const KINDS = ["steady", "realistic", "periodic", "search"] as const
const WORKLOADS = ["read", "write", "mixed"] as const

/**
 * Which dials CAN fell THIS build (monotonicity argument): a categorical alternative v is feasible
 * ⟺ its failure boundary sits BELOW the authored boundary b — equivalently, the deviated config
 * already fails at a load just under b, where the authored config still passes. So: one boundary
 * search for the authored config (≤12 sims), then ONE sim per alternative value at 0.97×b
 * (≤6 sims). rps is feasible whenever a finite authored boundary exists. Single-source only.
 */
export function feasibleBreakDials(
  nodes: readonly ArchieNode[],
  edges: readonly ArchieEdge[],
  c: ProbeChallenge,
  searchCeiling = 1_000_000,
): BreakFeasibility | null {
  const authored = c.trafficSources ?? []
  if (authored.length !== 1) return null
  const spec = authored[0]
  // Authored boundary: probe with ALL dials at authored values, scaling only rps.
  const authoredDials = { trafficKind: spec.kind, trafficWorkload: spec.workload, trafficOrigin: spec.origin }
  const at = (rps: number) => withTrafficPatch(nodes, () => ({ ...authoredDials, trafficRps: rps }))
  // No buildable curve (traffic node unresolvable) ⇒ NO feasibility info — never a confident
  // "nothing can fell this build" on missing data.
  if (buildTrafficCurveFromSources(at(spec.rps), c.durationSeconds).length === 0) return null
  let boundary: number | null = null
  if (!probePasses(at(spec.rps), edges, c)) {
    boundary = spec.rps
  } else {
    let lo = spec.rps
    let hi = spec.rps
    while (hi < searchCeiling && probePasses(at(hi * 2), edges, c)) hi *= 2
    if (hi < searchCeiling) {
      hi *= 2
      let guard = 0
      while (hi - lo > Math.max(5, lo * 0.03) && guard++ < 24) {
        const mid = Math.round((lo + hi) / 2)
        if (probePasses(at(mid), edges, c)) lo = mid
        else hi = mid
      }
      boundary = hi
    }
  }
  if (boundary === null) {
    // The build out-scales the search ceiling — nothing here can fell it.
    return { rps: false, kind: false, workload: false, origin: false, boundary: null }
  }
  const testLoad = Math.max(spec.rps, Math.floor(boundary * 0.97))
  const failsWith = (patch: Partial<ArchieNode["data"]>) =>
    !probePasses(withTrafficPatch(nodes, () => ({ ...authoredDials, trafficRps: testLoad, ...patch })), edges, c)
  return {
    rps: true,
    kind: KINDS.some((k) => k !== spec.kind && failsWith({ trafficKind: k })),
    workload: WORKLOADS.some((w) => w !== spec.workload && failsWith({ trafficWorkload: w })),
    origin: spec.origin !== "multi-region" && failsWith({ trafficOrigin: "multi-region" }),
    boundary,
  }
}

/**
 * D102 registry applicability: for each dial-based break METHOD, would it fell THIS build?
 * Same monotonicity trick as feasibleBreakDials, keyed by method id (value-level). ≤9 sims.
 * Returns null when no single authored source / curve unresolvable (no claims on missing data).
 */
export function breakMethodApplicability(
  nodes: readonly ArchieNode[],
  edges: readonly ArchieEdge[],
  c: ProbeChallenge,
): Record<string, boolean> | null {
  const authored = c.trafficSources ?? []
  if (authored.length !== 1) return null
  const spec = authored[0]
  const authoredDials = { trafficKind: spec.kind, trafficWorkload: spec.workload, trafficOrigin: spec.origin }
  const at = (rps: number) => withTrafficPatch(nodes, () => ({ ...authoredDials, trafficRps: rps }))
  if (buildTrafficCurveFromSources(at(spec.rps), c.durationSeconds).length === 0) return null
  // Authored boundary (shared with feasibleBreakDials' approach)
  let boundary: number | null = null
  if (!probePasses(at(spec.rps), edges, c)) boundary = spec.rps
  else {
    let lo = spec.rps
    let hi = spec.rps
    while (hi < 1_000_000 && probePasses(at(hi * 2), edges, c)) hi *= 2
    if (hi < 1_000_000) {
      hi *= 2
      let guard = 0
      while (hi - lo > Math.max(5, lo * 0.03) && guard++ < 24) {
        const mid = Math.round((lo + hi) / 2)
        if (probePasses(at(mid), edges, c)) lo = mid
        else hi = mid
      }
      boundary = hi
    }
  }
  const out: Record<string, boolean> = { "rps-overload": boundary !== null }
  if (boundary === null) {
    for (const k of KINDS) if (k !== spec.kind) out[`shape-${k}`] = false
    for (const w of WORKLOADS) if (w !== spec.workload) out[`workload-${w}`] = false
    out["origin-multi-region"] = false
    return out
  }
  const testLoad = Math.max(spec.rps, Math.floor(boundary * 0.97))
  const failsWith = (patch: Partial<ArchieNode["data"]>) =>
    !probePasses(withTrafficPatch(nodes, () => ({ ...authoredDials, trafficRps: testLoad, ...patch })), edges, c)
  for (const k of KINDS) if (k !== spec.kind) out[`shape-${k}`] = failsWith({ trafficKind: k })
  for (const w of WORKLOADS) if (w !== spec.workload) out[`workload-${w}`] = failsWith({ trafficWorkload: w })
  out["origin-multi-region"] = spec.origin !== "multi-region" && failsWith({ trafficOrigin: "multi-region" })
  return out
}
