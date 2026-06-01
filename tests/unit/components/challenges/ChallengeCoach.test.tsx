import { describe, it, expect, beforeEach } from "vitest"
import { render, screen } from "@testing-library/react"
import { ChallengeCoach } from "@/components/challenges/ChallengeCoach"
import { useChallengeStore } from "@/stores/challengeStore"
import { useArchitectureStore } from "@/stores/architectureStore"
import type { Challenge } from "@/lib/challengeTypes"

function makeChallenge(over: Partial<Challenge> = {}): Challenge {
  return {
    id: "c1", title: "Test", brief: "b", difficulty: "beginner",
    budgetCap: 100, durationSeconds: 60, trafficCurve: [{ t: 0, rps: 0 }],
    requiredComponents: ["compute"], targetMetrics: { uptimePercent: 99, p99LatencyMs: 200 },
    scheduledEvents: [], hints: [], ...over,
  }
}

describe("ChallengeCoach (P88)", () => {
  beforeEach(() => {
    useChallengeStore.setState({ activeChallenge: null, attemptState: "idle", lastResult: null, lastMeasured: null })
    useArchitectureStore.setState({ nodes: [], topologyIssues: [] } as never)
  })

  it("renders nothing outside challenge mode", () => {
    const { container } = render(<ChallengeCoach />)
    expect(container).toBeEmptyDOMElement()
  })

  it("renders the stage chip + headline for the current step", () => {
    useChallengeStore.setState({ activeChallenge: makeChallenge(), attemptState: "building" })
    render(<ChallengeCoach />)
    const card = screen.getByTestId("challenge-coach")
    expect(card).toHaveAttribute("data-mode", "tackle")
    expect(card).toHaveTextContent(/tackle/i)
    expect(screen.getByTestId("challenge-coach-headline")).toHaveTextContent("Add a traffic source")
  })

  it("reflects the watch stage while running", () => {
    useChallengeStore.setState({ activeChallenge: makeChallenge(), attemptState: "running" })
    render(<ChallengeCoach />)
    expect(screen.getByTestId("challenge-coach")).toHaveAttribute("data-mode", "watch")
    expect(screen.getByTestId("challenge-coach-headline")).toHaveTextContent("Watch the live stats")
  })
})
