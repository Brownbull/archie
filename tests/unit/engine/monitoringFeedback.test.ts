import { describe, it, expect } from "vitest"
import { simulateTick, computeOverrides } from "@/engine/simulationEngine"
import type { SimGraph, ScheduledEvent } from "@/lib/simulationTypes"

/**
 * Monitoring Feedback (E8 → EN7, D74).
 *
 * Observability earns its keep by shrinking a failure's BLAST RADIUS, not by recovering faster.
 * A monitored failure runs its FULL duration, but after a detection delay (OBS_DETECT_DELAY_S) the
 * blast drops to OBS_RESIDUAL_BLAST and the node serves the rest. Unmonitored failures stay fully
 * offline for the whole window.
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

describe("Monitoring Feedback — EN7 blast-radius model (D74)", () => {
  const events: ScheduledEvent[] = [{ t: 0, type: "component_failure", target: "compute", durationS: 30 }]

  it("before detection (within OBS_DETECT_DELAY_S), a monitored failure is full-blast offline", () => {
    const g = buildWithMonitoring(true)
    const ov = computeOverrides(g.nodes, events, 3, g.edges) // t=3 < 5s detection delay
    expect(ov.offlineNodeIds.has("compute")).toBe(true)
    expect(ov.capacityFactors?.has("compute")).toBe(false)
  })

  it("after detection, a monitored failure is MITIGATED — partial capacity, not offline", () => {
    const g = buildWithMonitoring(true)
    const ov = computeOverrides(g.nodes, events, 15, g.edges) // t=15 ≥ 5s → detected
    expect(ov.offlineNodeIds.has("compute")).toBe(false) // no longer fully down
    expect(ov.capacityFactors?.get("compute")).toBeCloseTo(1 - 0.6, 6) // serves (1−residual) = 40%
  })

  it("an UNmonitored failure stays fully offline for the whole window", () => {
    const g = buildWithMonitoring(false)
    expect(computeOverrides(g.nodes, events, 15, g.edges).offlineNodeIds.has("compute")).toBe(true)
    expect(computeOverrides(g.nodes, events, 29, g.edges).offlineNodeIds.has("compute")).toBe(true)
  })

  it("monitoring shrinks the blast but NOT the duration — recovers only at full durationS", () => {
    const g = buildWithMonitoring(true)
    const at29 = computeOverrides(g.nodes, events, 29, g.edges) // still in window, mitigated
    expect(at29.capacityFactors?.get("compute")).toBeCloseTo(0.4, 6)
    const at30 = computeOverrides(g.nodes, events, 30, g.edges) // window over → recovered
    expect(at30.offlineNodeIds.has("compute")).toBe(false)
    expect(at30.capacityFactors?.has("compute")).toBe(false)
  })
})
