import { useMemo } from "react"
import { useArchitectureStore } from "@/stores/architectureStore"
import { getNodeCategoryAverages } from "@/stores/architectureStoreHelpers"
import { METRIC_CATEGORIES, type MetricCategoryId } from "@/lib/constants"
import { getWeight } from "@/lib/weightUtils"

export interface TopMetric {
  categoryId: MetricCategoryId
  shortName: string
  value: number
  color: string
}

const CATEGORY_LOOKUP = new Map<string, { shortName: string; color: string }>(
  METRIC_CATEGORIES.map((c) => [c.id, { shortName: c.shortName, color: c.color }]),
)

/**
 * Returns the top N metric categories for a canvas node, sorted by current weight profile.
 * Values are demand-adjusted when a scenario is active (computedMetrics already includes adjustments).
 * Categories with zero weight are excluded.
 */
export function useTopMetrics(nodeId: string, count = 2): TopMetric[] {
  const computedMetrics = useArchitectureStore((s) => s.computedMetrics)
  const weightProfile = useArchitectureStore((s) => s.weightProfile)

  return useMemo(() => {
    const safeCount = Math.min(Math.max(count, 0), METRIC_CATEGORIES.length)
    const nodeMetrics = computedMetrics.get(nodeId)
    if (!nodeMetrics || nodeMetrics.metrics.length === 0) return []

    const categoryAverages = getNodeCategoryAverages(nodeMetrics)

    return categoryAverages
      .map((avg) => ({
        categoryId: avg.categoryId as MetricCategoryId,
        weight: getWeight(avg.categoryId, weightProfile),
        value: Math.round(avg.averageScore * 10) / 10,
        ...(CATEGORY_LOOKUP.get(avg.categoryId) ?? { shortName: avg.categoryId, color: "var(--color-muted)" }),
      }))
      .filter((m) => m.weight > 0)
      .sort((a, b) => b.weight - a.weight || b.value - a.value)
      .slice(0, safeCount)
      .map(({ categoryId, shortName, value, color }) => ({ categoryId, shortName, value, color }))
  }, [computedMetrics, weightProfile, nodeId, count])
}
