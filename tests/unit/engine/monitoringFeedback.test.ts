import { describe, it, expect } from "vitest"
import { simulateTick, computeOverrides } from "@/engine/simulationEngine"
import type { SimGraph, ScheduledEvent } from "@/lib/simulationTypes"

/**
 * TDD — Monitoring Feedback (E8).
 *
 * When monitoring is connected to a failing node and the `monitoringAidsRecovery`
 * flag is set, the failure duration is shortened. Without monitoring, failures
 * last their full scheduled duration (or even ×1.5 longer with the penalty).
 */

function buildWithMonitoring(hasMonitoring: boolean): SimGraph {
  const nodes = [
    { id: "traffic", category: "traffic" as const, effectiveMaxRps: 0, baseLatencyMs: 0, failureMode: "shed" as const },
    { id: "compute", category: "compute" as const, effectiveMaxRps: 1000, baseLatencyMs: 10, failureMode: "shed" as const },
  ]
  const edges = [{ source: "traffic", target: "compute" }]
  if (hasMonitoring) {
    nodes.push({ id: "monitor", category: "monitoring" as const, effectiveMaxRps: 10000, baseLatencyMs: 2, failureMode: "shed" as const })
    edges.push({ source: "compute", target: "monitor" })
  }
  return { nodes, edges }
}

describe("Monitoring Feedback — E8 (TDD RED → GREEN)", () => {
  it("RED: today, failure duration is the same with or without monitoring", () => {
    const events: ScheduledEvent[] = [{ t: 0, type: "component_failure", target: "compute", durationS: 30 }]

    const withMon = computeOverrides(buildWithMonitoring(true).nodes, events, 15)
    const withoutMon = computeOverrides(buildWithMonitoring(false).nodes, events, 15)

    // At t=15 (within the 30s window), compute is offline in BOTH cases
    expect(withMon.offlineNodeIds.has("compute")).toBe(true)
    expect(withoutMon.offlineNodeIds.has("compute")).toBe(true)
  })

  it("GREEN: with monitoring + monitoringAidsRecovery, failure recovers 33% faster", () => {
    // 30s failure, with monitoring → recovers at 20s (33% faster)
    const events: ScheduledEvent[] = [{ t: 0, type: "component_failure", target: "compute", durationS: 30 }]
    const graph = buildWithMonitoring(true)

    // At t=25, with monitoring the node should be recovered (30 × 0.67 = ~20s)
    const overrides = computeOverrides(graph.nodes, events, 25, graph.edges)
    expect(overrides.offlineNodeIds.has("compute")).toBe(false) // recovered early!

    // At t=25 WITHOUT monitoring, still offline
    const noMonGraph = buildWithMonitoring(false)
    const noMonOverrides = computeOverrides(noMonGraph.nodes, events, 25, noMonGraph.edges)
    expect(noMonOverrides.offlineNodeIds.has("compute")).toBe(true) // still down
  })

  it("without monitoring, failure lasts full duration", () => {
    const events: ScheduledEvent[] = [{ t: 0, type: "component_failure", target: "compute", durationS: 30 }]
    const graph = buildWithMonitoring(false)

    // At t=29, still offline
    const overrides = computeOverrides(graph.nodes, events, 29, graph.edges)
    expect(overrides.offlineNodeIds.has("compute")).toBe(true)

    // At t=30, recovered
    const overrides30 = computeOverrides(graph.nodes, events, 30, graph.edges)
    expect(overrides30.offlineNodeIds.has("compute")).toBe(false)
  })
})
