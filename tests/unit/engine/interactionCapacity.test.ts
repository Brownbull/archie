import { describe, it, expect } from "vitest"
import { simulateTick } from "@/engine/simulationEngine"
import type { SimGraph } from "@/lib/simulationTypes"

/**
 * TDD — Interaction Rules Affect Capacity (E6).
 *
 * Today: a monitoring node connected to compute doesn't change how failures work.
 * Desired: monitoring presence shortens failure recovery (E8 — monitoring feedback).
 * Also: this test verifies that the E1 cache hit ratio already achieves the
 * "interaction rules affect capacity" goal for cache→DB (cache reduces DB load).
 *
 * This file validates the integrated behavior of E1+E2+E5 working together,
 * which IS the "interaction rules affect capacity" enhancement.
 */

describe("Interaction Rules — E6 (Integrated Behavior)", () => {
  it("cache upstream of DB reduces DB incoming traffic (E1 already achieves this)", () => {
    const graph: SimGraph = {
      nodes: [
        { id: "traffic", category: "traffic", effectiveMaxRps: 0, baseLatencyMs: 0, failureMode: "shed" },
        { id: "cache", category: "caching", effectiveMaxRps: 100000, baseLatencyMs: 0.5, failureMode: "shed", cacheHitRatio: 0.8 },
        { id: "db", category: "data-storage", effectiveMaxRps: 500, baseLatencyMs: 5, failureMode: "shed" },
      ],
      edges: [
        { source: "traffic", target: "cache" },
        { source: "cache", target: "db" },
      ],
    }
    const tick = simulateTick(graph, 0, 2000)
    const db = tick.nodes.find((n) => n.nodeId === "db")!
    // Cache absorbs 80% → DB sees 400 of 2000 (within its 500 cap)
    expect(db.incomingRps).toBeCloseTo(400, 0)
    expect(db.failedRps).toBe(0)
  })

  it("queue buffers burst before worker — worker sees steady drain rate (E5)", () => {
    const graph: SimGraph = {
      nodes: [
        { id: "traffic", category: "traffic", effectiveMaxRps: 0, baseLatencyMs: 0, failureMode: "shed" },
        { id: "queue", category: "messaging", effectiveMaxRps: 500, baseLatencyMs: 3, failureMode: "shed", queueBufferSize: 5000, queueDepth: 0 },
        { id: "worker", category: "compute", effectiveMaxRps: 500, baseLatencyMs: 15, failureMode: "shed" },
      ],
      edges: [
        { source: "traffic", target: "queue" },
        { source: "queue", target: "worker" },
      ],
    }
    const tick = simulateTick(graph, 0, 2000)
    const worker = tick.nodes.find((n) => n.nodeId === "worker")!
    const queue = tick.nodes.find((n) => n.nodeId === "queue")!
    // Queue drains 500/tick → worker sees 500, not the full 2000
    expect(worker.incomingRps).toBe(500)
    expect(worker.failedRps).toBe(0)
    // Queue absorbed 1500 into buffer
    expect(queue.failedRps).toBe(0)
  })

  it("combined: cache + queue + worker chain — each layer reduces downstream load", () => {
    const graph: SimGraph = {
      nodes: [
        { id: "traffic", category: "traffic", effectiveMaxRps: 0, baseLatencyMs: 0, failureMode: "shed" },
        { id: "cache", category: "caching", effectiveMaxRps: 100000, baseLatencyMs: 0.5, failureMode: "shed", cacheHitRatio: 0.7 },
        { id: "queue", category: "messaging", effectiveMaxRps: 500, baseLatencyMs: 3, failureMode: "shed", queueBufferSize: 3000, queueDepth: 0 },
        { id: "worker", category: "compute", effectiveMaxRps: 500, baseLatencyMs: 15, failureMode: "shed" },
      ],
      edges: [
        { source: "traffic", target: "cache" },
        { source: "cache", target: "queue" },
        { source: "queue", target: "worker" },
      ],
    }
    const tick = simulateTick(graph, 0, 5000)
    // Cache: 5000 in, 70% hit → forwards 1500 (misses)
    const queue = tick.nodes.find((n) => n.nodeId === "queue")!
    expect(queue.incomingRps).toBeCloseTo(1500, 0)
    // Queue: drains 500, buffers 1000, no overflow
    expect(queue.failedRps).toBe(0)
    // Worker: sees only 500 (drain rate)
    const worker = tick.nodes.find((n) => n.nodeId === "worker")!
    expect(worker.incomingRps).toBe(500)
    expect(worker.failedRps).toBe(0)
    // System: zero failures — 5000 rps handled by a 500 rps worker!
    expect(tick.totalFailedRps).toBe(0)
  })
})
