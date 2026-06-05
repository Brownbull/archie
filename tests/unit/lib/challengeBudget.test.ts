import { describe, it, expect } from "vitest"
import { combinedSourcePeak, exceedsBuildablePeak } from "@/lib/challengeBudget"
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
