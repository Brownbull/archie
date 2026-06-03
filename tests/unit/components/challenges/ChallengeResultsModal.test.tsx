import { describe, it, expect, beforeEach, afterEach, vi } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"
import type { Challenge, StarBreakdown, MeasuredAttempt } from "@/lib/challengeTypes"
import type { TickState } from "@/lib/simulationTypes"

// Control the scored inputs so auto-scoring is deterministic without a real engine run.
vi.mock("@/lib/simulationStats", async (orig) => {
  const actual = await orig<typeof import("@/lib/simulationStats")>()
  return { ...actual, computeSimStats: () => ({ uptimePercent: 100, avgLatencyMs: 10, p99LatencyMs: 50, currentRps: 0, servedRps: 0, failedRps: 0, totalServed: 0, totalFailed: 0 }) }
})
vi.mock("@/stores/architectureStoreHelpers", async (orig) => {
  const actual = await orig<typeof import("@/stores/architectureStoreHelpers")>()
  return { ...actual, computeTotalArchitectureCost: () => 80 }
})

// Control the suggestion independently of the engine; null by default so existing cases are unaffected.
let mockSuggestion: import("@/engine/suggestionEngine").SuggestionResult | null = null
vi.mock("@/hooks/useChallengeSuggestion", () => ({ useChallengeSuggestion: () => mockSuggestion }))
// Persistence needs auth context + Firestore; it has its own unit test + E2E coverage.
vi.mock("@/hooks/useAttemptPersistence", () => ({ useAttemptPersistence: () => undefined }))
vi.mock("@/hooks/useProgressPersistence", () => ({ useProgressPersistence: () => undefined }))
// Attempt comparison reads auth + the attempts store; control it directly (own unit test covers logic).
let mockPriorBest: import("@/schemas/attemptSchema").AttemptRecord | null = null
vi.mock("@/hooks/useAttemptComparison", () => ({ useAttemptComparison: () => mockPriorBest }))

import { ChallengeResultsModal } from "@/components/challenges/ChallengeResultsModal"
import { useChallengeStore } from "@/stores/challengeStore"
import { useSimulationStore } from "@/stores/simulationStore"
import { useArchitectureStore } from "@/stores/architectureStore"

const challenge: Challenge = {
  id: "c1", title: "HA Service", brief: "b", difficulty: "beginner", budgetCap: 100, durationSeconds: 60,
  trafficCurve: [{ t: 0, rps: 0 }, { t: 60, rps: 100 }],
  requiredComponents: ["compute"], targetMetrics: { uptimePercent: 99, p99LatencyMs: 200 },
  scheduledEvents: [], hints: [],
  schemaVersion: 2, requires: [], unlocks: [], requiredTypes: [], availableBlocks: [], grants: [], origin: "builtin",
}
const cs = () => useChallengeStore.getState()
const frame = (tick: number): TickState => ({ tick, targetRps: 100, nodes: [], totalServedRps: 100, totalFailedRps: 0 })

describe("ChallengeResultsModal (Epic 16 P4)", () => {
  beforeEach(() => {
    mockSuggestion = null
    mockPriorBest = null
    useChallengeStore.setState({ activeChallenge: null, attemptState: "idle", lastResult: null, lastMeasured: null, bestStars: {} })
    useSimulationStore.getState().reset()
    useArchitectureStore.setState({ nodes: [], topologyIssues: [], topologyIssuesByNodeId: new Map() })
  })
  afterEach(() => useSimulationStore.getState().reset())

  it("renders nothing until an attempt is scored", () => {
    render(<ChallengeResultsModal />)
    expect(screen.queryByTestId("challenge-results")).not.toBeInTheDocument()
  })

  it("auto-scores when the simulation finishes while the attempt is running (3★, clean+under budget)", () => {
    cs().selectChallenge(challenge)
    cs().startAttempt() // running
    // simulate a finished run: ticks present, status done, clean topology
    useSimulationStore.setState({ status: "done", ticks: [frame(0), frame(1)], currentTick: 1 })
    render(<ChallengeResultsModal />)
    // hook scored: uptime 100≥99, p99 50≤200 (pass), cost 80≤100 (under), 0 issues (clean) → 3★
    expect(cs().attemptState).toBe("scored")
    expect(cs().lastResult?.stars).toBe(3)
    // the snapshot of measured actuals is recorded for the modal
    expect(cs().lastMeasured).toEqual({ uptimePercent: 100, p99LatencyMs: 50, totalCost: 80, topologyIssueCount: 0 })
    expect(screen.getByTestId("challenge-results")).toBeInTheDocument()
    expect(screen.getByTestId("result-stars")).toHaveAttribute("aria-label", "3 of 3 stars")
    expect(screen.getByTestId("result-metrics")).toHaveAttribute("data-met", "true")
    expect(screen.getByTestId("result-under-budget")).toHaveAttribute("data-met", "true")
    expect(screen.getByTestId("result-clean-topology")).toHaveAttribute("data-met", "true")
  })

  it("renders a 0★ failed result with every criterion unmet", () => {
    useChallengeStore.setState({
      activeChallenge: challenge, attemptState: "scored",
      lastResult: { stars: 0, passedMetrics: false, underBudget: false, cleanTopology: false },
      lastMeasured: { uptimePercent: 82.3, p99LatencyMs: 640, totalCost: 250, topologyIssueCount: 1 },
    })
    render(<ChallengeResultsModal />)
    expect(screen.getByTestId("result-stars")).toHaveAttribute("aria-label", "0 of 3 stars")
    expect(screen.getByTestId("challenge-results")).toHaveTextContent("Targets not met")
    expect(screen.getByTestId("result-metrics")).not.toHaveAttribute("data-met")
    expect(screen.getByTestId("result-under-budget")).not.toHaveAttribute("data-met")
    expect(screen.getByTestId("result-clean-topology")).not.toHaveAttribute("data-met")
    expect(screen.getByTestId("result-clean-topology")).toHaveTextContent("1 issue") // singular
  })

  it("shows unmet criteria for a partial result", () => {
    const result: StarBreakdown = { stars: 1, passedMetrics: true, underBudget: false, cleanTopology: false }
    const measured: MeasuredAttempt = { uptimePercent: 99.4, p99LatencyMs: 150, totalCost: 320, topologyIssueCount: 2 }
    useChallengeStore.setState({ activeChallenge: challenge, attemptState: "scored", lastResult: result, lastMeasured: measured })
    render(<ChallengeResultsModal />)
    expect(screen.getByTestId("result-stars")).toHaveAttribute("aria-label", "1 of 3 stars")
    expect(screen.getByTestId("result-metrics")).toHaveAttribute("data-met", "true")
    expect(screen.getByTestId("result-under-budget")).not.toHaveAttribute("data-met")
    expect(screen.getByTestId("result-clean-topology")).not.toHaveAttribute("data-met")
    expect(screen.getByTestId("challenge-results")).toHaveTextContent("$320 of $100/mo")
    expect(screen.getByTestId("challenge-results")).toHaveTextContent("2 issues")
  })

  it("Retry re-enters build mode and clears the finished simulation", () => {
    useChallengeStore.setState({
      activeChallenge: challenge, attemptState: "scored",
      lastResult: { stars: 0, passedMetrics: false, underBudget: false, cleanTopology: false },
      lastMeasured: { uptimePercent: 90, p99LatencyMs: 300, totalCost: 50, topologyIssueCount: 0 },
    })
    useSimulationStore.setState({ status: "done", ticks: [frame(0)], currentTick: 0 })
    render(<ChallengeResultsModal />)
    fireEvent.click(screen.getByTestId("result-retry"))
    expect(cs().attemptState).toBe("building")
    expect(cs().activeChallenge?.id).toBe("c1")
    expect(useSimulationStore.getState().status).toBe("idle") // sim cleared
  })

  it("shows the 'try this next' suggestion card when the engine returns one", () => {
    mockSuggestion = {
      kind: "suggestion",
      best: { changeType: "add-replica", nodeId: "n-app", description: "Add a replica to App Server (1× → 2×)", uptimeDelta: 5, latencyDelta: -20, costDelta: 40 },
      baseline: { uptimePercent: 90, avgLatencyMs: 0, p99LatencyMs: 100, currentRps: 0, servedRps: 0, failedRps: 0, totalServed: 0, totalFailed: 0 },
      baselineCost: 40, considered: 3,
    }
    useChallengeStore.setState({
      activeChallenge: challenge, attemptState: "scored",
      lastResult: { stars: 1, passedMetrics: true, underBudget: false, cleanTopology: false },
      lastMeasured: { uptimePercent: 95, p99LatencyMs: 120, totalCost: 200, topologyIssueCount: 1 },
    })
    render(<ChallengeResultsModal />)
    expect(screen.getByTestId("suggestion-card")).toHaveAttribute("data-kind", "suggestion")
    expect(screen.getByTestId("suggestion-description")).toHaveTextContent("Add a replica to App Server")
  })

  describe("vs your past attempts (P4)", () => {
    it("hides the comparison section when there is no prior attempt", () => {
      mockPriorBest = null
      useChallengeStore.setState({
        activeChallenge: challenge, attemptState: "scored",
        lastResult: { stars: 2, passedMetrics: true, underBudget: true, cleanTopology: false },
        lastMeasured: { uptimePercent: 99, p99LatencyMs: 120, totalCost: 80, topologyIssueCount: 1 },
      })
      render(<ChallengeResultsModal />)
      expect(screen.queryByTestId("vs-past-attempts")).not.toBeInTheDocument()
    })

    it("renders deltas vs the prior best attempt", () => {
      mockPriorBest = {
        id: "prev", userId: "u1", challengeId: challenge.id, stars: 1,
        uptimePercent: 95, p99LatencyMs: 200, totalCost: 120, topologyIssueCount: 2, createdAt: 1000,
      }
      useChallengeStore.setState({
        activeChallenge: challenge, attemptState: "scored",
        lastResult: { stars: 3, passedMetrics: true, underBudget: true, cleanTopology: true },
        lastMeasured: { uptimePercent: 99, p99LatencyMs: 120, totalCost: 80, topologyIssueCount: 0 },
      })
      render(<ChallengeResultsModal />)
      expect(screen.getByTestId("vs-past-attempts")).toBeInTheDocument()
      expect(screen.getByTestId("vs-delta-cost")).toHaveAttribute("data-tone", "good")
      expect(screen.getByTestId("vs-delta-cost")).toHaveTextContent("40 $/mo")
      expect(screen.getByTestId("vs-delta-latency")).toHaveAttribute("data-tone", "good")
      expect(screen.getByTestId("vs-delta-uptime")).toHaveAttribute("data-tone", "good")
    })
  })

  it("Close returns to building mode (stays in challenge) and preserves sim data", () => {
    useChallengeStore.setState({
      activeChallenge: challenge, attemptState: "scored",
      lastResult: { stars: 3, passedMetrics: true, underBudget: true, cleanTopology: true },
      lastMeasured: { uptimePercent: 100, p99LatencyMs: 40, totalCost: 60, topologyIssueCount: 0 },
    })
    useSimulationStore.setState({ status: "done", ticks: [frame(0)], currentTick: 0 })
    render(<ChallengeResultsModal />)
    fireEvent.click(screen.getByTestId("result-close"))
    expect(cs().activeChallenge?.id).toBe("c1")
    expect(cs().attemptState).toBe("building")
    // Sim data is PRESERVED so the player can inspect the run
    expect(useSimulationStore.getState().status).toBe("done")
    expect(useSimulationStore.getState().ticks).toHaveLength(1)
  })
})
