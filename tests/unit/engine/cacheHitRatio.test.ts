import { describe, it, expect } from "vitest"
import { simulateTick } from "@/engine/simulationEngine"
import type { SimGraph } from "@/lib/simulationTypes"

/**
 * TDD RED phase — Cache Hit Ratio (E1).
 *
 * These tests define the DESIRED behavior: a cache node with `cacheHitRatio` should
 * bifurcate traffic — hits are served locally (never forwarded), misses are forwarded
 * downstream. Today all these tests FAIL because the engine treats cache as a plain pipe.
 *
 * Architecture under test:
 *   Traffic Source (1000 rps) → Cache (Redis, hit ratio 0.8) → Database (PostgreSQL)
 *
 * Expected behavior:
 *   Cache receives 1000 rps, serves 800 locally (hits), forwards 200 to DB (misses).
 *   DB receives only 200 rps instead of 1000.
 *
 * Current behavior (WRONG):
 *   Cache receives 1000 rps, serves 1000 (all traffic), forwards ALL 1000 to DB.
 *   DB receives 1000 rps — cache doesn't reduce DB load at all.
 */

// Architecture: TrafficSource → Cache → Database
function buildCacheDbGraph(cacheHitRatio?: number): SimGraph {
  return {
    nodes: [
      {
        id: "traffic",
        category: "traffic",
        effectiveMaxRps: 0, // uncapped source
        baseLatencyMs: 0,
        failureMode: "shed",
      },
      {
        id: "cache",
        category: "caching",
        effectiveMaxRps: 50_000, // Redis: 50k capacity, way above 1000
        baseLatencyMs: 0.5,
        failureMode: "shed",
        ...(cacheHitRatio !== undefined ? { cacheHitRatio } : {}),
      },
      {
        id: "db",
        category: "data-storage",
        effectiveMaxRps: 500, // PostgreSQL single-node: 500 RPS
        baseLatencyMs: 5,
        failureMode: "shed",
      },
    ],
    edges: [
      { source: "traffic", target: "cache" },
      { source: "cache", target: "db" },
    ],
  }
}

// Architecture WITHOUT cache: TrafficSource → Database (baseline)
function buildNoCacheGraph(): SimGraph {
  return {
    nodes: [
      { id: "traffic", category: "traffic", effectiveMaxRps: 0, baseLatencyMs: 0, failureMode: "shed" },
      { id: "db", category: "data-storage", effectiveMaxRps: 500, baseLatencyMs: 5, failureMode: "shed" },
    ],
    edges: [{ source: "traffic", target: "db" }],
  }
}

describe("Cache Hit Ratio — E1 (TDD RED → GREEN)", () => {
  describe("RED: current behavior proves cache is just a pipe", () => {
    it("today, cache forwards ALL traffic to DB (1000 rps in, 1000 rps to DB)", () => {
      const graph = buildCacheDbGraph() // no cacheHitRatio field today
      const tick = simulateTick(graph, 0, 1000)

      const cacheTelemetry = tick.nodes.find((n) => n.nodeId === "cache")!
      const dbTelemetry = tick.nodes.find((n) => n.nodeId === "db")!

      // Cache receives 1000, serves 1000 (within its 50k capacity)
      expect(cacheTelemetry.incomingRps).toBe(1000)
      expect(cacheTelemetry.servedRps).toBe(1000)

      // TODAY: DB receives ALL 1000 (cache forwards everything it serves)
      // This proves the cache is just a pipe — it doesn't reduce DB load
      expect(dbTelemetry.incomingRps).toBe(1000)
      // DB can only handle 500 → sheds 500
      expect(dbTelemetry.servedRps).toBe(500)
      expect(dbTelemetry.failedRps).toBe(500)
    })

    it("today, DB is bottlenecked at 500 rps even with a cache in front", () => {
      const withCache = simulateTick(buildCacheDbGraph(), 0, 1000)
      const withoutCache = simulateTick(buildNoCacheGraph(), 0, 1000)

      const dbWithCache = withCache.nodes.find((n) => n.nodeId === "db")!
      const dbWithout = withoutCache.nodes.find((n) => n.nodeId === "db")!

      // TODAY: DB gets the SAME load with or without cache — cache does nothing useful
      expect(dbWithCache.incomingRps).toBe(dbWithout.incomingRps)
      expect(dbWithCache.failedRps).toBe(dbWithout.failedRps)
    })
  })

  describe("GREEN: with cacheHitRatio, cache bifurcates traffic", () => {
    it("cache with 0.8 hit ratio forwards only 20% to DB (200 of 1000 rps)", () => {
      const graph = buildCacheDbGraph(0.8)
      const tick = simulateTick(graph, 0, 1000)

      const cacheTelemetry = tick.nodes.find((n) => n.nodeId === "cache")!
      const dbTelemetry = tick.nodes.find((n) => n.nodeId === "db")!

      // Cache receives 1000, serves 1000 (hits + misses all "served" by the cache node)
      expect(cacheTelemetry.incomingRps).toBe(1000)
      expect(cacheTelemetry.servedRps).toBe(1000)
      expect(cacheTelemetry.failedRps).toBe(0)

      // DB receives ONLY the miss traffic: 1000 × (1 - 0.8) = 200
      expect(dbTelemetry.incomingRps).toBeCloseTo(200, 0)
      // DB can handle 500, so 200 is well within capacity → 0 failures
      expect(dbTelemetry.servedRps).toBeCloseTo(200, 0)
      expect(dbTelemetry.failedRps).toBe(0)
    })

    it("cache with 0.8 hit ratio eliminates DB bottleneck that exists without cache", () => {
      const withCache = simulateTick(buildCacheDbGraph(0.8), 0, 1000)
      const withoutCache = simulateTick(buildNoCacheGraph(), 0, 1000)

      const dbWithCache = withCache.nodes.find((n) => n.nodeId === "db")!
      const dbWithout = withoutCache.nodes.find((n) => n.nodeId === "db")!

      // Without cache: DB receives 1000, sheds 500 (bottleneck)
      expect(dbWithout.incomingRps).toBe(1000)
      expect(dbWithout.failedRps).toBe(500)

      // With cache: DB receives only 200, sheds 0 (no bottleneck!)
      expect(dbWithCache.incomingRps).toBeCloseTo(200, 0)
      expect(dbWithCache.failedRps).toBe(0)
    })

    it("cache hit ratio of 0 forwards everything (acts like a pipe)", () => {
      const graph = buildCacheDbGraph(0)
      const tick = simulateTick(graph, 0, 1000)
      const dbTelemetry = tick.nodes.find((n) => n.nodeId === "db")!
      // 0% hit ratio = all misses = all forwarded
      expect(dbTelemetry.incomingRps).toBe(1000)
    })

    it("cache hit ratio of 1.0 absorbs everything (nothing forwarded)", () => {
      const graph = buildCacheDbGraph(1.0)
      const tick = simulateTick(graph, 0, 1000)
      const dbTelemetry = tick.nodes.find((n) => n.nodeId === "db")!
      // 100% hit ratio = all hits = nothing forwarded
      expect(dbTelemetry.incomingRps).toBe(0)
    })

    it("overall system uptime improves when cache reduces DB load below capacity", () => {
      const withCache = simulateTick(buildCacheDbGraph(0.8), 0, 1000)
      const withoutCache = simulateTick(buildNoCacheGraph(), 0, 1000)

      // Without cache: system fails (DB sheds 500 of 1000)
      expect(withoutCache.totalFailedRps).toBe(500)

      // With cache: no system failures (DB well within capacity at 200)
      expect(withCache.totalFailedRps).toBe(0)
    })
  })
})
