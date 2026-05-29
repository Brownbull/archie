import { describe, it, expect, beforeEach, afterEach, vi } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"
import { ChallengeStartButton } from "@/components/challenges/ChallengeStartButton"
import { useChallengeStore } from "@/stores/challengeStore"
import { useSimulationStore } from "@/stores/simulationStore"
import { useArchitectureStore } from "@/stores/architectureStore"
import { makeNode } from "../../../helpers/factories"
import type { Challenge } from "@/lib/challengeTypes"

const challenge: Challenge = {
  id: "c1", title: "Test", brief: "b", difficulty: "beginner", budgetCap: 100, durationSeconds: 60,
  trafficCurve: [{ t: 0, rps: 0 }, { t: 60, rps: 100 }],
  requiredComponents: ["compute"], targetMetrics: { uptimePercent: 99, p99LatencyMs: 200 },
  scheduledEvents: [{ type: "component_failure", target: "x", t: 30, durationS: 10 }], hints: [],
}

const cs = () => useChallengeStore.getState()

describe("ChallengeStartButton (Epic 16 P4)", () => {
  beforeEach(() => {
    useChallengeStore.setState({ activeChallenge: null, attemptState: "idle", lastResult: null, lastMeasured: null, bestStars: {} })
    useSimulationStore.getState().reset()
    useArchitectureStore.setState({ nodes: [makeNode({ id: "n0" })] })
  })
  afterEach(() => {
    useSimulationStore.getState().reset()
  })

  it("is hidden outside challenge mode", () => {
    render(<ChallengeStartButton />)
    expect(screen.queryByTestId("start-challenge")).not.toBeInTheDocument()
  })

  it("is hidden when the canvas is empty", () => {
    useArchitectureStore.setState({ nodes: [] })
    cs().selectChallenge(challenge)
    render(<ChallengeStartButton />)
    expect(screen.queryByTestId("start-challenge")).not.toBeInTheDocument()
  })

  it("shows in challenge build mode and starts the attempt + simulation on click", () => {
    // Stub start so no real engine run / playback interval fires during the assertion.
    const startSpy = vi.spyOn(useSimulationStore.getState(), "start").mockImplementation(() => {})
    cs().selectChallenge(challenge) // building
    render(<ChallengeStartButton />)
    expect(screen.getByTestId("start-challenge")).toBeInTheDocument()
    fireEvent.click(screen.getByTestId("start-challenge"))
    // attempt moved running and the sim was started with the challenge's curve + events
    expect(cs().attemptState).toBe("running")
    expect(startSpy).toHaveBeenCalledTimes(1)
    const [, curve, events, durationS] = startSpy.mock.calls[0]
    expect(curve).toEqual(challenge.trafficCurve)
    expect(events).toEqual(challenge.scheduledEvents)
    expect(durationS).toBe(challenge.durationSeconds) // authored duration honored, not the 90s default
    // a start-time cost/topology snapshot is recorded for decoupled scoring
    expect(cs().attemptSnapshot).not.toBeNull()
    expect(cs().attemptSnapshot?.topologyIssueCount).toBe(0)
    expect(typeof cs().attemptSnapshot?.totalCost).toBe("number")
  })

  it("is hidden once the attempt is already running", () => {
    cs().selectChallenge(challenge)
    cs().startAttempt() // running
    render(<ChallengeStartButton />)
    expect(screen.queryByTestId("start-challenge")).not.toBeInTheDocument()
  })
})
