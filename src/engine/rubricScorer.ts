import type { SimulationStats } from "@/lib/simulationStats"
import type { Challenge, StarBreakdown } from "@/lib/challengeTypes"
import { evaluateRequiredTopology, allTopologyAssertionsPass, type TopologyGraphInput } from "@/engine/topologyAssertions"
import { COMPONENT_TYPES, isOnPathExempt } from "@/lib/componentTypes"

// Multi-region origin grading (ISAPivot Phase 3, D55/D66). A multi-region traffic source requires a
// multi-region-capable architecture: CDN + DNS at the edge plus a database to replicate. "Any
// data-storage type" is the author-asserted DB proxy (we don't model per-DB replication capability).
const MULTI_REGION_EDGE_TYPES = ["cdn", "dns"] as const
const DATA_STORAGE_TYPE_IDS: ReadonlySet<string> = new Set(
  [...COMPONENT_TYPES.values()].filter((t) => t.category === "data-storage").map((t) => t.id),
)

function hasMultiRegionArchitecture(canvasTypeIds: ReadonlySet<string>): boolean {
  const edgeOk = MULTI_REGION_EDGE_TYPES.every((t) => canvasTypeIds.has(t))
  const dbOk = [...DATA_STORAGE_TYPE_IDS].some((id) => canvasTypeIds.has(id))
  return edgeOk && dbOk
}

/**
 * ED3 (D74): a required type counts only if it's ON THE SERVED PATH — directed-reachable from a traffic
 * source through the frozen graph — so "drop a disconnected block" no longer satisfies required_types.
 * Async tiers (messaging / real-time) are exempt (they legitimately sit off the sync path). Mirrors the
 * sim's inflow seeding: BFS from in-degree-0 traffic nodes when any exist, else from all in-degree-0.
 */
function requiredTypesOnServedPath(graph: TopologyGraphInput, requiredTypes: readonly string[]): boolean {
  const { typeByNodeId, edges } = graph
  const indeg = new Map<string, number>()
  const outAdj = new Map<string, string[]>()
  for (const id of typeByNodeId.keys()) indeg.set(id, 0)
  for (const e of edges) {
    if (!typeByNodeId.has(e.source) || !typeByNodeId.has(e.target)) continue
    outAdj.set(e.source, [...(outAdj.get(e.source) ?? []), e.target])
    indeg.set(e.target, (indeg.get(e.target) ?? 0) + 1)
  }
  const entries = [...typeByNodeId.keys()].filter((id) => (indeg.get(id) ?? 0) === 0)
  const trafficEntries = entries.filter((id) => COMPONENT_TYPES.get(typeByNodeId.get(id) ?? "")?.category === "traffic")
  const seeds = trafficEntries.length > 0 ? trafficEntries : entries
  const reachable = new Set<string>()
  const queue = [...seeds]
  while (queue.length > 0) {
    const id = queue.shift()!
    if (reachable.has(id)) continue
    reachable.add(id)
    for (const t of outAdj.get(id) ?? []) if (!reachable.has(t)) queue.push(t)
  }
  const reachableTypes = new Set([...reachable].map((id) => typeByNodeId.get(id)!))
  return requiredTypes.every((t) => isOnPathExempt(t) || reachableTypes.has(t))
}

/**
 * Scores a challenge attempt against its rubric (Epic 16, D28).
 * - Base pass (1★): uptime ≥ target AND p99 latency ≤ target. ISAPivot Phase 3 adds two OPTIONAL gates,
 *   folded into the same metrics star: p95 ≤ target (when authored) and cost-per-request ≤ target (when
 *   authored). Absent on the 41 built-ins ⇒ skipped ⇒ identical scoring.
 * - +1★: total cost ≤ budgetCap.
 * - +1★ (well-formed): zero BLOCKING topology issues — orphaned or unreachable nodes (D72). Single-
 *   point-of-failure and replicas-without-LB issues are ADVISORY and do NOT gate this star; a build
 *   with none of them additionally earns the `resilient` flag (a non-star "Resilient" recognition).
 * Budget and topology stars are only awarded when the base pass is met (roadmap "pass → 1★ then +1/+1").
 * The breakdown booleans report the RAW conditions (for display), independent of the gate.
 *
 * @param topologyIssueCount BLOCKING topology issue count (orphan + unreachable) — see countTopologyIssues.
 * @param costPerRequest measured cost-efficiency (monthly cost ÷ requests served), derived by the
 *   caller at score time. undefined when unmeasured — a defined cost target then fails conservatively.
 * @param topologyGraph the attempt's frozen structural graph (node-id→type + edges) for
 *   required_topology assertions (D66). undefined ⇒ a challenge WITH assertions fails conservatively;
 *   the 41 built-ins declare no assertions so they never reach that branch.
 * @param advisoryTopologyCount SPOF + replicas-without-LB issue count (D72). Does not gate any star;
 *   zero (with zero blocking) ⇒ `resilient`. Defaults to 0 so legacy callers stay byte-identical.
 */
export function evaluateAttempt(
  stats: SimulationStats,
  challenge: Challenge,
  topologyIssueCount: number,
  totalCost: number,
  canvasTypeIds?: ReadonlySet<string>,
  costPerRequest?: number,
  topologyGraph?: TopologyGraphInput,
  advisoryTopologyCount = 0,
): StarBreakdown {
  const tm = challenge.targetMetrics
  const passedMetrics =
    stats.uptimePercent >= tm.uptimePercent &&
    stats.p99LatencyMs <= tm.p99LatencyMs &&
    (tm.p95LatencyMs === undefined
      || (stats.p95LatencyMs !== undefined && stats.p95LatencyMs <= tm.p95LatencyMs)) &&
    (tm.costPerRequest === undefined
      || (costPerRequest !== undefined && costPerRequest <= tm.costPerRequest))
  const underBudget = totalCost <= challenge.budgetCap
  // The topology star is "well-formed": zero BLOCKING issues (orphan/unreachable). cleanTopology now
  // reflects structural validity, NOT redundancy (D72).
  const cleanTopology = topologyIssueCount === 0
  // Resilient (non-star recognition): no blocking AND no advisory issues — no SPOF, every replicated
  // tier behind a load balancer. This is the strict "zero topology issues of any kind" bar.
  const resilient = topologyIssueCount === 0 && advisoryTopologyCount === 0

  // required_topology (ISAPivot Phase 3, D66): empty/absent ⇒ true (identity — the 41 built-ins).
  // Present but no frozen graph ⇒ conservative fail. Folded into the clean-topology star below.
  const requiredTopologyOk = !challenge.requiredTopology?.length
    ? true
    : !!topologyGraph && allTopologyAssertionsPass(evaluateRequiredTopology(topologyGraph, challenge.requiredTopology))

  // required_types (ED3, D74): the key blocks MUST be ON THE SERVED PATH (directed-reachable from the
  // traffic source) when the frozen graph is available — a disconnected block no longer counts. Async
  // tiers are exempt. Without a graph (e.g. the golden's synthetic calls, or no start-time snapshot),
  // fall back to canvas PRESENCE — byte-identical to pre-D74.
  const hasAllRequiredTypes = challenge.requiredTypes.length === 0
    ? true
    : topologyGraph
      ? requiredTypesOnServedPath(topologyGraph, challenge.requiredTypes)
      : (canvasTypeIds ? challenge.requiredTypes.every((t) => canvasTypeIds.has(t)) : true)

  // forbidden_types (ISAPivot Phase 3): any forbidden type on the canvas is a hard 0★ gate. Absent
  // forbiddenTypes (the 41 built-ins) ⇒ hasForbidden false ⇒ forbiddenTypesOk true ⇒ basePass unchanged.
  const hasForbidden = !!challenge.forbiddenTypes?.length
    && !!canvasTypeIds
    && challenge.forbiddenTypes.some((t) => canvasTypeIds.has(t))
  const forbiddenTypesOk = !hasForbidden

  // origin grading (ISAPivot Phase 3, D55/D66): always graded — when any traffic source is
  // multi-region, the architecture must be multi-region-capable (CDN + DNS + a database). The 41
  // built-ins declare no multi-region source ⇒ originRequiresMultiRegion false ⇒ originRequirementOk
  // true ⇒ basePass unchanged. Missing canvasTypeIds with a multi-region source ⇒ conservative fail.
  const originRequiresMultiRegion = !!challenge.trafficSources?.some((s) => s.origin === "multi-region")
  const originRequirementOk = !originRequiresMultiRegion
    || (!!canvasTypeIds && hasMultiRegionArchitecture(canvasTypeIds))

  const basePass = passedMetrics && hasAllRequiredTypes && forbiddenTypesOk && originRequirementOk
  // restore-redundancy (D74): now that a fractional AZ outage (ED2) makes spreading replicas across
  // zones mechanically meaningful, recognize it. resilienceEarned = a no-SPOF build that PASSED a
  // challenge that actually exercises a zone outage — i.e., the redundancy demonstrably paid off. A
  // separate recognition (NOT a star modifier), so it never re-opens the D72 budget-vs-redundancy tension.
  const challengeExercisesOutage = challenge.scheduledEvents.some((e) => e.type === "az_outage")
  const resilienceEarned = basePass && resilient && challengeExercisesOutage
  // The topology star requires BOTH zero issues AND all required_topology assertions (D66).
  // For the 41 built-ins requiredTopologyOk is always true, so this equals the prior cleanTopology gate.
  const topologyStar = cleanTopology && requiredTopologyOk
  const stars = basePass ? 1 + (underBudget ? 1 : 0) + (topologyStar ? 1 : 0) : 0

  return {
    stars: stars as StarBreakdown["stars"],
    passedMetrics,
    hasRequiredBlocks: hasAllRequiredTypes,
    underBudget,
    cleanTopology,
    resilient,
    resilienceEarned,
    forbiddenTypesOk,
    requiredTopologyOk,
    originRequirementOk,
  }
}
