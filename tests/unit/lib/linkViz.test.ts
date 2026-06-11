import { describe, it, expect } from "vitest"
import { PORT_DASHARRAYS, throughputSpeedFactor } from "@/lib/linkViz"
import { PORT_TYPES, type PortType } from "@/lib/constants"

describe("linkViz (P5-S6 / D95)", () => {
  it("every port type has a distinct line style (http = solid)", () => {
    const types = Object.keys(PORT_TYPES) as PortType[]
    expect(Object.keys(PORT_DASHARRAYS).sort()).toEqual(types.sort())
    expect(PORT_DASHARRAYS.http).toBeUndefined() // solid
    const dashes = types.map((t) => PORT_DASHARRAYS[t] ?? "solid")
    expect(new Set(dashes).size).toBe(dashes.length) // all distinct
  })

  it("throughputSpeedFactor: log-scaled, clamped, neutral on unknown", () => {
    expect(throughputSpeedFactor(undefined)).toBe(1)
    expect(throughputSpeedFactor(0)).toBe(1)
    expect(throughputSpeedFactor(Infinity)).toBe(1)
    expect(throughputSpeedFactor(1000)).toBeCloseTo(0.7, 5)
    expect(throughputSpeedFactor(10_000)).toBeCloseTo(1.0, 5)
    expect(throughputSpeedFactor(100_000)).toBeCloseTo(1.3, 5)
    expect(throughputSpeedFactor(10_000_000)).toBe(1.8) // ceiling
    expect(throughputSpeedFactor(1)).toBe(0.6) // floor
    // monotonic
    expect(throughputSpeedFactor(50_000)).toBeGreaterThan(throughputSpeedFactor(5_000))
  })
})
