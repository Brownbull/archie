import { computeCategoryScores, computeWeightedCategoryScores, type CategoryScore } from "@/engine/dashboardCalculator"
import { evaluateConstraints, type ConstraintViolation } from "@/engine/constraintEvaluator"
import { getWeight } from "@/lib/weightUtils"
import { computeWeightedNodeScore, computeHeatmapStatus, type NodeCategoryAverage } from "@/engine/heatmapCalculator"
import { evaluateTier } from "@/engine/tierEvaluator"
import type { TierCategoryScore } from "@/engine/tierEvaluator"
import { DEFAULT_TIER_DEFINITIONS } from "@/lib/tierDefinitions"
import type { TierResult } from "@/lib/tierDefinitions"
import type { RecalculatedMetrics } from "@/engine/recalculator"
import type { HeatmapStatus } from "@/engine/heatmapCalculator"
import {
  METRIC_CATEGORIES,
  type Constraint,
  type WeightProfile,
} from "@/lib/constants"

// Re-export types used by store consumers
export type { CategoryScore, ConstraintViolation, RecalculatedMetrics, HeatmapStatus, TierResult }

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
export function recomputeWeightedHeatmap(
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
export function buildPerNodeCategoryScores(
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
export function buildViolationsByNodeId(
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
