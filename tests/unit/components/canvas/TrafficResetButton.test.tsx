import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"

vi.mock("@/lib/firebase", () => ({ db: {}, auth: { currentUser: null } }))
vi.mock("sonner", () => ({ toast: { success: vi.fn(), warning: vi.fn(), error: vi.fn() } }))

import { TrafficResetButton } from "@/components/canvas/TrafficResetButton"
import { useArchitectureStore } from "@/stores/architectureStore"
import { useChallengeStore } from "@/stores/challengeStore"
import type { Challenge } from "@/lib/challengeTypes"

const challenge = {
  id: "c1", title: "T", brief: "b", difficulty: "beginner", budgetCap: 100, durationSeconds: 60,
  trafficCurve: [{ t: 0, rps: 0 }], requiredComponents: ["compute"],
  targetMetrics: { uptimePercent: 95, p99LatencyMs: 400 }, scheduledEvents: [], hints: [],
  schemaVersion: 2, requires: [], unlocks: [], minXp: 0, requiredTypes: [], availableBlocks: [], grants: [],
  origin: "builtin",
  trafficSources: [{ type: "web-users", rps: 120, kind: "realistic", workload: "mixed", origin: "one-region" }],
} as unknown as Challenge

const trafficNode = (over: Record<string, unknown> = {}) => ({
  id: "t1",
  data: { componentCategory: "traffic", trafficRps: 120, trafficKind: "realistic", trafficWorkload: "mixed", trafficOrigin: "one-region", ...over },
})

describe("TrafficResetButton (2026-06-11 playtest)", () => {
  beforeEach(() => {
    useChallengeStore.setState({ activeChallenge: challenge })
    useArchitectureStore.setState({ nodes: [trafficNode()] } as never)
  })

  it("idle (matching spec): rendered but not dirty", () => {
    render(<TrafficResetButton />)
    const btn = screen.getByTestId("traffic-reset")
    expect(btn).not.toHaveAttribute("data-dirty")
  })

  it("deviated dials highlight it; clicking restores the authored spec in place", () => {
    const setRps = vi.fn()
    const setKind = vi.fn()
    const setWorkload = vi.fn()
    const setOrigin = vi.fn()
    useArchitectureStore.setState({
      nodes: [trafficNode({ trafficRps: 9000, trafficKind: "periodic" })],
      setNodeTrafficRps: setRps, setNodeTrafficKind: setKind, setNodeWorkload: setWorkload, setNodeOrigin: setOrigin,
    } as never)
    render(<TrafficResetButton />)
    const btn = screen.getByTestId("traffic-reset")
    expect(btn).toHaveAttribute("data-dirty", "true")
    fireEvent.click(btn)
    expect(setRps).toHaveBeenCalledWith("t1", 120)
    expect(setKind).toHaveBeenCalledWith("t1", "realistic")
    expect(setWorkload).toHaveBeenCalledWith("t1", "mixed")
    expect(setOrigin).toHaveBeenCalledWith("t1", "one-region")
  })

  it("hidden outside a quest (no authored spec to reset to)", () => {
    useChallengeStore.setState({ activeChallenge: null })
    render(<TrafficResetButton />)
    expect(screen.queryByTestId("traffic-reset")).toBeNull()
  })
})

describe("rps free input (D101 UI gap, 2026-06-11)", () => {
  it("the readout opens an input; Enter commits an exact value", async () => {
    const { TrafficNodeControls } = await import("@/components/canvas/TrafficNodeControls")
    const setRps = vi.fn()
    useArchitectureStore.setState({ setNodeTrafficRps: setRps } as never)
    render(<TrafficNodeControls nodeId="t1" data={{ componentCategory: "traffic", trafficRps: 120, trafficKind: "realistic" } as never} />)
    fireEvent.click(screen.getByTestId("rps-stepper-value"))
    const input = screen.getByTestId("rps-input")
    fireEvent.keyDown(input, { key: "Enter", target: { value: "1100" } })
    expect(setRps).toHaveBeenCalledWith("t1", 1100)
  })

  it("garbage and out-of-range values never commit", async () => {
    const { TrafficNodeControls } = await import("@/components/canvas/TrafficNodeControls")
    const setRps = vi.fn()
    useArchitectureStore.setState({ setNodeTrafficRps: setRps } as never)
    render(<TrafficNodeControls nodeId="t1" data={{ componentCategory: "traffic", trafficRps: 120, trafficKind: "realistic" } as never} />)
    fireEvent.click(screen.getByTestId("rps-stepper-value"))
    fireEvent.keyDown(screen.getByTestId("rps-input"), { key: "Enter", target: { value: "-5" } })
    expect(setRps).not.toHaveBeenCalled()
  })
})
