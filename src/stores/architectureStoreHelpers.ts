import { componentLibrary } from "@/services/componentLibrary"
import { detectTopologyIssues, detectReplicasWithoutLB, type TopologyIssue } from "@/engine/topologyChecker"
import type { SimGraph, SimNode, SimEdge, TrafficCurve, TickState } from "@/lib/simulationTypes"
import { buildPeakAnchoredCurve, normalizeTrafficKind, type TrafficKind } from "@/engine/trafficPatterns"
import type { DemandProfile, FailureModifiers } from "@/lib/demandTypes"
import { getScenarioPreset } from "@/services/scenarioLoader"
import { getFailurePreset } from "@/services/failureLoader"
import { computeCategoryScores, computeWeightedCategoryScores, type CategoryScore } from "@/engine/dashboardCalculator"
import { evaluateConstraints, type ConstraintViolation } from "@/engine/constraintEvaluator"
import { getWeight } from "@/lib/weightUtils"
import { computeWeightedNodeScore, computeHeatmapStatus, type NodeCategoryAverage, type HeatmapStatus } from "@/engine/heatmapCalculator"
import { evaluateTier, type TierCategoryScore } from "@/engine/tierEvaluator"
import { DEFAULT_TIER_DEFINITIONS, type TierResult } from "@/lib/tierDefinitions"
import type { RecalculatedMetrics } from "@/engine/recalculator"
import {
  METRIC_CATEGORIES,
  getScalingRule,
  TRAFFIC_RPS_STEPS,
  azCountForReplicas,
  type Constraint,
  type WeightProfile,
  type ComponentCategoryId,
} from "@/lib/constants"

/**
 * Module-level helper: computes per-node category averages from RecalculatedMetrics.
 * Used by weighted heatmap to apply weight profile before determining heatmap status.
 */
export function getNodeCategoryAverages(nodeMetrics: RecalculatedMetrics): NodeCategoryAverage[] {
  const categoryMap = new Map<string, { sum: number; count: number }>()
  for (const metric of nodeMetrics.metrics) {
    const entry = categoryMap.get(metric.category) ?? { sum: 0, count: 0 }
    entry.sum += metric.numericValue
    entry.count++
    categoryMap.set(metric.category, entry)
  }
  const averages: NodeCategoryAverage[] = []
  for (const [categoryId, { sum, count }] of categoryMap) {
    averages.push({ categoryId, averageScore: sum / count })
  }
  return averages
}

/**
 * Module-level helper: evaluates tier from current architecture state and sets result.
 * Called from triggerRecalculation (with overrideMetrics), addNode, removeNode/removeNodes.
 * Applies weight profile to category scores before tier evaluation (Story 5-2 AC-3, AC-5).
 */
export function evaluateAndSetTier(
  nodes: { id: string; data: { componentCategory: string } }[],
  weightProfile: WeightProfile,
  computedMetrics: Map<string, RecalculatedMetrics>,
  overrideMetrics?: Map<string, RecalculatedMetrics>,
): TierResult | null {
  if (nodes.length === 0) return null
  try {
    const metrics = overrideMetrics ?? computedMetrics
    const categoryScores = computeCategoryScores(metrics)
    const weightedScores = computeWeightedCategoryScores(categoryScores, weightProfile)
    const tierCategoryScores: TierCategoryScore[] = weightedScores.map((cs) => ({
      categoryId: cs.categoryId,
      score: cs.score,
      hasData: cs.hasData,
    }))
    const nodeSummaries = nodes.map((n) => ({
      id: n.id,
      category: n.data.componentCategory,
    }))
    return evaluateTier(nodeSummaries, tierCategoryScores, DEFAULT_TIER_DEFINITIONS)
  } catch (err) {
    if (import.meta.env.DEV) {
      console.warn("evaluateAndSetTier failed:", err)
    }
    return null
  }
}

/**
 * Module-level helper: recomputes weighted heatmap for all nodes.
 * Uses weight profile to compute per-node weighted overall scores,
 * then maps to heatmap statuses.
 */
function recomputeWeightedHeatmap(
  computedMetrics: Map<string, RecalculatedMetrics>,
  weightProfile: WeightProfile,
): Map<string, HeatmapStatus> {
  const result = new Map<string, HeatmapStatus>()
  for (const [nodeId, nodeMetrics] of computedMetrics) {
    const categoryAverages = getNodeCategoryAverages(nodeMetrics)
    const weightedScore = computeWeightedNodeScore(categoryAverages, weightProfile)
    result.set(nodeId, computeHeatmapStatus(weightedScore))
  }
  return result
}

/**
 * Module-level helper: builds per-node weighted category scores from RecalculatedMetrics.
 * For each node, groups metrics by category, computes average, then applies weight.
 * Returns Map<nodeId, CategoryScore[]> suitable for evaluateConstraints.
 * Story 6-2 AC-3: per-node constraint violations.
 */
function buildPerNodeCategoryScores(
  computedMetrics: Map<string, RecalculatedMetrics>,
  weightProfile: WeightProfile,
): Map<string, CategoryScore[]> {
  const result = new Map<string, CategoryScore[]>()
  for (const [nodeId, nodeMetrics] of computedMetrics) {
    const catMap = new Map<string, { sum: number; count: number }>()
    for (const metric of nodeMetrics.metrics) {
      const entry = catMap.get(metric.category) ?? { sum: 0, count: 0 }
      entry.sum += metric.numericValue
      entry.count++
      catMap.set(metric.category, entry)
    }
    const scores: CategoryScore[] = METRIC_CATEGORIES.map((cat) => {
      const entry = catMap.get(cat.id)
      if (!entry) return { categoryId: cat.id, categoryName: cat.name, score: 0, metricCount: 0, hasData: false }
      const rawScore = entry.sum / entry.count
      const rawWeight = getWeight(cat.id, weightProfile)
      const safeWeight = Number.isNaN(rawWeight) || rawWeight < 0 ? 0 : rawWeight
      return { categoryId: cat.id, categoryName: cat.name, score: rawScore * safeWeight, metricCount: entry.count, hasData: true }
    })
    result.set(nodeId, scores)
  }
  return result
}

/**
 * Module-level helper: evaluates constraints and returns violations + grouped map.
 * Called after scoring changes (recalculation, weight change) and constraint CRUD.
 * Story 6-2 AC-ARCH-PATTERN-4.
 */
export function evaluateAndGetViolations(
  constraints: Constraint[],
  weightProfile: WeightProfile,
  nodes: { length: number },
  computedMetrics: Map<string, RecalculatedMetrics>,
  overrideMetrics?: Map<string, RecalculatedMetrics>,
): { constraintViolations: ConstraintViolation[]; violationsByNodeId: Map<string, ConstraintViolation[]> } {
  if (constraints.length === 0 || nodes.length === 0) {
    return { constraintViolations: [], violationsByNodeId: new Map() }
  }
  const metrics = overrideMetrics ?? computedMetrics
  const categoryScores = computeCategoryScores(metrics)
  const weightedScores = computeWeightedCategoryScores(categoryScores, weightProfile)
  const perNodeScores = buildPerNodeCategoryScores(metrics, weightProfile)
  const violations = evaluateConstraints(constraints, weightedScores, perNodeScores)
  return { constraintViolations: violations, violationsByNodeId: buildViolationsByNodeId(violations) }
}

/**
 * Module-level helper: groups violations by nodeId for O(1) per-node lookups.
 * ArchieNode subscribes to violationsByNodeId.get(id) instead of filtering the full array.
 * TD-6-3a AC-2.
 */
function buildViolationsByNodeId(
  violations: ConstraintViolation[],
): Map<string, ConstraintViolation[]> {
  const map = new Map<string, ConstraintViolation[]>()
  for (const v of violations) {
    map.set(v.nodeId, [...(map.get(v.nodeId) ?? []), v])
  }
  return map
}

/**
 * Module-level helper: recomputes the scoring layer (dashboard, heatmap, tier, constraints)
 * from existing computedMetrics + weight profile. No BFS propagation.
 * O(nodes * categories) — fast path for weight slider changes (AC-ARCH-PATTERN-4).
 */
export function recomputeScoringLayer(
  nodes: { id: string; data: { componentCategory: string } }[],
  weightProfile: WeightProfile,
  computedMetrics: Map<string, RecalculatedMetrics>,
  constraints: Constraint[],
): {
  heatmapColors: Map<string, HeatmapStatus>
  currentTier: TierResult | null
  constraintViolations: ConstraintViolation[]
  violationsByNodeId: Map<string, ConstraintViolation[]>
} {
  const heatmapColors = recomputeWeightedHeatmap(computedMetrics, weightProfile)
  const currentTier = evaluateAndSetTier(nodes, weightProfile, computedMetrics)
  const { constraintViolations, violationsByNodeId } = evaluateAndGetViolations(
    constraints, weightProfile, nodes, computedMetrics,
  )
  return { heatmapColors, currentTier, constraintViolations, violationsByNodeId }
}

/**
 * Module-level helper: runs topology checks on current graph and returns
 * issues + grouped-by-node map for O(1) per-node lookups.
 * Called after topology mutations (addNode, removeNode, addEdge, removeEdges, loadArchitecture).
 */
export function evaluateTopology(
  nodes: { id: string; data: { replicaCount: number; componentCategory: ComponentCategoryId } }[],
  edges: { source: string; target: string }[],
): { topologyIssues: TopologyIssue[]; topologyIssuesByNodeId: Map<string, TopologyIssue[]> } {
  const graphIssues = detectTopologyIssues(nodes, edges)
  // Epic 14: replica scaling topology — flag replicated nodes missing an upstream LB
  const replicaIssuesRaw = detectReplicasWithoutLB(
    nodes.map((n) => ({ id: n.id, replicaCount: n.data.replicaCount, category: n.data.componentCategory })),
    edges,
  )
  // Suppress 'replicas-without-lb' on orphan nodes — a fully disconnected node is already
  // flagged as an orphan (the actionable signal); a redundant "needs LB" warning adds noise (Epic 14 review).
  const orphanIds = new Set(graphIssues.filter((i) => i.issueType === "orphan").map((i) => i.nodeId))
  const replicaIssues = replicaIssuesRaw.filter((i) => !orphanIds.has(i.nodeId))
  // Traffic sources are request origins, not optimisation targets — suppress all warnings on them.
  const trafficNodeIds = new Set(nodes.filter((n) => n.data.componentCategory === "traffic").map((n) => n.id))
  const issues = [...graphIssues, ...replicaIssues].filter((i) => !trafficNodeIds.has(i.nodeId))
  const byNode = new Map<string, TopologyIssue[]>()
  for (const issue of issues) {
    const arr = byNode.get(issue.nodeId)
    if (arr) {
      arr.push(issue)
    } else {
      byNode.set(issue.nodeId, [issue])
    }
  }
  return { topologyIssues: issues, topologyIssuesByNodeId: byNode }
}

// --- Ripple timeout management (extracted from architectureStore for line-count headroom) ---

// Module-level tracking for ripple setTimeout IDs (TD-2-2b)
// Kept outside store state to avoid triggering subscriber re-renders on timeout bookkeeping
const pendingRippleTimeouts = new Set<ReturnType<typeof setTimeout>>()

export function clearPendingRippleTimeouts(): void {
  for (const id of pendingRippleTimeouts) {
    clearTimeout(id)
  }
  pendingRippleTimeouts.clear()
}

export function addPendingRippleTimeout(id: ReturnType<typeof setTimeout>): void {
  pendingRippleTimeouts.add(id)
}

export function removePendingRippleTimeout(id: ReturnType<typeof setTimeout>): void {
  pendingRippleTimeouts.delete(id)
}

// --- Demand scenario helpers (Story 9-4) ---

/** Resolves demand profile from scenario ID. Returns null when no scenario active. */
export function getDemandProfileForScenario(scenarioId: string | null): DemandProfile | null {
  if (!scenarioId) return null
  return getScenarioPreset(scenarioId)?.demandProfile ?? null
}

// --- Failure scenario helpers (Story 9-7) ---

/** Resolves failure modifiers from failure preset ID. Returns null when no failure active. */
export function getFailureModifiersForScenario(failureScenarioId: string | null): FailureModifiers | null {
  if (!failureScenarioId) return null
  return getFailurePreset(failureScenarioId)?.failureModifiers ?? null
}

// --- Economics helpers (Epic 13) ---

export interface NodeCostInfo {
  readonly monthlyCost: number | undefined
  readonly maxRPS: number | undefined
  readonly baseMaxRPS: number | undefined
  readonly baseLatencyMs: number | undefined
  readonly cacheHitRatio: number | undefined
  readonly missLatencyPenaltyMs: number | undefined
  readonly coldStartLatencyMs: number | undefined
  readonly coldStartRatio: number | undefined
  readonly writeRatio: number | undefined
  readonly writeDistribution: "primary" | "sharded" | undefined
  /** EN2: per-replica concurrency ceiling, replica-scaled like maxRPS. undefined ⇒ no limit. */
  readonly concurrencyLimit: number | undefined
  /** ED9: pay-per-use elasticity — cost integrates over the load curve instead of flat × replicas. */
  readonly autoscale: boolean | undefined
  /** EN4: read-replica replication lag (ms) — base staleness for the consistency model. */
  readonly replicationLagMs: number | undefined
}

/**
 * Returns effective economics for a node, scaled by replicaCount (Epic 14).
 * - monthlyCost scales linearly: you pay per replica regardless of scaling type.
 * - maxRPS scales by replicaFactor: linear for 'full'/'read-only' replicas, 1× for 'none'
 *   (non-scalable categories add no throughput even if replicaCount > 1).
 * - baseLatencyMs is unaffected by replication.
 * replicaCount defaults to 1 so existing callers stay backward-compatible (×1 = unchanged).
 */
export function getNodeCost(
  archieComponentId: string,
  activeConfigVariantId: string,
  replicaCount = 1,
  trafficRps?: number,
): NodeCostInfo {
  const component = componentLibrary.getComponent(archieComponentId)
  const variant = component?.configVariants.find((v) => v.id === activeConfigVariantId)
  const replicas = Number.isFinite(replicaCount) ? Math.max(1, Math.floor(replicaCount)) : 1
  const rule = component ? getScalingRule(component.category as ComponentCategoryId) : undefined
  // Traffic source (ISAPivot): `trafficRps` is the source's PEAK rps — set via the stepper through
  // TRAFFIC_RPS_STEPS (3k → 10M). It WINS; the legacy replicaCount-as-index is the fallback for any
  // un-migrated node so maxRPS is never NaN. A traffic source is a free load origin, so its cost is
  // the variant's flat cost (NOT × the stepper count — that count is no longer a replica multiplier).
  if (component?.category === "traffic") {
    const idx = Math.min(replicas, TRAFFIC_RPS_STEPS.length) - 1
    return {
      monthlyCost: variant?.monthlyCost,
      maxRPS: Number.isFinite(trafficRps) && (trafficRps as number) > 0 ? (trafficRps as number) : TRAFFIC_RPS_STEPS[idx],
      baseMaxRPS: variant?.maxRPS,
      baseLatencyMs: variant?.baseLatencyMs,
      cacheHitRatio: variant?.cacheHitRatio,
      missLatencyPenaltyMs: variant?.missLatencyPenaltyMs,
      coldStartLatencyMs: variant?.coldStartLatencyMs,
      coldStartRatio: variant?.coldStartRatio,
      writeRatio: variant?.writeRatio,
      writeDistribution: variant?.writeDistribution,
      concurrencyLimit: undefined, // traffic sources are load origins, never concurrency-limited
      autoscale: undefined, // a traffic source is a load origin, not an autoscaling tier
      replicationLagMs: undefined,
    }
  }
  const capacityFactor = rule && rule.replicaType !== "none" ? replicas : 1
  return {
    monthlyCost: variant?.monthlyCost === undefined ? undefined : variant.monthlyCost * replicas,
    maxRPS: variant?.maxRPS === undefined ? undefined : variant.maxRPS * capacityFactor,
    baseMaxRPS: variant?.maxRPS,
    baseLatencyMs: variant?.baseLatencyMs,
    cacheHitRatio: variant?.cacheHitRatio,
    missLatencyPenaltyMs: variant?.missLatencyPenaltyMs,
    coldStartLatencyMs: variant?.coldStartLatencyMs,
    coldStartRatio: variant?.coldStartRatio,
    writeRatio: variant?.writeRatio,
    writeDistribution: variant?.writeDistribution,
    // EN2: concurrency scales with replicas just like throughput (more replicas = more in-flight slots).
    concurrencyLimit: variant?.concurrencyLimit === undefined ? undefined : variant.concurrencyLimit * capacityFactor,
    autoscale: variant?.autoscale,
    replicationLagMs: variant?.replicationLagMs,
  }
}

export type ComplexityLevel = "low" | "medium" | "high"

/**
 * Effective operational-complexity level for a node's active variant — the variant's override
 * if it sets one, else the component's base metric. Drives the on-node complexity badge so an
 * architect sees "how hard is this to run/operate" at a glance. Null when the component or the
 * metric is unknown.
 */
export function getNodeComplexity(
  archieComponentId: string,
  activeConfigVariantId: string,
): ComplexityLevel | null {
  const component = componentLibrary.getComponent(archieComponentId)
  if (!component) return null
  const variant = component.configVariants?.find((v) => v.id === activeConfigVariantId)
  const fromVariant = variant?.metrics?.find((m) => m.category === "operational-complexity")
  const fromBase = component.baseMetrics?.find((m) => m.category === "operational-complexity")
  return (fromVariant ?? fromBase)?.value ?? null
}

/**
 * Total requests/second originated by Traffic Source blocks on the canvas (category "traffic").
 * Each source's chosen tier sets its rate (the variant's maxRPS). 0 when there are no sources, in
 * which case the simulation falls back to its default/scenario curve.
 */
export function totalTrafficSourceRps(
  nodes: ReadonlyArray<{ data?: { archieComponentId: string; activeConfigVariantId: string; componentCategory: string; replicaCount?: number; trafficRps?: number } }>,
): number {
  let total = 0
  for (const node of nodes) {
    const d = node.data
    if (!d || d.componentCategory !== "traffic") continue
    const { maxRPS } = getNodeCost(d.archieComponentId, d.activeConfigVariantId, d.replicaCount ?? 1, d.trafficRps)
    if (maxRPS !== undefined) total += maxRPS
  }
  return total
}

/**
 * Rescales a traffic curve so its peak equals `peak`, preserving the curve's SHAPE (ramp/spike).
 * Used so Traffic Source blocks set the volume while the demand Scenario keeps shaping it over time.
 */
export function scaleTrafficCurveToPeak(curve: TrafficCurve, peak: number): TrafficCurve {
  const max = Math.max(1, ...curve.map((p) => p.rps))
  return curve.map((p) => ({ t: p.t, rps: Math.round((p.rps / max) * peak) }))
}

/**
 * Normalize a node's traffic config to the player-facing `trafficKind` (ISAPivot migration).
 * Idempotent boundary normalizer applied on every architecture load (autosave, saved-canvas slots,
 * YAML import, blueprints) so legacy `data.trafficPattern` (steady/wobble/periodic/surge) becomes
 * `data.trafficKind` (steady/realistic/periodic/search). Non-traffic nodes pass through untouched.
 */
export function normalizeNodeTrafficKind<T extends { data: Record<string, unknown> }>(node: T): T {
  const d = node.data
  if (d.componentCategory !== "traffic") {
    // Traffic config is meaningless on non-traffic nodes — strip any stray legacy/new field so
    // hand-crafted or corrupt input can't round-trip invalid traffic config onto e.g. a database node.
    if (d.trafficKind === undefined && d.trafficPattern === undefined && d.trafficRps === undefined && d.trafficWorkload === undefined && d.trafficOrigin === undefined) return node
    const { trafficKind: _k, trafficPattern: _p, trafficRps: _r, trafficWorkload: _w, trafficOrigin: _o, ...rest } = d
    return { ...node, data: rest } as T
  }
  const trafficKind = normalizeTrafficKind((d.trafficKind ?? d.trafficPattern) as string | undefined)
  // Backfill the real peak rps from the legacy replicaCount-as-index for un-migrated traffic nodes.
  const rc = Number.isFinite(d.replicaCount) ? Math.max(1, Math.floor(d.replicaCount as number)) : 1
  const trafficRps = Number.isFinite(d.trafficRps) && (d.trafficRps as number) > 0
    ? (d.trafficRps as number)
    : TRAFFIC_RPS_STEPS[Math.min(rc, TRAFFIC_RPS_STEPS.length) - 1]
  // ISAPivot: default the read/write mix + origin so every traffic node carries a full, valid config.
  const trafficWorkload =
    d.trafficWorkload === "read" || d.trafficWorkload === "write" || d.trafficWorkload === "mixed" ? d.trafficWorkload : "mixed"
  const trafficOrigin = d.trafficOrigin === "multi-region" ? "multi-region" : "one-region"
  const { trafficPattern: _legacy, ...rest } = d
  return { ...node, data: { ...rest, trafficKind, trafficRps, trafficWorkload, trafficOrigin } } as T
}

/** True if any traffic source carries a non-steady kind (so the sim should shape its own curve). */
export function hasTrafficKind(
  nodes: ReadonlyArray<{ data?: { componentCategory?: string; trafficKind?: string; trafficPattern?: string } }>,
): boolean {
  return nodes.some(
    (n) =>
      n.data?.componentCategory === "traffic" &&
      normalizeTrafficKind(n.data.trafficKind ?? n.data.trafficPattern) !== "steady",
  )
}

/**
 * Combine N traffic specs (each a PEAK rps + kind, D63) into one curve, summed tick-aligned. Each
 * source is peak-anchored (its curve peaks AT its rps; the kind shapes the duty cycle below). The
 * combined peak is therefore bounded by Σ(source peaks). Returns [] when no rate-bearing specs.
 * Shared by canvas-node curves (buildTrafficCurveFromSources) and authored challenge sources.
 */
export function buildTrafficCurveFromSpecs(
  specs: ReadonlyArray<{ rps: number; kind: TrafficKind }>,
  durationS: number,
  points = 48,
): TrafficCurve {
  let combined: TrafficCurve | null = null
  let seed = 1
  for (const spec of specs) {
    if (!(spec.rps > 0)) continue
    const curve = buildPeakAnchoredCurve(spec.rps, spec.kind, durationS, points, seed++)
    combined = combined === null
      ? curve.map((p) => ({ ...p }))
      : combined.map((p, i) => ({ t: p.t, rps: p.rps + (curve[i]?.rps ?? 0) }))
  }
  return combined ?? []
}

/**
 * Builds the simulation traffic curve from each canvas Traffic Source's PEAK rps + kind, summed
 * tick-aligned across all sources. Each source peak-anchors (its curve peaks at getNodeCost.maxRPS =
 * trafficRps). Returns [] when there are no rate-bearing sources (caller falls back to the ramp).
 * Reads legacy `trafficPattern` defensively for un-normalized callers.
 */
export function buildTrafficCurveFromSources(
  nodes: ReadonlyArray<{ data?: { archieComponentId: string; activeConfigVariantId: string; componentCategory: string; replicaCount?: number; trafficRps?: number; trafficKind?: string; trafficPattern?: string } }>,
  durationS: number,
  points = 48,
): TrafficCurve {
  const specs: { rps: number; kind: TrafficKind }[] = []
  for (const node of nodes) {
    const d = node.data
    if (!d || d.componentCategory !== "traffic") continue
    const peak = getNodeCost(d.archieComponentId, d.activeConfigVariantId, d.replicaCount ?? 1, d.trafficRps).maxRPS
    if (peak === undefined || peak <= 0) continue
    specs.push({ rps: peak, kind: normalizeTrafficKind(d.trafficKind ?? d.trafficPattern) })
  }
  return buildTrafficCurveFromSpecs(specs, durationS, points)
}

export function computeTotalArchitectureCost(
  nodes: ReadonlyArray<{ data: { archieComponentId: string; activeConfigVariantId: string; replicaCount?: number; trafficRps?: number } }>,
): number {
  let total = 0
  for (const node of nodes) {
    const { monthlyCost } = getNodeCost(
      node.data.archieComponentId,
      node.data.activeConfigVariantId,
      node.data.replicaCount ?? 1,
      node.data.trafficRps,
    )
    if (monthlyCost !== undefined) {
      total += monthlyCost
    }
  }
  return total
}

/**
 * Monthly cost with ED9 (D74) autoscaling folded in: an autoscale node bills the MEAN of its active
 * replicas over the load curve (active = ceil(incoming / per-replica capacity), capped at provisioned),
 * not flat × replicas — so a bursty workload pays near baseline instead of 24/7 peak. When NO node
 * autoscales (the 57 built-ins) this returns EXACTLY `computeTotalArchitectureCost` (byte-identical).
 * Idle leading ticks (totalServed 0) are skipped so the curve's ramp doesn't fake an elasticity discount.
 */
export function computeIntegratedArchitectureCost(
  nodes: ReadonlyArray<{ id: string; data: { archieComponentId: string; activeConfigVariantId: string; replicaCount?: number; trafficRps?: number } }>,
  ticks: readonly TickState[],
): number {
  const cost = (n: { data: { archieComponentId: string; activeConfigVariantId: string; replicaCount?: number; trafficRps?: number } }) =>
    getNodeCost(n.data.archieComponentId, n.data.activeConfigVariantId, n.data.replicaCount ?? 1, n.data.trafficRps)
  if (!nodes.some((n) => cost(n).autoscale)) return computeTotalArchitectureCost(nodes)
  let total = 0
  for (const node of nodes) {
    const c = cost(node)
    if (c.monthlyCost === undefined) continue
    const R = Math.max(1, node.data.replicaCount ?? 1)
    if (!c.autoscale || c.baseMaxRPS === undefined || c.baseMaxRPS <= 0) {
      total += c.monthlyCost // static tier (or no per-replica capacity to scale on) → flat
      continue
    }
    const perReplicaCost = c.monthlyCost / R
    let sum = 0
    let counted = 0
    for (const tk of ticks) {
      if (tk.totalServedRps <= 0) continue // skip idle ramp ticks
      const inc = tk.nodes.find((t) => t.nodeId === node.id)?.incomingRps ?? 0
      sum += Math.min(R, Math.max(1, Math.ceil(inc / c.baseMaxRPS)))
      counted += 1
    }
    total += (counted > 0 ? sum / counted : R) * perReplicaCost
  }
  return total
}

/**
 * ED5 (D74): how much a traffic source's ACCESS PATTERN erodes cache locality. Steady traffic hits the
 * same hot set (cache fully effective); search/long-tail spreads across a huge key space (poor locality).
 * Directional, not measured. Unknown/undefined kind ⇒ 1 (no erosion — preserves pre-ED5 behavior).
 */
export function cacheErosionForKind(kind: string | undefined): number {
  switch (kind) {
    case "search": return 0.6
    case "periodic": return 0.9
    case "realistic": return 0.95
    default: return 1 // steady, or unknown
  }
}

/**
 * ED6 (D74): the cross-region sim opts derived from a challenge — the SINGLE source of truth shared by
 * the live app (ChallengeStartButton) and the harness (referenceSolution), so the scored sim and its
 * oracle never drift. multiRegion is true when any source is multi-region; the RTT is authored-only.
 */
export function crossRegionSimOpts(
  c: { crossRegionRttMs?: number; trafficSources?: ReadonlyArray<{ origin: string }> },
): { crossRegionRttMs?: number; multiRegion?: boolean } {
  return {
    crossRegionRttMs: c.crossRegionRttMs,
    multiRegion: !!c.trafficSources?.some((s) => s.origin === "multi-region"),
  }
}

/**
 * ED5/D20 (D74): the rps-weighted workload blend of a challenge's traffic sources — the SAME quantities
 * buildSimGraph derives from the canvas, computed straight from the authored sources. Used to make the
 * challenge's demand authoritative in the LIVE sim (a locked challenge overrides the player's traffic
 * node so the cache/DB derating matches the harness). Empty/zero sources ⇒ {} (no override).
 */
export function workloadBlend(
  sources: ReadonlyArray<{ rps: number; workload?: string; kind?: string; cacheableFraction?: number }>,
): { writePressure?: number; cacheableFraction?: number; cacheErosion?: number } {
  let weightedWrite = 0
  let weightedCacheable = 0
  let weightedErosion = 0
  let total = 0
  for (const s of sources) {
    if (s.rps <= 0) continue
    weightedWrite += s.rps * (s.workload === "write" ? 1 : s.workload === "read" ? 0 : 0.5)
    weightedCacheable += s.rps * (s.cacheableFraction ?? 1)
    weightedErosion += s.rps * cacheErosionForKind(s.kind)
    total += s.rps
  }
  if (total <= 0) return {}
  return { writePressure: weightedWrite / total, cacheableFraction: weightedCacheable / total, cacheErosion: weightedErosion / total }
}

/**
 * Builds the immutable SimGraph the simulation engine runs over (Epic 15).
 * Each node's effective capacity (maxRPS scaled by replicas) + base latency come from getNodeCost.
 * effectiveMaxRps 0 means "unknown/uncapped" (variant has no maxRPS authored).
 */
export function buildSimGraph(
  nodes: ReadonlyArray<{ id: string; data: { archieComponentId: string; activeConfigVariantId: string; componentCategory: ComponentCategoryId; replicaCount?: number; trafficRps?: number; trafficWorkload?: string; trafficKind?: string; cacheableFraction?: number } }>,
  edges: ReadonlyArray<{ source: string; target: string }>,
  // ED6 (D74): cross-region RTT opts, threaded from the active challenge by the challenge-scoring call
  // sites (app + harness). Omitted by every other caller ⇒ undefined ⇒ no RTT term (byte-identical).
  opts?: { crossRegionRttMs?: number; multiRegion?: boolean },
): SimGraph {
  // ISAPivot Phase 2b + ED5 (D74): derive the global WORKLOAD behaviors from the traffic sources,
  // rps-weighted. write-pressure (write=1, mixed=0.5, read=0) blends into the DB write/read split;
  // cacheable-fraction (default 1) + access-pattern erosion (steady 1 → search 0.6) derate a cache's
  // headline hit ratio to its REAL one (a write-heavy / long-tail / low-cacheable workload caches poorly).
  let weightedWrite = 0
  let weightedCacheable = 0
  let weightedErosion = 0
  let totalSourceRps = 0
  for (const n of nodes) {
    if (n.data.componentCategory !== "traffic") continue
    const rps = getNodeCost(n.data.archieComponentId, n.data.activeConfigVariantId, n.data.replicaCount ?? 1, n.data.trafficRps).maxRPS ?? 0
    if (rps <= 0) continue
    const w = n.data.trafficWorkload === "write" ? 1 : n.data.trafficWorkload === "read" ? 0 : 0.5
    weightedWrite += rps * w
    weightedCacheable += rps * (n.data.cacheableFraction ?? 1)
    weightedErosion += rps * cacheErosionForKind(n.data.trafficKind)
    totalSourceRps += rps
  }
  const writePressure = totalSourceRps > 0 ? weightedWrite / totalSourceRps : undefined
  const cacheableFraction = totalSourceRps > 0 ? weightedCacheable / totalSourceRps : undefined
  const cacheErosion = totalSourceRps > 0 ? weightedErosion / totalSourceRps : undefined

  const simNodes: SimNode[] = nodes.map((n) => {
    const cost = getNodeCost(n.data.archieComponentId, n.data.activeConfigVariantId, n.data.replicaCount ?? 1, n.data.trafficRps)
    return {
      id: n.id,
      category: n.data.componentCategory,
      effectiveMaxRps: cost.maxRPS ?? 0,
      baseMaxRps: cost.baseMaxRPS,
      baseLatencyMs: cost.baseLatencyMs ?? 0,
      failureMode: "shed",
      ...(cost.cacheHitRatio !== undefined ? { cacheHitRatio: cost.cacheHitRatio } : {}),
      ...(cost.missLatencyPenaltyMs !== undefined ? { missLatencyPenaltyMs: cost.missLatencyPenaltyMs } : {}),
      ...(cost.coldStartLatencyMs !== undefined ? { coldStartLatencyMs: cost.coldStartLatencyMs } : {}),
      ...(cost.coldStartRatio !== undefined ? { coldStartRatio: cost.coldStartRatio } : {}),
      ...(cost.writeRatio !== undefined ? { writeRatio: cost.writeRatio } : {}),
      ...(cost.writeDistribution !== undefined ? { writeDistribution: cost.writeDistribution } : {}),
      ...(cost.concurrencyLimit !== undefined ? { concurrencyLimit: cost.concurrencyLimit } : {}),
      ...(cost.replicationLagMs !== undefined ? { replicationLagMs: cost.replicationLagMs } : {}),
      // ED2: a multi-replica tier spreads across AZs, so it survives an az_outage at (azCount−1)/azCount.
      ...(() => {
        const az = azCountForReplicas(n.data.replicaCount ?? 1)
        return az > 1 ? { azCount: az } : {}
      })(),
    }
  })
  const simEdges: SimEdge[] = edges.map((e) => ({ source: e.source, target: e.target }))
  return {
    nodes: simNodes,
    edges: simEdges,
    ...(writePressure !== undefined ? { writePressure } : {}),
    ...(cacheableFraction !== undefined ? { cacheableFraction } : {}),
    ...(cacheErosion !== undefined ? { cacheErosion } : {}),
    ...(opts?.crossRegionRttMs !== undefined ? { crossRegionRttMs: opts.crossRegionRttMs } : {}),
    ...(opts?.multiRegion ? { multiRegion: true } : {}),
  }
}

