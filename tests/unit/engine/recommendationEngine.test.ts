import { describe, it, expect } from "vitest"
import {
  computeRecommendations,
  type VariantRecommendation,
} from "@/engine/recommendationEngine"
import type { Component, ConfigVariant } from "@/types"
import type { MetricValue } from "@/schemas/metricSchema"
import { RECOMMENDATION_THRESHOLD } from "@/lib/constants"

// --- Helpers ---

function makeMetric(
  id: string,
  numericValue: number,
  category = "performance",
): MetricValue {
  const value = numericValue <= 3 ? "low" : numericValue <= 7 ? "medium" : "high"
  return { id, name: id, value, numericValue, category }
}

function makeVariant(
  id: string,
  name: string,
  metrics: MetricValue[],
): ConfigVariant {
  return { id, name, metrics }
}

function makeComponent(variants: ConfigVariant[]): Component {
  return {
    id: "test-component",
    name: "Test Component",
    category: "compute",
    description: "Test",
    is: "A test component",
    gain: ["Fast"],
    cost: ["Complex"],
    tags: [],
    baseMetrics: [],
    configVariants: variants,
  }
}

describe("computeRecommendations", () => {
  it("returns empty array when all metrics are at or above threshold", () => {
    const component = makeComponent([
      makeVariant("v1", "Variant 1", [
        makeMetric("perf", RECOMMENDATION_THRESHOLD),
        makeMetric("scale", 8),
      ]),
      makeVariant("v2", "Variant 2", [
        makeMetric("perf", 9),
        makeMetric("scale", 6),
      ]),
    ])

    const result = computeRecommendations(component, "v1")
    expect(result).toEqual([])
  })

  it("returns empty array for single-variant component", () => {
    const component = makeComponent([
      makeVariant("v1", "Only Variant", [makeMetric("perf", 2)]),
    ])

    const result = computeRecommendations(component, "v1")
    expect(result).toEqual([])
  })

  it("returns empty array when configVariants is empty", () => {
    const component = makeComponent([])

    const result = computeRecommendations(component, "v1")
    expect(result).toEqual([])
  })

  it("returns empty array when activeVariantId is not found", () => {
    const component = makeComponent([
      makeVariant("v1", "Variant 1", [makeMetric("perf", 3)]),
      makeVariant("v2", "Variant 2", [makeMetric("perf", 8)]),
    ])

    const result = computeRecommendations(component, "nonexistent")
    expect(result).toEqual([])
  })

  it("returns one recommendation for one weak metric with one improving variant", () => {
    const component = makeComponent([
      makeVariant("v1", "Standard", [
        makeMetric("perf", 3),
        makeMetric("scale", 8),
      ]),
      makeVariant("v2", "High Perf", [
        makeMetric("perf", 7),
        makeMetric("scale", 6),
      ]),
    ])

    const result = computeRecommendations(component, "v1")
    expect(result).toHaveLength(1)
    expect(result[0]).toMatchObject({
      weakMetricId: "perf",
      weakMetricName: "perf",
      improvedVariantId: "v2",
      improvedVariantName: "High Perf",
      improvementDelta: 4,
    })
  })

  it("captures trade-off cost metric (biggest regression)", () => {
    const component = makeComponent([
      makeVariant("v1", "Standard", [
        makeMetric("perf", 3),
        makeMetric("scale", 8),
        makeMetric("cost", 7),
      ]),
      makeVariant("v2", "High Perf", [
        makeMetric("perf", 7),
        makeMetric("scale", 5),  // -3 regression
        makeMetric("cost", 6),   // -1 regression
      ]),
    ])

    const result = computeRecommendations(component, "v1")
    expect(result).toHaveLength(1)
    expect(result[0]).toMatchObject({
      tradeCostMetricId: "scale",
      tradeCostMetricName: "scale",
      tradeCostDelta: -3,
    })
  })

  it("returns multiple recommendations for multiple weak metrics", () => {
    const component = makeComponent([
      makeVariant("v1", "Standard", [
        makeMetric("perf", 2),
        makeMetric("security", 3),
        makeMetric("scale", 8),
      ]),
      makeVariant("v2", "Better", [
        makeMetric("perf", 7),
        makeMetric("security", 6),
        makeMetric("scale", 5),
      ]),
    ])

    const result = computeRecommendations(component, "v1")
    expect(result).toHaveLength(2)

    const perfRec = result.find((r) => r.weakMetricId === "perf")
    const secRec = result.find((r) => r.weakMetricId === "security")
    expect(perfRec).toBeDefined()
    expect(secRec).toBeDefined()
  })

  it("selects best improvement when multiple variants improve the same weak metric", () => {
    const component = makeComponent([
      makeVariant("v1", "Standard", [
        makeMetric("perf", 2),
        makeMetric("scale", 7),
      ]),
      makeVariant("v2", "Good", [
        makeMetric("perf", 5),
        makeMetric("scale", 6),
      ]),
      makeVariant("v3", "Best", [
        makeMetric("perf", 9),
        makeMetric("scale", 4),
      ]),
    ])

    const result = computeRecommendations(component, "v1")
    expect(result).toHaveLength(1)
    expect(result[0].improvedVariantId).toBe("v3")
    expect(result[0].improvementDelta).toBe(7)
  })

  it("handles no trade-off (all metrics improve or stay same)", () => {
    const component = makeComponent([
      makeVariant("v1", "Standard", [
        makeMetric("perf", 3),
        makeMetric("scale", 5),
      ]),
      makeVariant("v2", "Better All", [
        makeMetric("perf", 8),
        makeMetric("scale", 7),
      ]),
    ])

    const result = computeRecommendations(component, "v1")
    expect(result).toHaveLength(1)
    expect(result[0].tradeCostMetricId).toBe("")
    expect(result[0].tradeCostDelta).toBe(0)
  })

  it("treats metric at exactly threshold (5) as NOT weak", () => {
    const component = makeComponent([
      makeVariant("v1", "Standard", [makeMetric("perf", RECOMMENDATION_THRESHOLD)]),
      makeVariant("v2", "Better", [makeMetric("perf", 9)]),
    ])

    const result = computeRecommendations(component, "v1")
    expect(result).toEqual([])
  })

  it("treats metric at threshold - 1 (4) as weak", () => {
    const component = makeComponent([
      makeVariant("v1", "Standard", [makeMetric("perf", RECOMMENDATION_THRESHOLD - 1)]),
      makeVariant("v2", "Better", [makeMetric("perf", 9)]),
    ])

    const result = computeRecommendations(component, "v1")
    expect(result).toHaveLength(1)
  })

  it("deduplicates: one recommendation per weak metric even with multiple candidates", () => {
    const component = makeComponent([
      makeVariant("v1", "Standard", [makeMetric("perf", 2)]),
      makeVariant("v2", "Option A", [makeMetric("perf", 6)]),
      makeVariant("v3", "Option B", [makeMetric("perf", 8)]),
      makeVariant("v4", "Option C", [makeMetric("perf", 7)]),
    ])

    const result = computeRecommendations(component, "v1")
    expect(result).toHaveLength(1) // Only one rec for "perf"
    expect(result[0].improvedVariantId).toBe("v3") // Best improvement
  })

  it("skips candidates that do not improve the weak metric", () => {
    const component = makeComponent([
      makeVariant("v1", "Standard", [
        makeMetric("perf", 3),
        makeMetric("scale", 8),
      ]),
      makeVariant("v2", "Worse", [
        makeMetric("perf", 2),
        makeMetric("scale", 9),
      ]),
      makeVariant("v3", "Same", [
        makeMetric("perf", 3),
        makeMetric("scale", 7),
      ]),
    ])

    const result = computeRecommendations(component, "v1")
    // Neither v2 (worse) nor v3 (same) improve perf → no recommendations
    expect(result).toEqual([])
  })

  it("returns correct VariantRecommendation shape", () => {
    const component = makeComponent([
      makeVariant("v1", "Standard", [
        makeMetric("perf", 3),
        makeMetric("scale", 8),
      ]),
      makeVariant("v2", "Better", [
        makeMetric("perf", 7),
        makeMetric("scale", 6),
      ]),
    ])

    const result = computeRecommendations(component, "v1")
    expect(result).toHaveLength(1)
    const rec: VariantRecommendation = result[0]
    expect(rec).toEqual({
      weakMetricId: "perf",
      weakMetricName: "perf",
      improvedVariantId: "v2",
      improvedVariantName: "Better",
      improvementDelta: 4,
      tradeCostMetricId: "scale",
      tradeCostMetricName: "scale",
      tradeCostDelta: -2,
    })
  })
})
