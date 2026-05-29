import { describe, it, expect } from "vitest"
import { computeSimStats } from "@/lib/simulationStats"
import type { TickState, NodeTelemetry } from "@/lib/simulationTypes"

const tn = (latencyMs: number): NodeTelemetry => ({
  nodeId: "n", incomingRps: 0, servedRps: 0, failedRps: 0, latencyMs, capacityPercent: 0, overloaded: false,
})
const frame = (tick: number, targetRps: number, served: number, failed: number, latency: number): TickState => ({
  tick, targetRps, nodes: [tn(latency)], totalServedRps: served, totalFailedRps: failed,
})

describe("computeSimStats (Epic 15)", () => {
  it("returns 100% uptime and zeros for an empty run", () => {
    const s = computeSimStats([], 0)
    expect(s.uptimePercent).toBe(100)
    expect(s.avgLatencyMs).toBe(0)
    expect(s.totalServed).toBe(0)
  })

  it("treats a no-traffic run as 100% uptime", () => {
    const s = computeSimStats([frame(0, 0, 0, 0, 5)], 0)
    expect(s.uptimePercent).toBe(100)
  })

  it("computes uptime as served / (served + failed)", () => {
    const s = computeSimStats([frame(0, 100, 80, 20, 10)], 0)
    expect(s.uptimePercent).toBe(80)
    expect(s.failedRps).toBe(20)
    expect(s.servedRps).toBe(80)
    expect(s.currentRps).toBe(100)
  })

  it("aggregates served/failed across elapsed ticks", () => {
    const ticks = [frame(0, 50, 50, 0, 5), frame(1, 100, 60, 40, 20)]
    const s = computeSimStats(ticks, 1)
    expect(s.totalServed).toBe(110)
    expect(s.totalFailed).toBe(40)
    expect(s.uptimePercent).toBeCloseTo((110 / 150) * 100, 5)
  })

  it("computes mean and p99 of per-tick worst-hop latency", () => {
    const ticks = [frame(0, 10, 10, 0, 10), frame(1, 10, 10, 0, 20), frame(2, 10, 10, 0, 30)]
    const s = computeSimStats(ticks, 2)
    expect(s.avgLatencyMs).toBe(20)
    expect(s.p99LatencyMs).toBe(30) // worst
  })

  it("only aggregates up to currentTick (live stats)", () => {
    const ticks = [frame(0, 10, 10, 0, 5), frame(1, 10, 10, 0, 5), frame(2, 100, 0, 100, 99)]
    const atTick1 = computeSimStats(ticks, 1)
    expect(atTick1.totalFailed).toBe(0) // tick 2's failures not yet counted
    expect(atTick1.currentRps).toBe(10)
    const atTick2 = computeSimStats(ticks, 2)
    expect(atTick2.totalFailed).toBe(100)
  })

  it("clamps an out-of-range currentTick", () => {
    const ticks = [frame(0, 10, 10, 0, 5)]
    expect(() => computeSimStats(ticks, 99)).not.toThrow()
    expect(computeSimStats(ticks, 99).currentRps).toBe(10)
  })
})
