import { describe, it, expect } from "vitest"
import { applyFailureModifiers } from "@/engine/demandEngine"
import type { MetricValue } from "@/schemas/metricSchema"
import type { FailureModifiers } from "@/lib/demandTypes"
import { DEMAND_METRIC_FLOOR, DEMAND_METRIC_CEILING } from "@/lib/constants"

// --- Test Helpers ---

function makeMetric(id: string, numericValue: number, category = "performance"): MetricValue {
  const value = numericValue <= 3 ? "low" : numericValue <= 7 ? "medium" : "high"
  return { id, name: id, value, numericValue, category }
}

function baseMetrics(): MetricValue[] {
  return [
    makeMetric("read-latency", 5, "performance"),
    makeMetric("write-throughput", 7, "performance"),
    makeMetric("data-durability", 8, "reliability"),
    makeMetric("operational-complexity", 6, "operational-complexity"),
  ]
}

// --- applyFailureModifiers ---

describe("applyFailureModifiers", () => {
  it("returns metrics unchanged when failureModifiers is null", () => {
    const metrics = baseMetrics()
    const result = applyFailureModifiers(metrics, null)
    expect(result).toEqual(metrics)
  })

  it("returns metrics unchanged when failureModifiers is undefined", () => {
    const metrics = baseMetrics()
    const result = applyFailureModifiers(metrics, undefined)
    expect(result).toEqual(metrics)
  })

  it("returns metrics unchanged when failureModifiers is empty", () => {
    const metrics = baseMetrics()
    const result = applyFailureModifiers(metrics, {})
    expect(result).toEqual(metrics)
  })

  it("applies single modifier correctly", () => {
    const metrics = [makeMetric("data-durability", 8)]
    const modifiers: FailureModifiers = { "data-durability": 0.5 }
    const result = applyFailureModifiers(metrics, modifiers)
    // 8 * 0.5 = 4.0
    expect(result[0].numericValue).toBe(4)
    expect(result[0].value).toBe("medium")
  })

  it("applies multiple modifiers independently", () => {
    const metrics = [
      makeMetric("read-latency", 6),
      makeMetric("data-durability", 10),
    ]
    const modifiers: FailureModifiers = {
      "read-latency": 0.5,
      "data-durability": 0.3,
    }
    const result = applyFailureModifiers(metrics, modifiers)
    // 6 * 0.5 = 3.0
    expect(result[0].numericValue).toBe(3)
    expect(result[0].value).toBe("low")
    // 10 * 0.3 = 3.0
    expect(result[1].numericValue).toBe(3)
    expect(result[1].value).toBe("low")
  })

  it("leaves unmatched metrics unchanged", () => {
    const metrics = [
      makeMetric("read-latency", 5),
      makeMetric("cache-efficiency", 7),
    ]
    const modifiers: FailureModifiers = { "read-latency": 0.4 }
    const result = applyFailureModifiers(metrics, modifiers)
    // read-latency: 5 * 0.4 = 2.0
    expect(result[0].numericValue).toBe(2)
    // cache-efficiency: unchanged
    expect(result[1].numericValue).toBe(7)
  })

  it("clamps result to floor (DEMAND_METRIC_FLOOR = 1)", () => {
    const metrics = [makeMetric("data-durability", 2)]
    const modifiers: FailureModifiers = { "data-durability": 0.1 }
    const result = applyFailureModifiers(metrics, modifiers)
    // 2 * 0.1 = 0.2 → clamped to 1
    expect(result[0].numericValue).toBe(DEMAND_METRIC_FLOOR)
    expect(result[0].value).toBe("low")
  })

  it("clamps result to ceiling (DEMAND_METRIC_CEILING = 10)", () => {
    // Multiplier is 0.1-1.0 so ceiling is unlikely, but test the clamp logic
    const metrics = [makeMetric("read-latency", 10)]
    const modifiers: FailureModifiers = { "read-latency": 1.0 }
    const result = applyFailureModifiers(metrics, modifiers)
    // 10 * 1.0 = 10.0 exactly at ceiling
    expect(result[0].numericValue).toBe(DEMAND_METRIC_CEILING)
  })

  it("handles boundary multiplier at 0.1", () => {
    const metrics = [makeMetric("read-latency", 10)]
    const modifiers: FailureModifiers = { "read-latency": 0.1 }
    const result = applyFailureModifiers(metrics, modifiers)
    // 10 * 0.1 = 1.0 (exactly the floor)
    expect(result[0].numericValue).toBe(1)
  })

  it("handles boundary multiplier at 1.0 (identity)", () => {
    const metrics = [makeMetric("data-durability", 8)]
    const modifiers: FailureModifiers = { "data-durability": 1.0 }
    const result = applyFailureModifiers(metrics, modifiers)
    expect(result[0].numericValue).toBe(8)
  })

  it("updates value enum correctly for all ranges", () => {
    // Low range (1-3)
    const metrics1 = [makeMetric("m1", 6)]
    const r1 = applyFailureModifiers(metrics1, { m1: 0.5 })
    expect(r1[0].numericValue).toBe(3)
    expect(r1[0].value).toBe("low")

    // Medium range (4-7)
    const metrics2 = [makeMetric("m2", 10)]
    const r2 = applyFailureModifiers(metrics2, { m2: 0.5 })
    expect(r2[0].numericValue).toBe(5)
    expect(r2[0].value).toBe("medium")

    // High range (8-10)
    const metrics3 = [makeMetric("m3", 10)]
    const r3 = applyFailureModifiers(metrics3, { m3: 0.9 })
    expect(r3[0].numericValue).toBe(9)
    expect(r3[0].value).toBe("high")
  })

  it("preserves other metric fields (id, name, category)", () => {
    const metrics = [makeMetric("read-latency", 8, "performance")]
    const result = applyFailureModifiers(metrics, { "read-latency": 0.5 })
    expect(result[0].id).toBe("read-latency")
    expect(result[0].name).toBe("read-latency")
    expect(result[0].category).toBe("performance")
  })
})

// --- AC-4: Demand + Failure stacking (Level 3 → Level 4) ---

describe("demand + failure stacking (AC-4)", () => {
  it("failure modifiers apply after demand-adjusted metrics (Level ordering)", () => {
    // Simulate post-demand metrics (Level 3 already applied by applyDemandModifiers)
    const postDemandMetrics = [
      makeMetric("read-latency", 8),
      makeMetric("data-durability", 10),
    ]
    const failureMods: FailureModifiers = {
      "read-latency": 0.5,     // 8 * 0.5 = 4.0
      "data-durability": 0.3,  // 10 * 0.3 = 3.0
    }
    const result = applyFailureModifiers(postDemandMetrics, failureMods)
    expect(result[0].numericValue).toBe(4)
    expect(result[0].value).toBe("medium")
    expect(result[1].numericValue).toBe(3)
    expect(result[1].value).toBe("low")
  })

  it("no failure scenario = identity pass-through after demand", () => {
    const postDemandMetrics = [makeMetric("read-latency", 6)]
    const result = applyFailureModifiers(postDemandMetrics, null)
    expect(result[0].numericValue).toBe(6)
    expect(result).toEqual(postDemandMetrics)
  })

  it("combined result stays within clamp bounds [1, 10]", () => {
    // Extreme case: demand already degraded to 2, failure degrades further
    const extremeMetrics = [makeMetric("data-durability", 2)]
    const failureMods: FailureModifiers = { "data-durability": 0.1 }
    const result = applyFailureModifiers(extremeMetrics, failureMods)
    // 2 * 0.1 = 0.2 → clamped to floor (1)
    expect(result[0].numericValue).toBe(DEMAND_METRIC_FLOOR)
  })
})
