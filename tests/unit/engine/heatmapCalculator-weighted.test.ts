import { describe, it, expect } from "vitest"
import { computeWeightedNodeScore } from "@/engine/heatmapCalculator"
import { DEFAULT_WEIGHT_PROFILE, type WeightProfile } from "@/lib/constants"

// --- Test Helpers ---

interface NodeCategoryAverage {
  categoryId: string
  averageScore: number
}

function makeWeightProfile(overrides: Partial<WeightProfile> = {}): WeightProfile {
  return { ...DEFAULT_WEIGHT_PROFILE, ...overrides }
}

// --- computeWeightedNodeScore ---

describe("computeWeightedNodeScore", () => {
  it("returns weighted overall: sum(categoryAvg*weight)/sum(weight)", () => {
    const categoryAverages: NodeCategoryAverage[] = [
      { categoryId: "performance", averageScore: 8 },
      { categoryId: "reliability", averageScore: 4 },
    ]
    const weights = makeWeightProfile({
      performance: 1.0,
      reliability: 0.5,
    })

    const result = computeWeightedNodeScore(categoryAverages, weights)

    // (8*1.0 + 4*0.5) / (1.0 + 0.5) = 10 / 1.5 = 6.666... -> 6.7
    expect(result).toBe(6.7)
  })

  it("excludes categories with weight 0 from average", () => {
    const categoryAverages: NodeCategoryAverage[] = [
      { categoryId: "performance", averageScore: 8 },
      { categoryId: "reliability", averageScore: 2 },
    ]
    const weights = makeWeightProfile({
      performance: 1.0,
      reliability: 0,
    })

    const result = computeWeightedNodeScore(categoryAverages, weights)

    // reliability excluded (weight 0): 8*1.0 / 1.0 = 8
    expect(result).toBe(8)
  })

  it("falls back to unweighted when all category weights are 0", () => {
    const categoryAverages: NodeCategoryAverage[] = [
      { categoryId: "performance", averageScore: 8 },
      { categoryId: "reliability", averageScore: 4 },
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

    const result = computeWeightedNodeScore(categoryAverages, weights)

    // Fallback: (8 + 4) / 2 = 6.0
    expect(result).toBe(6)
  })

  it("returns score directly for single-category node", () => {
    const categoryAverages: NodeCategoryAverage[] = [
      { categoryId: "performance", averageScore: 7.5 },
    ]
    const weights = makeWeightProfile({ performance: 0.8 })

    const result = computeWeightedNodeScore(categoryAverages, weights)

    // 7.5*0.8 / 0.8 = 7.5
    expect(result).toBe(7.5)
  })

  it("node with good perf but low perf weight - perf contributes less", () => {
    const categoryAverages: NodeCategoryAverage[] = [
      { categoryId: "performance", averageScore: 9 },
      { categoryId: "security", averageScore: 3 },
    ]
    const weights = makeWeightProfile({
      performance: 0.2,
      security: 1.0,
    })

    const result = computeWeightedNodeScore(categoryAverages, weights)

    // (9*0.2 + 3*1.0) / (0.2 + 1.0) = (1.8 + 3) / 1.2 = 4.8 / 1.2 = 4.0
    expect(result).toBe(4)
  })

  it("returns 0 for empty category averages", () => {
    const result = computeWeightedNodeScore([], makeWeightProfile())
    expect(result).toBe(0)
  })

  it("rounds to 1 decimal place", () => {
    const categoryAverages: NodeCategoryAverage[] = [
      { categoryId: "performance", averageScore: 7 },
      { categoryId: "reliability", averageScore: 3 },
      { categoryId: "scalability", averageScore: 5 },
    ]
    const weights = makeWeightProfile({
      performance: 1.0,
      reliability: 0.3,
      scalability: 0.7,
    })

    const result = computeWeightedNodeScore(categoryAverages, weights)

    // (7*1.0 + 3*0.3 + 5*0.7) / (1.0 + 0.3 + 0.7) = 11.4 / 2.0 = 5.7
    expect(result).toBe(5.7)
  })
})
