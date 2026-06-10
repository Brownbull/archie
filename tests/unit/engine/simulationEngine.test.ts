import { describe, it, expect } from "vitest"
import { interpolateRps, findEntryNodes, simulateTick, runSimulation, defaultTrafficCurve, computeOverrides, effectiveCacheHitRatio } from "@/engine/simulationEngine"
import type { ScheduledEvent } from "@/lib/simulationTypes"
import { SIM_TICKS, azCountForReplicas } from "@/lib/constants"
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

  it("follows the M/M/1 queueing curve as utilization climbs (ED4/LX4)", () => {
    const g: SimGraph = { nodes: [node("in", 100, { baseLatencyMs: 10 })], edges: [] }
    const at = (rps: number) => tel(simulateTick(g, 0, rps), "in").latencyMs
    expect(at(50)).toBe(10) // ρ=0.50 ≤ FLOOR → base (1×)
    expect(at(75)).toBeCloseTo(20, 6) // ρ=0.75 → u=0.5 → 2×
    expect(at(90)).toBeCloseTo(50, 6) // ρ=0.90 → u=0.8 → 5×
    expect(at(95)).toBeCloseTo(100, 6) // ρ=0.95 → u=0.9 → 10×
    const over = tel(simulateTick(g, 0, 200), "in")
    expect(over.latencyMs).toBeCloseTo(500, 6) // ρ=2.0 clamps at CAP 0.99 → 50× (finite, no Infinity)
    expect(over.capacityPercent).toBe(2)
  })

  describe("end-to-end path latency (ED1/EN1)", () => {
    it("sums per-node latency + inter-node RTT along the served path", () => {
      // traffic → a(5ms) → b(20ms, terminal); all under capacity so each node is at base latency.
      const g: SimGraph = { nodes: [node("a", 1000, { baseLatencyMs: 5 }), node("b", 1000, { baseLatencyMs: 20 })], edges: [edge("a", "b")] }
      const s = simulateTick(g, 0, 100)
      expect(s.pathLatencyMs).toBeCloseTo(5 + 2 + 20, 6) // 5 + RTT + 20 = 27 (b is the completion point)
      expect(s.worstHopLatencyMs).toBe(20) // worst single hop unchanged
    })

    it("a cache hit short-circuits the path, so a high hit-ratio LOWERS end-to-end latency", () => {
      const mk = (hit: number): SimGraph => ({
        nodes: [
          node("src", 100000, { baseLatencyMs: 1 }),
          node("cache", 100000, { category: "caching", baseLatencyMs: 5, cacheHitRatio: hit }),
          node("db", 100000, { category: "data-storage", baseLatencyMs: 20 }),
        ],
        edges: [edge("src", "cache"), edge("cache", "db")],
      })
      const hot = simulateTick(mk(0.9), 0, 1000).pathLatencyMs! // 90% complete at the short src→cache path
      const cold = simulateTick(mk(0), 0, 1000).pathLatencyMs! // everything reaches the db
      expect(hot).toBeLessThan(cold)
    })

    it("fan-in takes the MAX parent path, not the sum", () => {
      // a(5) and b(30) both feed c(10, terminal). c's path latency uses the slower parent, not a+b.
      const g: SimGraph = { nodes: [node("a", 1000, { baseLatencyMs: 5 }), node("b", 1000, { baseLatencyMs: 30 }), node("c", 1000, { baseLatencyMs: 10 })], edges: [edge("a", "c"), edge("b", "c")] }
      const s = simulateTick(g, 0, 100)
      expect(s.pathLatencyMs).toBeCloseTo(10 + 2 + 30, 6) // c + RTT + max(a,b) = 42, NOT 10+5+30
    })
  })

  describe("concurrency gate (EN2 / Little's law)", () => {
    it("rejects via connection-pool exhaustion BELOW the rps cap when requests are slow", () => {
      // 10k rps cap (ρ=0.1, base 100ms latency) but only 50 concurrent slots: in-flight = 1000×0.1 = 100 > 50,
      // so throughput is capped at 50×1000/100 = 500 rps — pool-exhausted well under the rps ceiling.
      const g: SimGraph = { nodes: [node("x", 10000, { baseLatencyMs: 100, concurrencyLimit: 50 })], edges: [] }
      const t = tel(simulateTick(g, 0, 1000), "x")
      expect(t.servedRps).toBeCloseTo(500, 6)
      expect(t.rejectedRps).toBeCloseTo(500, 6)
      expect(t.failedRps).toBeCloseTo(500, 6)
      expect(t.overloaded).toBe(true)
      expect(t.servedRps * (100 / 1000)).toBeCloseTo(50, 6) // Little's identity: in-flight == limit post-gate
    })

    it("a generous concurrency limit does not bind", () => {
      const g: SimGraph = { nodes: [node("x", 10000, { baseLatencyMs: 100, concurrencyLimit: 10000 })], edges: [] }
      const t = tel(simulateTick(g, 0, 1000), "x")
      expect(t.servedRps).toBe(1000)
      expect(t.rejectedRps).toBeUndefined()
      expect(t.overloaded).toBe(false)
    })

    it("undefined concurrency limit is a no-op: served/failed byte-identical", () => {
      const withGate: SimGraph = { nodes: [node("x", 600, { baseLatencyMs: 100 })], edges: [] }
      const t = tel(simulateTick(withGate, 0, 1000), "x")
      expect(t.servedRps).toBe(600) // pure rps-cap shed, unchanged by the (absent) concurrency gate
      expect(t.failedRps).toBe(400)
      expect(t.rejectedRps).toBeUndefined()
    })
  })

  describe("cyclic flow (EN6 fixed-point)", () => {
    it("a cycle member receives forwarded traffic + flow still conserves (closes D7)", () => {
      // src → a, with a ↔ b forming a cycle. Pre-EN6, b never forwarded and the cycle's flow was dropped.
      const g: SimGraph = { nodes: [node("src", 0), node("a", 1000), node("b", 1000)], edges: [edge("src", "a"), edge("a", "b"), edge("b", "a")] }
      const s = simulateTick(g, 0, 200)
      expect(tel(s, "b").incomingRps).toBeGreaterThan(0) // D7 fix: the cycle member now sees traffic
      expect(s.totalServedRps + s.totalFailedRps).toBeCloseTo(200, 6) // conservation holds
      expect(Number.isFinite(s.totalServedRps)).toBe(true)
    })

    it("a self-loop terminates within the pass cap (no hang)", () => {
      const g: SimGraph = { nodes: [node("src", 0), node("x", 500)], edges: [edge("src", "x"), edge("x", "x")] }
      const s = simulateTick(g, 0, 300)
      expect(tel(s, "x").incomingRps).toBeGreaterThan(0)
      expect(Number.isFinite(s.totalServedRps)).toBe(true)
    })
  })

  describe("fractional AZ outage (ED2) + cascade (EN3)", () => {
    it("a partial-AZ survivor serves cf/retryMultiplier — the EN3 thundering-herd crowds the survivor", () => {
      const g: SimGraph = { nodes: [node("c", 1000)], edges: [] }
      const ov = { offlineNodeIds: new Set<string>(), latencyMultipliers: new Map<string, number>(), capacityFactors: new Map([["c", 2 / 3]]) }
      const t = tel(simulateTick(g, 0, 900, ov), "c")
      // ED2: survives at 2/3 (was 0 pre-D74). EN3 (unmonitored ⇒ ÷2 retry overhead): 0.667/2 ⇒ 1/3 served.
      expect(t.servedRps).toBeCloseTo(1000 / 3, 0)
      expect(t.overloaded).toBe(true)
    })

    it("a breaker neighbor (observability) DAMPS the cascade — the survivor keeps far more capacity", () => {
      const g: SimGraph = { nodes: [node("c", 1000)], edges: [] }
      const base = { offlineNodeIds: new Set<string>(), latencyMultipliers: new Map<string, number>(), capacityFactors: new Map([["c", 2 / 3]]) }
      const undamped = tel(simulateTick(g, 0, 900, base), "c").servedRps // ÷2 ⇒ 333
      const damped = tel(simulateTick(g, 0, 900, { ...base, breakerNodeIds: new Set(["c"]) }), "c").servedRps // ÷1.1 ⇒ 606
      expect(damped).toBeGreaterThan(undamped)
      expect(damped).toBeCloseTo((1000 * (2 / 3)) / 1.1, 0) // ~606 — observability contains the blast
    })

    it("EN3 only crowds PARTIAL survivors — a fully-offline (cf 0) or healthy (cf 1) node is unaffected", () => {
      const g: SimGraph = { nodes: [node("c", 1000)], edges: [] }
      const healthy = tel(simulateTick(g, 0, 900), "c").servedRps
      expect(healthy).toBe(900) // no outage ⇒ no cascade ⇒ byte-identical
    })

    it("capacityFactor 0 (single-AZ) is fully offline", () => {
      const g: SimGraph = { nodes: [node("c", 1000)], edges: [] }
      const ov = { offlineNodeIds: new Set<string>(), latencyMultipliers: new Map<string, number>(), capacityFactors: new Map([["c", 0]]) }
      const t = tel(simulateTick(g, 0, 500, ov), "c")
      expect(t.servedRps).toBe(0)
      expect(t.failedRps).toBe(500)
    })
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

  it("scales target-category capacity to the surviving AZ fraction for an az_outage (ED2)", () => {
    const ov = computeOverrides(nodes, [{ t: 0, type: "az_outage", target: "compute" }], 5)
    // single-AZ nodes (azCount undefined → 1) survive at 0 — fully offline, as before D74
    expect(ov.capacityFactors?.get("app")).toBe(0)
    expect(ov.capacityFactors?.get("app2")).toBe(0)
    expect(ov.capacityFactors?.has("db")).toBe(false) // different category — untouched
  })

  it("a multi-AZ node survives an az_outage at (azCount−1)/azCount (ED2)", () => {
    const az3: SimNode[] = [node("c", 1000, { azCount: 3 })]
    const ov = computeOverrides(az3, [{ t: 0, type: "az_outage", target: "compute" }], 5)
    expect(ov.capacityFactors?.get("c")).toBeCloseTo(2 / 3, 6) // 3 AZs, lose 1 → 0.667 survives
  })

  it("azCountForReplicas tracks replicaCount, capped at MAX_AZ_COUNT", () => {
    expect(azCountForReplicas(1)).toBe(1)
    expect(azCountForReplicas(2)).toBe(2)
    expect(azCountForReplicas(3)).toBe(3)
    expect(azCountForReplicas(20)).toBe(3) // capped at 3
    expect(azCountForReplicas(0)).toBe(1)
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

  it("scales spike intensity by chaosIntensity (3e): 1 = as-authored, 0 = inert, >1 = harsher", () => {
    const ev: ScheduledEvent[] = [{ t: 0, type: "latency_spike", target: "db", multiplier: 3 }]
    expect(computeOverrides(nodes, ev, 5, undefined, 1).latencyMultipliers.get("db")).toBe(3) // as-authored (byte-identical)
    expect(computeOverrides(nodes, ev, 5, undefined, 0).latencyMultipliers.get("db")).toBe(1) // inert: ×1, NOT ×0
    expect(computeOverrides(nodes, ev, 5, undefined, 2).latencyMultipliers.get("db")).toBe(5) // 1 + (3-1)×2
    expect(computeOverrides(nodes, ev, 5, undefined, 0.5).latencyMultipliers.get("db")).toBe(2) // 1 + (3-1)×0.5
  })

  it("chaosIntensity defaults to 1 when omitted (byte-identical to pre-3e)", () => {
    const ev: ScheduledEvent[] = [{ t: 0, type: "latency_spike", target: "db", multiplier: 4 }]
    expect(computeOverrides(nodes, ev, 5).latencyMultipliers.get("db")).toBe(4)
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

describe("simulateTick — per-source inflow seeding (ISAPivot Phase 2)", () => {
  it("splits targetRps across traffic-source entries proportional to each source's rate", () => {
    const g: SimGraph = {
      nodes: [node("s1", 9000, { category: "traffic" }), node("s2", 3000, { category: "traffic" }), node("app", 100000)],
      edges: [edge("s1", "app"), edge("s2", "app")],
    }
    const s = simulateTick(g, 0, 12000)
    expect(tel(s, "s1").incomingRps).toBeCloseTo(9000, 5) // 9000/12000 of the load
    expect(tel(s, "s2").incomingRps).toBeCloseTo(3000, 5) // 3000/12000 of the load
  })

  it("a single traffic source receives all targetRps", () => {
    const g: SimGraph = { nodes: [node("s", 5000, { category: "traffic" }), node("app", 100000)], edges: [edge("s", "app")] }
    expect(tel(simulateTick(g, 0, 4000), "s").incomingRps).toBeCloseTo(4000, 5)
  })

  it("falls back to an even split when entries are not traffic sources (generic graph — no behavior change)", () => {
    const g: SimGraph = { nodes: [node("a", 1000), node("b", 1000), node("db", 100000)], edges: [edge("a", "db"), edge("b", "db")] }
    const s = simulateTick(g, 0, 1000)
    expect(tel(s, "a").incomingRps).toBeCloseTo(500, 5)
    expect(tel(s, "b").incomingRps).toBeCloseTo(500, 5)
  })

  it("falls back to an even split among traffic entries when their rates are all 0 (uncapped)", () => {
    const g: SimGraph = {
      nodes: [node("s1", 0, { category: "traffic" }), node("s2", 0, { category: "traffic" }), node("app", 100000)],
      edges: [edge("s1", "app"), edge("s2", "app")],
    }
    const s = simulateTick(g, 0, 1000)
    expect(tel(s, "s1").incomingRps).toBeCloseTo(500, 5)
    expect(tel(s, "s2").incomingRps).toBeCloseTo(500, 5)
  })

  it("seeds only the traffic source when entries are mixed — an orphaned non-traffic entry gets 0 (load originates from sources)", () => {
    const g: SimGraph = {
      nodes: [node("src", 5000, { category: "traffic" }), node("orphan", 1000), node("app", 100000)],
      edges: [edge("src", "app")], // 'orphan' has no incoming AND no upstream source
    }
    const s = simulateTick(g, 0, 5000)
    expect(tel(s, "src").incomingRps).toBeCloseTo(5000, 5) // the source carries all the load
    expect(tel(s, "orphan").incomingRps).toBe(0) // orphaned non-traffic entry: no source feeds it
  })
})

describe("simulateTick — workload write-pressure (ISAPivot Phase 2b)", () => {
  it("write-heavy sources raise the effective write ratio at a primary DB (more write-cap failures)", () => {
    const db = node("db", 1000, { category: "data-storage", baseMaxRps: 200, writeRatio: 0.2, writeDistribution: "primary" })
    // No write-pressure: writes = 1000×0.2 = 200 ≤ write cap (baseMaxRps 200) → no failures.
    expect(tel(simulateTick({ nodes: [db], edges: [] }, 0, 1000), "db").failedRps).toBe(0)
    // writePressure 1.0: eff wr = (0.2+1)/2 = 0.6 → writes 600 > cap 200 → 400 shed.
    expect(tel(simulateTick({ nodes: [db], edges: [], writePressure: 1.0 }, 0, 1000), "db").failedRps).toBeCloseTo(400, 5)
  })

  it("read-heavy sources lower the effective write ratio (fewer write-cap failures)", () => {
    const db = node("db", 1000, { category: "data-storage", baseMaxRps: 200, writeRatio: 0.4, writeDistribution: "primary" })
    // writeRatio 0.4 alone: writes 400 > cap 200 → 200 shed.
    expect(tel(simulateTick({ nodes: [db], edges: [] }, 0, 1000), "db").failedRps).toBeCloseTo(200, 5)
    // read-heavy (writePressure 0): eff wr = (0.4+0)/2 = 0.2 → writes 200 ≤ cap 200 → no failures.
    expect(tel(simulateTick({ nodes: [db], edges: [], writePressure: 0 }, 0, 1000), "db").failedRps).toBe(0)
  })
})

describe("effectiveCacheHitRatio — workload-derated hit ratio (ED5, D74)", () => {
  it("returns the ceiling unchanged when no workload data (byte-identical to pre-ED5)", () => {
    expect(effectiveCacheHitRatio(0.9, {})).toBeCloseTo(0.9, 6)
  })
  it("a fully-read, steady, fully-cacheable workload keeps the ceiling", () => {
    expect(effectiveCacheHitRatio(0.9, { writePressure: 0, cacheErosion: 1, cacheableFraction: 1 })).toBeCloseTo(0.9, 6)
  })
  it("write-pressure derates (writes can't be cached): half-write halves the hit ratio", () => {
    expect(effectiveCacheHitRatio(0.9, { writePressure: 0.5 })).toBeCloseTo(0.45, 6)
    expect(effectiveCacheHitRatio(0.9, { writePressure: 1 })).toBe(0) // pure writes ⇒ cache useless
  })
  it("cacheable-fraction + access-pattern erosion compound multiplicatively", () => {
    // 0.9 ceiling × 0.5 cacheable × 0.8 erosion = 0.36
    expect(effectiveCacheHitRatio(0.9, { cacheableFraction: 0.5, cacheErosion: 0.8 })).toBeCloseTo(0.36, 6)
  })
})

describe("cross-region RTT + replication-lag staleness (ED6/EN4, D74)", () => {
  const compute = { id: "c", category: "compute" as const, effectiveMaxRps: 100000, baseLatencyMs: 10, failureMode: "shed" as const }
  const lb = { id: "lb", category: "delivery-network" as const, effectiveMaxRps: 1000000, baseLatencyMs: 2, failureMode: "shed" as const }

  it("multi-region + authored RTT adds the penalty to compute, NOT to delivery-network (edge terminates locally)", () => {
    const g = { nodes: [compute, lb], edges: [], crossRegionRttMs: 40, multiRegion: true }
    expect(tel(simulateTick(g, 0, 1000), "c").latencyMs).toBeCloseTo(50, 5) // 10 base + 40 RTT
    expect(tel(simulateTick(g, 0, 1000), "lb").latencyMs).toBeCloseTo(2, 5) // edge tier exempt
  })

  it("no RTT when not multi-region OR unauthored — byte-identical to pre-ED6", () => {
    expect(tel(simulateTick({ nodes: [compute], edges: [], crossRegionRttMs: 40 }, 0, 1000), "c").latencyMs).toBeCloseTo(10, 5) // multiRegion absent
    expect(tel(simulateTick({ nodes: [compute], edges: [], multiRegion: true }, 0, 1000), "c").latencyMs).toBeCloseTo(10, 5) // RTT unauthored
  })

  it("a write/read-split DB emits BOUNDED staleness (log fanout, not linear); a low-lag variant stays small", () => {
    const db = { id: "db", category: "data-storage" as const, effectiveMaxRps: 4000, baseMaxRps: 1000, baseLatencyMs: 5, failureMode: "shed" as const, writeRatio: 0.3, writeDistribution: "primary" as const, replicationLagMs: 10 }
    // effWriteRatio = (0.3 + 0.3)/2 = 0.3 → (1 + 0.3×4) = 2.2; replicas = 4000/1000 = 4 → fanout 1+log2(4) = 3
    expect(tel(simulateTick({ nodes: [db], edges: [], writePressure: 0.3 }, 0, 2000), "db").stalenessMs).toBeCloseTo(10 * 2.2 * 3, 1)
    // a high-lag (default 50) variant on the same shape is ~5× staler — the async-vs-synchronous lesson
    const asyncDb = { ...db, replicationLagMs: 50 }
    expect(tel(simulateTick({ nodes: [asyncDb], edges: [], writePressure: 0.3 }, 0, 2000), "db").stalenessMs).toBeCloseTo(50 * 2.2 * 3, 1)
  })
})

describe("scheduled-event retargeting by category/type (S7 / D89, D91)", () => {
  // Live canvas node ids are crypto UUIDs — authored targets name a category or fundamental type.
  const uuidNodes: SimNode[] = [
    node("9f3a-uuid-compute", 100, { category: "compute" }),
    node("17bc-uuid-compute2", 100, { category: "compute" }),
    node("44de-uuid-db", 100, { category: "data-storage", typeId: "relational-db" }),
    node("a1ff-uuid-nosql", 100, { category: "data-storage", typeId: "nosql" }),
  ]

  it("latency_spike targeting a CATEGORY fires on every matching UUID-id node (was silently inert)", () => {
    const ov = computeOverrides(uuidNodes, [{ t: 0, type: "latency_spike", target: "compute", multiplier: 4 }], 5)
    expect(ov.latencyMultipliers.get("9f3a-uuid-compute")).toBe(4)
    expect(ov.latencyMultipliers.get("17bc-uuid-compute2")).toBe(4)
    expect(ov.latencyMultipliers.has("44de-uuid-db")).toBe(false) // different category — untouched
  })

  it("latency_spike targeting a fundamental TYPE hits only that type (write-storm-brownout's relational-db)", () => {
    const ov = computeOverrides(uuidNodes, [{ t: 0, type: "latency_spike", target: "relational-db", multiplier: 4 }], 5)
    expect(ov.latencyMultipliers.get("44de-uuid-db")).toBe(4)
    expect(ov.latencyMultipliers.has("a1ff-uuid-nosql")).toBe(false) // same category, different type
  })

  it("component_failure targeting a CATEGORY offlines every matching node", () => {
    const ov = computeOverrides(uuidNodes, [{ t: 0, type: "component_failure", target: "data-storage", durationS: 30 }], 5)
    expect(ov.offlineNodeIds.has("44de-uuid-db")).toBe(true)
    expect(ov.offlineNodeIds.has("a1ff-uuid-nosql")).toBe(true)
    expect(ov.offlineNodeIds.has("9f3a-uuid-compute")).toBe(false)
  })

  it("id-equality matching is preserved (harness/import back-compat)", () => {
    const literal: SimNode[] = [node("app", 100, { category: "compute" })]
    const ov = computeOverrides(literal, [{ t: 0, type: "component_failure", target: "app", durationS: 30 }], 5)
    expect(ov.offlineNodeIds.has("app")).toBe(true)
  })

  it("component_failure monitoring is judged PER NODE: the monitored copy mitigates, the unmonitored dies", () => {
    const nodes2: SimNode[] = [
      node("c1", 100, { category: "compute" }),
      node("c2", 100, { category: "compute" }),
      node("mon", 100, { category: "monitoring" }),
    ]
    const edges = [edge("c1", "mon")] // only c1 is monitor-adjacent
    // past the detection delay: monitored c1 keeps (1−OBS_RESIDUAL_BLAST) capacity, c2 is fully offline
    const ov = computeOverrides(nodes2, [{ t: 0, type: "component_failure", target: "compute", durationS: 60 }], 30, edges)
    expect(ov.offlineNodeIds.has("c2")).toBe(true)
    expect(ov.offlineNodeIds.has("c1")).toBe(false)
    expect(ov.capacityFactors?.get("c1")).toBeGreaterThan(0)
    expect(ov.capacityFactors?.get("c1")).toBeLessThan(1)
  })
})

describe("tick event emission for observe-to-recover (S8 / D89)", () => {
  const evNodes: SimNode[] = [
    node("c1", 100, { category: "compute" }),
    node("mon", 100, { category: "monitoring" }),
  ]
  const failure: ScheduledEvent[] = [{ t: 30, type: "component_failure", target: "compute", durationS: 20 }]

  it("computeOverrides reports the active event with its hit nodes; absent outside the window", () => {
    expect(computeOverrides(evNodes, failure, 10).activeEvents).toBeUndefined() // before
    const during = computeOverrides(evNodes, failure, 35)
    expect(during.activeEvents).toHaveLength(1)
    expect(during.activeEvents?.[0]).toMatchObject({ type: "component_failure", target: "compute", detected: false })
    expect(during.activeEvents?.[0].nodeIds).toEqual(["c1"])
    expect(computeOverrides(evNodes, failure, 55).activeEvents).toBeUndefined() // after
  })

  it("detected flips true once a monitored target passes the detection delay", () => {
    const edges = [edge("c1", "mon")]
    const early = computeOverrides(evNodes, failure, 31, edges) // 1s in — pre-detection
    expect(early.activeEvents?.[0].detected).toBe(false)
    const later = computeOverrides(evNodes, failure, 45, edges) // past OBS_DETECT_DELAY_S
    expect(later.activeEvents?.[0].detected).toBe(true)
  })

  it("runSimulation carries events on frames inside the window only (identity elsewhere)", () => {
    const graph: SimGraph = { nodes: [node("c1", 1000, { category: "compute" })], edges: [] }
    const curve = [{ t: 0, rps: 100 }, { t: 90, rps: 100 }]
    const result = runSimulation(graph, curve, 10, 90, [{ t: 30, type: "latency_spike", target: "compute", multiplier: 2, durationS: 20 }])
    const withEvents = result.ticks.filter((f) => f.events?.length)
    expect(withEvents.length).toBeGreaterThan(0)
    for (const f of withEvents) {
      const t = (f.tick / 9) * 90
      expect(t).toBeGreaterThanOrEqual(30)
      expect(t).toBeLessThan(50)
      expect(f.events?.[0].type).toBe("latency_spike")
    }
    expect(result.ticks[0].events).toBeUndefined() // event-free frame stays legacy-shaped
  })

  it("telemetry flags monitor-adjacent nodes (monitored) only while overrides are in play", () => {
    const graph: SimGraph = { nodes: evNodes, edges: [edge("c1", "mon")] }
    const ov = computeOverrides(evNodes, failure, 35, graph.edges)
    const state = simulateTick(graph, 0, 100, ov)
    expect(tel(state, "c1").monitored).toBe(true)
    expect(tel(state, "mon").monitored).toBeUndefined() // the monitor itself isn't "monitored"
    const plain = simulateTick(graph, 0, 100) // no overrides → no flag (legacy identity)
    expect(tel(plain, "c1").monitored).toBeUndefined()
  })
})

describe("zero-match events emit no event state (review fix — no phantom markers)", () => {
  it("an active event whose target matches no node produces no activeEvents and no frame events", () => {
    const onlyCompute: SimNode[] = [node("c1", 1000, { category: "compute" })]
    // Target a category absent from the build (a partial build missing the event's tier).
    const ev: ScheduledEvent[] = [{ t: 0, type: "latency_spike", target: "auth-security", multiplier: 3, durationS: 60 }]
    expect(computeOverrides(onlyCompute, ev, 5).activeEvents).toBeUndefined()
    const result = runSimulation({ nodes: onlyCompute, edges: [] }, [{ t: 0, rps: 100 }], 5, 60, ev)
    expect(result.ticks.every((f) => f.events === undefined)).toBe(true)
  })

  it("component_failure and az_outage with no matching nodes are equally silent", () => {
    const onlyCompute: SimNode[] = [node("c1", 1000, { category: "compute" })]
    expect(computeOverrides(onlyCompute, [{ t: 0, type: "component_failure", target: "data-storage", durationS: 60 }], 5).activeEvents).toBeUndefined()
    expect(computeOverrides(onlyCompute, [{ t: 0, type: "az_outage", target: "data-storage", durationS: 60 }], 5).activeEvents).toBeUndefined()
  })
})
