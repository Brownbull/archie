import { describe, it, expect } from "vitest"
import { metricTone } from "@/lib/metricTone"

describe("metricTone (D74) — green pass / amber near / red fail", () => {
  it("goodWhenLower: exactly at target ⇒ green pass", () => {
    expect(metricTone(300, 300, true, 0)).toEqual({ cls: "text-emerald-400", pass: true })
  })
  it("goodWhenLower: under target ⇒ green pass (even if close)", () => {
    expect(metricTone(290, 300, true, 0).pass).toBe(true)
    expect(metricTone(290, 300, true, 0).cls).toBe("text-emerald-400")
  })
  it("goodWhenLower: within 10% over ⇒ amber fail", () => {
    expect(metricTone(320, 300, true, 0)).toEqual({ cls: "text-amber-400", pass: false }) // 320 ≤ 330
  })
  it("goodWhenLower: beyond 10% over ⇒ red fail", () => {
    expect(metricTone(480, 300, true, 0)).toEqual({ cls: "text-red-400", pass: false })
  })
  it("goodWhenHigher (uptime): at/above target ⇒ green; below ⇒ amber then red", () => {
    expect(metricTone(99, 99, false, 1).pass).toBe(true)
    expect(metricTone(95, 99, false, 1)).toEqual({ cls: "text-amber-400", pass: false }) // 95 ≥ 99×0.9=89.1
    expect(metricTone(70, 99, false, 1)).toEqual({ cls: "text-red-400", pass: false }) // 70 < 89.1
  })
  it("non-finite measured (unmeasured factor, e.g. staleness with no read DB) ⇒ red fail", () => {
    // The consistency chip passes Infinity when there's nothing on the path to measure staleness — it must
    // never read as a pass (you can't claim a bound you never produced) and is rendered as "unmeasured".
    expect(metricTone(Infinity, 100, true, 0)).toEqual({ cls: "text-red-400", pass: false })
  })
  it("tone is computed AFTER rounding to display precision (no contradictory color)", () => {
    // 300.4 rounds to 300 at 0 digits → reads as pass, never red-but-shows-300
    expect(metricTone(300.4, 300, true, 0).pass).toBe(true)
    // 99.96 rounds to 100.0 ≥ 99 → pass
    expect(metricTone(99.96, 100, false, 1).pass).toBe(true)
  })
})
