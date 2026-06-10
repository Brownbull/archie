import { readdirSync, readFileSync } from "node:fs"
import { join } from "node:path"
import { load } from "js-yaml"

import { componentLibrary } from "@/services/componentLibrary"
import { ComponentYamlSchema, type Component } from "@/schemas/componentSchema"
import { COMPONENT_TYPES, isOnPathExempt } from "@/lib/componentTypes"
import { buildSimGraph, computeTotalArchitectureCost, computeIntegratedArchitectureCost, evaluateTopology, buildTrafficCurveFromSpecs, getNodeCost, crossRegionSimOpts } from "@/stores/architectureStoreHelpers"
import { runSimulation } from "@/engine/simulationEngine"
import { computeSimStats } from "@/lib/simulationStats"
import { evaluateAttempt } from "@/engine/rubricScorer"
import { countTopologyIssues } from "@/engine/topologyChecker"
import { MAX_REPLICAS, getScalingRule } from "@/lib/constants"
import { costPerMillionRequests, peakCurveRps, peakOriginBoundRps, usageCostPerMonth } from "@/lib/challengeBudget"
import { CURRENT_SCHEMA_VERSION } from "@/schemas/architectureFileSchema"
import type { Challenge } from "@/lib/challengeTypes"
import type { ComponentCategoryId } from "@/lib/constants"

/**
 * Reference-solution builder — the heart of the Phase 4 solvability harness, extracted so it can be
 * reused by (a) the harness itself, (b) the tier-6 capstone-completion proof, and (c) the E2E
 * architecture-fixture generator. For each challenge it constructs a generic, over-provisioned,
 * resilience-fronted REFERENCE SOLUTION from the challenge's own required_components + required_types,
 * which the caller runs through the REAL simulation + scorer.
 *
 * It is a smoke-test builder, not a balance oracle: a clearing solution means "a sensible,
 * well-provisioned architecture passes", not "the intended minimal solution".
 */

/** Parse every local component authoring YAML into a validated Component (no Firestore). */
export function loadLocalComponents(): Component[] {
  const dir = join(process.cwd(), "src/data/components")
  const out: Component[] = []
  for (const file of readdirSync(dir).filter((f) => f.endsWith(".yaml"))) {
    const parsed = load(readFileSync(join(dir, file), "utf-8"))
    const result = ComponentYamlSchema.safeParse(parsed)
    if (result.success) out.push(result.data)
  }
  return out
}

// A representative TYPE id to place for each required_components CATEGORY (categories aren't scored
// directly, but a functional solution needs a node of each to route traffic through realistically).
const CATEGORY_PRIMARY_TYPE: Record<string, string> = {
  traffic: "traffic-source",
  "delivery-network": "load-balancer",
  compute: "compute",
  "data-storage": "relational-db",
  caching: "cache",
  search: "search-engine",
  messaging: "message-queue",
  "real-time": "realtime",
  monitoring: "observability",
  "auth-security": "auth",
}

// The synchronous spine, ordered FRONT of compute. cdn + cache sit ahead of compute so their hits are
// served terminally (the sim absorbs hits locally, only misses forward) — stacked cdn(~0.90)+cache(~0.92)
// absorb ~99% of reads, which is what lets a reference solution survive a full compute az_outage.
const FRONT_SPINE = ["dns", "cdn", "cache", "api-gateway", "auth", "rate-limiter", "load-balancer"]
// Categories placed AFTER compute (compute fans out to them).
const DATA_CATEGORIES = new Set(["data-storage", "search"])

export interface RefNode {
  id: string
  type: "archie"
  position: { x: number; y: number }
  data: { archieComponentId: string; activeConfigVariantId: string; componentCategory: ComponentCategoryId; replicaCount: number; trafficRps?: number; trafficWorkload?: string; trafficKind?: string; trafficOrigin?: string; cacheableFraction?: number }
}

export interface RefEdge {
  id: string
  source: string
  target: string
}

type Variant = { id: string; maxRPS?: number; cacheHitRatio?: number; monthlyCost?: number; concurrencyLimit?: number; baseLatencyMs?: number; replicationLagMs?: number }

// EN2 (D74): conservative in-flight estimate for SIZING. W depends on post-resize ρ (circular), so use
// the queueing curve at the lean builder's actual peak operating point. leanResize sizes to load×1.1, so
// a node runs at ρ≈1/1.1≈0.91 at peak, where the ED4 curve inflates latency ≈5.5× base — NOT the 2.5×
// of ρ=0.8 the first cut assumed (that under-sizes the pool and the gate would shed). 5.5× is the
// conservative upper bound that never under-sizes: replicas so concurrencyLimit × replicas ≥ load × W/1000.
const SIZING_W_MULTIPLIER = 5.5
function concurrencyReplicas(v: Variant, load: number, scalesWithReplicas: boolean): number {
  if (!v.concurrencyLimit || v.concurrencyLimit <= 0 || !scalesWithReplicas) return 1
  const wEst = Math.max(v.baseLatencyMs ?? 0, 0) * SIZING_W_MULTIPLIER
  const inFlight = (load || 1) * (wEst / 1000)
  return Math.max(1, Math.ceil(inFlight / v.concurrencyLimit))
}

/**
 * PASS-1 variant pick: maximize capacity so the over-provisioned reference never sheds — this gives
 * leanResize() an accurate measurement of each node's TRUE load demand. For cache-capable types
 * (cdn/cache) the HIT RATIO is the point (hits are served terminally, so a high-hit-ratio front tier
 * survives a compute outage); everything else maximizes throughput.
 */
function pickVariant(component: { configVariants: Variant[] }, typeId: string): Variant {
  const variants = component.configVariants
  if (typeId === "cdn" || typeId === "cache") {
    const withRatio = variants.filter((v) => (v.cacheHitRatio ?? 0) > 0)
    if (withRatio.length > 0) {
      return withRatio.reduce((best, v) => ((v.cacheHitRatio ?? 0) > (best.cacheHitRatio ?? 0) ? v : best))
    }
  }
  // EN4 (D74): a strong-consistency (replicationLagMs) variant is NOT the default over-provisioned pick —
  // exclude it so adding one never shifts a non-consistency MAX build (the 60 stay byte-identical).
  const eligible = variants.filter((v) => v.replicationLagMs === undefined)
  const pool = eligible.length > 0 ? eligible : variants
  return pool.reduce((best, v) => ((v.maxRPS ?? 0) > (best.maxRPS ?? 0) ? v : best), pool[0])
}

/**
 * PASS-2 variant pick (cost-aware, replicaType-aware) — sizes a node to its MEASURED `load` the way a
 * cost-conscious player would (D72). Picks the CHEAPEST variant whose effective capacity covers the
 * load, total cost = monthlyCost × replicas-needed:
 *  - `scalesWithReplicas` (compute/etc — replicaType "full"): capacity = maxRPS × replicas, so fit
 *    needs ceil(load/maxRPS) ≤ MAX_REPLICAS.
 *  - otherwise (data-storage read-replicas, singletons): replicas do NOT add throughput for the
 *    binding constraint (writes), so the variant's OWN maxRPS must cover the load.
 * Falls back to the max-throughput variant when nothing fits (minimizes the shortfall).
 */
function pickCheapestVariant(component: { configVariants: Variant[] }, typeId: string, load: number, scalesWithReplicas: boolean, preferLowLag = false): Variant {
  // EN4 (D74): strong-consistency (replicationLagMs) variants are eligible ONLY for a consistency-
  // targeted challenge. Otherwise they're invisible to EVERY branch below — the hit-ratio pick, the
  // fits/cost selection, AND the max-throughput fallback — so adding one never shifts a non-consistency
  // build (the 60 stay byte-identical; the fallback was the leak that pulled in the 12k synchronous DB).
  const nonLag = component.configVariants.filter((v) => v.replicationLagMs === undefined)
  const variants = preferLowLag || nonLag.length === 0 ? component.configVariants : nonLag
  // A consistency-targeted challenge needs FRESH reads — prefer the lowest replication-lag variant that
  // carries the load (then cheapest among ties), trading cost/latency for low staleness.
  if (preferLowLag) {
    const withLag = variants.filter((v) => v.replicationLagMs !== undefined)
    if (withLag.length > 0) {
      const minLag = Math.min(...withLag.map((v) => v.replicationLagMs ?? Infinity))
      const lowest = withLag.filter((v) => (v.replicationLagMs ?? Infinity) === minLag)
      const pick = lowest.reduce((best, v) => ((v.monthlyCost ?? 0) < (best.monthlyCost ?? 0) ? v : best))
      const tPer = pick.maxRPS && pick.maxRPS > 0 ? pick.maxRPS : load || 1
      if ((scalesWithReplicas ? Math.ceil((load || 1) / tPer) <= MAX_REPLICAS : (pick.maxRPS ?? 0) >= load)) return pick
    }
  }
  if (typeId === "cdn" || typeId === "cache") {
    const withRatio = variants.filter((v) => (v.cacheHitRatio ?? 0) > 0)
    if (withRatio.length > 0) {
      const bestRatio = Math.max(...withRatio.map((v) => v.cacheHitRatio ?? 0))
      const top = withRatio.filter((v) => (v.cacheHitRatio ?? 0) === bestRatio)
      const pick = top.reduce((best, v) => ((v.monthlyCost ?? 0) < (best.monthlyCost ?? 0) ? v : best))
      // EN2: only short-circuit if the hit-ratio pick's connection pool actually carries the load;
      // otherwise fall through to the general fits/cost selection. (No-op until a cdn/cache authors a limit.)
      if (concurrencyReplicas(pick, load, scalesWithReplicas) <= MAX_REPLICAS) return pick
    }
  }
  const replicasFor = (v: Variant) => {
    const per = v.maxRPS && v.maxRPS > 0 ? v.maxRPS : load || 1
    const rpsReplicas = scalesWithReplicas ? Math.max(1, Math.ceil((load || 1) / per)) : 1
    // EN2: a high-latency variant may need MORE replicas for the connection pool than for throughput.
    return Math.max(rpsReplicas, concurrencyReplicas(v, load, scalesWithReplicas))
  }
  // EN2: a non-scaling variant whose own per-replica pool can't carry the in-flight load never fits.
  const concurrencyOk = (v: Variant) =>
    scalesWithReplicas || !v.concurrencyLimit || v.concurrencyLimit > (load || 1) * ((Math.max(v.baseLatencyMs ?? 0, 0) * SIZING_W_MULTIPLIER) / 1000)
  const fits = (v: Variant) =>
    (v.maxRPS ?? 0) > 0 && concurrencyOk(v) && (scalesWithReplicas ? replicasFor(v) <= MAX_REPLICAS : (v.maxRPS ?? 0) >= load)
  const cost = (v: Variant) => (v.monthlyCost ?? 0) * replicasFor(v)
  const affordable = variants.filter(fits)
  if (affordable.length > 0) return affordable.reduce((best, v) => (cost(v) < cost(best) ? v : best))
  // Consistency-targeted fallback (S2/D93): when nothing covers the load, a freshness challenge's
  // player still picks the LOWEST-LAG variant and eats the shed — staleness, not throughput, is the
  // binding gate. (Pre-calibration this happened by accident: the strong variant was also the
  // max-throughput fallback; the citus lift exposed it.) Only strong-or-stale sets consistencyTargetMs.
  if (preferLowLag) {
    const withLag = variants.filter((v) => v.replicationLagMs !== undefined)
    if (withLag.length > 0) {
      const minLag = Math.min(...withLag.map((v) => v.replicationLagMs ?? Infinity))
      return withLag.filter((v) => (v.replicationLagMs ?? Infinity) === minLag)
        .reduce((best, v) => ((v.maxRPS ?? 0) > (best.maxRPS ?? 0) ? v : best))
    }
  }
  return variants.reduce((best, v) => ((v.maxRPS ?? 0) > (best.maxRPS ?? 0) ? v : best), variants[0])
}

/**
 * The traffic curve the GAME actually runs: when a challenge declares typed trafficSources, the load
 * is derived from them (peak-anchored, summed) — overriding the authored trafficCurve, exactly as
 * ChallengeStartButton does. So the harness validates the real recast load, not the legacy curve.
 */
export function challengeCurve(c: Challenge) {
  return c.trafficSources && c.trafficSources.length > 0
    ? buildTrafficCurveFromSpecs(c.trafficSources, c.durationSeconds)
    : c.trafficCurve
}

function curvePeak(c: Challenge): number {
  return challengeCurve(c).reduce((m, p) => Math.max(m, p.rps), 0)
}

/** Build a node for a TYPE id via its default provider, sized to cover `peak` rps. */
function refNode(idSuffix: string, typeId: string, peak: number, trafficRps?: number): RefNode | null {
  const type = COMPONENT_TYPES.get(typeId)
  if (!type) return null
  const component = componentLibrary.getComponent(type.defaultProviderId)
  if (!component || component.configVariants.length === 0) return null
  const variant = pickVariant(component as never, typeId)
  const perNode = variant.maxRPS && variant.maxRPS > 0 ? variant.maxRPS : peak || 1
  const replicaCount = Math.max(1, Math.ceil((peak || 1) / perNode))
  return {
    id: `n-${idSuffix}`,
    type: "archie",
    position: { x: 0, y: 0 },
    data: {
      archieComponentId: component.id,
      activeConfigVariantId: variant.id,
      componentCategory: component.category as ComponentCategoryId,
      replicaCount,
      ...(trafficRps !== undefined ? { trafficRps } : {}),
    },
  }
}

/** Construct an over-provisioned, resilience-fronted reference solution for a challenge. */
export function buildSolution(c: Challenge): { nodes: RefNode[]; edges: RefEdge[] } {
  const peak = curvePeak(c)
  // availableBlocks hard-gates the player's palette; a faithful reference solution only uses allowed
  // types. Empty availableBlocks ⇒ unrestricted.
  const allowed = c.availableBlocks.length > 0 ? new Set(c.availableBlocks) : null
  // forbidden_types (4c hardening) must NOT appear in a passing solution — never place them.
  const forbidden = new Set(c.forbiddenTypes ?? [])
  const canUse = (t: string) => (allowed === null || allowed.has(t)) && !forbidden.has(t)
  const catOf = (t: string) => COMPONENT_TYPES.get(t)?.category

  // Pick a USABLE representative TYPE for a required category (prefer the canonical primary, but never
  // a forbidden / disallowed one — when the primary is banned, fall back to any usable type of the
  // category so a forbidden_types hardening that targets the primary still yields a valid solution).
  const repForCategory = (cat: string): string | undefined => {
    const primary = CATEGORY_PRIMARY_TYPE[cat]
    if (primary && canUse(primary)) return primary
    const pool = allowed ? [...allowed] : [...COMPONENT_TYPES.keys()]
    for (const t of pool) if (canUse(t) && catOf(t) === cat) return t
    return undefined
  }

  // TYPE ids to place: required categories + explicit required types, then a compute serving tier,
  // then resilience fronting (stacked cdn + cache when allowed — survives compute outages, cuts latency).
  const wanted = new Set<string>()
  for (const cat of c.requiredComponents) {
    const t = repForCategory(cat)
    if (t) wanted.add(t)
  }
  for (const t of c.requiredTypes) wanted.add(t)
  // D19 (ED9): ensure a compute-category serving tier exists — but add the canonical generic `compute`
  // ONLY when none is already required. All 57 built-ins list `compute` in required_components, so this
  // is byte-identical for them; a serverless-PRIMARY challenge (requires serverless, omits the compute
  // category) then builds serverless-only, letting ED9's autoscale discount dominate the bill instead of
  // being dwarfed by a redundant static compute tier.
  if (![...wanted].some((t) => catOf(t) === "compute")) wanted.add("compute")
  // Resilience fronting (stacked cdn + cache to absorb reads): worth its cost when the load is high
  // enough to need absorption OR the challenge has scheduled outages to survive. Below that, the
  // origin serves directly and the extra tiers would only bust tight low-tier budgets (D72 — the
  // budget star). Required cdn/cache are still added via the loops above regardless.
  const needsFronting = peak >= 100_000 || c.scheduledEvents.length > 0
  if (needsFronting) for (const t of ["cdn", "cache"]) if (canUse(t)) wanted.add(t)
  // Multi-region origin grading (4c): a multi-region source requires CDN + DNS + a database present.
  // Ensure all three are in the solution (cdn already added above when allowed).
  if (c.trafficSources?.some((s) => s.origin === "multi-region")) {
    for (const t of ["cdn", "dns"]) if (canUse(t)) wanted.add(t)
    const hasDb = [...wanted].some((t) => catOf(t) === "data-storage")
    if (!hasDb) {
      const db = canUse("relational-db") ? "relational-db" : [...(allowed ?? [])].find((t) => catOf(t) === "data-storage")
      if (db) wanted.add(db)
    }
  }

  const nodes: RefNode[] = []
  const idByType = new Map<string, string>()
  for (const t of wanted) {
    const n = refNode(t, t, peak, t === "traffic-source" ? peak : undefined)
    if (n) {
      nodes.push(n)
      idByType.set(t, n.id)
    }
  }

  const id = (t: string) => idByType.get(t)
  const present = (t: string) => idByType.has(t)
  const placed = [...idByType.keys()]
  const computeTypes = placed.filter((t) => catOf(t) === "compute")
  const dataTypes = placed.filter((t) => DATA_CATEGORIES.has(catOf(t) ?? ""))

  const edges: RefEdge[] = []
  let ei = 0
  const link = (source?: string, target?: string) => {
    if (!source || !target || source === target) return
    if (edges.some((e) => e.source === source && e.target === target)) return // dedup
    edges.push({ id: `e${ei++}`, source, target })
  }
  // Add a typed node if missing (and allowed); returns its node id. Used by the topology satisfier.
  const ensureNode = (typeId?: string): string | undefined => {
    if (!typeId) return undefined
    if (idByType.has(typeId)) return idByType.get(typeId)
    if (!canUse(typeId)) return undefined
    const n = refNode(typeId, typeId, peak)
    if (!n) return undefined
    nodes.push(n)
    idByType.set(typeId, n.id)
    return n.id
  }

  // ED5 (D74): emit one traffic node PER challenge source, each stamped with its workload behaviors
  // (workload → write-pressure, kind → access-pattern erosion, cacheableFraction). buildSimGraph blends
  // them rps-weighted into the cache's REAL hit ratio. Legacy curve-only challenges → one aggregate node.
  const trafficIds: string[] = []
  const srcs = c.trafficSources ?? []
  if (srcs.length > 0) {
    srcs.forEach((s, i) => {
      const tn = refNode(`traffic-${i}`, "traffic-source", s.rps, s.rps)
      if (!tn) return
      tn.data.trafficWorkload = s.workload
      tn.data.trafficKind = s.kind
      tn.data.trafficOrigin = s.origin
      if (s.cacheableFraction !== undefined) tn.data.cacheableFraction = s.cacheableFraction
      nodes.push(tn)
      trafficIds.push(tn.id)
    })
  } else {
    const tn = refNode("traffic-source", "traffic-source", peak, peak)
    if (tn) { nodes.push(tn); trafficIds.push(tn.id) }
  }
  if (trafficIds.length > 0) idByType.set("traffic-source", trafficIds[0]) // spine anchors on the first

  // Sync spine: traffic → [front spine, ordered] → [compute chain] → fan out to data nodes.
  const front = FRONT_SPINE.filter(present)
  const chain = [id("traffic-source"), ...front.map(id), ...computeTypes.map(id)].filter(Boolean) as string[]
  for (let i = 0; i < chain.length - 1; i++) link(chain[i], chain[i + 1])
  // Additional source nodes feed the same first downstream as the primary (chain[1]).
  if (chain.length > 1) for (const tid of trafficIds.slice(1)) link(tid, chain[1])
  const primaryCompute = computeTypes.map(id).find(Boolean) ?? id("compute")
  for (const d of dataTypes) link(primaryCompute, id(d))
  // Observability monitors compute (E8 monitoring-recovery helps uptime through failures).
  if (present("observability")) link(primaryCompute, id("observability"))
  // Async tiers (messaging / real-time) stay OFF the sync path: present for required-type coverage,
  // but no synchronous traffic flows through them, so their outage cannot shed the request path.

  // Satisfy required_topology assertions (D69 — the 4c-deferred builder support): add the nodes +
  // edges each rule needs so a hardened topology challenge is still clearable by the reference solution.
  for (const a of c.requiredTopology ?? []) {
    if (a.ruleType === "CACHE_BETWEEN") {
      const cache = ensureNode("cache")
      link(cache, ensureNode(a.sourceType)) // cache adjacent to a sourceType node
      link(cache, ensureNode(a.targetType)) // ...and to a targetType node
    } else if (a.ruleType === "LB_UPSTREAM") {
      link(ensureNode("load-balancer"), ensureNode(a.targetType)) // every target adjacent to an LB
    } else if (a.ruleType === "FAN_OUT_GTE") {
      const src = ensureNode(a.sourceType)
      const min = a.minCount ?? 2
      const neighborsOf = () => new Set(
        edges.filter((e) => e.source === src || e.target === src).map((e) => (e.source === src ? e.target : e.source)),
      )
      let k = 0
      while (src && neighborsOf().size < min) {
        const fillerType = canUse("compute") ? "compute" : [...(allowed ?? ["compute"])].find((x) => catOf(x) !== "traffic" && canUse(x))
        const filler = fillerType ? refNode(`fan-${a.sourceType}-${k}`, fillerType, peak) : null
        if (!filler) break
        nodes.push(filler)
        link(src, filler.id)
        k++
      }
    }
  }

  // Eliminate orphans (D72) — category-aware after ED3 (D74). Any placed node still with no edge:
  //  - EXEMPT async tiers (messaging / real-time): wired FROM it INTO compute (n→compute), leaving NO
  //    incoming traffic so it carries zero load (an AZ outage on it sheds nothing). Presence satisfies
  //    its required-type check (ED3 exempts async tiers).
  //  - NON-exempt types (e.g. `security`): MUST be on the served path for ED3, so wire compute→n —
  //    directed-reachable from the traffic source. Side-channel categories (monitoring/security) are
  //    excluded from path latency, so this doesn't perturb p99.
  const connected = new Set(edges.flatMap((e) => [e.source, e.target]))
  const sink = primaryCompute ?? id("traffic-source")
  for (const n of nodes) {
    if (connected.has(n.id) || n.id === sink) continue
    const typeId = componentLibrary.getComponent(n.data.archieComponentId)?.typeId ?? ""
    if (isOnPathExempt(typeId)) link(n.id, sink) // async tier — stays off the sync path
    else link(primaryCompute, n.id) // ED3: make it directed-reachable (on the served path)
  }

  return { nodes, edges }
}

/** Return a copy of nodes with every replicaCount capped at `max` (the UI's MAX_REPLICAS stepper limit). */
export function capReplicas(nodes: readonly RefNode[], max: number): RefNode[] {
  return nodes.map((n) =>
    n.data.replicaCount > max ? { ...n, data: { ...n.data, replicaCount: max } } : n,
  )
}

/**
 * PASS 2 (D72) — lean-resize an over-provisioned reference to its MEASURED load, the way a cost-
 * conscious player sizes their build. Runs the (capacity-guaranteed) pass-1 graph once, reads each
 * node's peak incomingRps, then repicks the cheapest variant + minimum replicas that serves that load
 * (replicaType-aware). This is what makes behind-cache tiers cheap (cache absorption ⇒ tiny load ⇒
 * small variant) and write-bound DBs correct (a read-replica variant can't scale writes), so the
 * solution earns the cost star without forfeiting capacity. Headroom (×1.1) absorbs realistic bursts.
 */
function leanResize(c: Challenge, nodes: readonly RefNode[], edges: readonly RefEdge[]): RefNode[] {
  // ED5 (D74): resizing a tier changes how much it forwards (variant hit ratio), which changes the
  // load every DOWNSTREAM tier sees — so a single pass under-provisions caches behind a re-sized CDN.
  // Iterate to a fixed point: re-measure each node's peak incoming on the freshly-sized graph and
  // re-size, a few times. Converges in ≤3 passes for these topologies; stable builds are no-ops.
  let current: RefNode[] = nodes.map((n) => ({ ...n, data: { ...n.data } }))
  for (let pass = 0; pass < 3; pass++) {
    const result = runSimulation(buildSimGraph(current, edges, crossRegionSimOpts(c)), challengeCurve(c), undefined, c.durationSeconds, c.scheduledEvents, c.chaosIntensity)
    const peakIn = new Map<string, number>()
    for (const tick of result.ticks) {
      for (const nt of tick.nodes) peakIn.set(nt.nodeId, Math.max(peakIn.get(nt.nodeId) ?? 0, nt.incomingRps))
    }
    current = current.map((n) => {
      if (n.data.componentCategory === "traffic") return n // the load origin — not a sized tier
      const component = componentLibrary.getComponent(n.data.archieComponentId)
      if (!component || component.configVariants.length === 0) return n
      const typeId = component.typeId ?? ""
      const load = Math.max(1, Math.ceil((peakIn.get(n.id) ?? 0) * 1.1))
      const scalesWithReplicas = getScalingRule(n.data.componentCategory).replicaType === "full"
      // EN4: a consistency-targeted challenge makes the builder prefer fresh (low replication-lag) DB variants.
      const variant = pickCheapestVariant(component as never, typeId, load, scalesWithReplicas, c.consistencyTargetMs !== undefined)
      const per = variant.maxRPS && variant.maxRPS > 0 ? variant.maxRPS : load
      const rpsReplicas = scalesWithReplicas ? Math.max(1, Math.ceil(load / per)) : 1
      // EN2: size for the connection pool too — a slow tier needs replicas for concurrency, not just rps.
      const replicaCount = Math.max(rpsReplicas, concurrencyReplicas(variant as Variant, load, scalesWithReplicas))
      return { ...n, data: { ...n.data, activeConfigVariantId: variant.id, replicaCount } }
    })
  }
  return current
}

/**
 * The "player-grade" reference solution: the over-provisioned build (buildSolution) lean-resized to
 * its measured load and capped at the UI replica limit. This is what the harness, the capstone proof,
 * and the E2E architecture fixtures all use — a sensible, cost-efficient, buildable 3★ solution.
 */
export function buildLeanSolution(c: Challenge, replicaCap = MAX_REPLICAS): { nodes: RefNode[]; edges: RefEdge[] } {
  const built = buildSolution(c)
  const lean = leanResize(c, built.nodes, built.edges)
  return { nodes: capReplicas(lean, replicaCap), edges: built.edges }
}

/**
 * Redundant (no-single-point-of-failure) variant of buildSolution. The topology star requires ZERO
 * topology issues, and `missing-hop` flags any node reachable only through an articulation point — so
 * a linear one-node-per-tier chain can never earn it. This duplicates every non-traffic tier into
 * `width` parallel nodes (replicas split across them) and fully bipartite-wires adjacent tiers, so no
 * single node is an articulation point. The traffic source stays single (suppressed from topology
 * scoring). Used to prove every challenge is 3★-completable within the UI budget.
 */
export function buildRedundantSolution(c: Challenge, width = 2): { nodes: RefNode[]; edges: RefEdge[] } {
  const base = buildSolution(c)
  const trafficIds = new Set(base.nodes.filter((n) => n.data.componentCategory === "traffic").map((n) => n.id))
  // Map each base node id → its parallel copy ids (traffic stays single).
  const copies = new Map<string, string[]>()
  const nodes: RefNode[] = []
  for (const n of base.nodes) {
    const w = trafficIds.has(n.id) ? 1 : width
    const perCopyReplicas = Math.max(1, Math.ceil(n.data.replicaCount / w))
    const ids: string[] = []
    for (let k = 0; k < w; k++) {
      const id = w === 1 ? n.id : `${n.id}-${k}`
      ids.push(id)
      nodes.push({ ...n, id, data: { ...n.data, replicaCount: perCopyReplicas } })
    }
    copies.set(n.id, ids)
  }
  // Bipartite-wire adjacent tiers: every copy of A connects to every copy of B for each base edge A→B.
  const edges: RefEdge[] = []
  let ei = 0
  for (const e of base.edges) {
    for (const s of copies.get(e.source) ?? [e.source]) {
      for (const t of copies.get(e.target) ?? [e.target]) {
        edges.push({ id: `e${ei++}`, source: s, target: t })
      }
    }
  }
  return { nodes, edges }
}

export interface ScoreResult {
  breakdown: ReturnType<typeof evaluateAttempt>
  stats: ReturnType<typeof computeSimStats>
  nodeCount: number
  maxReplica: number
}

/** Score ONE concrete build (nodes + edges) through the REAL sim + scorer (D72 topology split). */
export function scoreBuild(c: Challenge, nodes: readonly RefNode[], edges: readonly RefEdge[]): ScoreResult {
  const graph = buildSimGraph(nodes, edges, crossRegionSimOpts(c))
  const result = runSimulation(graph, challengeCurve(c), undefined, c.durationSeconds, c.scheduledEvents, c.chaosIntensity)
  const stats = computeSimStats(result.ticks, result.ticks.length - 1)
  const { topologyIssues } = evaluateTopology(nodes, edges)
  // D72: only blocking issues (orphan/unreachable) gate the well-formed star; SPOF/LB are advisory.
  // Match the app's useChallengeAutoScore split so the harness scores identically to the real game.
  const { blocking, advisory } = countTopologyIssues(topologyIssues)
  // ED9 (D74): integrate cost over the curve so autoscale tiers bill mean-active, not flat. No autoscale
  // node ⇒ exactly computeTotalArchitectureCost. D74 on-path: pass edges so a disconnected block doesn't
  // bill (matches the live app's ChallengeStartButton/useChallengeAutoScore — no harness/app drift).
  const totalCost = computeIntegratedArchitectureCost(nodes, result.ticks, edges)
  const canvasTypeIds = new Set<string>()
  const typeByNodeId = new Map<string, string>()
  const cdnHitByNodeId = new Map<string, number>()
  for (const n of nodes) {
    const typeId = componentLibrary.getComponent(n.data.archieComponentId)?.typeId
    if (typeId) {
      canvasTypeIds.add(typeId)
      typeByNodeId.set(n.id, typeId)
      if (typeId === "cdn") {
        const hit = getNodeCost(n.data.archieComponentId, n.data.activeConfigVariantId, n.data.replicaCount ?? 1, n.data.trafficRps).cacheHitRatio
        if (hit !== undefined && hit > 0) cdnHitByNodeId.set(n.id, hit)
      }
    }
  }
  // EN5 (D74): fold per-origin-request usage fees into the bill the SAME way the live app does — the
  // shared peakOriginBoundRps + usageCostPerMonth helpers (so harness + game grade the identical
  // quantity). 0 when no usage_rates, so the 57 stay byte-identical.
  const effectiveCost = totalCost + usageCostPerMonth(c.usageRates, peakOriginBoundRps(result.ticks, cdnHitByNodeId))
  // ED7 (D74): cost-efficiency in $/million-requests at peak demand — same unit the app scores with.
  const costPerRequest = costPerMillionRequests(effectiveCost, peakCurveRps(c.trafficCurve))
  const breakdown = evaluateAttempt(stats, c, blocking, effectiveCost, canvasTypeIds, costPerRequest, {
    typeByNodeId,
    edges: edges.map((e) => ({ source: e.source, target: e.target })),
  }, advisory)
  return { breakdown, stats, nodeCount: nodes.length, maxReplica: Math.max(...nodes.map((n) => n.data.replicaCount)) }
}

/**
 * Candidate buildable solutions for `c`, in PREFERENCE order. Lean first (cost-efficient, realistic —
 * wins ties so the cheapest 3★ build is chosen), then max-capacity (over-provisioned for high-traffic
 * challenges where the lean variants can't carry the volume at ≤cap replicas). A challenge is
 * 3★-completable iff one of these clears it — covering both the budget-bound (lean) and capacity-bound
 * (max) regimes a player would choose between. `redundant` is an alternate single candidate.
 */
function candidateBuilds(c: Challenge, cap: number, opts?: { redundant?: boolean; width?: number }): Array<{ nodes: RefNode[]; edges: RefEdge[] }> {
  if (opts?.redundant) {
    const r = buildRedundantSolution(c, opts.width ?? 2)
    return [{ nodes: capReplicas(r.nodes, cap), edges: r.edges }]
  }
  const max = buildSolution(c)
  return [buildLeanSolution(c, cap), { nodes: capReplicas(max.nodes, cap), edges: max.edges }]
}

/**
 * Score `c` against the REAL sim + scorer, returning the BEST of its candidate builds (the first to
 * reach 3★, else the highest-starred). `opts.replicaCap` caps replicas at the UI's MAX_REPLICAS limit.
 */
export function scoreSolution(c: Challenge, opts?: { replicaCap?: number; redundant?: boolean; width?: number }): ScoreResult {
  const cap = opts?.replicaCap ?? MAX_REPLICAS
  let best: ScoreResult | null = null
  for (const b of candidateBuilds(c, cap, opts)) {
    const r = scoreBuild(c, b.nodes, b.edges)
    if (!best || r.breakdown.stars > best.breakdown.stars) best = r
    if (best.breakdown.stars === 3) break
  }
  return best as ScoreResult
}

/** The winning buildable solution for `c` (the candidate that scores highest) — used for E2E fixtures. */
export function buildClearingSolution(c: Challenge, replicaCap = MAX_REPLICAS): { nodes: RefNode[]; edges: RefEdge[] } {
  let best: { nodes: RefNode[]; edges: RefEdge[] } | null = null
  let bestStars = -1
  for (const b of candidateBuilds(c, replicaCap)) {
    const stars = scoreBuild(c, b.nodes, b.edges).breakdown.stars
    if (stars > bestStars) { best = b; bestStars = stars }
    if (bestStars === 3) break
  }
  return best as { nodes: RefNode[]; edges: RefEdge[] }
}

/**
 * Serialize a reference solution (nodes + edges) into an architecture-file object that the app's
 * `Import` flow accepts (architectureFileSchema, CURRENT_SCHEMA_VERSION). This is how the capstone
 * E2E gets a winning build onto the canvas without fragile drag-and-drop: cap replicas at the UI
 * ceiling first, then dump this to YAML and `setInputFiles` it through the real import UI.
 */
export function toArchitectureFixture(c: Challenge, nodes: readonly RefNode[], edges: readonly RefEdge[]) {
  return {
    schema_version: CURRENT_SCHEMA_VERSION,
    name: `${c.id} — reference solution (D71 capstone proof)`,
    nodes: nodes.map((n, i) => ({
      id: n.id,
      component_id: n.data.archieComponentId,
      config_variant_id: n.data.activeConfigVariantId,
      position: { x: (i % 6) * 220, y: Math.floor(i / 6) * 180 },
      replicas: n.data.replicaCount,
      ...(n.data.trafficRps !== undefined ? { traffic_rps: n.data.trafficRps } : {}),
      ...(n.data.trafficWorkload ? { traffic_workload: n.data.trafficWorkload } : {}),
      ...(n.data.trafficKind && n.data.trafficKind !== "steady" ? { traffic_kind: n.data.trafficKind } : {}),
      ...(n.data.trafficOrigin && n.data.trafficOrigin !== "one-region" ? { traffic_origin: n.data.trafficOrigin } : {}),
    })),
    edges: edges.map((e) => ({ id: e.id, source_node_id: e.source, target_node_id: e.target })),
  }
}
