import { describe, it, expect, vi, beforeEach } from "vitest"
import { buildSimGraph } from "@/stores/architectureStoreHelpers"
import { runSimulation, defaultTrafficCurve } from "@/engine/simulationEngine"
import type { ComponentCategoryId } from "@/lib/constants"

// Mock component library: each component carries maxRPS + baseLatencyMs (capacity inputs).
const mockGetComponent = vi.fn()
vi.mock("@/services/componentLibrary", () => ({
  componentLibrary: { getComponent: (...a: unknown[]) => mockGetComponent(...a) },
}))
vi.mock("@/lib/firebase", () => ({ auth: { currentUser: null }, db: {} }))

const LIB: Record<string, { category: string; maxRPS: number; baseLatencyMs: number }> = {
  nginx: { category: "delivery-network", maxRPS: 5000, baseLatencyMs: 2 },
  app: { category: "compute", maxRPS: 300, baseLatencyMs: 15 },
  db: { category: "data-storage", maxRPS: 1000, baseLatencyMs: 8 },
}
function comp(id: string) {
  const c = LIB[id]
  return { id, name: id, category: c.category, configVariants: [{ id: "default", name: "d", metrics: [], maxRPS: c.maxRPS, baseLatencyMs: c.baseLatencyMs }] }
}
const node = (id: string, comp: string, replicaCount = 1) => ({
  id,
  data: { archieComponentId: comp, activeConfigVariantId: "default", componentCategory: LIB[comp].category as ComponentCategoryId, replicaCount },
})
const edge = (source: string, target: string) => ({ source, target })

describe("simulation flow (integration): buildSimGraph → runSimulation (Epic 15)", () => {
  beforeEach(() => {
    mockGetComponent.mockImplementation((id: string) => (LIB[id] ? comp(id) : undefined))
  })

  it("routes a curve through an nginx → app → db chain and accounts served/failed", () => {
    const nodes = [node("n-lb", "nginx"), node("n-app", "app"), node("n-db", "db")]
    const edges = [edge("n-lb", "n-app"), edge("n-app", "n-db")]
    const graph = buildSimGraph(nodes, edges)

    // sanity: capacities wired from the library through getNodeCost
    expect(graph.nodes.find((n) => n.id === "n-app")!.effectiveMaxRps).toBe(300)

    const result = runSimulation(graph, defaultTrafficCurve(90, 1000))
    expect(result.entryNodeIds).toEqual(["n-lb"])

    // Early tick (low RPS): everything served, no failures.
    expect(result.ticks[0].totalFailedRps).toBe(0)
    // Late tick (~1000 RPS): the 300-RPS app is the bottleneck → failures appear.
    const last = result.ticks[result.ticks.length - 1]
    expect(last.totalFailedRps).toBeGreaterThan(0)
    const lbLast = last.nodes.find((n) => n.nodeId === "n-lb")!
    const appLast = last.nodes.find((n) => n.nodeId === "n-app")!
    const dbLast = last.nodes.find((n) => n.nodeId === "n-db")!
    expect(appLast.overloaded).toBe(true)
    expect(appLast.servedRps).toBeCloseTo(300, 1) // capped at capacity
    // Bottleneck isolation: nginx (5000) and db (only sees app's ≤300) do NOT shed.
    expect(lbLast.failedRps).toBe(0)
    expect(dbLast.failedRps).toBe(0)
    expect(lbLast.overloaded).toBe(false)
    expect(dbLast.overloaded).toBe(false)
  })

  it("relieves the bottleneck when the app is scaled with replicas", () => {
    const single = runSimulation(buildSimGraph([node("a", "app")], []), defaultTrafficCurve(90, 1000))
    const scaled = runSimulation(buildSimGraph([node("a", "app", 5)], []), defaultTrafficCurve(90, 1000))
    const lastSingle = single.ticks[single.ticks.length - 1]
    const lastScaled = scaled.ticks[scaled.ticks.length - 1]
    // 5× replicas (compute = full scaling) → 5× capacity → fewer failed requests at peak.
    expect(lastScaled.totalFailedRps).toBeLessThan(lastSingle.totalFailedRps)
  })

  it("conserves flow per node and forwards served traffic downstream (real routing)", () => {
    // nginx(5000) -> app(300) -> db(1000); peak 1000 RPS so the app sheds.
    const result = runSimulation(
      buildSimGraph(
        [node("n-lb", "nginx"), node("n-app", "app"), node("n-db", "db")],
        [edge("n-lb", "n-app"), edge("n-app", "n-db")],
      ),
      defaultTrafficCurve(90, 1000),
    )
    const last = result.ticks[result.ticks.length - 1]
    const lb = last.nodes.find((n) => n.nodeId === "n-lb")!
    const app = last.nodes.find((n) => n.nodeId === "n-app")!
    const db = last.nodes.find((n) => n.nodeId === "n-db")!

    // Per-node conservation: served + failed == incoming (not a target-level identity).
    for (const t of last.nodes) {
      expect(t.servedRps + t.failedRps).toBeCloseTo(t.incomingRps, 4)
    }
    // Routing fidelity: nginx forwards everything it served to its single downstream (app).
    expect(app.incomingRps).toBeCloseTo(lb.servedRps, 4)
    // app sheds to its 300 cap; db receives ONLY app's served traffic (≤300), so db never overloads.
    expect(db.incomingRps).toBeCloseTo(app.servedRps, 4)
    expect(app.servedRps).toBeCloseTo(300, 1)
    expect(db.incomingRps).toBeLessThanOrEqual(300)
  })
})
