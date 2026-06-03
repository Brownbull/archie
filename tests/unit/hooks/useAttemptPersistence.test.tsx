import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { renderHook } from "@testing-library/react"
import type { Challenge } from "@/lib/challengeTypes"

const mockUseAuth = vi.fn()
vi.mock("@/hooks/useAuth", () => ({ useAuth: () => mockUseAuth() }))

import { useAttemptPersistence } from "@/hooks/useAttemptPersistence"
import { useChallengeStore } from "@/stores/challengeStore"
import { useAttemptsStore } from "@/stores/attemptsStore"

const challenge: Challenge = {
  id: "first-service", title: "T", brief: "b", difficulty: "beginner", budgetCap: 100, durationSeconds: 60,
  trafficCurve: [{ t: 0, rps: 0 }, { t: 60, rps: 100 }],
  requiredComponents: ["compute"], targetMetrics: { uptimePercent: 95, p99LatencyMs: 200 },
  scheduledEvents: [], hints: [],
  schemaVersion: 2, requires: [], unlocks: [], minXp: 0, requiredTypes: [], availableBlocks: [], grants: [], origin: "builtin",
}
const scoredState = {
  activeChallenge: challenge, attemptState: "scored" as const,
  lastResult: { stars: 2 as const, passedMetrics: true, underBudget: false, cleanTopology: true },
  lastMeasured: { uptimePercent: 99.4, p99LatencyMs: 120, totalCost: 80, topologyIssueCount: 0 },
  attemptSnapshot: null, bestStars: {},
}

describe("useAttemptPersistence (Epic 17 P4)", () => {
  let recordSpy: ReturnType<typeof vi.spyOn>
  beforeEach(() => {
    recordSpy = vi.spyOn(useAttemptsStore.getState(), "recordAttempt").mockResolvedValue(undefined)
    mockUseAuth.mockReturnValue({ user: { uid: "user-1" }, loading: false })
    useChallengeStore.setState({ activeChallenge: null, attemptState: "idle", lastResult: null, lastMeasured: null, attemptSnapshot: null, bestStars: {} })
  })
  afterEach(() => recordSpy.mockRestore()) // restore the singleton method so spies don't stack across tests

  it("persists the scored attempt once, owner-stamped, from the challenge + measured snapshot", () => {
    useChallengeStore.setState(scoredState)
    renderHook(() => useAttemptPersistence())
    expect(recordSpy).toHaveBeenCalledTimes(1)
    expect(recordSpy).toHaveBeenCalledWith({
      userId: "user-1", challengeId: "first-service", stars: 2,
      uptimePercent: 99.4, p99LatencyMs: 120, totalCost: 80, topologyIssueCount: 0,
    })
  })

  it("does not persist while not scored", () => {
    useChallengeStore.setState({ ...scoredState, attemptState: "running" })
    renderHook(() => useAttemptPersistence())
    expect(recordSpy).not.toHaveBeenCalled()
  })

  it("does not persist without an authenticated user (no unowned write)", () => {
    mockUseAuth.mockReturnValue({ user: null, loading: false })
    useChallengeStore.setState(scoredState)
    renderHook(() => useAttemptPersistence())
    expect(recordSpy).not.toHaveBeenCalled()
  })

  it("is idempotent — a re-render does not double-persist the same scored attempt", () => {
    useChallengeStore.setState(scoredState)
    const { rerender } = renderHook(() => useAttemptPersistence())
    rerender()
    rerender()
    expect(recordSpy).toHaveBeenCalledTimes(1)
  })

  it("persists a fresh attempt after a retry (a new score)", () => {
    useChallengeStore.setState(scoredState)
    const { rerender } = renderHook(() => useAttemptPersistence())
    expect(recordSpy).toHaveBeenCalledTimes(1)
    // retry: selectChallenge clears, then a new score produces a new lastResult object
    useChallengeStore.setState({ attemptState: "building", lastResult: null, lastMeasured: null })
    rerender()
    useChallengeStore.setState({
      attemptState: "scored",
      lastResult: { stars: 3, passedMetrics: true, underBudget: true, cleanTopology: true },
      lastMeasured: { uptimePercent: 100, p99LatencyMs: 50, totalCost: 60, topologyIssueCount: 0 },
    })
    rerender()
    expect(recordSpy).toHaveBeenCalledTimes(2)
    expect(recordSpy.mock.calls[1][0]).toMatchObject({ stars: 3, totalCost: 60 })
  })
})
