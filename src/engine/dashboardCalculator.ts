import { METRIC_CATEGORIES } from "@/lib/constants"
import type { RecalculatedMetrics } from "@/engine/recalculator"

// --- Types ---

export interface CategoryScore {
  categoryId: string
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
 * Returns a Tailwind color class matching MetricBar.tsx thresholds:
 * - score >= 7 -> green
 * - score >= 4 -> yellow
 * - score < 4  -> red
 */
export function getScoreColor(score: number): string {
  if (score >= 7) return "bg-green-500"
  if (score >= 4) return "bg-yellow-500"
  return "bg-red-500"
}
