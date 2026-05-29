import { describe, it, expect, beforeEach, afterEach, vi } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"
import { RunSimulationButton } from "@/components/canvas/RunSimulationButton"
import { useSimulationStore } from "@/stores/simulationStore"
import type { SimGraph, TrafficCurve } from "@/lib/simulationTypes"

let mockNodes: unknown[] = []
let mockActiveScenarioId: string | null = null
let mockScenarioCurve: TrafficCurve | undefined

vi.mock("@/stores/architectureStore", () => ({
  useArchitectureStore: Object.assign(
    (selector: (s: { nodes: unknown[] }) => unknown) => selector({ nodes: mockNodes }),
    { getState: () => ({ nodes: mockNodes, edges: [] as unknown[], activeScenarioId: mockActiveScenarioId }) },
  ),
}))

const simGraph: SimGraph = {
  nodes: [{ id: "n1", category: "compute", effectiveMaxRps: 80, baseLatencyMs: 10, failureMode: "shed" }],
  edges: [],
}
vi.mock("@/stores/architectureStoreHelpers", () => ({ buildSimGraph: vi.fn(() => simGraph) }))
vi.mock("@/services/scenarioLoader", () => ({
  getScenarioPreset: vi.fn(() => (mockScenarioCurve ? { trafficCurve: mockScenarioCurve } : undefined)),
}))

const s = () => useSimulationStore.getState()

describe("RunSimulationButton (Epic 15)", () => {
  beforeEach(() => {
    vi.useFakeTimers()
    s().reset()
    mockNodes = []
    mockActiveScenarioId = null
    mockScenarioCurve = undefined
  })
  afterEach(() => {
    s().reset()
    vi.clearAllTimers()
    vi.useRealTimers()
  })

  it("is hidden when the canvas is empty", () => {
    render(<RunSimulationButton />)
    expect(screen.queryByTestId("run-simulation")).not.toBeInTheDocument()
  })

  it("shows when idle with nodes on the canvas", () => {
    mockNodes = [{ id: "n1" }]
    render(<RunSimulationButton />)
    expect(screen.getByTestId("run-simulation")).toBeInTheDocument()
  })

  it("is hidden while a simulation is already running", () => {
    mockNodes = [{ id: "n1" }]
    useSimulationStore.setState({ status: "running" })
    render(<RunSimulationButton />)
    expect(screen.queryByTestId("run-simulation")).not.toBeInTheDocument()
  })

  it("starts a simulation on click using the default curve when no scenario", () => {
    mockNodes = [{ id: "n1" }]
    render(<RunSimulationButton />)
    fireEvent.click(screen.getByTestId("run-simulation"))
    expect(s().status).toBe("running")
    expect(s().ticks.length).toBeGreaterThan(0)
    expect(s().entryNodeIds).toEqual(["n1"])
  })

  it("uses the active scenario's traffic curve when present", () => {
    mockNodes = [{ id: "n1" }]
    mockActiveScenarioId = "peak"
    mockScenarioCurve = [{ t: 0, rps: 200 }, { t: 90, rps: 200 }] // constant 200
    render(<RunSimulationButton />)
    fireEvent.click(screen.getByTestId("run-simulation"))
    // constant 200 RPS curve → first tick targets 200 (default ramp would be 0)
    expect(s().ticks[0].targetRps).toBe(200)
  })
})
