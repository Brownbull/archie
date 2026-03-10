import {
  HEATMAP_THRESHOLD_WARNING,
  HEATMAP_THRESHOLD_BOTTLENECK,
} from "@/lib/constants"
import type { WeightProfile } from "@/lib/constants"
import { getWeight } from "@/lib/weightUtils"

// --- Types ---

export type HeatmapStatus = "healthy" | "warning" | "bottleneck"

// Severity ordering for worst-case comparison
const SEVERITY: Record<HeatmapStatus, number> = {
  healthy: 2,
  warning: 1,
  bottleneck: 0,
}

// --- Pure Functions ---

/**
 * Maps a node's overallScore (1-10 average) to a HeatmapStatus.
 * healthy >= 6, warning >= 4, bottleneck < 4.
 */
export function computeHeatmapStatus(overallScore: number): HeatmapStatus {
  if (overallScore >= HEATMAP_THRESHOLD_WARNING) return "healthy"
  if (overallScore >= HEATMAP_THRESHOLD_BOTTLENECK) return "warning"
  return "bottleneck"
}

/**
 * Computes heatmap status for all nodes from their computed metrics.
 * Input: Map<nodeId, { overallScore: number }>
 * Output: Map<nodeId, HeatmapStatus>
 */
export function computeArchitectureHeatmap(
  metrics: ReadonlyMap<string, { overallScore: number }>,
): Map<string, HeatmapStatus> {
  const result = new Map<string, HeatmapStatus>()
  for (const [nodeId, data] of metrics) {
    result.set(nodeId, computeHeatmapStatus(data.overallScore))
  }
  return result
}

// --- Weighted Node Score ---

export interface NodeCategoryAverage {
  categoryId: string
  averageScore: number
}

/**
 * Computes a node's weighted overall score from per-category averages.
 * Formula: sum(categoryAvg * weight) / sum(weight) for non-zero-weight categories.
 *
 * Categories with weight 0 are excluded from the average.
 * Falls back to unweighted average if all weights are 0.
 * Returns 0 for empty input. Rounded to 1 decimal place.
 *
 * Pure function -- weights passed as parameters, no store imports.
 */
export function computeWeightedNodeScore(
  categoryAverages: NodeCategoryAverage[],
  weights: WeightProfile,
): number {
  if (categoryAverages.length === 0) return 0

  // Filter to categories with non-zero weight
  const weighted = categoryAverages.filter((ca) => getWeight(ca.categoryId, weights) > 0)

  // Fallback: all weights are 0 — use equal weights
  if (weighted.length === 0) {
    const sum = categoryAverages.reduce((acc, ca) => acc + ca.averageScore, 0)
    return Math.round((sum / categoryAverages.length) * 10) / 10
  }

  const totalWeight = weighted.reduce((acc, ca) => acc + getWeight(ca.categoryId, weights), 0)
  const weightedSum = weighted.reduce((acc, ca) => acc + ca.averageScore * getWeight(ca.categoryId, weights), 0)

  return Math.round((weightedSum / totalWeight) * 10) / 10
}

/**
 * Computes edge heatmap status as worst-case of two endpoints.
 * bottleneck > warning > healthy (lower severity number = worse).
 * Undefined endpoints default to "healthy".
 */
export function computeEdgeHeatmapStatus(
  sourceStatus: HeatmapStatus | undefined,
  targetStatus: HeatmapStatus | undefined,
): HeatmapStatus {
  const source = sourceStatus ?? "healthy"
  const target = targetStatus ?? "healthy"
  return SEVERITY[source] <= SEVERITY[target] ? source : target
}
