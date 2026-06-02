import { describe, it, expect } from "vitest"
import { simulateTick } from "@/engine/simulationEngine"
import type { SimGraph } from "@/lib/simulationTypes"

/**
 * TDD — Protocol Overhead (E7).
 *
 * Different protocols add different latency overhead. HTTP (REST/JSON) is
 * heavier than gRPC (binary) which is heavier than raw TCP.
 */

function buildNodeWithProtocol(protocolOverhead?: number): SimGraph {
  return {
    nodes: [
      { id: "traffic", category: "traffic", effectiveMaxRps: 0, baseLatencyMs: 0, failureMode: "shed" },
      {
        id: "service",
        category: "compute",
        effectiveMaxRps: 5000,
        baseLatencyMs: 10,
        failureMode: "shed",
        ...(protocolOverhead !== undefined ? { protocolOverheadMs: protocolOverhead } : {}),
      },
    ],
    edges: [{ source: "traffic", target: "service" }],
  }
}

describe("Protocol Overhead — E7 (TDD RED → GREEN)", () => {
  it("RED: today, all nodes have same latency regardless of protocol", () => {
    const tick = simulateTick(buildNodeWithProtocol(), 0, 1000)
    const svc = tick.nodes.find((n) => n.nodeId === "service")!
    expect(svc.latencyMs).toBe(10) // just baseLatencyMs
  })

  it("GREEN: node with protocolOverheadMs adds it to base latency", () => {
    const tick = simulateTick(buildNodeWithProtocol(5), 0, 1000)
    const svc = tick.nodes.find((n) => n.nodeId === "service")!
    expect(svc.latencyMs).toBe(15) // 10 base + 5 protocol
  })

  it("HTTP overhead (5ms) vs gRPC (1ms) vs TCP (0ms)", () => {
    const http = simulateTick(buildNodeWithProtocol(5), 0, 1000)
    const grpc = simulateTick(buildNodeWithProtocol(1), 0, 1000)
    const tcp = simulateTick(buildNodeWithProtocol(0), 0, 1000)

    expect(http.nodes.find((n) => n.nodeId === "service")!.latencyMs).toBe(15)
    expect(grpc.nodes.find((n) => n.nodeId === "service")!.latencyMs).toBe(11)
    expect(tcp.nodes.find((n) => n.nodeId === "service")!.latencyMs).toBe(10)
  })

  it("no protocolOverheadMs field = backward compatible (no addition)", () => {
    const tick = simulateTick(buildNodeWithProtocol(), 0, 1000)
    expect(tick.nodes.find((n) => n.nodeId === "service")!.latencyMs).toBe(10)
  })
})
