import { describe, it, expect, vi, beforeEach } from "vitest"

// getNodeCost reads the component library; stub it so the test is hermetic.
vi.mock("@/services/componentLibrary", () => ({
  componentLibrary: {
    getComponent: (id: string) => {
      if (id === "web-users") {
        return {
          category: "traffic",
          configVariants: [{ id: "moderate", maxRPS: 3000, monthlyCost: 0, baseLatencyMs: 0 }],
        }
      }
      if (id === "api-client") {
        return {
          category: "traffic",
          configVariants: [{ id: "burst", maxRPS: 12000, monthlyCost: 0, baseLatencyMs: 0 }],
        }
      }
      if (id === "postgresql") {
        return {
          category: "data-storage",
          configVariants: [{ id: "default", maxRPS: 8000, monthlyCost: 120, baseLatencyMs: 5 }],
        }
      }
      return undefined
    },
  },
}))

import { totalTrafficSourceRps, scaleTrafficCurveToPeak, buildTrafficCurveFromSources, hasTrafficPattern } from "@/stores/architectureStoreHelpers"

const node = (archieComponentId: string, activeConfigVariantId: string, componentCategory: string) => ({
  data: { archieComponentId, activeConfigVariantId, componentCategory, replicaCount: 1 },
})

describe("traffic source RPS", () => {
  beforeEach(() => vi.clearAllMocks())

  it("sums the rate of every traffic-source node and ignores non-source nodes", () => {
    const nodes = [
      node("web-users", "moderate", "traffic"),
      node("api-client", "burst", "traffic"),
      node("postgresql", "default", "data-storage"),
    ]
    expect(totalTrafficSourceRps(nodes)).toBe(15000) // 3000 + 12000, DB excluded
  })

  it("returns 0 when there are no traffic sources", () => {
    expect(totalTrafficSourceRps([node("postgresql", "default", "data-storage")])).toBe(0)
  })

  it("scales a traffic source's emitted rps by its stepper count (replicaCount)", () => {
    // The on-node −/＋ stepper drives replicaCount; for traffic that multiplies the variant's
    // maxRPS (regression: getNodeCost previously froze it at ×1 because traffic is replicaType 'none').
    const nodes = [{ data: { archieComponentId: "web-users", activeConfigVariantId: "moderate", componentCategory: "traffic", replicaCount: 3 } }]
    expect(totalTrafficSourceRps(nodes)).toBe(9000) // 3000 × 3
  })

  it("hasTrafficPattern detects a non-steady traffic source only", () => {
    expect(hasTrafficPattern([{ data: { componentCategory: "traffic", trafficPattern: "surge" } }])).toBe(true)
    expect(hasTrafficPattern([{ data: { componentCategory: "traffic", trafficPattern: "steady" } }])).toBe(false)
    expect(hasTrafficPattern([{ data: { componentCategory: "traffic" } }])).toBe(false)
    expect(hasTrafficPattern([{ data: { componentCategory: "compute", trafficPattern: "surge" } }])).toBe(false)
  })

  it("buildTrafficCurveFromSources shapes a single source by its pattern (surge peaks ~5×)", () => {
    const nodes = [{ data: { archieComponentId: "web-users", activeConfigVariantId: "moderate", componentCategory: "traffic", replicaCount: 1, trafficPattern: "surge" } }]
    const curve = buildTrafficCurveFromSources(nodes, 90)
    expect(curve.length).toBeGreaterThan(2)
    expect(Math.max(...curve.map((p) => p.rps))).toBeGreaterThan(3000 * 4) // base 3000 × ~5
    expect(curve[0].rps).toBe(3000) // baseline at the edges
  })

  it("buildTrafficCurveFromSources sums multiple sources tick-aligned", () => {
    const nodes = [
      { data: { archieComponentId: "web-users", activeConfigVariantId: "moderate", componentCategory: "traffic", replicaCount: 1, trafficPattern: "steady" } },
      { data: { archieComponentId: "api-client", activeConfigVariantId: "burst", componentCategory: "traffic", replicaCount: 1, trafficPattern: "steady" } },
    ]
    const curve = buildTrafficCurveFromSources(nodes, 90)
    expect(curve.every((p) => p.rps === 15000)).toBe(true) // 3000 + 12000, both steady → flat
  })

  it("buildTrafficCurveFromSources returns [] with no traffic sources", () => {
    expect(buildTrafficCurveFromSources([{ data: { archieComponentId: "postgresql", activeConfigVariantId: "default", componentCategory: "data-storage", replicaCount: 1 } }], 90)).toEqual([])
  })

  it("rescales a curve to the given peak while preserving its shape", () => {
    const curve = [
      { t: 0, rps: 0 },
      { t: 45, rps: 500 },
      { t: 90, rps: 1000 },
    ]
    const scaled = scaleTrafficCurveToPeak(curve, 30000)
    expect(scaled.map((p) => p.rps)).toEqual([0, 15000, 30000]) // peak → 30000, midpoint stays 50%
    expect(scaled.map((p) => p.t)).toEqual([0, 45, 90]) // times unchanged
  })
})
