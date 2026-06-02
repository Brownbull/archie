import { describe, it, expect } from "vitest"
import { simulateTick } from "@/engine/simulationEngine"
import type { SimGraph } from "@/lib/simulationTypes"

/**
 * TDD RED — Queue Backpressure (E5).
 *
 * Today: message queues shed excess traffic instantly (same as compute).
 * Desired: queues BUFFER burst traffic. Queue fills when incoming > drain rate,
 * adding latency proportional to depth. Only overflows (sheds) when buffer is full.
 *
 * Architecture: Traffic (3000 rps) → Queue (capacity 1000 drain/tick) → Worker (1000 rps)
 *
 * Today: queue capacity 1000, incoming 3000 → sheds 2000 instantly.
 * Desired: queue absorbs into buffer, latency grows with depth, sheds only on overflow.
 */

function buildQueueWorkerGraph(queueBufferSize?: number): SimGraph {
  return {
    nodes: [
      { id: "traffic", category: "traffic", effectiveMaxRps: 0, baseLatencyMs: 0, failureMode: "shed" },
      {
        id: "queue",
        category: "messaging",
        effectiveMaxRps: 1000, // drain rate per tick
        baseLatencyMs: 3,
        failureMode: "shed",
        ...(queueBufferSize !== undefined ? { queueBufferSize, queueDepth: 0 } : {}),
      },
      { id: "worker", category: "compute", effectiveMaxRps: 1000, baseLatencyMs: 15, failureMode: "shed" },
    ],
    edges: [
      { source: "traffic", target: "queue" },
      { source: "queue", target: "worker" },
    ],
  }
}

describe("Queue Backpressure — E5 (TDD RED → GREEN)", () => {
  describe("RED: today queues shed instantly like any other node", () => {
    it("today, queue with 1000 capacity sheds 2000 of 3000 rps instantly", () => {
      const tick = simulateTick(buildQueueWorkerGraph(), 0, 3000)
      const queue = tick.nodes.find((n) => n.nodeId === "queue")!
      expect(queue.incomingRps).toBe(3000)
      expect(queue.servedRps).toBe(1000)
      expect(queue.failedRps).toBe(2000) // instant shed, no buffering
    })
  })

  describe("GREEN: with buffer, queue absorbs burst and grows latency", () => {
    it("queue with buffer absorbs burst — fewer failures than without buffer", () => {
      const tick = simulateTick(buildQueueWorkerGraph(5000), 0, 3000)
      const queue = tick.nodes.find((n) => n.nodeId === "queue")!
      // Queue drains 1000/tick, incoming 3000 → 2000 buffered, 0 shed (buffer has room)
      expect(queue.servedRps).toBe(1000) // drain rate
      expect(queue.failedRps).toBe(0) // buffered, not shed
    })

    it("queue latency increases with buffer depth", () => {
      const tick = simulateTick(buildQueueWorkerGraph(5000), 0, 3000)
      const queue = tick.nodes.find((n) => n.nodeId === "queue")!
      // Base 3ms + buffering overhead: 2000 items in buffer adds latency
      expect(queue.latencyMs).toBeGreaterThan(3)
    })

    it("queue overflows when buffer is full — then it sheds", () => {
      // Buffer of 500, incoming 3000, drain 1000 → need to buffer 2000, only room for 500
      const tick = simulateTick(buildQueueWorkerGraph(500), 0, 3000)
      const queue = tick.nodes.find((n) => n.nodeId === "queue")!
      // Drain 1000 + buffer 500 = handle 1500, shed 1500
      expect(queue.servedRps).toBe(1000) // drain
      expect(queue.failedRps).toBe(1500) // overflow (2000 excess - 500 buffer)
    })

    it("worker receives only the drain rate, not the full burst", () => {
      const tick = simulateTick(buildQueueWorkerGraph(5000), 0, 3000)
      const worker = tick.nodes.find((n) => n.nodeId === "worker")!
      // Queue drains 1000, forwards 1000 to worker
      expect(worker.incomingRps).toBe(1000)
    })

    it("without buffer field, queue behaves as today (backward compatible)", () => {
      const tick = simulateTick(buildQueueWorkerGraph(), 0, 3000)
      const queue = tick.nodes.find((n) => n.nodeId === "queue")!
      expect(queue.failedRps).toBe(2000) // same as before
    })
  })
})
