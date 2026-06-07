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

// LX3 par benchmark — fixed for "c1" so the assertion is decoupled from the generated par values.
vi.mock("@/lib/challengePar", () => ({ getChallengePar: (id: string) => (id === "c1" ? { cost: 100, nodes: 4 } : undefined) }))

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
import { useUiStore } from "@/stores/uiStore"

const challenge: Challenge = {
  id: "c1", title: "HA Service", brief: "b", difficulty: "beginner", budgetCap: 100, durationSeconds: 60,
  trafficCurve: [{ t: 0, rps: 0 }, { t: 60, rps: 100 }],
  requiredComponents: ["compute"], targetMetrics: { uptimePercent: 99, p99LatencyMs: 200 },
  scheduledEvents: [], hints: [],
  schemaVersion: 2, requires: [], unlocks: [], minXp: 0, requiredTypes: [], availableBlocks: [], grants: [], origin: "builtin",
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
    useUiStore.setState({ questLogOpen: false, challengesOpen: false })
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
    expect(cs().lastMeasured).toMatchObject({ uptimePercent: 100, p99LatencyMs: 50, totalCost: 80, topologyIssueCount: 0 })
    // ED7: cost-efficiency = $/M-req at peak (peak 100 rps, $80/mo) ≈ 0.309.
    expect(cs().lastMeasured?.costPerRequest).toBeCloseTo(0.3086, 3)
    expect(screen.getByTestId("challenge-results")).toBeInTheDocument()
    expect(screen.getByTestId("result-stars")).toHaveAttribute("aria-label", "3 of 3 stars")
    expect(screen.getByTestId("result-metrics")).toHaveAttribute("data-met", "true")
    expect(screen.getByTestId("result-under-budget")).toHaveAttribute("data-met", "true")
    expect(screen.getByTestId("result-well-formed")).toHaveAttribute("data-met", "true")
  })

  it("renders a 0★ failed result with every criterion unmet", () => {
    useChallengeStore.setState({
      activeChallenge: challenge, attemptState: "scored",
      lastResult: { stars: 0, passedMetrics: false, underBudget: false, cleanTopology: false, resilient: false },
      lastMeasured: { uptimePercent: 82.3, p99LatencyMs: 640, totalCost: 250, topologyIssueCount: 1 },
    })
    render(<ChallengeResultsModal />)
    expect(screen.getByTestId("result-stars")).toHaveAttribute("aria-label", "0 of 3 stars")
    expect(screen.getByTestId("challenge-results")).toHaveTextContent("Targets not met")
    expect(screen.getByTestId("result-metrics")).not.toHaveAttribute("data-met")
    expect(screen.getByTestId("result-under-budget")).not.toHaveAttribute("data-met")
    expect(screen.getByTestId("result-well-formed")).not.toHaveAttribute("data-met")
    expect(screen.getByTestId("result-well-formed")).toHaveTextContent("1 disconnected node") // singular
    // resilient is false ⇒ no bonus badge
    expect(screen.queryByTestId("result-resilient-badge")).toBeNull()
  })

  it("names the culprit tier when metrics fail (LX2)", () => {
    useChallengeStore.setState({
      activeChallenge: challenge, attemptState: "scored",
      lastResult: { stars: 0, passedMetrics: false, underBudget: false, cleanTopology: true, resilient: false },
      lastMeasured: { uptimePercent: 88, p99LatencyMs: 500, totalCost: 200, topologyIssueCount: 0, bottleneck: { typeId: "compute", capacityPercent: 1.8, failedRps: 5000 } },
    })
    render(<ChallengeResultsModal />)
    const callout = screen.getByTestId("result-bottleneck")
    expect(callout).toHaveTextContent("Compute")
    expect(callout).toHaveTextContent("180%")
  })

  it("shows the lean-reference par and flags beating it (LX3)", () => {
    useChallengeStore.setState({
      activeChallenge: challenge, attemptState: "scored",
      lastResult: { stars: 3, passedMetrics: true, underBudget: true, cleanTopology: true, resilient: false },
      lastMeasured: { uptimePercent: 99.9, p99LatencyMs: 80, totalCost: 80, topologyIssueCount: 0 }, // 80 ≤ par 100
    })
    render(<ChallengeResultsModal />)
    const par = screen.getByTestId("result-par")
    expect(par).toHaveTextContent("$100/mo")
    expect(par).toHaveTextContent("4 nodes")
    expect(par).toHaveTextContent("matched or beat")
  })

  it("omits the culprit callout when metrics pass", () => {
    useChallengeStore.setState({
      activeChallenge: challenge, attemptState: "scored",
      lastResult: { stars: 3, passedMetrics: true, underBudget: true, cleanTopology: true, resilient: false },
      lastMeasured: { uptimePercent: 99.9, p99LatencyMs: 100, totalCost: 50, topologyIssueCount: 0, bottleneck: { typeId: "compute", capacityPercent: 1.8, failedRps: 5000 } },
    })
    render(<ChallengeResultsModal />)
    expect(screen.queryByTestId("result-bottleneck")).toBeNull()
  })

  it("shows unmet criteria for a partial result", () => {
    const result: StarBreakdown = { stars: 1, passedMetrics: true, underBudget: false, cleanTopology: false, resilient: false }
    const measured: MeasuredAttempt = { uptimePercent: 99.4, p99LatencyMs: 150, totalCost: 320, topologyIssueCount: 2 }
    useChallengeStore.setState({ activeChallenge: challenge, attemptState: "scored", lastResult: result, lastMeasured: measured })
    render(<ChallengeResultsModal />)
    expect(screen.getByTestId("result-stars")).toHaveAttribute("aria-label", "1 of 3 stars")
    expect(screen.getByTestId("result-metrics")).toHaveAttribute("data-met", "true")
    expect(screen.getByTestId("result-under-budget")).not.toHaveAttribute("data-met")
    expect(screen.getByTestId("result-well-formed")).not.toHaveAttribute("data-met")
    expect(screen.getByTestId("challenge-results")).toHaveTextContent("$320 of $100/mo")
    expect(screen.getByTestId("challenge-results")).toHaveTextContent("2 disconnected nodes")
  })

  it("renders 'unmeasured' (not 'Infinityms') for a consistency target with nothing to measure (D74)", () => {
    const consistencyChallenge: Challenge = { ...challenge, consistencyTargetMs: 100 }
    const result: StarBreakdown = { stars: 0, passedMetrics: false, underBudget: true, cleanTopology: true, resilient: false }
    // No maxStalenessMs ⇒ the chip receives Infinity; it must read "unmeasured" in red, never "Infinityms".
    const measured: MeasuredAttempt = { uptimePercent: 100, p99LatencyMs: 50, totalCost: 80, topologyIssueCount: 0 }
    useChallengeStore.setState({ activeChallenge: consistencyChallenge, attemptState: "scored", lastResult: result, lastMeasured: measured })
    render(<ChallengeResultsModal />)
    const chip = document.querySelector('[data-metric-type="consistency"]')
    expect(chip).not.toBeNull()
    expect(chip?.textContent).toContain("unmeasured")
    expect(chip?.textContent).not.toContain("Infinity")
    expect(chip?.getAttribute("data-unmeasured")).toBe("true")
    expect(chip?.getAttribute("data-pass")).toBe("false")
  })

  it("offers a Quest menu button at 0★ (failed run is not a dead-end) that opens the quest tree", () => {
    const result: StarBreakdown = { stars: 0, passedMetrics: false, underBudget: false, cleanTopology: false, resilient: false }
    const measured: MeasuredAttempt = { uptimePercent: 70, p99LatencyMs: 600, totalCost: 200, topologyIssueCount: 0 }
    useChallengeStore.setState({ activeChallenge: challenge, attemptState: "scored", lastResult: result, lastMeasured: measured })
    render(<ChallengeResultsModal />)
    expect(screen.queryByTestId("result-next-quest")).not.toBeInTheDocument() // gold CTA hidden at 0★
    fireEvent.click(screen.getByTestId("result-quest-menu"))
    expect(useUiStore.getState().questLogOpen).toBe(true)
  })

  it("shows the gold Next Quest CTA (not the neutral Quest menu) when stars > 0", () => {
    const result: StarBreakdown = { stars: 2, passedMetrics: true, underBudget: true, cleanTopology: false, resilient: false }
    const measured: MeasuredAttempt = { uptimePercent: 100, p99LatencyMs: 50, totalCost: 60, topologyIssueCount: 1 }
    useChallengeStore.setState({ activeChallenge: challenge, attemptState: "scored", lastResult: result, lastMeasured: measured })
    render(<ChallengeResultsModal />)
    expect(screen.getByTestId("result-next-quest")).toBeInTheDocument()
    expect(screen.queryByTestId("result-quest-menu")).not.toBeInTheDocument()
  })

  it("shows the Resilient bonus badge when the build has no SPOF (D72)", () => {
    const result: StarBreakdown = { stars: 3, passedMetrics: true, underBudget: true, cleanTopology: true, resilient: true }
    const measured: MeasuredAttempt = { uptimePercent: 100, p99LatencyMs: 40, totalCost: 60, topologyIssueCount: 0 }
    useChallengeStore.setState({ activeChallenge: challenge, attemptState: "scored", lastResult: result, lastMeasured: measured })
    render(<ChallengeResultsModal />)
    expect(screen.getByTestId("result-resilient-badge")).toBeInTheDocument()
    expect(screen.getByTestId("result-resilient-badge")).toHaveTextContent("Resilient")
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
