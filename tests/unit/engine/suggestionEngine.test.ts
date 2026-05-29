import { describe, it, expect, vi, beforeEach } from "vitest"
import type { ComponentCategoryId } from "@/lib/constants"

// Control capacity/cost/variants deterministically; getScalingRule (from constants) stays real.
const mockGetComponent = vi.fn()
vi.mock("@/services/componentLibrary", () => ({
  componentLibrary: { getComponent: (...a: unknown[]) => mockGetComponent(...a) },
}))
vi.mock("@/lib/firebase", () => ({ auth: { currentUser: null }, db: {} }))

import { suggestArchitectureChange, type SuggestionInput, type SuggestionNode } from "@/engine/suggestionEngine"

type Variant = { id: string; name: string; maxRPS: number; baseLatencyMs: number; monthlyCost: number }
const LIB: Record<string, { name: string; category: string; configVariants: Variant[] }> = {}
function defComp(id: string, category: string, variants: Variant[]) {
  LIB[id] = { name: id, category, configVariants: variants }
}
const node = (id: string, comp: string, variantId: string, replicaCount = 1): SuggestionNode => ({
  id,
  data: { archieComponentId: comp, activeConfigVariantId: variantId, componentCategory: LIB[comp].category as ComponentCategoryId, replicaCount },
})
function input(nodes: SuggestionNode[], peakRps: number, target?: { uptimePercent: number; p99LatencyMs: number }): SuggestionInput {
  return {
    nodes,
    edges: [],
    curve: [{ t: 0, rps: 0 }, { t: 90, rps: peakRps }],
    targetMetrics: target,
  }
}

describe("suggestArchitectureChange (Epic 17 P1)", () => {
  beforeEach(() => {
    for (const k of Object.keys(LIB)) delete LIB[k]
    mockGetComponent.mockImplementation((id: string) =>
      LIB[id] ? { id, name: LIB[id].name, category: LIB[id].category, configVariants: LIB[id].configVariants } : undefined,
    )
  })

  it("returns well-optimized with nothing to consider on an empty canvas", () => {
    const r = suggestArchitectureChange(input([], 100))
    expect(r.kind).toBe("well-optimized")
    expect(r.best).toBeNull()
    expect(r.considered).toBe(0)
  })

  it("suggests adding a replica when an overloaded node fails the target (single variant)", () => {
    defComp("app", "compute", [{ id: "v1", name: "Standard", maxRPS: 100, baseLatencyMs: 15, monthlyCost: 40 }])
    const r = suggestArchitectureChange(input([node("n1", "app", "v1", 1)], 300, { uptimePercent: 95, p99LatencyMs: 500 }))
    expect(r.kind).toBe("suggestion")
    expect(r.best?.changeType).toBe("add-replica")
    expect(r.best!.uptimeDelta).toBeGreaterThan(0) // more capacity → more served
    expect(r.best!.costDelta).toBeGreaterThan(0) // replicas cost more
  })

  it("prefers a bigger variant that actually achieves the pass over a partial replica bump", () => {
    defComp("app", "compute", [
      { id: "small", name: "Small", maxRPS: 100, baseLatencyMs: 15, monthlyCost: 40 },
      { id: "large", name: "Large", maxRPS: 400, baseLatencyMs: 12, monthlyCost: 120 },
    ])
    // small (100) overloaded by 300 peak; large (400) clears it; +1 replica (200) does not.
    const r = suggestArchitectureChange(input([node("n1", "app", "small", 1)], 300, { uptimePercent: 99, p99LatencyMs: 500 }))
    expect(r.baseline.uptimePercent).toBeLessThan(99) // baseline genuinely FAILS the target
    expect(r.kind).toBe("suggestion")
    expect(r.best?.changeType).toBe("bigger-variant") // the change that reaches a pass wins over a partial bump
    expect(r.best!.uptimeDelta).toBeGreaterThan(0)
  })

  it("does NOT suggest a cheaper-but-slower variant that degrades latency on a passing system", () => {
    defComp("app", "compute", [
      { id: "fast", name: "Fast", maxRPS: 400, baseLatencyMs: 10, monthlyCost: 120 },
      { id: "slow", name: "Slow", maxRPS: 400, baseLatencyMs: 60, monthlyCost: 40 }, // same cap, cheaper, slower
    ])
    // fast passes at 100 peak; switching to slow keeps uptime + passes p99(200) but +50ms latency.
    const r = suggestArchitectureChange(input([node("n1", "app", "fast", 1)], 100, { uptimePercent: 95, p99LatencyMs: 200 }))
    expect(r.baseline.uptimePercent).toBeGreaterThanOrEqual(95) // baseline passes
    // the saving exists and stays under target, but it degrades latency → not a healthy suggestion
    expect(r.kind).toBe("well-optimized")
    expect(r.best).toBeNull()
  })

  it("suggests a cost saving (remove replica) when over-provisioned but still passing", () => {
    defComp("app", "compute", [{ id: "v1", name: "Standard", maxRPS: 100, baseLatencyMs: 15, monthlyCost: 40 }])
    // 3× = 300 cap vs 50 peak → passes with huge headroom; dropping to 2× still passes and saves cost.
    const r = suggestArchitectureChange(input([node("n1", "app", "v1", 3)], 50, { uptimePercent: 95, p99LatencyMs: 500 }))
    expect(r.kind).toBe("suggestion")
    expect(r.best?.changeType).toBe("remove-replica")
    expect(r.best!.costDelta).toBeLessThan(0) // a saving
  })

  it("reports well-optimized when nothing improves the passing baseline", () => {
    defComp("app", "compute", [{ id: "v1", name: "Standard", maxRPS: 100, baseLatencyMs: 15, monthlyCost: 40 }])
    // 1× = 100 cap vs 50 peak → passes; no cheaper/bigger variant, can't drop below 1 replica.
    const r = suggestArchitectureChange(input([node("n1", "app", "v1", 1)], 50, { uptimePercent: 95, p99LatencyMs: 500 }))
    expect(r.kind).toBe("well-optimized")
    expect(r.best).toBeNull()
    expect(r.considered).toBeGreaterThan(0) // add-replica was evaluated, just not net-positive
  })

  it("never suggests a cost cut that would break a passing baseline", () => {
    defComp("app", "compute", [
      { id: "small", name: "Small", maxRPS: 100, baseLatencyMs: 15, monthlyCost: 40 },
      { id: "large", name: "Large", maxRPS: 400, baseLatencyMs: 12, monthlyCost: 120 },
    ])
    // large (400) passes 300 peak; the cheaper "small" (100) would fail → must NOT be suggested.
    const r = suggestArchitectureChange(input([node("n1", "app", "large", 1)], 300, { uptimePercent: 99, p99LatencyMs: 500 }))
    expect(r.baseline.uptimePercent).toBeGreaterThanOrEqual(99) // baseline passes
    expect(r.considered).toBeGreaterThan(0) // the cheaper variant WAS evaluated…
    expect(r.best?.changeType).not.toBe("cheaper-variant") // …and rejected for breaking the pass
    expect(r.kind).toBe("well-optimized") // no safe saving exists here
  })

  it("does not generate replica candidates for non-scalable components", () => {
    defComp("dash", "monitoring", [{ id: "v1", name: "Standard", maxRPS: 1000, baseLatencyMs: 5, monthlyCost: 20 }])
    // monitoring is scalable:false → no replica candidates; single variant → no swaps → nothing to consider.
    const r = suggestArchitectureChange(input([node("n1", "dash", "v1", 1)], 50, { uptimePercent: 95, p99LatencyMs: 500 }))
    expect(r.considered).toBe(0)
    expect(r.kind).toBe("well-optimized")
  })

  it("degrades gracefully when the active variant id is stale — no crash, replica candidate still evaluated", () => {
    defComp("app", "compute", [{ id: "v1", name: "Standard", maxRPS: 100, baseLatencyMs: 15, monthlyCost: 40 }])
    // node points at a variant id that no longer exists → variant swaps are skipped (can't resolve
    // a baseline to compare against) and the node resolves to 0 capacity, so replicas can't help.
    const r = suggestArchitectureChange(input([node("n1", "app", "ghost-variant", 1)], 300, { uptimePercent: 95, p99LatencyMs: 500 }))
    expect(r.considered).toBeGreaterThan(0) // add-replica was still generated + simulated (no crash)
    expect(r.kind).toBe("well-optimized") // a 0-capacity node can't be improved by scaling
    expect(r.best).toBeNull()
  })

  it("handles a multi-node chain — targets the overloaded tier", () => {
    defComp("edge", "delivery-network", [{ id: "v1", name: "CDN", maxRPS: 5000, baseLatencyMs: 2, monthlyCost: 20 }])
    defComp("app", "compute", [{ id: "v1", name: "Server", maxRPS: 100, baseLatencyMs: 15, monthlyCost: 40 }])
    defComp("db", "data-storage", [{ id: "v1", name: "DB", maxRPS: 1000, baseLatencyMs: 8, monthlyCost: 30 }])
    const nodes = [node("n-edge", "edge", "v1", 1), node("n-app", "app", "v1", 1), node("n-db", "db", "v1", 1)]
    const r = suggestArchitectureChange({
      nodes,
      edges: [{ source: "n-edge", target: "n-app" }, { source: "n-app", target: "n-db" }],
      curve: [{ t: 0, rps: 0 }, { t: 90, rps: 300 }], // app (100) is the bottleneck
      targetMetrics: { uptimePercent: 95, p99LatencyMs: 500 },
    })
    expect(r.considered).toBeGreaterThan(1) // candidates across multiple nodes
    expect(r.kind).toBe("suggestion")
    expect(r.best?.nodeId).toBe("n-app") // the overloaded compute tier is what to fix
  })

  it("in default mode (no target) suggests the best net improvement — a cost cut that keeps service", () => {
    defComp("app", "compute", [
      { id: "small", name: "Small", maxRPS: 100, baseLatencyMs: 12, monthlyCost: 40 },
      { id: "large", name: "Large", maxRPS: 400, baseLatencyMs: 12, monthlyCost: 120 },
    ])
    // large at tiny 30 peak is wasteful; small still serves all → same uptime, lower cost.
    const r = suggestArchitectureChange(input([node("n1", "app", "large", 1)], 30))
    expect(r.kind).toBe("suggestion")
    expect(r.best?.changeType).toBe("cheaper-variant")
    expect(r.best!.costDelta).toBeLessThan(0)
    expect(r.best!.uptimeDelta).toBeGreaterThanOrEqual(0)
  })

  it("is deterministic — identical inputs yield an identical suggestion", () => {
    defComp("app", "compute", [
      { id: "small", name: "Small", maxRPS: 100, baseLatencyMs: 15, monthlyCost: 40 },
      { id: "large", name: "Large", maxRPS: 400, baseLatencyMs: 12, monthlyCost: 120 },
    ])
    const a = suggestArchitectureChange(input([node("n1", "app", "small", 1)], 300, { uptimePercent: 99, p99LatencyMs: 500 }))
    const b = suggestArchitectureChange(input([node("n1", "app", "small", 1)], 300, { uptimePercent: 99, p99LatencyMs: 500 }))
    expect(a).toEqual(b)
  })
})
