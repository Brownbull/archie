import { describe, it, expect } from "vitest"
import { simulateTick } from "@/engine/simulationEngine"
import type { SimGraph } from "@/lib/simulationTypes"

/**
 * TDD — CDN Edge Bifurcation (E3). Reuses cacheHitRatio from E1 but adds
 * miss_latency_penalty: CDN hits are fast (edge latency), misses pay an
 * origin round-trip penalty on top of the base latency.
 */

function buildCdnOriginGraph(hitRatio?: number, missLatencyPenaltyMs?: number): SimGraph {
  return {
    nodes: [
      { id: "traffic", category: "traffic", effectiveMaxRps: 0, baseLatencyMs: 0, failureMode: "shed" },
      {
        id: "cdn",
        category: "delivery-network",
        effectiveMaxRps: 100_000,
        baseLatencyMs: 10,
        failureMode: "shed",
        ...(hitRatio !== undefined ? { cacheHitRatio: hitRatio } : {}),
        ...(missLatencyPenaltyMs !== undefined ? { missLatencyPenaltyMs } : {}),
      },
      { id: "origin", category: "compute", effectiveMaxRps: 1000, baseLatencyMs: 15, failureMode: "shed" },
    ],
    edges: [
      { source: "traffic", target: "cdn" },
      { source: "cdn", target: "origin" },
    ],
  }
}

describe("CDN Edge Bifurcation — E3 (TDD)", () => {
  it("CDN with 0.90 hit ratio forwards only 10% to origin", () => {
    const tick = simulateTick(buildCdnOriginGraph(0.90), 0, 5000)
    const origin = tick.nodes.find((n) => n.nodeId === "origin")!
    // 5000 × 0.10 = 500 → origin receives 500 (within 1000 capacity)
    expect(origin.incomingRps).toBeCloseTo(500, 0)
    expect(origin.failedRps).toBe(0)
  })

  it("without CDN hit ratio, origin receives all traffic and bottlenecks", () => {
    const tick = simulateTick(buildCdnOriginGraph(), 0, 5000)
    const origin = tick.nodes.find((n) => n.nodeId === "origin")!
    expect(origin.incomingRps).toBe(5000)
    expect(origin.failedRps).toBe(4000)
  })

  it("CDN miss latency penalty increases CDN latency for miss portion", () => {
    const tick = simulateTick(buildCdnOriginGraph(0.85, 80), 0, 1000)
    const cdn = tick.nodes.find((n) => n.nodeId === "cdn")!
    // Base latency 10ms + weighted miss penalty: 0.15 × 80 = 12ms → total ~22ms
    expect(cdn.latencyMs).toBeGreaterThan(10)
    expect(cdn.latencyMs).toBeCloseTo(22, 0)
  })

  it("CDN with no misses (1.0 ratio) has no penalty", () => {
    const tick = simulateTick(buildCdnOriginGraph(1.0, 80), 0, 1000)
    const cdn = tick.nodes.find((n) => n.nodeId === "cdn")!
    expect(cdn.latencyMs).toBe(10) // pure edge latency, no miss penalty
  })
})
