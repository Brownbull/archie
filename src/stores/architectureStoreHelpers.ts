import { componentLibrary } from "@/services/componentLibrary"
import { detectTopologyIssues, detectReplicasWithoutLB, type TopologyIssue } from "@/engine/topologyChecker"
import type { SimGraph, SimNode, SimEdge, TrafficCurve } from "@/lib/simulationTypes"
import { buildPatternCurve, type TrafficPattern } from "@/engine/trafficPatterns"
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
  readonly baseLatencyMs: number | undefined
  readonly cacheHitRatio: number | undefined
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
): NodeCostInfo {
  const component = componentLibrary.getComponent(archieComponentId)
  const variant = component?.configVariants.find((v) => v.id === activeConfigVariantId)
  const replicas = Number.isFinite(replicaCount) ? Math.max(1, Math.floor(replicaCount)) : 1
  const rule = component ? getScalingRule(component.category as ComponentCategoryId) : undefined
  // Traffic source: the stepper's count is the 1-based index into the discrete rps scale (3k → 10M),
  // NOT a tier multiplier — so its emitted rate comes straight from TRAFFIC_RPS_STEPS.
  if (component?.category === "traffic") {
    const idx = Math.min(replicas, TRAFFIC_RPS_STEPS.length) - 1
    return {
      monthlyCost: variant?.monthlyCost === undefined ? undefined : variant.monthlyCost * replicas,
      maxRPS: TRAFFIC_RPS_STEPS[idx],
      baseLatencyMs: variant?.baseLatencyMs,
      cacheHitRatio: variant?.cacheHitRatio,
    }
  }
  const capacityFactor = rule && rule.replicaType !== "none" ? replicas : 1
  return {
    monthlyCost: variant?.monthlyCost === undefined ? undefined : variant.monthlyCost * replicas,
    maxRPS: variant?.maxRPS === undefined ? undefined : variant.maxRPS * capacityFactor,
    baseLatencyMs: variant?.baseLatencyMs,
    cacheHitRatio: variant?.cacheHitRatio,
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
  nodes: ReadonlyArray<{ data?: { archieComponentId: string; activeConfigVariantId: string; componentCategory: string; replicaCount?: number } }>,
): number {
  let total = 0
  for (const node of nodes) {
    const d = node.data
    if (!d || d.componentCategory !== "traffic") continue
    const { maxRPS } = getNodeCost(d.archieComponentId, d.activeConfigVariantId, d.replicaCount ?? 1)
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

/** True if any traffic source carries a non-steady pattern (so the sim should shape its own curve). */
export function hasTrafficPattern(
  nodes: ReadonlyArray<{ data?: { componentCategory?: string; trafficPattern?: string } }>,
): boolean {
  return nodes.some((n) => n.data?.componentCategory === "traffic" && !!n.data.trafficPattern && n.data.trafficPattern !== "steady")
}

/**
 * Builds the simulation traffic curve from each Traffic Source's own rate + pattern, summed
 * tick-aligned across all sources (so multiple sources combine). Each source's average = its
 * tier × stepper (getNodeCost.maxRPS); its pattern (wobble/periodic/surge) shapes the curve around
 * that average. Returns [] when there are no rate-bearing sources (caller falls back to the ramp).
 */
export function buildTrafficCurveFromSources(
  nodes: ReadonlyArray<{ data?: { archieComponentId: string; activeConfigVariantId: string; componentCategory: string; replicaCount?: number; trafficPattern?: string } }>,
  durationS: number,
  points = 48,
): TrafficCurve {
  let combined: TrafficCurve | null = null
  let seed = 1
  for (const node of nodes) {
    const d = node.data
    if (!d || d.componentCategory !== "traffic") continue
    const base = getNodeCost(d.archieComponentId, d.activeConfigVariantId, d.replicaCount ?? 1).maxRPS
    if (base === undefined || base <= 0) continue
    const pattern = (d.trafficPattern as TrafficPattern) ?? "steady"
    const curve = buildPatternCurve(pattern, base, durationS, points, seed++)
    combined = combined === null
      ? curve.map((p) => ({ ...p }))
      : combined.map((p, i) => ({ t: p.t, rps: p.rps + (curve[i]?.rps ?? 0) }))
  }
  return combined ?? []
}

export function computeTotalArchitectureCost(
  nodes: ReadonlyArray<{ data: { archieComponentId: string; activeConfigVariantId: string; replicaCount?: number } }>,
): number {
  let total = 0
  for (const node of nodes) {
    const { monthlyCost } = getNodeCost(
      node.data.archieComponentId,
      node.data.activeConfigVariantId,
      node.data.replicaCount ?? 1,
    )
    if (monthlyCost !== undefined) {
      total += monthlyCost
    }
  }
  return total
}

/**
 * Builds the immutable SimGraph the simulation engine runs over (Epic 15).
 * Each node's effective capacity (maxRPS scaled by replicas) + base latency come from getNodeCost.
 * effectiveMaxRps 0 means "unknown/uncapped" (variant has no maxRPS authored).
 */
export function buildSimGraph(
  nodes: ReadonlyArray<{ id: string; data: { archieComponentId: string; activeConfigVariantId: string; componentCategory: ComponentCategoryId; replicaCount?: number } }>,
  edges: ReadonlyArray<{ source: string; target: string }>,
): SimGraph {
  const simNodes: SimNode[] = nodes.map((n) => {
    const cost = getNodeCost(n.data.archieComponentId, n.data.activeConfigVariantId, n.data.replicaCount ?? 1)
    return {
      id: n.id,
      category: n.data.componentCategory,
      effectiveMaxRps: cost.maxRPS ?? 0,
      baseLatencyMs: cost.baseLatencyMs ?? 0,
      failureMode: "shed",
      ...(cost.cacheHitRatio !== undefined ? { cacheHitRatio: cost.cacheHitRatio } : {}),
    }
  })
  const simEdges: SimEdge[] = edges.map((e) => ({ source: e.source, target: e.target }))
  return { nodes: simNodes, edges: simEdges }
}

