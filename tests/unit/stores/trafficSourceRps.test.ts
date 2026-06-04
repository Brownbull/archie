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

import { totalTrafficSourceRps, scaleTrafficCurveToPeak, buildTrafficCurveFromSources, buildTrafficCurveFromSpecs, hasTrafficKind, normalizeNodeTrafficKind, getNodeCost, buildSimGraph } from "@/stores/architectureStoreHelpers"
import { TRAFFIC_RPS_STEPS } from "@/lib/constants"

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
    expect(totalTrafficSourceRps(nodes)).toBe(6000) // scale[0]+scale[0] = 3000+3000 (both at step 1); DB excluded
  })

  it("returns 0 when there are no traffic sources", () => {
    expect(totalTrafficSourceRps([node("postgresql", "default", "data-storage")])).toBe(0)
  })

  it("scales a traffic source's emitted rps by its stepper count (replicaCount)", () => {
    // The on-node −/＋ stepper drives replicaCount; for traffic that multiplies the variant's
    // maxRPS (regression: getNodeCost previously froze it at ×1 because traffic is replicaType 'none').
    const nodes = [{ data: { archieComponentId: "web-users", activeConfigVariantId: "moderate", componentCategory: "traffic", replicaCount: 3 } }]
    expect(totalTrafficSourceRps(nodes)).toBe(9000) // step 3 → TRAFFIC_RPS_STEPS[2] = 9000
  })

  it("maps the stepper index onto the discrete rps scale (step 7 → 60k, step 20 → 10M)", () => {
    const at = (rc: number) => totalTrafficSourceRps([{ data: { archieComponentId: "web-users", activeConfigVariantId: "moderate", componentCategory: "traffic", replicaCount: rc } }])
    expect(at(1)).toBe(3000)
    expect(at(7)).toBe(60_000)
    expect(at(20)).toBe(10_000_000)
  })

  it("hasTrafficKind detects a non-steady traffic source only (and reads legacy trafficPattern)", () => {
    expect(hasTrafficKind([{ data: { componentCategory: "traffic", trafficKind: "realistic" } }])).toBe(true)
    expect(hasTrafficKind([{ data: { componentCategory: "traffic", trafficKind: "steady" } }])).toBe(false)
    expect(hasTrafficKind([{ data: { componentCategory: "traffic" } }])).toBe(false)
    expect(hasTrafficKind([{ data: { componentCategory: "compute", trafficKind: "realistic" } }])).toBe(false)
    // Legacy persisted field still detected (surge → realistic, a non-steady kind).
    expect(hasTrafficKind([{ data: { componentCategory: "traffic", trafficPattern: "surge" } }])).toBe(true)
  })

  it("buildTrafficCurveFromSources peak-anchors a source's curve to its rps (D63: rps = PEAK)", () => {
    const nodes = [{ data: { archieComponentId: "web-users", activeConfigVariantId: "moderate", componentCategory: "traffic", replicaCount: 1, trafficKind: "periodic" } }]
    const curve = buildTrafficCurveFromSources(nodes, 90) // no trafficRps → fallback peak = TRAFFIC_RPS_STEPS[0] = 3000
    expect(curve.length).toBeGreaterThan(2)
    // Peaks AT the source's rps (3000), NOT 3× it — the kind shapes the duty cycle BELOW the peak.
    expect(Math.max(...curve.map((p) => p.rps))).toBeLessThanOrEqual(3000)
    expect(Math.max(...curve.map((p) => p.rps))).toBeGreaterThan(3000 * 0.9)
    expect(Math.min(...curve.map((p) => p.rps))).toBeLessThan(3000) // sits below the peak (baseline ~1000)
  })

  it("buildTrafficCurveFromSpecs sums peak-anchored sources tick-aligned", () => {
    const curve = buildTrafficCurveFromSpecs([{ rps: 5000, kind: "steady" }, { rps: 3000, kind: "steady" }], 90)
    expect(curve.every((p) => p.rps === 8000)).toBe(true) // 5000 + 3000 steady → flat 8000
  })

  it("buildTrafficCurveFromSpecs peak-anchors a periodic source at its rps (not 3×)", () => {
    const curve = buildTrafficCurveFromSpecs([{ rps: 9000, kind: "periodic" }], 90)
    expect(Math.max(...curve.map((p) => p.rps))).toBeLessThanOrEqual(9000)
    expect(Math.max(...curve.map((p) => p.rps))).toBeGreaterThan(9000 * 0.9)
  })

  it("buildTrafficCurveFromSources treats legacy trafficPattern as the migrated kind (wobble ≡ realistic)", () => {
    const legacy = [{ data: { archieComponentId: "web-users", activeConfigVariantId: "moderate", componentCategory: "traffic", replicaCount: 1, trafficPattern: "wobble" } }]
    const migrated = [{ data: { archieComponentId: "web-users", activeConfigVariantId: "moderate", componentCategory: "traffic", replicaCount: 1, trafficKind: "realistic" } }]
    expect(buildTrafficCurveFromSources(legacy, 90)).toEqual(buildTrafficCurveFromSources(migrated, 90))
  })

  it("buildTrafficCurveFromSources sums multiple sources tick-aligned", () => {
    const nodes = [
      { data: { archieComponentId: "web-users", activeConfigVariantId: "moderate", componentCategory: "traffic", replicaCount: 1, trafficKind: "steady" } },
      { data: { archieComponentId: "api-client", activeConfigVariantId: "burst", componentCategory: "traffic", replicaCount: 1, trafficKind: "steady" } },
    ]
    const curve = buildTrafficCurveFromSources(nodes, 90)
    expect(curve.every((p) => p.rps === 6000)).toBe(true) // 3000 + 3000 (both at step 1, steady) → flat
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

describe("normalizeNodeTrafficKind (ISAPivot boundary normalizer)", () => {
  const tnode = (data: Record<string, unknown>) => ({ id: "n1", type: "archie", data })

  it("returns a non-traffic node untouched (same reference) when it has no traffic fields", () => {
    const n = tnode({ archieComponentId: "postgresql", componentCategory: "data-storage", replicaCount: 2 })
    expect(normalizeNodeTrafficKind(n)).toBe(n) // identity preserved → React Flow memo-safe
  })

  it("strips a stray trafficKind/trafficPattern from a NON-traffic node (anti-corruption)", () => {
    const n = tnode({ archieComponentId: "postgresql", componentCategory: "data-storage", replicaCount: 1, trafficKind: "periodic", trafficPattern: "surge" })
    const out = normalizeNodeTrafficKind(n)
    expect(out.data.trafficKind).toBeUndefined()
    expect(out.data.trafficPattern).toBeUndefined()
    expect(out.data.replicaCount).toBe(1) // other fields preserved
  })

  it("migrates a traffic node's legacy trafficPattern to trafficKind and drops the legacy field", () => {
    const out = normalizeNodeTrafficKind(tnode({ archieComponentId: "web-users", componentCategory: "traffic", replicaCount: 1, trafficPattern: "wobble" }))
    expect(out.data.trafficKind).toBe("realistic")
    expect(out.data.trafficPattern).toBeUndefined()
  })

  it("collapses legacy surge to realistic (surge has no player kind)", () => {
    expect(normalizeNodeTrafficKind(tnode({ componentCategory: "traffic", trafficPattern: "surge" })).data.trafficKind).toBe("realistic")
  })

  it("preserves a modern trafficKind and defaults an unset traffic node to steady", () => {
    expect(normalizeNodeTrafficKind(tnode({ componentCategory: "traffic", trafficKind: "search" })).data.trafficKind).toBe("search")
    expect(normalizeNodeTrafficKind(tnode({ componentCategory: "traffic" })).data.trafficKind).toBe("steady")
  })

  it("lets the modern trafficKind win when both fields are present", () => {
    expect(normalizeNodeTrafficKind(tnode({ componentCategory: "traffic", trafficKind: "periodic", trafficPattern: "wobble" })).data.trafficKind).toBe("periodic")
  })

  it("is idempotent", () => {
    const once = normalizeNodeTrafficKind(tnode({ componentCategory: "traffic", trafficPattern: "surge", archieComponentId: "web-users" }))
    expect(normalizeNodeTrafficKind(once)).toEqual(once)
  })

  it("backfills trafficRps from the legacy replicaCount index for a traffic node", () => {
    const out = normalizeNodeTrafficKind(tnode({ componentCategory: "traffic", replicaCount: 7 }))
    expect(out.data.trafficRps).toBe(TRAFFIC_RPS_STEPS[6]) // index = replicaCount(7) - 1
  })

  it("preserves an existing trafficRps (backfill is idempotent)", () => {
    const out = normalizeNodeTrafficKind(tnode({ componentCategory: "traffic", replicaCount: 7, trafficRps: 5000 }))
    expect(out.data.trafficRps).toBe(5000)
  })

  it("strips a stray trafficRps from a non-traffic node", () => {
    const out = normalizeNodeTrafficKind(tnode({ componentCategory: "data-storage", trafficRps: 9000 }))
    expect(out.data.trafficRps).toBeUndefined()
  })

  it("defaults workload=mixed and origin=one-region for a traffic node", () => {
    const out = normalizeNodeTrafficKind(tnode({ componentCategory: "traffic", trafficRps: 5000 }))
    expect(out.data.trafficWorkload).toBe("mixed")
    expect(out.data.trafficOrigin).toBe("one-region")
  })

  it("preserves explicit workload/origin on a traffic node", () => {
    const out = normalizeNodeTrafficKind(tnode({ componentCategory: "traffic", trafficWorkload: "write", trafficOrigin: "multi-region" }))
    expect(out.data.trafficWorkload).toBe("write")
    expect(out.data.trafficOrigin).toBe("multi-region")
  })

  it("strips stray workload/origin from a non-traffic node", () => {
    const out = normalizeNodeTrafficKind(tnode({ componentCategory: "data-storage", trafficWorkload: "write", trafficOrigin: "multi-region" }))
    expect(out.data.trafficWorkload).toBeUndefined()
    expect(out.data.trafficOrigin).toBeUndefined()
  })
})

describe("getNodeCost traffic RPS (ISAPivot Phase 1)", () => {
  it("uses trafficRps as the source's maxRPS when set", () => {
    expect(getNodeCost("web-users", "moderate", 1, 5000).maxRPS).toBe(5000)
  })

  it("lets trafficRps win over the legacy replicaCount index", () => {
    expect(getNodeCost("web-users", "moderate", 3, 5000).maxRPS).toBe(5000) // NOT TRAFFIC_RPS_STEPS[2]
  })

  it("falls back to the TRAFFIC_RPS_STEPS index when trafficRps is absent (back-compat)", () => {
    expect(getNodeCost("web-users", "moderate", 7).maxRPS).toBe(TRAFFIC_RPS_STEPS[6]) // 60000
    expect(getNodeCost("web-users", "moderate", 1).maxRPS).toBe(TRAFFIC_RPS_STEPS[0]) // 3000
  })

  it("falls back when trafficRps is 0 or non-finite (never NaN maxRPS)", () => {
    expect(getNodeCost("web-users", "moderate", 1, 0).maxRPS).toBe(TRAFFIC_RPS_STEPS[0])
    expect(getNodeCost("web-users", "moderate", 1, Number.NaN).maxRPS).toBe(TRAFFIC_RPS_STEPS[0])
  })

  it("decouples traffic cost from the stepper count (not multiplied by replicaCount)", () => {
    expect(getNodeCost("web-users", "moderate", 3).monthlyCost).toBe(getNodeCost("web-users", "moderate", 1).monthlyCost)
  })

  it("leaves non-traffic cost scaling unchanged (cost × replicas)", () => {
    expect(getNodeCost("postgresql", "default", 3).monthlyCost).toBe(360) // 120 × 3, untouched branch
  })
})

describe("buildSimGraph write-pressure (ISAPivot Phase 2b)", () => {
  it("computes a global rps-weighted write-pressure from the source workloads", () => {
    const g = buildSimGraph([
      { id: "a", data: { archieComponentId: "web-users", activeConfigVariantId: "moderate", componentCategory: "traffic" as const, trafficRps: 9000, trafficWorkload: "write" } },
      { id: "b", data: { archieComponentId: "web-users", activeConfigVariantId: "moderate", componentCategory: "traffic" as const, trafficRps: 3000, trafficWorkload: "read" } },
    ], [])
    expect(g.writePressure).toBeCloseTo(0.75, 5) // (9000×1 + 3000×0) / 12000
  })

  it("omits write-pressure when there are no traffic sources", () => {
    const g = buildSimGraph([{ id: "db", data: { archieComponentId: "postgresql", activeConfigVariantId: "default", componentCategory: "data-storage" as const, replicaCount: 1 } }], [])
    expect(g.writePressure).toBeUndefined()
  })
})
