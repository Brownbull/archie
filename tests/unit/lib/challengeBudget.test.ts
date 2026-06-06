import { describe, it, expect } from "vitest"
import { combinedSourcePeak, exceedsBuildablePeak, peakCurveRps, costPerMillionRequests, SECONDS_PER_MONTH, usageCostPerMonth, peakOriginBoundRps } from "@/lib/challengeBudget"
import { MAX_BUILDABLE_PEAK_RPS } from "@/lib/constants"
import type { ChallengeTrafficSource } from "@/lib/challengeTypes"
import type { TickState } from "@/lib/simulationTypes"

const src = (rps: number, type: ChallengeTrafficSource["type"]): ChallengeTrafficSource => ({
  type,
  rps,
  kind: "steady",
  workload: "read",
  origin: "one-region",
})

describe("challenge buildability budget (D71)", () => {
  it("sums per-source peaks; undefined/empty ⇒ 0 (legacy-curve load)", () => {
    expect(combinedSourcePeak(undefined)).toBe(0)
    expect(combinedSourcePeak([])).toBe(0)
    expect(combinedSourcePeak([src(500_000, "web-users"), src(300_000, "api-client")])).toBe(800_000)
  })

  it("allows a combined peak at or below the buildable ceiling", () => {
    expect(exceedsBuildablePeak([src(MAX_BUILDABLE_PEAK_RPS, "web-users")])).toBe(false)
    expect(exceedsBuildablePeak([src(1_000_000, "web-users"), src(1_000_000, "api-client")])).toBe(false)
  })

  it("flags a combined peak above the ceiling — even when each source is individually small", () => {
    // 4 sources × 1M = 4M > 2M: per-source limits alone wouldn't catch this; the total gate does.
    const fourSources = (["web-users", "api-client", "mobile-users", "iot-sensors"] as const).map((t) => src(1_000_000, t))
    expect(combinedSourcePeak(fourSources)).toBe(4_000_000)
    expect(exceedsBuildablePeak(fourSources)).toBe(true)
  })

  it("the buildable ceiling matches MAX_REPLICAS × ~100k front-tier throughput (2M)", () => {
    expect(MAX_BUILDABLE_PEAK_RPS).toBe(2_000_000)
  })
})

describe("cost-efficiency unit (ED7, D74)", () => {
  it("peakCurveRps returns the busiest point of the curve", () => {
    expect(peakCurveRps([{ t: 0, rps: 0 }, { t: 60, rps: 480_000 }, { t: 90, rps: 800_000 }])).toBe(800_000)
    expect(peakCurveRps([{ t: 0, rps: 0 }])).toBe(0)
  })

  it("costPerMillionRequests = monthly cost spread over a month of peak traffic", () => {
    // $565/mo at 800k rps: 565 × 1e6 / (800000 × 2,592,000) ≈ 0.000272 $/M-req.
    expect(costPerMillionRequests(565, 800_000)).toBeCloseTo(0.000272, 6)
    // Over-provisioned ($36,240) is ~64× worse — the cost lesson.
    expect(costPerMillionRequests(36_240, 800_000)!).toBeGreaterThan(0.017)
  })

  it("is undefined when there is no demand (peak 0)", () => {
    expect(costPerMillionRequests(500, 0)).toBeUndefined()
    expect(SECONDS_PER_MONTH).toBe(2_592_000)
  })
})

describe("usage-based cost (EN5, D74)", () => {
  const tick = (cdnServed: number, total: number): TickState => ({
    tick: 0, targetRps: total,
    nodes: [{ nodeId: "cdn", incomingRps: total, servedRps: cdnServed, failedRps: 0, latencyMs: 5, capacityPercent: 0, overloaded: false }],
    totalServedRps: total, totalFailedRps: 0,
  })

  it("usageCostPerMonth is 0 without rates or load, scales with origin requests otherwise", () => {
    expect(usageCostPerMonth(undefined, 100_000)).toBe(0)
    expect(usageCostPerMonth({ perMillionRequests: 0.004 }, 0)).toBe(0)
    // 50k origin rps × 2,592,000 s/mo = 1.296e11 req → 129,600 M-req × $0.004 ≈ $518
    expect(usageCostPerMonth({ perMillionRequests: 0.004 }, 50_000)).toBeCloseTo(518.4, 1)
  })

  it("peakOriginBoundRps subtracts CDN edge absorption (served × hit) from total served", () => {
    const ticks = [tick(1000, 1000)]
    expect(peakOriginBoundRps(ticks, new Map([["cdn", 0.9]]))).toBeCloseTo(100, 6) // 90% absorbed → 100 origin-bound
    expect(peakOriginBoundRps(ticks, new Map())).toBe(1000) // no CDN → all 1000 reaches origin
  })
})
