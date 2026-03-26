import { describe, it, expect } from "vitest"
import {
  applyDemandModifiers,
  computeDemandAdjustedMetrics,
} from "@/engine/demandEngine"
import type { MetricValue } from "@/schemas/metricSchema"
import type { DemandResponse, DemandProfile } from "@/lib/demandTypes"
import { DEMAND_METRIC_FLOOR, DEMAND_METRIC_CEILING } from "@/lib/constants"

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

/** Creates a baseline DemandProfile with all variables at their lowest/default level */
function makeBaselineProfile(overrides?: Partial<DemandProfile>): DemandProfile {
  return {
    "traffic-volume": "low",
    "data-size": "low",
    "concurrent-users": "low",
    "geographic-spread": "single-region",
    "burst-pattern": "steady",
    ...overrides,
  }
}

// --- applyDemandModifiers ---

describe("applyDemandModifiers", () => {
  it("returns base metrics unchanged when demandProfile is null (AC-6)", () => {
    const metrics = [makeMetric({ id: "read-latency", category: "performance", numericValue: 7 })]
    const result = applyDemandModifiers(metrics, undefined, null)

    expect(result).toHaveLength(1)
    expect(result[0].numericValue).toBe(7)
    expect(result[0].demandMultiplier).toBe(1)
    expect(result[0].originalValue).toBe(7)
  })

  it("returns base metrics unchanged when demandProfile is undefined (AC-6)", () => {
    const metrics = [makeMetric({ id: "read-latency", category: "performance", numericValue: 8 })]
    const result = applyDemandModifiers(metrics, undefined, undefined)

    expect(result).toHaveLength(1)
    expect(result[0].numericValue).toBe(8)
    expect(result[0].demandMultiplier).toBe(1)
    expect(result[0].originalValue).toBe(8)
  })

  it("applies single variable modifier correctly (AC-1)", () => {
    const metrics = [makeMetric({ id: "write-throughput", category: "performance", numericValue: 9, value: "high" })]
    const demandResponses: DemandResponse = {
      "traffic-volume": { high: { "write-throughput": 0.7 } },
    }
    const profile = makeBaselineProfile({ "traffic-volume": "high" })

    const result = applyDemandModifiers(metrics, demandResponses, profile)

    expect(result).toHaveLength(1)
    expect(result[0].numericValue).toBeCloseTo(9 * 0.7, 5) // 6.3
    expect(result[0].originalValue).toBe(9)
    expect(result[0].demandMultiplier).toBeCloseTo(6.3 / 9, 5) // 0.7
  })

  it("stacks two variables multiplicatively (AC-1, AC-3)", () => {
    // Story example: base 7 × 0.7 × 0.9 = 4.41
    const metrics = [makeMetric({ id: "write-throughput", category: "performance", numericValue: 7, value: "medium" })]
    const demandResponses: DemandResponse = {
      "traffic-volume": { high: { "write-throughput": 0.7 } },
      "concurrent-users": { high: { "write-throughput": 0.9 } },
    }
    const profile = makeBaselineProfile({
      "traffic-volume": "high",
      "concurrent-users": "high",
    })

    const result = applyDemandModifiers(metrics, demandResponses, profile)

    expect(result[0].numericValue).toBeCloseTo(7 * 0.7 * 0.9, 5) // 4.41
    expect(result[0].originalValue).toBe(7)
    expect(result[0].demandMultiplier).toBeCloseTo(4.41 / 7, 5)
  })

  it("stacks three variables correctly (AC-3)", () => {
    const metrics = [makeMetric({ id: "write-throughput", category: "performance", numericValue: 8, value: "high" })]
    const demandResponses: DemandResponse = {
      "traffic-volume": { high: { "write-throughput": 0.8 } },
      "concurrent-users": { high: { "write-throughput": 0.7 } },
      "burst-pattern": { unpredictable: { "write-throughput": 0.9 } },
    }
    const profile = makeBaselineProfile({
      "traffic-volume": "high",
      "concurrent-users": "high",
      "burst-pattern": "unpredictable",
    })

    const result = applyDemandModifiers(metrics, demandResponses, profile)

    expect(result[0].numericValue).toBeCloseTo(8 * 0.8 * 0.7 * 0.9, 5) // 4.032
    expect(result[0].originalValue).toBe(8)
  })

  it("defaults missing modifier to 1.0 (AC-2)", () => {
    const metrics = [
      makeMetric({ id: "write-throughput", category: "performance", numericValue: 9 }),
      makeMetric({ id: "data-durability", category: "reliability", numericValue: 6 }),
    ]
    const demandResponses: DemandResponse = {
      "traffic-volume": { high: { "write-throughput": 0.7 } },
      // no modifier for data-durability
    }
    const profile = makeBaselineProfile({ "traffic-volume": "high" })

    const result = applyDemandModifiers(metrics, demandResponses, profile)

    expect(result[0].numericValue).toBeCloseTo(9 * 0.7, 5) // write-throughput affected
    expect(result[1].numericValue).toBe(6) // data-durability unchanged
    expect(result[1].demandMultiplier).toBe(1)
  })

  it("clamps result at floor 1.0 for extreme degradation (AC-3)", () => {
    // base 2, multipliers 0.3 × 0.3 = 0.09, raw = 0.18, clamped to 1.0
    const metrics = [makeMetric({ id: "write-throughput", category: "performance", numericValue: 2, value: "low" })]
    const demandResponses: DemandResponse = {
      "traffic-volume": { extreme: { "write-throughput": 0.3 } },
      "concurrent-users": { extreme: { "write-throughput": 0.3 } },
    }
    const profile = makeBaselineProfile({
      "traffic-volume": "extreme",
      "concurrent-users": "extreme",
    })

    const result = applyDemandModifiers(metrics, demandResponses, profile)

    expect(result[0].numericValue).toBe(DEMAND_METRIC_FLOOR) // clamped to 1
    expect(result[0].originalValue).toBe(2)
    expect(result[0].value).toBe("low")
  })

  it("clamps result at ceiling 10.0 when modifier > 1.0 (AC-3)", () => {
    // base 8 × 1.5 = 12, clamped to 10 — exercises the ceiling branch
    const metrics = [makeMetric({ id: "write-throughput", category: "performance", numericValue: 8, value: "high" })]
    const demandResponses: DemandResponse = {
      "traffic-volume": { high: { "write-throughput": 1.5 } },
    }
    const profile = makeBaselineProfile({ "traffic-volume": "high" })

    const result = applyDemandModifiers(metrics, demandResponses, profile)

    expect(result[0].numericValue).toBe(DEMAND_METRIC_CEILING) // clamped to 10
    expect(result[0].originalValue).toBe(8)
    expect(result[0].value).toBe("high")
  })

  it("re-derives value enum when numericValue crosses boundary", () => {
    // high (numericValue 8) degrades to ~4.8 → should become "medium"
    const metrics = [makeMetric({ id: "write-throughput", category: "performance", numericValue: 8, value: "high" })]
    const demandResponses: DemandResponse = {
      "traffic-volume": { extreme: { "write-throughput": 0.6 } },
    }
    const profile = makeBaselineProfile({ "traffic-volume": "extreme" })

    const result = applyDemandModifiers(metrics, demandResponses, profile)

    expect(result[0].numericValue).toBeCloseTo(4.8, 5)
    expect(result[0].value).toBe("medium")
  })

  it("returns identity when demandResponses is empty object", () => {
    const metrics = [makeMetric({ id: "read-latency", category: "performance", numericValue: 5 })]
    const profile = makeBaselineProfile({ "traffic-volume": "high" })

    const result = applyDemandModifiers(metrics, {} as DemandResponse, profile)

    expect(result[0].numericValue).toBe(5)
    expect(result[0].demandMultiplier).toBe(1)
  })

  it("handles multiple metrics with mixed modifier presence", () => {
    const metrics = [
      makeMetric({ id: "read-latency", category: "performance", numericValue: 3, value: "low" }),
      makeMetric({ id: "write-throughput", category: "performance", numericValue: 9, value: "high" }),
      makeMetric({ id: "data-durability", category: "reliability", numericValue: 7, value: "medium" }),
    ]
    const demandResponses: DemandResponse = {
      "traffic-volume": {
        high: {
          "write-throughput": 0.7,
          "read-latency": 0.8,
        },
      },
    }
    const profile = makeBaselineProfile({ "traffic-volume": "high" })

    const result = applyDemandModifiers(metrics, demandResponses, profile)

    expect(result).toHaveLength(3)
    expect(result[0].numericValue).toBeCloseTo(3 * 0.8, 5) // read-latency
    expect(result[1].numericValue).toBeCloseTo(9 * 0.7, 5) // write-throughput
    expect(result[2].numericValue).toBe(7) // data-durability unchanged
  })
})

// --- computeDemandAdjustedMetrics ---

describe("computeDemandAdjustedMetrics", () => {
  it("returns correct map for multiple nodes (AC-4)", () => {
    const nodeMetrics = new Map<string, MetricValue[]>([
      ["node-1", [makeMetric({ id: "write-throughput", category: "performance", numericValue: 9 })]],
      ["node-2", [makeMetric({ id: "read-latency", category: "performance", numericValue: 5 })]],
      ["node-3", [makeMetric({ id: "data-durability", category: "reliability", numericValue: 7 })]],
    ])
    const nodeDemandResponses = new Map<string, DemandResponse | undefined>([
      ["node-1", { "traffic-volume": { high: { "write-throughput": 0.7 } } }],
      ["node-2", { "traffic-volume": { high: { "read-latency": 0.8 } } }],
      ["node-3", undefined],
    ])
    const profile = makeBaselineProfile({ "traffic-volume": "high" })

    const result = computeDemandAdjustedMetrics(nodeMetrics, nodeDemandResponses, profile)

    expect(result.size).toBe(3)
    expect(result.get("node-1")![0].numericValue).toBeCloseTo(9 * 0.7, 5)
    expect(result.get("node-2")![0].numericValue).toBeCloseTo(5 * 0.8, 5)
    expect(result.get("node-3")![0].numericValue).toBe(7) // no demand responses
  })

  it("returns base metrics for all nodes when profile is null (AC-6)", () => {
    const nodeMetrics = new Map<string, MetricValue[]>([
      ["node-1", [makeMetric({ id: "write-throughput", category: "performance", numericValue: 9 })]],
    ])
    const nodeDemandResponses = new Map<string, DemandResponse | undefined>([
      ["node-1", { "traffic-volume": { high: { "write-throughput": 0.5 } } }],
    ])

    const result = computeDemandAdjustedMetrics(nodeMetrics, nodeDemandResponses, null)

    expect(result.get("node-1")![0].numericValue).toBe(9)
    expect(result.get("node-1")![0].demandMultiplier).toBe(1)
  })

  it("computes 15 components within 20ms (AC-5)", () => {
    const nodeMetrics = new Map<string, MetricValue[]>()
    const nodeDemandResponses = new Map<string, DemandResponse | undefined>()

    for (let i = 0; i < 15; i++) {
      const metrics: MetricValue[] = []
      for (let j = 0; j < 8; j++) {
        metrics.push(makeMetric({
          id: `metric-${j}`,
          category: "performance",
          numericValue: 3 + (j % 8),
        }))
      }
      nodeMetrics.set(`node-${i}`, metrics)
      nodeDemandResponses.set(`node-${i}`, {
        "traffic-volume": {
          extreme: Object.fromEntries(metrics.map((m, idx) => [m.id, 0.6 + (idx * 0.04)])),
        },
        "concurrent-users": {
          high: Object.fromEntries(metrics.map((m, idx) => [m.id, 0.7 + (idx * 0.025)])),
        },
      })
    }

    const profile = makeBaselineProfile({
      "traffic-volume": "extreme",
      "concurrent-users": "high",
    })

    const start = performance.now()
    const result = computeDemandAdjustedMetrics(nodeMetrics, nodeDemandResponses, profile)
    const elapsed = performance.now() - start

    expect(result.size).toBe(15)
    expect(elapsed).toBeLessThan(20)
  })
})
