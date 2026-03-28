import { METRIC_CATEGORIES, SCORE_COLOR_GOOD_THRESHOLD, HEATMAP_THRESHOLD_BOTTLENECK } from "@/lib/constants"
import type { MetricCategoryId, WeightProfile } from "@/lib/constants"
import type { RecalculatedMetrics } from "@/engine/recalculator"
import { getWeight } from "@/lib/weightUtils"

// --- Types ---

export interface ComponentCategoryMetric {
  nodeId: string
  averageScore: number
}

export interface CategoryBreakdown {
  categoryId: string
  best: ComponentCategoryMetric[]
  worst: ComponentCategoryMetric[]
  totalComponents: number
}

export interface CategoryScore {
  categoryId: MetricCategoryId
  categoryName: string
  score: number
  metricCount: number
  hasData: boolean
}

// --- Pure Functions ---

/**
 * Computes per-category average scores across all nodes in the architecture.
 *
 * For each of the 7 METRIC_CATEGORIES, collects all MetricValue entries with
 * matching `category` across ALL nodes, computes the flat average of numericValue,
 * and returns a CategoryScore with hasData=true if any metrics found.
 *
 * Pure function -- no side effects, no imports from react/zustand/firebase/services/stores.
 */
export function computeCategoryScores(
  computedMetrics: Map<string, RecalculatedMetrics>,
): CategoryScore[] {
  return METRIC_CATEGORIES.map((cat) => {
    let sum = 0
    let count = 0

    for (const [, nodeMetrics] of computedMetrics) {
      for (const metric of nodeMetrics.metrics) {
        if (metric.category === cat.id) {
          sum += metric.numericValue
          count++
        }
      }
    }

    if (count === 0) {
      return {
        categoryId: cat.id,
        categoryName: cat.name,
        score: 0,
        metricCount: 0,
        hasData: false,
      }
    }

    return {
      categoryId: cat.id,
      categoryName: cat.name,
      score: sum / count,
      metricCount: count,
      hasData: true,
    }
  })
}

/**
 * Computes the aggregate architecture score as the arithmetic mean of
 * categories that have data.
 *
 * Returns 0 if no categories have data. Rounded to 1 decimal place.
 */
export function computeAggregateScore(categoryScores: CategoryScore[]): number {
  const withData = categoryScores.filter((s) => s.hasData)
  if (withData.length === 0) return 0

  const sum = withData.reduce((acc, s) => acc + s.score, 0)
  // Safe: withData.length > 0 guaranteed by early return above
  const mean = sum / withData.length

  return Math.round(mean * 10) / 10
}

/**
 * Computes the top-3 best and worst components for a given metric category.
 *
 * For each node in computedMetrics, collects metrics matching `categoryId`,
 * computes per-node average, and returns the top-3 highest and lowest scorers.
 *
 * Pure function -- no side effects, no imports from react/zustand/firebase/services/stores.
 */
export function computeCategoryBreakdown(
  computedMetrics: Map<string, RecalculatedMetrics>,
  categoryId: string,
): CategoryBreakdown {
  const nodeScores: ComponentCategoryMetric[] = []

  for (const [nodeId, nodeMetrics] of computedMetrics) {
    const categoryMetrics = nodeMetrics.metrics.filter((m) => m.category === categoryId)
    if (categoryMetrics.length === 0) continue

    const avg =
      categoryMetrics.reduce((sum, m) => sum + m.numericValue, 0) / categoryMetrics.length

    nodeScores.push({ nodeId, averageScore: avg })
  }

  if (nodeScores.length === 0) {
    return { categoryId, best: [], worst: [], totalComponents: 0 }
  }

  const sorted = [...nodeScores].sort((a, b) => b.averageScore - a.averageScore)

  return {
    categoryId,
    best: sorted.slice(0, 3),
    worst: sorted.slice(-3).reverse(),
    totalComponents: nodeScores.length,
  }
}

/**
 * Applies weight profile to category scores.
 * weightedScore = score * weight for each category.
 * Weight defaults to 1.0 for categories not present in the profile.
 *
 * Pure function -- weights passed as parameters, no store imports.
 */
export function computeWeightedCategoryScores(
  categoryScores: CategoryScore[],
  weights: WeightProfile,
): CategoryScore[] {
  return categoryScores.map((cs) => ({
    ...cs,
    score: cs.score * getWeight(cs.categoryId, weights),
  }))
}

/**
 * Computes weighted aggregate score: sum(score * weight) / sum(weight)
 * for categories that have data.
 *
 * Falls back to equal weights (1.0 each) if sum of weights is 0.
 * Returns 0 if no categories have data. Rounded to 1 decimal place.
 *
 * Pure function -- weights passed as parameters, no store imports.
 */
export function computeWeightedAggregateScore(
  categoryScores: CategoryScore[],
  weights: WeightProfile,
): number {
  const withData = categoryScores.filter((s) => s.hasData)
  if (withData.length === 0) return 0

  const totalWeight = withData.reduce((acc, s) => acc + getWeight(s.categoryId, weights), 0)

  // Fallback: if all weights are 0, use equal weights (1.0 each)
  if (totalWeight === 0) {
    const sum = withData.reduce((acc, s) => acc + s.score, 0)
    return Math.round((sum / withData.length) * 10) / 10
  }

  const weightedSum = withData.reduce((acc, s) => acc + s.score * getWeight(s.categoryId, weights), 0)

  return Math.round((weightedSum / totalWeight) * 10) / 10
}

/**
 * Returns a Tailwind color class matching MetricBar.tsx thresholds:
 * - score >= SCORE_COLOR_GOOD_THRESHOLD -> green
 * - score >= HEATMAP_THRESHOLD_BOTTLENECK -> yellow
 * - score < HEATMAP_THRESHOLD_BOTTLENECK -> red
 */
export function getScoreColor(score: number): string {
  if (score >= SCORE_COLOR_GOOD_THRESHOLD) return "bg-green-500"
  if (score >= HEATMAP_THRESHOLD_BOTTLENECK) return "bg-yellow-500"
  return "bg-red-500"
}
