import { describe, it, expect, beforeEach, vi } from "vitest"
import { renderHook } from "@testing-library/react"
import type { Challenge } from "@/lib/challengeTypes"
import type { TickState } from "@/lib/simulationTypes"

// Isolate the wiring: fixed stats so the test asserts WHICH cost/topology the hook scores with,
// not the stat math (that has its own tests; the integration test uses the real engine).
vi.mock("@/lib/simulationStats", async (orig) => {
  const actual = await orig<typeof import("@/lib/simulationStats")>()
  return { ...actual, computeSimStats: () => ({ uptimePercent: 100, avgLatencyMs: 10, p99LatencyMs: 50, currentRps: 0, servedRps: 0, failedRps: 0, totalServed: 0, totalFailed: 0 }) }
})

import { useChallengeAutoScore } from "@/hooks/useChallengeAutoScore"
import { useChallengeStore } from "@/stores/challengeStore"
import { useSimulationStore } from "@/stores/simulationStore"
import { useArchitectureStore } from "@/stores/architectureStore"

const challenge: Challenge = {
  id: "c1", title: "T", brief: "b", difficulty: "beginner", budgetCap: 100, durationSeconds: 60,
  trafficCurve: [{ t: 0, rps: 0 }, { t: 60, rps: 100 }],
  requiredComponents: ["compute"], targetMetrics: { uptimePercent: 99, p99LatencyMs: 200 },
  scheduledEvents: [], hints: [],
  schemaVersion: 2, requires: [], unlocks: [], minXp: 0, requiredTypes: [], availableBlocks: [], grants: [], origin: "builtin",
}
const cs = () => useChallengeStore.getState()
const frame = (t: number): TickState => ({ tick: t, targetRps: 100, nodes: [], totalServedRps: 100, totalFailedRps: 0 })

// A BLOCKING topology issue (orphan) — counts toward the well-formed star (D72). Uses the real
// TopologyIssue shape (issueType) so countTopologyIssues classifies it correctly.
function fakeIssue() {
  return { issueType: "orphan", nodeId: "n", severity: "warning", description: "m" } as never
}

describe("useChallengeAutoScore (Epic 16 P4)", () => {
  beforeEach(() => {
    useChallengeStore.setState({ activeChallenge: null, attemptState: "idle", lastResult: null, lastMeasured: null, attemptSnapshot: null, bestStars: {} })
    useSimulationStore.getState().reset()
    useArchitectureStore.setState({ nodes: [], topologyIssues: [], topologyIssuesByNodeId: new Map() })
  })

  it("does not score while the sim is still running", () => {
    useChallengeStore.setState({ activeChallenge: challenge, attemptState: "running", attemptSnapshot: { totalCost: 10, topologyIssueCount: 0 } })
    useSimulationStore.setState({ status: "running", ticks: [frame(0), frame(1)], currentTick: 0 })
    renderHook(() => useChallengeAutoScore())
    expect(cs().attemptState).toBe("running")
    expect(cs().lastResult).toBeNull()
  })

  it("does not score when the sim is done but no attempt is running", () => {
    useChallengeStore.setState({ activeChallenge: challenge, attemptState: "building" })
    useSimulationStore.setState({ status: "done", ticks: [frame(0)], currentTick: 0 })
    renderHook(() => useChallengeAutoScore())
    expect(cs().attemptState).toBe("building")
    expect(cs().lastResult).toBeNull()
  })

  it("scores with the START-TIME snapshot, NOT the live canvas (the core invariant)", () => {
    // Snapshot says cheap + clean; live canvas is expensive + dirty (edited mid-run).
    useChallengeStore.setState({ activeChallenge: challenge, attemptState: "running", attemptSnapshot: { totalCost: 80, topologyIssueCount: 0 } })
    useArchitectureStore.setState({ topologyIssues: [fakeIssue(), fakeIssue()] }) // live: 2 issues
    useSimulationStore.setState({ status: "done", ticks: [frame(0), frame(1)], currentTick: 1 })
    renderHook(() => useChallengeAutoScore())
    expect(cs().attemptState).toBe("scored")
    // 3★ requires under-budget (80≤100) + clean topology (snapshot 0 issues, NOT live 2)
    expect(cs().lastMeasured).toMatchObject({ uptimePercent: 100, p99LatencyMs: 50, totalCost: 80, topologyIssueCount: 0 })
    expect(cs().lastResult?.cleanTopology).toBe(true)
    expect(cs().lastResult?.stars).toBe(3)
  })

  it("fires exactly once per run — the attemptState guard blocks re-scoring on status churn", () => {
    useChallengeStore.setState({ activeChallenge: challenge, attemptState: "running", attemptSnapshot: { totalCost: 80, topologyIssueCount: 0 } })
    useSimulationStore.setState({ status: "done", ticks: [frame(0), frame(1)], currentTick: 1 })
    const spy = vi.spyOn(useChallengeStore.getState(), "scoreAttempt")
    const { rerender } = renderHook(() => useChallengeAutoScore())
    expect(spy).toHaveBeenCalledTimes(1) // scored → attemptState now 'scored'
    // a later status change (e.g. a stale tick / re-render) must not double-score
    useSimulationStore.setState({ status: "done", currentTick: 1 })
    rerender()
    expect(spy).toHaveBeenCalledTimes(1)
    expect(cs().attemptState).toBe("scored")
    spy.mockRestore()
  })

  it("falls back to the live canvas when no snapshot was recorded", () => {
    useChallengeStore.setState({ activeChallenge: challenge, attemptState: "running", attemptSnapshot: null })
    useArchitectureStore.setState({ topologyIssues: [fakeIssue()] }) // live: 1 issue, no snapshot
    useSimulationStore.setState({ status: "done", ticks: [frame(0)], currentTick: 0 })
    renderHook(() => useChallengeAutoScore())
    expect(cs().attemptState).toBe("scored")
    expect(cs().lastMeasured?.topologyIssueCount).toBe(1) // live fallback
  })
})
