import { describe, it, expect } from "vitest"
import {
  computeCategoryScores,
  computeAggregateScore,
  computeWeightedCategoryScores,
  computeWeightedAggregateScore,
} from "@/engine/dashboardCalculator"
import { computeWeightedNodeScore, computeHeatmapStatus } from "@/engine/heatmapCalculator"
import type { RecalculatedMetrics } from "@/engine/recalculator"
import { DEFAULT_WEIGHT_PROFILE, type WeightProfile } from "@/lib/constants"

// --- Helpers ---

function makeMetrics(
  nodeId: string,
  categoryValues: Record<string, number[]>,
): RecalculatedMetrics {
  const metrics = Object.entries(categoryValues).flatMap(([category, values]) =>
    values.map((numericValue, i) => ({
      id: `${category}-${i}`,
      value: (numericValue <= 3 ? "low" : numericValue <= 7 ? "medium" : "high") as "low" | "medium" | "high",
      numericValue,
      category,
    })),
  )
  const overallScore =
    metrics.length > 0
      ? metrics.reduce((sum, m) => sum + m.numericValue, 0) / metrics.length
      : 0
  return { nodeId, metrics, overallScore }
}

describe("Priority Scoring Flow (Integration)", () => {
  const metricsMap = new Map([
    ["node-1", makeMetrics("node-1", { performance: [8, 6], reliability: [9], security: [4] })],
    ["node-2", makeMetrics("node-2", { performance: [5, 7], reliability: [6], scalability: [8] })],
  ])

  describe("full pipeline: adjust slider -> scores change -> reset -> revert", () => {
    it("computes correct unweighted scores", () => {
      const categoryScores = computeCategoryScores(metricsMap)
      const aggregate = computeAggregateScore(categoryScores)

      // perf: (8+6+5+7)/4 = 6.5
      // reliability: (9+6)/2 = 7.5
      // security: 4/1 = 4
      // scalability: 8/1 = 8
      // aggregate: (6.5+7.5+4+8)/4 = 6.5
      const perf = categoryScores.find((c) => c.categoryId === "performance")
      expect(perf?.score).toBe(6.5)
      expect(perf?.hasData).toBe(true)

      const rel = categoryScores.find((c) => c.categoryId === "reliability")
      expect(rel?.score).toBe(7.5)

      expect(aggregate).toBe(6.5)
    })

    it("weighted scores change when performance weight is reduced", () => {
      const categoryScores = computeCategoryScores(metricsMap)
      const weights: WeightProfile = { ...DEFAULT_WEIGHT_PROFILE, performance: 0.5 }

      const weightedScores = computeWeightedCategoryScores(categoryScores, weights)
      const weightedAggregate = computeWeightedAggregateScore(categoryScores, weights)

      // performance weighted: 6.5 * 0.5 = 3.25
      // reliability: 7.5 * 1.0 = 7.5
      // security: 4 * 1.0 = 4
      // scalability: 8 * 1.0 = 8
      const perfWeighted = weightedScores.find((c) => c.categoryId === "performance")
      expect(perfWeighted?.score).toBe(3.25)

      // weighted aggregate: (6.5*0.5 + 7.5*1 + 4*1 + 8*1) / (0.5+1+1+1) = 22.75/3.5 = 6.5
      expect(weightedAggregate).toBe(6.5)
    })

    it("weighted aggregate differs from unweighted when weights are asymmetric", () => {
      const categoryScores = computeCategoryScores(metricsMap)
      // Boost security (low score), reduce performance (high score)
      const weights: WeightProfile = {
        ...DEFAULT_WEIGHT_PROFILE,
        performance: 0.3,
        security: 0.8,
      }

      const unweighted = computeAggregateScore(categoryScores)
      const weighted = computeWeightedAggregateScore(categoryScores, weights)

      // unweighted: 6.5
      // weighted: (6.5*0.3 + 7.5*1 + 4*0.8 + 8*1) / (0.3+1+0.8+1) = (1.95+7.5+3.2+8)/3.1 = 20.65/3.1 ≈ 6.7
      expect(unweighted).toBe(6.5)
      expect(weighted).not.toBe(unweighted)
    })

    it("reset to default weights restores original scores", () => {
      const categoryScores = computeCategoryScores(metricsMap)

      // Compute with custom weights (reduce high-scoring categories to shift aggregate)
      const customWeights: WeightProfile = { ...DEFAULT_WEIGHT_PROFILE, reliability: 0.3, scalability: 0.3 }
      const weightedAggregate = computeWeightedAggregateScore(categoryScores, customWeights)

      // Reset to default
      const resetAggregate = computeWeightedAggregateScore(categoryScores, DEFAULT_WEIGHT_PROFILE)
      const unweightedAggregate = computeAggregateScore(categoryScores)

      // After reset, weighted aggregate should equal unweighted
      expect(resetAggregate).toBe(unweightedAggregate)
      // And should differ from custom-weighted
      expect(weightedAggregate).not.toBe(unweightedAggregate)
    })
  })

  describe("heatmap integration with weights", () => {
    it("node heatmap status reflects weight profile", () => {
      // Node with borderline performance (6.5) and good reliability (9)
      const categoryAverages = [
        { categoryId: "performance", averageScore: 6.5 },
        { categoryId: "reliability", averageScore: 9 },
      ]

      // Default weights: overall = (6.5+9)/2 = 7.75 → healthy
      const defaultScore = computeWeightedNodeScore(categoryAverages, DEFAULT_WEIGHT_PROFILE)
      expect(computeHeatmapStatus(defaultScore)).toBe("healthy")

      // Zero out reliability: overall = 6.5*1/(1) = 6.5 → healthy
      const perfOnlyWeights: WeightProfile = { ...DEFAULT_WEIGHT_PROFILE, reliability: 0.1 }
      const perfOnlyScore = computeWeightedNodeScore(categoryAverages, perfOnlyWeights)
      // Lower than default because high reliability contributes less
      expect(perfOnlyScore).toBeLessThan(defaultScore)
    })
  })

  describe("edge cases", () => {
    it("empty metrics map returns 0 for both weighted and unweighted", () => {
      const emptyMap = new Map<string, RecalculatedMetrics>()
      const categoryScores = computeCategoryScores(emptyMap)

      expect(computeAggregateScore(categoryScores)).toBe(0)
      expect(computeWeightedAggregateScore(categoryScores, DEFAULT_WEIGHT_PROFILE)).toBe(0)
    })

    it("all weights at minimum (0.1) still produces valid scores", () => {
      const categoryScores = computeCategoryScores(metricsMap)
      const minWeights: WeightProfile = Object.fromEntries(
        Object.keys(DEFAULT_WEIGHT_PROFILE).map((k) => [k, 0.1]),
      ) as WeightProfile

      const aggregate = computeWeightedAggregateScore(categoryScores, minWeights)
      // All weights equal (0.1) → same as unweighted
      expect(aggregate).toBe(computeAggregateScore(categoryScores))
    })
  })
})
