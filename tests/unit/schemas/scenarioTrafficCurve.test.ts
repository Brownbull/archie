import { describe, it, expect } from "vitest"
import { ScenarioPresetYamlSchema, TrafficCurveSchema } from "@/schemas/demandSchema"

const baseScenario = {
  id: "peak",
  name: "Peak Traffic",
  description: "A busy period",
  icon: "TrendingUp",
  demand_profile: {
    "traffic-volume": "high",
    "concurrent-users": "high",
    "burst-pattern": "steady",
    "data-size": "medium",
    "geographic-spread": "single-region",
  },
}

describe("ScenarioPreset traffic_curve (Epic 15, backward compatible)", () => {
  it("parses a scenario WITHOUT a traffic_curve (legacy) — trafficCurve undefined", () => {
    const r = ScenarioPresetYamlSchema.safeParse(baseScenario)
    expect(r.success).toBe(true)
    if (!r.success) return
    expect(r.data.trafficCurve).toBeUndefined()
    expect(r.data.demandProfile).toBeDefined()
  })

  it("parses traffic_curve and transforms it to camelCase trafficCurve", () => {
    const r = ScenarioPresetYamlSchema.safeParse({
      ...baseScenario,
      traffic_curve: [{ t: 0, rps: 0 }, { t: 45, rps: 500 }, { t: 90, rps: 1000 }],
    })
    expect(r.success).toBe(true)
    if (!r.success) return
    expect(r.data.trafficCurve).toEqual([{ t: 0, rps: 0 }, { t: 45, rps: 500 }, { t: 90, rps: 1000 }])
  })

  it("rejects a curve point with negative rps or out-of-range t", () => {
    expect(TrafficCurveSchema.safeParse([{ t: 0, rps: -5 }]).success).toBe(false)
    expect(TrafficCurveSchema.safeParse([{ t: 99999, rps: 10 }]).success).toBe(false)
  })

  it("requires at least one curve point", () => {
    expect(TrafficCurveSchema.safeParse([]).success).toBe(false)
  })
})
