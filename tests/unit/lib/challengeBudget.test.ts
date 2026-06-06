import { describe, it, expect } from "vitest"
import { combinedSourcePeak, exceedsBuildablePeak, peakCurveRps, costPerMillionRequests, SECONDS_PER_MONTH } from "@/lib/challengeBudget"
import { MAX_BUILDABLE_PEAK_RPS } from "@/lib/constants"
import type { ChallengeTrafficSource } from "@/lib/challengeTypes"

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
