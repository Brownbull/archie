import { describe, it, expect } from "vitest"
import { interpolateRps, findEntryNodes, simulateTick, runSimulation, defaultTrafficCurve, computeOverrides } from "@/engine/simulationEngine"
import type { ScheduledEvent } from "@/lib/simulationTypes"
import { SIM_TICKS } from "@/lib/constants"
import type { SimGraph, SimNode } from "@/lib/simulationTypes"

const node = (id: string, effectiveMaxRps: number, overrides: Partial<SimNode> = {}): SimNode => ({
  id,
  category: "compute",
  effectiveMaxRps,
  baseLatencyMs: 10,
  failureMode: "shed",
  ...overrides,
})
const edge = (source: string, target: string) => ({ source, target })
const tel = (state: ReturnType<typeof simulateTick>, id: string) => state.nodes.find((n) => n.nodeId === id)!

describe("interpolateRps", () => {
  const curve = [{ t: 0, rps: 0 }, { t: 50, rps: 100 }, { t: 100, rps: 20 }]
  it("returns 0 for an empty curve", () => expect(interpolateRps([], 10)).toBe(0))
  it("clamps to the first point before the start", () => expect(interpolateRps(curve, -5)).toBe(0))
  it("clamps to the last point after the end", () => expect(interpolateRps(curve, 999)).toBe(20))
  it("interpolates linearly mid-segment", () => {
    expect(interpolateRps(curve, 25)).toBe(50) // halfway 0→100
    expect(interpolateRps(curve, 75)).toBe(60) // halfway 100→20
  })
  it("returns the exact value at a knot", () => expect(interpolateRps(curve, 50)).toBe(100))
  it("handles an unsorted curve", () => {
    expect(interpolateRps([{ t: 100, rps: 20 }, { t: 0, rps: 0 }], 50)).toBe(10)
  })
  it("never returns negative", () => expect(interpolateRps([{ t: 0, rps: -5 }], 0)).toBe(0))
})

describe("findEntryNodes", () => {
  it("returns nodes with no incoming edge", () => {
    const g: SimGraph = { nodes: [node("a", 100), node("b", 100), node("c", 100)], edges: [edge("a", "b"), edge("b", "c")] }
    expect(findEntryNodes(g)).toEqual(["a"])
  })
  it("returns multiple entries", () => {
    const g: SimGraph = { nodes: [node("a", 1), node("b", 1), node("c", 1)], edges: [edge("a", "c"), edge("b", "c")] }
    expect(findEntryNodes(g).sort()).toEqual(["a", "b"])
  })
  it("treats a fully disconnected node as an entry", () => {
    const g: SimGraph = { nodes: [node("solo", 1)], edges: [] }
    expect(findEntryNodes(g)).toEqual(["solo"])
  })
})

describe("simulateTick — routing + capacity", () => {
  it("serves all traffic through a chain within capacity", () => {
    const g: SimGraph = { nodes: [node("in", 1000), node("app", 1000), node("db", 1000)], edges: [edge("in", "app"), edge("app", "db")] }
    const s = simulateTick(g, 0, 100)
    expect(tel(s, "in").incomingRps).toBe(100)
    expect(tel(s, "app").incomingRps).toBe(100)
    expect(tel(s, "db").incomingRps).toBe(100)
    expect(s.totalFailedRps).toBe(0)
    expect(s.totalServedRps).toBe(100)
    expect(tel(s, "in").overloaded).toBe(false)
  })

  it("sheds excess when a node is over capacity", () => {
    const g: SimGraph = { nodes: [node("in", 60), node("app", 1000)], edges: [edge("in", "app")] }
    const s = simulateTick(g, 0, 100)
    expect(tel(s, "in").servedRps).toBe(60)
    expect(tel(s, "in").failedRps).toBe(40)
    expect(tel(s, "in").overloaded).toBe(true)
    expect(tel(s, "app").incomingRps).toBe(60) // only served traffic forwards
    expect(s.totalFailedRps).toBe(40)
    expect(s.totalServedRps).toBe(60)
  })

  it("splits traffic evenly at a fan-out", () => {
    const g: SimGraph = { nodes: [node("lb", 1000), node("a1", 1000), node("a2", 1000)], edges: [edge("lb", "a1"), edge("lb", "a2")] }
    const s = simulateTick(g, 0, 100)
    expect(tel(s, "a1").incomingRps).toBe(50)
    expect(tel(s, "a2").incomingRps).toBe(50)
  })

  it("merges traffic at a fan-in", () => {
    const g: SimGraph = { nodes: [node("a", 1000), node("b", 1000), node("db", 1000)], edges: [edge("a", "db"), edge("b", "db")] }
    const s = simulateTick(g, 0, 100)
    // two entries split 100 → 50 each, both forward to db → 100
    expect(tel(s, "db").incomingRps).toBe(100)
  })

  it("treats effectiveMaxRps 0 as uncapped (no shed)", () => {
    const g: SimGraph = { nodes: [node("in", 0)], edges: [] }
    const s = simulateTick(g, 0, 500)
    expect(tel(s, "in").failedRps).toBe(0)
    expect(tel(s, "in").capacityPercent).toBe(0)
    expect(tel(s, "in").overloaded).toBe(false)
  })

  it("raises latency under overload and keeps base latency under capacity", () => {
    const g: SimGraph = { nodes: [node("in", 100, { baseLatencyMs: 10 })], edges: [] }
    const under = tel(simulateTick(g, 0, 50), "in")
    expect(under.latencyMs).toBe(10) // 50% load → base
    const over = tel(simulateTick(g, 0, 200), "in")
    // capacityPercent=2 → 10 × (1 + (2-1)×LATENCY_LOAD_K=2) = 30
    expect(over.latencyMs).toBe(30)
    expect(over.capacityPercent).toBe(2)
  })

  it("records telemetry for off-path nodes (e.g. monitoring) with zero inflow", () => {
    const g: SimGraph = { nodes: [node("in", 1000), node("mon", 1000, { category: "monitoring" })], edges: [] }
    const s = simulateTick(g, 0, 100)
    // both are entries (no incoming); traffic splits across both entries
    expect(s.nodes).toHaveLength(2)
    expect(tel(s, "mon")).toBeDefined()
  })

  it("does not infinite-loop on a cycle (processes cyclic nodes once)", () => {
    const g: SimGraph = { nodes: [node("a", 1000), node("b", 1000)], edges: [edge("a", "b"), edge("b", "a")] }
    const s = simulateTick(g, 0, 100)
    // no entry (both have incoming) — cyclic nodes still get telemetry, no hang
    expect(s.nodes).toHaveLength(2)
  })

  it("conserves flow on a DAG (targetRps = totalServed + totalFailed) across two bottlenecks", () => {
    const g: SimGraph = { nodes: [node("a", 60), node("b", 30)], edges: [edge("a", "b")] }
    const s = simulateTick(g, 0, 100)
    // a sheds 40 (100>60), forwards 60; b sheds 30 (60>30). Conservation must hold.
    expect(s.totalServedRps + s.totalFailedRps).toBe(100)
    expect(s.totalFailedRps).toBe(70)
    expect(s.totalServedRps).toBe(30)
  })

  it("conserves flow on a fan-out DAG", () => {
    const g: SimGraph = { nodes: [node("lb", 1000), node("a1", 30), node("a2", 1000)], edges: [edge("lb", "a1"), edge("lb", "a2")] }
    const s = simulateTick(g, 0, 100) // 50 to each; a1 sheds 20
    expect(s.totalFailedRps).toBe(20)
    expect(s.totalServedRps + s.totalFailedRps).toBe(100)
  })

  it("handles duplicate edges between the same pair without breaking topo order", () => {
    const g: SimGraph = { nodes: [node("a", 1000), node("b", 1000)], edges: [edge("a", "b"), edge("a", "b")] }
    const s = simulateTick(g, 0, 100)
    // a forwards served (100) split across its 2 out-edges (both to b) → b receives 100
    expect(tel(s, "a").incomingRps).toBe(100)
    expect(tel(s, "b").incomingRps).toBe(100)
    expect(s.nodes).toHaveLength(2)
  })

  it("treats a negative effectiveMaxRps as uncapped (documented behavior)", () => {
    const g: SimGraph = { nodes: [node("in", -5)], edges: [] }
    const s = simulateTick(g, 0, 100)
    expect(tel(s, "in").failedRps).toBe(0)
    expect(tel(s, "in").overloaded).toBe(false)
  })
})

describe("runSimulation", () => {
  const g: SimGraph = { nodes: [node("in", 80), node("app", 1000)], edges: [edge("in", "app")] }
  const ramp = [{ t: 0, rps: 0 }, { t: 90, rps: 100 }]

  it("produces SIM_TICKS frames by default", () => {
    const result = runSimulation(g, ramp)
    expect(result.ticks).toHaveLength(SIM_TICKS)
    expect(result.ticks[0].tick).toBe(0)
    expect(result.ticks[SIM_TICKS - 1].tick).toBe(SIM_TICKS - 1)
  })

  it("follows the traffic curve (ramp rises across ticks)", () => {
    const result = runSimulation(g, ramp)
    expect(result.ticks[0].targetRps).toBe(0)
    expect(result.ticks[SIM_TICKS - 1].targetRps).toBe(100)
    expect(result.ticks[SIM_TICKS - 1].targetRps).toBeGreaterThan(result.ticks[0].targetRps)
  })

  it("reports failed requests once the ramp exceeds the bottleneck capacity (80 RPS)", () => {
    const result = runSimulation(g, ramp)
    expect(result.ticks[0].totalFailedRps).toBe(0)
    expect(result.ticks[SIM_TICKS - 1].totalFailedRps).toBeGreaterThan(0) // 100 > 80
  })

  it("exposes entry node ids", () => {
    expect(runSimulation(g, ramp).entryNodeIds).toEqual(["in"])
  })

  it("honors a custom tick count", () => {
    expect(runSimulation(g, ramp, 10).ticks).toHaveLength(10)
  })

  it("handles a single-tick simulation", () => {
    const r = runSimulation(g, ramp, 1)
    expect(r.ticks).toHaveLength(1)
    expect(r.ticks[0].targetRps).toBe(0) // t=0 at tick 0
  })
})

describe("computeOverrides (scheduled events, Epic 16)", () => {
  const nodes = [node("app", 100, { category: "compute" }), node("app2", 100, { category: "compute" }), node("db", 100, { category: "data-storage" })]

  it("offlines a component_failure target only while the event is active", () => {
    const ev: ScheduledEvent[] = [{ t: 30, type: "component_failure", target: "app", durationS: 20 }]
    expect(computeOverrides(nodes, ev, 10).offlineNodeIds.size).toBe(0) // before
    expect(computeOverrides(nodes, ev, 35).offlineNodeIds.has("app")).toBe(true) // during
    expect(computeOverrides(nodes, ev, 55).offlineNodeIds.size).toBe(0) // after duration
  })

  it("offlines every node of the target category for an az_outage", () => {
    const ov = computeOverrides(nodes, [{ t: 0, type: "az_outage", target: "compute" }], 5)
    expect(ov.offlineNodeIds.has("app")).toBe(true)
    expect(ov.offlineNodeIds.has("app2")).toBe(true)
    expect(ov.offlineNodeIds.has("db")).toBe(false)
  })

  it("applies a latency multiplier for latency_spike (default ×3)", () => {
    expect(computeOverrides(nodes, [{ t: 0, type: "latency_spike", target: "db" }], 5).latencyMultipliers.get("db")).toBe(3)
    expect(computeOverrides(nodes, [{ t: 0, type: "latency_spike", target: "db", multiplier: 5 }], 5).latencyMultipliers.get("db")).toBe(5)
  })

  it("stacks concurrent latency spikes on the same node multiplicatively", () => {
    const ev: ScheduledEvent[] = [
      { t: 0, type: "latency_spike", target: "db", multiplier: 3 },
      { t: 0, type: "latency_spike", target: "db", multiplier: 2 },
    ]
    expect(computeOverrides(nodes, ev, 5).latencyMultipliers.get("db")).toBe(6) // ×3 × ×2
  })

  it("treats the active window as half-open [t, t+durationS)", () => {
    const ev: ScheduledEvent[] = [{ t: 30, type: "component_failure", target: "app", durationS: 20 }]
    expect(computeOverrides(nodes, ev, 30).offlineNodeIds.has("app")).toBe(true) // inclusive start
    expect(computeOverrides(nodes, ev, 50).offlineNodeIds.has("app")).toBe(false) // exclusive end
  })
})

describe("simulateTick with overrides", () => {
  it("an offline node sheds all incoming traffic and forwards nothing", () => {
    const g: SimGraph = { nodes: [node("in", 1000), node("db", 1000)], edges: [edge("in", "db")] }
    const overrides = { offlineNodeIds: new Set(["in"]), latencyMultipliers: new Map() }
    const s = simulateTick(g, 0, 100, overrides)
    const inT = s.nodes.find((n) => n.nodeId === "in")!
    expect(inT.servedRps).toBe(0)
    expect(inT.failedRps).toBe(100)
    expect(inT.overloaded).toBe(true)
    expect(s.nodes.find((n) => n.nodeId === "db")!.incomingRps).toBe(0) // nothing forwarded
  })

  it("multiplies latency for a node in latencyMultipliers", () => {
    const g: SimGraph = { nodes: [node("in", 1000, { baseLatencyMs: 10 })], edges: [] }
    const overrides = { offlineNodeIds: new Set<string>(), latencyMultipliers: new Map([["in", 4]]) }
    const s = simulateTick(g, 0, 50, overrides)
    expect(s.nodes.find((n) => n.nodeId === "in")!.latencyMs).toBe(40) // base 10 × 4 (50% load, no overload)
  })
})

describe("runSimulation with scheduled events", () => {
  it("a component_failure at t=0 sheds all traffic at the failed node for the whole run", () => {
    const g: SimGraph = { nodes: [node("lb", 5000), node("app", 5000)], edges: [edge("lb", "app")] }
    const events: ScheduledEvent[] = [{ t: 0, type: "component_failure", target: "lb" }]
    const result = runSimulation(g, defaultTrafficCurve(90, 1000), undefined, undefined, events)
    const last = result.ticks[result.ticks.length - 1]
    expect(last.nodes.find((n) => n.nodeId === "lb")!.servedRps).toBe(0)
    expect(last.totalServedRps).toBe(0) // entry offline → nothing reaches downstream
    expect(last.totalFailedRps).toBeGreaterThan(0)
  })

  it("is identical to a no-events run when scheduledEvents is empty (regression guard)", () => {
    const g: SimGraph = { nodes: [node("in", 80), node("db", 1000)], edges: [edge("in", "db")] }
    const withoutParam = runSimulation(g, defaultTrafficCurve(90, 1000))
    const withEmpty = runSimulation(g, defaultTrafficCurve(90, 1000), undefined, undefined, [])
    expect(withEmpty.ticks.at(-1)!.totalFailedRps).toBe(withoutParam.ticks.at(-1)!.totalFailedRps)
  })
})

describe("defaultTrafficCurve", () => {
  it("ramps 0 → target over the duration", () => {
    const c = defaultTrafficCurve(90, 1000)
    expect(c[0]).toEqual({ t: 0, rps: 0 })
    expect(c[c.length - 1]).toEqual({ t: 90, rps: 1000 })
  })
  it("interpolates to half-target at the midpoint", () => {
    expect(interpolateRps(defaultTrafficCurve(90, 1000), 45)).toBe(500)
  })
})
