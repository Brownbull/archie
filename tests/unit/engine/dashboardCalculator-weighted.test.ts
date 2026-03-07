import { describe, it, expect } from "vitest"
import {
  computeCategoryScores,
  computeWeightedCategoryScores,
  computeWeightedAggregateScore,
  type CategoryScore,
} from "@/engine/dashboardCalculator"
import { computeWeightedNodeScore, computeHeatmapStatus, type NodeCategoryAverage } from "@/engine/heatmapCalculator"
import { evaluateTier, type TierCategoryScore } from "@/engine/tierEvaluator"
import { DEFAULT_TIER_DEFINITIONS } from "@/lib/tierDefinitions"
import { DEFAULT_WEIGHT_PROFILE, METRIC_CATEGORIES, type WeightProfile } from "@/lib/constants"
import type { RecalculatedMetrics } from "@/engine/recalculator"

// --- Test Helpers ---

function makeCategoryScore(
  categoryId: string,
  score: number,
  hasData = true,
): CategoryScore {
  return {
    categoryId,
    categoryName: categoryId.charAt(0).toUpperCase() + categoryId.slice(1),
    score,
    metricCount: hasData ? 5 : 0,
    hasData,
  }
}

function makeWeightProfile(overrides: Partial<WeightProfile> = {}): WeightProfile {
  return { ...DEFAULT_WEIGHT_PROFILE, ...overrides }
}

// --- computeWeightedCategoryScores ---

describe("computeWeightedCategoryScores", () => {
  it("returns identical scores when all weights are 1.0 (identity)", () => {
    const scores: CategoryScore[] = [
      makeCategoryScore("performance", 8),
      makeCategoryScore("reliability", 6),
      makeCategoryScore("scalability", 7),
    ]
    const weights = makeWeightProfile()

    const result = computeWeightedCategoryScores(scores, weights)

    expect(result).toHaveLength(3)
    expect(result[0].score).toBe(8)
    expect(result[1].score).toBe(6)
    expect(result[2].score).toBe(7)
  })

  it("halves scores when weight is 0.5", () => {
    const scores: CategoryScore[] = [
      makeCategoryScore("performance", 8),
      makeCategoryScore("reliability", 6),
    ]
    const weights = makeWeightProfile({
      performance: 0.5,
      reliability: 0.5,
    })

    const result = computeWeightedCategoryScores(scores, weights)

    expect(result[0].score).toBe(4)
    expect(result[1].score).toBe(3)
  })

  it("produces score 0 when weight is 0", () => {
    const scores: CategoryScore[] = [
      makeCategoryScore("performance", 8),
    ]
    const weights = makeWeightProfile({ performance: 0 })

    const result = computeWeightedCategoryScores(scores, weights)

    expect(result[0].score).toBe(0)
  })

  it("preserves hasData and metricCount from original scores", () => {
    const scores: CategoryScore[] = [
      makeCategoryScore("performance", 8, true),
      makeCategoryScore("reliability", 0, false),
    ]
    const weights = makeWeightProfile({ performance: 0.5 })

    const result = computeWeightedCategoryScores(scores, weights)

    expect(result[0].hasData).toBe(true)
    expect(result[0].metricCount).toBe(5)
    expect(result[1].hasData).toBe(false)
    expect(result[1].metricCount).toBe(0)
  })

  it("handles empty scores array", () => {
    const result = computeWeightedCategoryScores([], makeWeightProfile())
    expect(result).toEqual([])
  })

  it("uses weight 1.0 for categories not in weight profile", () => {
    const scores: CategoryScore[] = [
      makeCategoryScore("unknown-category" as never, 8),
    ]
    const weights = makeWeightProfile()

    const result = computeWeightedCategoryScores(scores, weights)

    // Unknown category defaults to weight 1.0
    expect(result[0].score).toBe(8)
  })
})

// --- computeWeightedAggregateScore ---

describe("computeWeightedAggregateScore", () => {
  it("returns weighted average: sum(score*weight)/sum(weight)", () => {
    const scores: CategoryScore[] = [
      makeCategoryScore("performance", 10),
      makeCategoryScore("reliability", 6),
    ]
    // perf weight 1.0, rel weight 0.5
    const weights = makeWeightProfile({
      performance: 1.0,
      reliability: 0.5,
    })

    const result = computeWeightedAggregateScore(scores, weights)

    // (10*1.0 + 6*0.5) / (1.0 + 0.5) = 13 / 1.5 = 8.666... -> rounded to 8.7
    expect(result).toBe(8.7)
  })

  it("falls back to equal weights when all weights are 0", () => {
    const scores: CategoryScore[] = [
      makeCategoryScore("performance", 8),
      makeCategoryScore("reliability", 4),
    ]
    const weights = makeWeightProfile({
      performance: 0,
      reliability: 0,
      scalability: 0,
      security: 0,
      "operational-complexity": 0,
      "cost-efficiency": 0,
      "developer-experience": 0,
    })

    const result = computeWeightedAggregateScore(scores, weights)

    // Fallback: (8 + 4) / 2 = 6.0
    expect(result).toBe(6)
  })

  it("excludes categories without data", () => {
    const scores: CategoryScore[] = [
      makeCategoryScore("performance", 8),
      makeCategoryScore("reliability", 0, false),
    ]
    const weights = makeWeightProfile()

    const result = computeWeightedAggregateScore(scores, weights)

    // Only performance has data: 8*1.0 / 1.0 = 8
    expect(result).toBe(8)
  })

  it("returns 0 when no categories have data", () => {
    const scores: CategoryScore[] = [
      makeCategoryScore("performance", 0, false),
    ]
    const weights = makeWeightProfile()

    const result = computeWeightedAggregateScore(scores, weights)

    expect(result).toBe(0)
  })

  it("returns 0 for empty scores array", () => {
    const result = computeWeightedAggregateScore([], makeWeightProfile())
    expect(result).toBe(0)
  })

  it("rounds to 1 decimal place", () => {
    const scores: CategoryScore[] = [
      makeCategoryScore("performance", 7),
      makeCategoryScore("reliability", 3),
      makeCategoryScore("scalability", 5),
    ]
    const weights = makeWeightProfile({
      performance: 1.0,
      reliability: 0.3,
      scalability: 0.7,
    })

    const result = computeWeightedAggregateScore(scores, weights)

    // (7*1.0 + 3*0.3 + 5*0.7) / (1.0 + 0.3 + 0.7) = (7 + 0.9 + 3.5) / 2.0 = 11.4 / 2.0 = 5.7
    expect(result).toBe(5.7)
  })
})

// --- Integration: Weighted Pipeline End-to-End ---

describe("weighted pipeline integration", () => {
  function makeMetricsMap(nodeMetrics: Record<string, { category: string; value: number }[]>): Map<string, RecalculatedMetrics> {
    const map = new Map<string, RecalculatedMetrics>()
    for (const [nodeId, metrics] of Object.entries(nodeMetrics)) {
      const metricValues = metrics.map((m, i) => ({
        id: `metric-${i}`,
        name: `Metric ${i}`,
        category: m.category,
        value: m.value >= 7 ? "high" as const : m.value >= 4 ? "medium" as const : "low" as const,
        numericValue: m.value,
        description: "",
      }))
      const overall = metricValues.reduce((s, m) => s + m.numericValue, 0) / metricValues.length
      map.set(nodeId, { nodeId, metrics: metricValues, overallScore: overall })
    }
    return map
  }

  it("weight change affects dashboard category scores", () => {
    const metricsMap = makeMetricsMap({
      "node-1": [
        { category: "performance", value: 8 },
        { category: "reliability", value: 6 },
      ],
    })

    const unweighted = computeCategoryScores(metricsMap)
    const perfUnweighted = unweighted.find((s) => s.categoryId === "performance")!

    const weights = makeWeightProfile({ performance: 0.5 })
    const weighted = computeWeightedCategoryScores(unweighted, weights)
    const perfWeighted = weighted.find((s) => s.categoryId === "performance")!

    expect(perfUnweighted.score).toBe(8)
    expect(perfWeighted.score).toBe(4)
  })

  it("weight change affects heatmap status", () => {
    // Node with borderline performance (score 5.5 — healthy threshold is 6)
    const categoryAverages: NodeCategoryAverage[] = [
      { categoryId: "performance", averageScore: 5.5 },
      { categoryId: "reliability", averageScore: 8 },
    ]

    // Equal weights: (5.5+8)/2 = 6.75 -> healthy
    const equalWeights = makeWeightProfile()
    const equalScore = computeWeightedNodeScore(categoryAverages, equalWeights)
    expect(computeHeatmapStatus(equalScore)).toBe("healthy")

    // Heavy perf weight: perf drags down
    const perfHeavy = makeWeightProfile({ performance: 1.0, reliability: 0.1 })
    const perfScore = computeWeightedNodeScore(categoryAverages, perfHeavy)
    // (5.5*1.0 + 8*0.1) / (1.0+0.1) = 6.3/1.1 = 5.7 -> warning
    expect(computeHeatmapStatus(perfScore)).toBe("warning")
  })

  it("weight change affects tier evaluation", () => {
    const metricsMap = makeMetricsMap({
      "node-1": [
        { category: "performance", value: 7 },
        { category: "reliability", value: 7 },
        { category: "scalability", value: 7 },
      ],
      "node-2": [
        { category: "performance", value: 6 },
        { category: "security", value: 6 },
      ],
    })

    const nodes = [
      { id: "node-1", category: "compute" },
      { id: "node-2", category: "data-storage" },
    ]

    const unweightedScores = computeCategoryScores(metricsMap)

    // With all weights 1.0
    const weightedEqual = computeWeightedCategoryScores(unweightedScores, makeWeightProfile())
    const tierEqual: TierCategoryScore[] = weightedEqual.map((cs) => ({
      categoryId: cs.categoryId, score: cs.score, hasData: cs.hasData,
    }))
    const resultEqual = evaluateTier(nodes, tierEqual, DEFAULT_TIER_DEFINITIONS)

    // With performance weight 0 — drops performance score to 0
    const weightedNoPref = computeWeightedCategoryScores(unweightedScores, makeWeightProfile({ performance: 0 }))
    const tierNoPref: TierCategoryScore[] = weightedNoPref.map((cs) => ({
      categoryId: cs.categoryId, score: cs.score, hasData: cs.hasData,
    }))
    const resultNoPref = evaluateTier(nodes, tierNoPref, DEFAULT_TIER_DEFINITIONS)

    // With 0 performance weight, the tier should be equal or lower
    if (resultEqual && resultNoPref) {
      expect(resultNoPref.tierIndex).toBeLessThanOrEqual(resultEqual.tierIndex)
    }
  })

  it("all-weights-at-minimum (0.1) produces valid scores", () => {
    const scores: CategoryScore[] = METRIC_CATEGORIES.map((cat) =>
      makeCategoryScore(cat.id, 7),
    )
    const minWeights: WeightProfile = Object.fromEntries(
      METRIC_CATEGORIES.map((c) => [c.id, 0.1]),
    ) as WeightProfile

    const weighted = computeWeightedCategoryScores(scores, minWeights)
    const aggregate = computeWeightedAggregateScore(scores, minWeights)

    // All at 0.1: each score = 7*0.1 = 0.7
    for (const ws of weighted) {
      expect(ws.score).toBeCloseTo(0.7, 5)
    }
    // Aggregate: sum(7*0.1) / sum(0.1) = 4.9/0.7 = 7
    expect(aggregate).toBe(7)
  })
})
