import { describe, it, expect } from "vitest"
import {
  computeCategoryScores,
  computeAggregateScore,
  getScoreColor,
  type CategoryScore,
} from "@/engine/dashboardCalculator"
import { METRIC_CATEGORIES } from "@/lib/constants"
import type { RecalculatedMetrics } from "@/engine/recalculator"
import type { MetricValue } from "@/schemas/metricSchema"

// --- Helpers ---

function makeMetric(
  overrides: Partial<MetricValue> & { id: string; category: string },
): MetricValue {
  return {
    value: "medium" as const,
    numericValue: 5,
    ...overrides,
  }
}

function makeNode(
  nodeId: string,
  metrics: MetricValue[],
): RecalculatedMetrics {
  const overallScore =
    metrics.length > 0
      ? metrics.reduce((sum, m) => sum + m.numericValue, 0) / metrics.length
      : 0
  return { nodeId, metrics, overallScore }
}

// --- computeCategoryScores ---

describe("computeCategoryScores", () => {
  it("returns 7 entries with hasData=false and score=0 for empty metrics map", () => {
    const result = computeCategoryScores(new Map())

    expect(result).toHaveLength(7)
    for (const entry of result) {
      expect(entry.hasData).toBe(false)
      expect(entry.score).toBe(0)
    }
  })

  it("always returns entries in METRIC_CATEGORIES order", () => {
    const result = computeCategoryScores(new Map())

    expect(result).toHaveLength(METRIC_CATEGORIES.length)
    for (let i = 0; i < METRIC_CATEGORIES.length; i++) {
      expect(result[i].categoryId).toBe(METRIC_CATEGORIES[i].id)
      expect(result[i].categoryName).toBe(METRIC_CATEGORIES[i].name)
    }
  })

  it("computes correct score for single node with metrics in one category", () => {
    const metrics: MetricValue[] = [
      makeMetric({ id: "latency", category: "performance", numericValue: 8 }),
      makeMetric({ id: "throughput", category: "performance", numericValue: 6 }),
    ]
    const map = new Map([["node-1", makeNode("node-1", metrics)]])

    const result = computeCategoryScores(map)
    const perfEntry = result.find((r) => r.categoryId === "performance")!

    expect(perfEntry.hasData).toBe(true)
    expect(perfEntry.score).toBe(7) // (8+6)/2 = 7
    expect(perfEntry.metricCount).toBe(2)

    // Other categories should have no data
    const others = result.filter((r) => r.categoryId !== "performance")
    for (const entry of others) {
      expect(entry.hasData).toBe(false)
      expect(entry.score).toBe(0)
    }
  })

  it("computes flat average across multiple nodes", () => {
    const node1Metrics: MetricValue[] = [
      makeMetric({ id: "latency", category: "performance", numericValue: 8 }),
    ]
    const node2Metrics: MetricValue[] = [
      makeMetric({ id: "throughput", category: "performance", numericValue: 4 }),
    ]
    const map = new Map([
      ["node-1", makeNode("node-1", node1Metrics)],
      ["node-2", makeNode("node-2", node2Metrics)],
    ])

    const result = computeCategoryScores(map)
    const perfEntry = result.find((r) => r.categoryId === "performance")!

    expect(perfEntry.hasData).toBe(true)
    expect(perfEntry.score).toBe(6) // (8+4)/2 = 6
    expect(perfEntry.metricCount).toBe(2)
  })

  it("computes correct per-category averages for multiple categories", () => {
    const metrics: MetricValue[] = [
      makeMetric({ id: "latency", category: "performance", numericValue: 10 }),
      makeMetric({ id: "uptime", category: "reliability", numericValue: 8 }),
      makeMetric({ id: "failover", category: "reliability", numericValue: 4 }),
    ]
    const map = new Map([["node-1", makeNode("node-1", metrics)]])

    const result = computeCategoryScores(map)

    const perfEntry = result.find((r) => r.categoryId === "performance")!
    expect(perfEntry.score).toBe(10)
    expect(perfEntry.metricCount).toBe(1)
    expect(perfEntry.hasData).toBe(true)

    const relEntry = result.find((r) => r.categoryId === "reliability")!
    expect(relEntry.score).toBe(6) // (8+4)/2 = 6
    expect(relEntry.metricCount).toBe(2)
    expect(relEntry.hasData).toBe(true)

    // Remaining 5 categories have no data
    const noDataEntries = result.filter(
      (r) => r.categoryId !== "performance" && r.categoryId !== "reliability",
    )
    expect(noDataEntries).toHaveLength(5)
    for (const entry of noDataEntries) {
      expect(entry.hasData).toBe(false)
    }
  })

  it("ignores metrics with unknown/unmapped categories", () => {
    const metrics: MetricValue[] = [
      makeMetric({ id: "latency", category: "performance", numericValue: 8 }),
      makeMetric({ id: "mystery", category: "unknown-category", numericValue: 10 }),
      makeMetric({ id: "alien", category: "made-up", numericValue: 9 }),
    ]
    const map = new Map([["node-1", makeNode("node-1", metrics)]])

    const result = computeCategoryScores(map)

    const perfEntry = result.find((r) => r.categoryId === "performance")!
    expect(perfEntry.hasData).toBe(true)
    expect(perfEntry.score).toBe(8)
    expect(perfEntry.metricCount).toBe(1)

    // No entry should exist for unknown categories
    expect(result).toHaveLength(7)
    const unknownEntry = result.find((r) => r.categoryId === "unknown-category")
    expect(unknownEntry).toBeUndefined()
  })

  it("handles multi-node multi-category flat average correctly", () => {
    // Node 1: perf=9, security=3
    // Node 2: perf=5, security=7
    // Expected: perf=(9+5)/2=7, security=(3+7)/2=5
    const node1 = makeNode("node-1", [
      makeMetric({ id: "latency", category: "performance", numericValue: 9 }),
      makeMetric({ id: "encryption", category: "security", numericValue: 3 }),
    ])
    const node2 = makeNode("node-2", [
      makeMetric({ id: "throughput", category: "performance", numericValue: 5 }),
      makeMetric({ id: "auth-strength", category: "security", numericValue: 7 }),
    ])
    const map = new Map([
      ["node-1", node1],
      ["node-2", node2],
    ])

    const result = computeCategoryScores(map)

    expect(result.find((r) => r.categoryId === "performance")!.score).toBe(7)
    expect(result.find((r) => r.categoryId === "security")!.score).toBe(5)
  })

  it("handles node with empty metrics array", () => {
    const map = new Map([["node-1", makeNode("node-1", [])]])

    const result = computeCategoryScores(map)

    expect(result).toHaveLength(7)
    for (const entry of result) {
      expect(entry.hasData).toBe(false)
      expect(entry.score).toBe(0)
    }
  })
})

// --- computeAggregateScore ---

describe("computeAggregateScore", () => {
  it("returns 0 when all categories have hasData=false", () => {
    const scores: CategoryScore[] = METRIC_CATEGORIES.map((cat) => ({
      categoryId: cat.id,
      categoryName: cat.name,
      score: 0,
      metricCount: 0,
      hasData: false,
    }))

    expect(computeAggregateScore(scores)).toBe(0)
  })

  it("returns 0 for empty array", () => {
    expect(computeAggregateScore([])).toBe(0)
  })

  it("computes mean of only hasData=true categories", () => {
    const scores: CategoryScore[] = [
      { categoryId: "performance", categoryName: "Performance", score: 8, metricCount: 2, hasData: true },
      { categoryId: "reliability", categoryName: "Reliability", score: 6, metricCount: 1, hasData: true },
      { categoryId: "scalability", categoryName: "Scalability", score: 0, metricCount: 0, hasData: false },
      { categoryId: "security", categoryName: "Security", score: 0, metricCount: 0, hasData: false },
      { categoryId: "operational-complexity", categoryName: "Operational Simplicity", score: 4, metricCount: 1, hasData: true },
      { categoryId: "cost-efficiency", categoryName: "Cost Efficiency", score: 0, metricCount: 0, hasData: false },
      { categoryId: "developer-experience", categoryName: "Developer Experience", score: 0, metricCount: 0, hasData: false },
    ]

    // (8+6+4)/3 = 6.0
    expect(computeAggregateScore(scores)).toBe(6)
  })

  it("returns single category score when only one has data", () => {
    const scores: CategoryScore[] = [
      { categoryId: "performance", categoryName: "Performance", score: 7.5, metricCount: 3, hasData: true },
      { categoryId: "reliability", categoryName: "Reliability", score: 0, metricCount: 0, hasData: false },
    ]

    expect(computeAggregateScore(scores)).toBe(7.5)
  })

  it("rounds to 1 decimal place", () => {
    const scores: CategoryScore[] = [
      { categoryId: "performance", categoryName: "Performance", score: 7, metricCount: 1, hasData: true },
      { categoryId: "reliability", categoryName: "Reliability", score: 8, metricCount: 1, hasData: true },
      { categoryId: "scalability", categoryName: "Scalability", score: 6, metricCount: 1, hasData: true },
    ]

    // (7+8+6)/3 = 7.0
    expect(computeAggregateScore(scores)).toBe(7)
  })

  it("rounds correctly for non-trivial decimal", () => {
    const scores: CategoryScore[] = [
      { categoryId: "a", categoryName: "A", score: 7, metricCount: 1, hasData: true },
      { categoryId: "b", categoryName: "B", score: 8, metricCount: 1, hasData: true },
      { categoryId: "c", categoryName: "C", score: 9, metricCount: 1, hasData: true },
    ]

    // (7+8+9)/3 = 8.0
    expect(computeAggregateScore(scores)).toBe(8)
  })

  it("rounds 1/3 values correctly", () => {
    const scores: CategoryScore[] = [
      { categoryId: "a", categoryName: "A", score: 1, metricCount: 1, hasData: true },
      { categoryId: "b", categoryName: "B", score: 2, metricCount: 1, hasData: true },
      { categoryId: "c", categoryName: "C", score: 3, metricCount: 1, hasData: true },
    ]

    // (1+2+3)/3 = 2.0
    expect(computeAggregateScore(scores)).toBe(2)
  })

  it("rounds to 1 decimal with repeating decimal", () => {
    // Force a result like 5.333... to verify rounding
    const scores: CategoryScore[] = [
      { categoryId: "a", categoryName: "A", score: 5, metricCount: 1, hasData: true },
      { categoryId: "b", categoryName: "B", score: 5, metricCount: 1, hasData: true },
      { categoryId: "c", categoryName: "C", score: 6, metricCount: 1, hasData: true },
    ]

    // (5+5+6)/3 = 5.333... -> 5.3
    expect(computeAggregateScore(scores)).toBe(5.3)
  })
})

// --- getScoreColor ---

describe("getScoreColor", () => {
  it("returns green for score >= 7", () => {
    expect(getScoreColor(7)).toBe("bg-green-500")
    expect(getScoreColor(7.0)).toBe("bg-green-500")
    expect(getScoreColor(8)).toBe("bg-green-500")
    expect(getScoreColor(10)).toBe("bg-green-500")
  })

  it("returns yellow for score >= 4 and < 7", () => {
    expect(getScoreColor(4)).toBe("bg-yellow-500")
    expect(getScoreColor(4.0)).toBe("bg-yellow-500")
    expect(getScoreColor(5.5)).toBe("bg-yellow-500")
    expect(getScoreColor(6.9)).toBe("bg-yellow-500")
  })

  it("returns red for score < 4", () => {
    expect(getScoreColor(3.9)).toBe("bg-red-500")
    expect(getScoreColor(3)).toBe("bg-red-500")
    expect(getScoreColor(1)).toBe("bg-red-500")
    expect(getScoreColor(0)).toBe("bg-red-500")
  })

  it("handles exact boundary values", () => {
    expect(getScoreColor(7.0)).toBe("bg-green-500")
    expect(getScoreColor(4.0)).toBe("bg-yellow-500")
    expect(getScoreColor(3.99)).toBe("bg-red-500")
    expect(getScoreColor(6.99)).toBe("bg-yellow-500")
  })
})
