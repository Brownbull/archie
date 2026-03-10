import { describe, it, expect } from "vitest"
import { evaluateConstraints, evaluateNodeConstraints } from "@/engine/constraintEvaluator"
import type { ConstraintViolation } from "@/engine/constraintEvaluator"
import { computeCategoryScores, computeWeightedCategoryScores, type CategoryScore } from "@/engine/dashboardCalculator"
import { getWeight } from "@/lib/weightUtils"
import { METRIC_CATEGORIES, DEFAULT_WEIGHT_PROFILE, type Constraint, type MetricCategoryId, type WeightProfile } from "@/lib/constants"
import type { RecalculatedMetrics } from "@/engine/recalculator"

// --- Helpers ---

function makeMetrics(nodeScores: Record<string, Array<{ category: string; value: number }>>): Map<string, RecalculatedMetrics> {
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
      return { categoryId: cat.id, categoryName: cat.name, score: rawScore * getWeight(cat.id, weightProfile), metricCount: entry.count, hasData: true }
    })
    result.set(nodeId, scores)
  }
  return result
}

function makeConstraint(overrides: Partial<Constraint>): Constraint {
  return {
    id: `c-${Math.random()}`,
    categoryId: "performance" as MetricCategoryId,
    operator: "lte",
    threshold: 5,
    label: "Test",
    ...overrides,
  }
}

/** Simulates the full pipeline: metrics → category scores → weighted → constraints → violations */
function runPipeline(
  metrics: Map<string, RecalculatedMetrics>,
  constraints: Constraint[],
  weights: WeightProfile = { ...DEFAULT_WEIGHT_PROFILE },
): ConstraintViolation[] {
  const categoryScores = computeCategoryScores(metrics)
  const weightedScores = computeWeightedCategoryScores(categoryScores, weights)
  const perNodeScores = buildPerNodeCategoryScores(metrics, weights)
  return evaluateConstraints(constraints, weightedScores, perNodeScores)
}

// --- Integration Tests ---

describe("constraint evaluation pipeline (integration)", () => {
  it("full pipeline: metrics → scores → weights → constraints → violations", () => {
    const metrics = makeMetrics({
      "api-gateway": [
        { category: "performance", value: 8 },
        { category: "reliability", value: 6 },
        { category: "cost-efficiency", value: 3 },
      ],
      "database": [
        { category: "performance", value: 5 },
        { category: "reliability", value: 9 },
        { category: "cost-efficiency", value: 7 },
      ],
    })

    const constraints = [
      makeConstraint({ id: "c-cost", categoryId: "cost-efficiency", operator: "lte", threshold: 5 }),
      makeConstraint({ id: "c-rel", categoryId: "reliability", operator: "gte", threshold: 7 }),
    ]

    const violations = runPipeline(metrics, constraints)

    // cost-efficiency: api-gateway=3 (passes lte 5), database=7 (violated lte 5)
    const costViolations = violations.filter((v) => v.categoryId === "cost-efficiency")
    expect(costViolations).toHaveLength(1)
    expect(costViolations[0].nodeId).toBe("database")
    expect(costViolations[0].actualScore).toBe(7)

    // reliability: api-gateway=6 (violated gte 7), database=9 (passes gte 7)
    const relViolations = violations.filter((v) => v.categoryId === "reliability")
    expect(relViolations).toHaveLength(1)
    expect(relViolations[0].nodeId).toBe("api-gateway")
    expect(relViolations[0].actualScore).toBe(6)
  })

  it("weight change resolves constraint violation", () => {
    const metrics = makeMetrics({
      "node-1": [{ category: "performance", value: 7 }],
    })
    const constraint = makeConstraint({
      id: "c-perf",
      categoryId: "performance",
      operator: "lte",
      threshold: 5,
    })

    // At weight 1.0: score 7 > threshold 5 → violated
    const violationsDefault = runPipeline(metrics, [constraint])
    expect(violationsDefault).toHaveLength(1)

    // At weight 0.5: weighted score = 7 * 0.5 = 3.5 ≤ 5 → passes
    const halfWeights = { ...DEFAULT_WEIGHT_PROFILE, performance: 0.5 }
    const violationsHalf = runPipeline(metrics, [constraint], halfWeights)
    expect(violationsHalf).toHaveLength(0)
  })

  it("weight change creates constraint violation", () => {
    const metrics = makeMetrics({
      "node-1": [{ category: "reliability", value: 6 }],
    })
    const constraint = makeConstraint({
      id: "c-rel",
      categoryId: "reliability",
      operator: "gte",
      threshold: 5,
    })

    // At weight 1.0: score 6 ≥ 5 → passes
    const violationsDefault = runPipeline(metrics, [constraint])
    expect(violationsDefault).toHaveLength(0)

    // At weight 0.5: weighted score = 6 * 0.5 = 3.0 < 5 → violated
    const halfWeights = { ...DEFAULT_WEIGHT_PROFILE, reliability: 0.5 }
    const violationsHalf = runPipeline(metrics, [constraint], halfWeights)
    expect(violationsHalf).toHaveLength(1)
  })

  it("multiple constraints, partial violations across nodes", () => {
    const metrics = makeMetrics({
      "frontend": [
        { category: "performance", value: 9 },
        { category: "security", value: 4 },
      ],
      "backend": [
        { category: "performance", value: 4 },
        { category: "security", value: 8 },
      ],
      "database": [
        { category: "performance", value: 6 },
        { category: "security", value: 6 },
      ],
    })

    const constraints = [
      makeConstraint({ id: "c-perf-max", categoryId: "performance", operator: "lte", threshold: 7 }),
      makeConstraint({ id: "c-sec-min", categoryId: "security", operator: "gte", threshold: 5 }),
    ]

    const violations = runPipeline(metrics, constraints)

    // performance lte 7: frontend=9 (violated), backend=4 (passes), database=6 (passes)
    expect(violations.filter((v) => v.constraintId === "c-perf-max")).toHaveLength(1)
    expect(violations.find((v) => v.constraintId === "c-perf-max")?.nodeId).toBe("frontend")

    // security gte 5: frontend=4 (violated), backend=8 (passes), database=6 (passes)
    expect(violations.filter((v) => v.constraintId === "c-sec-min")).toHaveLength(1)
    expect(violations.find((v) => v.constraintId === "c-sec-min")?.nodeId).toBe("frontend")
  })

  it("empty metrics map with constraints produces no violations", () => {
    const metrics = new Map<string, RecalculatedMetrics>()
    const constraint = makeConstraint({ categoryId: "performance", operator: "lte", threshold: 3 })

    const violations = runPipeline(metrics, [constraint])

    expect(violations).toEqual([])
  })

  it("constraints for categories with no node data are skipped", () => {
    const metrics = makeMetrics({
      "node-1": [{ category: "performance", value: 8 }],
      // No security metrics on any node
    })

    const constraint = makeConstraint({
      categoryId: "security",
      operator: "gte",
      threshold: 5,
    })

    const violations = runPipeline(metrics, [constraint])

    expect(violations).toEqual([])
  })

  it("evaluateNodeConstraints matches pipeline per-node results", () => {
    const metrics = makeMetrics({
      "node-1": [
        { category: "performance", value: 8 },
        { category: "reliability", value: 3 },
      ],
    })

    const constraints = [
      makeConstraint({ id: "c-perf", categoryId: "performance", operator: "lte", threshold: 6 }),
      makeConstraint({ id: "c-rel", categoryId: "reliability", operator: "gte", threshold: 5 }),
    ]

    // Pipeline result
    const pipelineViolations = runPipeline(metrics, constraints)

    // Node-level result
    const perNodeScores = buildPerNodeCategoryScores(metrics, { ...DEFAULT_WEIGHT_PROFILE })
    const nodeViolations = evaluateNodeConstraints("node-1", perNodeScores.get("node-1")!, constraints)

    // Both should find the same violations for node-1
    expect(pipelineViolations).toHaveLength(2)
    expect(nodeViolations).toHaveLength(2)
    expect(pipelineViolations.map((v) => v.categoryId).sort()).toEqual(
      nodeViolations.map((v) => v.categoryId).sort(),
    )
  })
})
