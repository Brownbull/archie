import { describe, it, expect } from "vitest"
import { aggregateVariantStats, formatAggregatedStats } from "@/lib/aggregateStats"

describe("aggregateVariantStats", () => {
  it("sums monthly cost across components", () => {
    const r = aggregateVariantStats([{ monthlyCost: 20 }, { monthlyCost: 80 }, { monthlyCost: 0 }])
    expect(r.totalCost).toBe(100)
  })

  it("takes the bottleneck (minimum) maxRPS — the weakest link caps throughput", () => {
    const r = aggregateVariantStats([{ maxRPS: 100_000 }, { maxRPS: 2_000 }, { maxRPS: 50_000 }])
    expect(r.minRPS).toBe(2_000)
  })

  it("sums latency cumulatively across the path", () => {
    const r = aggregateVariantStats([{ baseLatencyMs: 5 }, { baseLatencyMs: 25 }, { baseLatencyMs: 15 }])
    expect(r.totalLatencyMs).toBe(45)
  })

  it("ignores zero/undefined maxRPS when finding the bottleneck", () => {
    // A 0-rps or rps-less component (e.g. a pure sink) shouldn't be treated as the bottleneck.
    const r = aggregateVariantStats([{ maxRPS: 0 }, { maxRPS: 3_000 }, {}])
    expect(r.minRPS).toBe(3_000)
  })

  it("leaves a field undefined when no component supplies it", () => {
    const r = aggregateVariantStats([{ monthlyCost: 10 }, { monthlyCost: 5 }])
    expect(r.totalCost).toBe(15)
    expect(r.minRPS).toBeUndefined()
    expect(r.totalLatencyMs).toBeUndefined()
  })

  it("returns all-undefined for an empty list", () => {
    expect(aggregateVariantStats([])).toEqual({ totalCost: undefined, minRPS: undefined, totalLatencyMs: undefined })
  })
})

describe("formatAggregatedStats", () => {
  it("formats the rolled-up summary as $/mo · rps · ms", () => {
    expect(formatAggregatedStats({ totalCost: 250, minRPS: 5_000, totalLatencyMs: 12 })).toBe("$250/mo · 5k rps · 12ms")
  })

  it("shows Free when total cost is 0", () => {
    expect(formatAggregatedStats({ totalCost: 0, minRPS: 1_000, totalLatencyMs: 3 })).toBe("Free · 1k rps · 3ms")
  })

  it("omits missing fields", () => {
    expect(formatAggregatedStats({ totalCost: 40 })).toBe("$40/mo")
  })
})
