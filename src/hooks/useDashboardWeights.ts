import { useMemo } from "react"
import { useArchitectureStore } from "@/stores/architectureStore"
import {
  computeCategoryScores,
  computeAggregateScore,
  computeWeightedAggregateScore,
} from "@/engine/dashboardCalculator"
import { METRIC_CATEGORIES } from "@/lib/constants"

/**
 * Shared hook for dashboard weight-derived state.
 * Replaces duplicated computations in DashboardPanel and DashboardOverlay (TD-5-3a AC-1, AC-2).
 */
export function useDashboardWeights() {
  const computedMetrics = useArchitectureStore((s) => s.computedMetrics)
  const weightProfile = useArchitectureStore((s) => s.weightProfile)

  const categoryScores = useMemo(
    () => computeCategoryScores(computedMetrics),
    [computedMetrics],
  )

  const aggregateScore = useMemo(
    () => computeAggregateScore(categoryScores),
    [categoryScores],
  )

  const weightedAggregateScore = useMemo(
    () => computeWeightedAggregateScore(categoryScores, weightProfile),
    [categoryScores, weightProfile],
  )

  const isNonDefaultWeights = useMemo(
    () => METRIC_CATEGORIES.some((c) => weightProfile[c.id] !== 1.0),
    [weightProfile],
  )

  return {
    categoryScores,
    aggregateScore,
    weightedAggregateScore,
    isNonDefaultWeights,
    weightProfile,
  }
}
