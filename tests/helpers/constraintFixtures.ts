import type { RecalculatedMetrics } from "@/engine/recalculator"
import type { CategoryScore } from "@/engine/dashboardCalculator"
import { METRIC_CATEGORIES, type Constraint, type MetricCategoryId, type WeightProfile } from "@/lib/constants"
import { getWeight } from "@/lib/weightUtils"

/**
 * Creates a RecalculatedMetrics map from simple node/score definitions.
 * Shared across constraint store and integration tests (TD-6-2a AC-4).
 */
export function makeMetrics(
  nodeScores: Record<string, Array<{ category: string; value: number }>>,
): Map<string, RecalculatedMetrics> {
  const map = new Map<string, RecalculatedMetrics>()
  for (const [nodeId, metrics] of Object.entries(nodeScores)) {
    const metricValues = metrics.map((m, i) => ({
      id: `metric-${i}`,
      name: `Metric ${i}`,
      category: m.category,
      value: (m.value >= 7 ? "high" : m.value >= 4 ? "medium" : "low") as "high" | "medium" | "low",
      numericValue: m.value,
      description: "",
    }))
    const overall = metricValues.reduce((s, m) => s + m.numericValue, 0) / metricValues.length
    map.set(nodeId, { nodeId, metrics: metricValues, overallScore: overall })
  }
  return map
}

/**
 * Builds per-node weighted category scores from computed metrics.
 * Used by integration tests to simulate the full pipeline (TD-6-2a AC-4).
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
      const w = getWeight(cat.id, weightProfile)
      const safeWeight = Number.isNaN(w) || w < 0 ? 0 : w
      return { categoryId: cat.id, categoryName: cat.name, score: rawScore * safeWeight, metricCount: entry.count, hasData: true }
    })
    result.set(nodeId, scores)
  }
  return result
}

let constraintCounter = 0

/** Reset counter between test suites to ensure predictable IDs. */
export function resetConstraintCounter(): void {
  constraintCounter = 0
}

/**
 * Creates a Constraint with sensible defaults and overrides.
 * Shared across store and integration tests (TD-6-2a AC-4).
 */
export function makeConstraint(overrides: Partial<Constraint> = {}): Constraint {
  constraintCounter++
  return {
    id: `c-${constraintCounter}`,
    categoryId: "performance" as MetricCategoryId,
    operator: "lte",
    threshold: 5,
    label: `Test Constraint ${constraintCounter}`,
    ...overrides,
  }
}
