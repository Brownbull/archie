import { describe, it, expect } from "vitest"
import { buildPatternCurve, buildPeakAnchoredCurve, kindToPattern, TRAFFIC_KINDS, TRAFFIC_PATTERNS } from "@/engine/trafficPatterns"

const BASE = 1000
const DURATION = 90

describe("buildPatternCurve", () => {
  it("spans [0, durationS] regardless of pattern", () => {
    for (const { id } of TRAFFIC_PATTERNS) {
      const c = buildPatternCurve(id, BASE, DURATION, 48)
      expect(c[0].t).toBe(0)
      expect(c[c.length - 1].t).toBe(DURATION)
      expect(c.every((p) => p.rps >= 0)).toBe(true)
    }
  })

  it("steady stays flat at the average", () => {
    const c = buildPatternCurve("steady", BASE, DURATION)
    expect(c.every((p) => p.rps === BASE)).toBe(true)
  })

  it("wobble varies around the average but is deterministic for a seed", () => {
    const a = buildPatternCurve("wobble", BASE, DURATION, 48, 7)
    const b = buildPatternCurve("wobble", BASE, DURATION, 48, 7)
    expect(a).toEqual(b) // same seed → identical curve (sim determinism)
    expect(a.some((p) => p.rps !== BASE)).toBe(true) // it actually wobbles
    // stays in a sane band (±~3σ of 15%)
    expect(a.every((p) => p.rps > BASE * 0.4 && p.rps < BASE * 1.6)).toBe(true)
  })

  it("periodic produces repeating peaks up to ~3× the average", () => {
    const c = buildPatternCurve("periodic", BASE, DURATION)
    const max = Math.max(...c.map((p) => p.rps))
    expect(max).toBeGreaterThan(BASE * 2.5)
    expect(max).toBeLessThanOrEqual(BASE * 3 + 1)
    expect(Math.min(...c.map((p) => p.rps))).toBeGreaterThanOrEqual(BASE) // never dips below baseline
  })

  it("surge ramps to ~5× in the middle and returns to baseline at the edges", () => {
    const c = buildPatternCurve("surge", BASE, DURATION)
    const max = Math.max(...c.map((p) => p.rps))
    expect(max).toBeGreaterThan(BASE * 4)
    expect(max).toBeLessThanOrEqual(BASE * 5 + 1)
    expect(c[0].rps).toBe(BASE)
    expect(c[c.length - 1].rps).toBe(BASE)
  })

  it("scales with the average (surge of 2k peaks ~10k)", () => {
    const c = buildPatternCurve("surge", 2000, DURATION)
    expect(Math.max(...c.map((p) => p.rps))).toBeGreaterThan(8000)
  })

  it("search produces dense sharp spikes up to ~4× that mostly sit near baseline", () => {
    const c = buildPatternCurve("search", BASE, DURATION)
    const max = Math.max(...c.map((p) => p.rps))
    expect(max).toBeGreaterThan(BASE * 2.5)
    expect(max).toBeLessThanOrEqual(BASE * 4 + 1)
    expect(Math.min(...c.map((p) => p.rps))).toBeGreaterThanOrEqual(BASE) // narrow spikes, never below baseline
    // sharp = most samples are near baseline, not at the peak
    const nearBaseline = c.filter((p) => p.rps < BASE * 1.5).length
    expect(nearBaseline).toBeGreaterThan(c.length / 2)
  })
})

describe("kindToPattern (ISAPivot)", () => {
  it("maps every player-facing kind to a valid internal pattern", () => {
    expect(kindToPattern("steady")).toBe("steady")
    expect(kindToPattern("realistic")).toBe("wobble")
    expect(kindToPattern("periodic")).toBe("periodic")
    expect(kindToPattern("search")).toBe("search")
  })

  it("every TRAFFIC_KINDS entry resolves to a buildable curve", () => {
    for (const { id } of TRAFFIC_KINDS) {
      const c = buildPatternCurve(kindToPattern(id), BASE, DURATION)
      expect(c[0].t).toBe(0)
      expect(c[c.length - 1].t).toBe(DURATION)
    }
  })
})

describe("buildPeakAnchoredCurve (ISAPivot rps = PEAK)", () => {
  const PEAK = 10000

  it("every kind peaks EXACTLY at the rps — incl. stochastic realistic (scale-to-peak)", () => {
    for (const { id } of TRAFFIC_KINDS) {
      const max = Math.max(...buildPeakAnchoredCurve(PEAK, id, DURATION).map((p) => p.rps))
      expect(max, `${id} must peak at exactly rps`).toBe(PEAK)
    }
  })

  it("steady is flat at the peak", () => {
    expect(buildPeakAnchoredCurve(8000, "steady", DURATION).every((p) => p.rps === 8000)).toBe(true)
  })

  it("periodic/search sit well below the peak at baseline (the kind = duty cycle below the peak)", () => {
    expect(Math.min(...buildPeakAnchoredCurve(8000, "search", DURATION).map((p) => p.rps))).toBeLessThan(8000 * 0.5)
    expect(Math.min(...buildPeakAnchoredCurve(9000, "periodic", DURATION).map((p) => p.rps))).toBeLessThan(9000)
  })

  it("is deterministic for a given (kind, peak, duration, seed)", () => {
    expect(buildPeakAnchoredCurve(7000, "realistic", DURATION, 48, 5)).toEqual(buildPeakAnchoredCurve(7000, "realistic", DURATION, 48, 5))
  })
})
