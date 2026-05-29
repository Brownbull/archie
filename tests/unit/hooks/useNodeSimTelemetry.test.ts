import { describe, it, expect, afterEach } from "vitest"
import { renderHook } from "@testing-library/react"
import { useNodeSimTelemetry, simCapacityColorClass } from "@/hooks/useNodeSimTelemetry"
import { useSimulationStore } from "@/stores/simulationStore"
import type { TickState, NodeTelemetry } from "@/lib/simulationTypes"

const teleNode = (nodeId: string, o: Partial<NodeTelemetry> = {}): NodeTelemetry => ({
  nodeId,
  incomingRps: 0,
  servedRps: 0,
  failedRps: 0,
  latencyMs: 5,
  capacityPercent: 0,
  overloaded: false,
  ...o,
})
const frame = (tick: number, nodes: NodeTelemetry[]): TickState => ({
  tick,
  targetRps: 100,
  nodes,
  totalServedRps: 0,
  totalFailedRps: 0,
})

describe("useNodeSimTelemetry", () => {
  afterEach(() => useSimulationStore.getState().reset())

  it("returns null when no simulation is active (idle)", () => {
    const { result } = renderHook(() => useNodeSimTelemetry("n1"))
    expect(result.current).toBeNull()
  })

  it("returns the node's telemetry at the current tick", () => {
    useSimulationStore.setState({
      status: "running",
      currentTick: 1,
      ticks: [
        frame(0, [teleNode("n1", { incomingRps: 10, capacityPercent: 0.1 })]),
        frame(1, [teleNode("n1", { incomingRps: 80, latencyMs: 12, capacityPercent: 0.8 })]),
      ],
    })
    const { result } = renderHook(() => useNodeSimTelemetry("n1"))
    expect(result.current?.incomingRps).toBe(80)
    expect(result.current?.capacityPercent).toBe(0.8)
  })

  it("returns null for a node absent from the current tick", () => {
    useSimulationStore.setState({ status: "running", currentTick: 0, ticks: [frame(0, [teleNode("other")])] })
    const { result } = renderHook(() => useNodeSimTelemetry("missing"))
    expect(result.current).toBeNull()
  })
})

describe("simCapacityColorClass", () => {
  it("is green below 70%", () => {
    expect(simCapacityColorClass(0)).toBe("bg-green-500")
    expect(simCapacityColorClass(0.69)).toBe("bg-green-500")
  })
  it("is yellow from 70% to under 100%", () => {
    expect(simCapacityColorClass(0.7)).toBe("bg-yellow-500")
    expect(simCapacityColorClass(0.99)).toBe("bg-yellow-500")
  })
  it("is red at or above 100%", () => {
    expect(simCapacityColorClass(1)).toBe("bg-red-500")
    expect(simCapacityColorClass(2.5)).toBe("bg-red-500")
  })
})
