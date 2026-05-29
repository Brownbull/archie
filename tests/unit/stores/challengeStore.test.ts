import { describe, it, expect, beforeEach } from "vitest"
import { useChallengeStore, isChallengeMode } from "@/stores/challengeStore"
import type { Challenge } from "@/lib/challengeTypes"
import type { SimulationStats } from "@/lib/simulationStats"

const challenge: Challenge = {
  id: "c1", title: "Test", brief: "b", difficulty: "beginner",
  budgetCap: 100, durationSeconds: 60,
  trafficCurve: [{ t: 0, rps: 0 }, { t: 60, rps: 100 }],
  requiredComponents: ["compute"],
  targetMetrics: { uptimePercent: 99, p99LatencyMs: 200 },
  scheduledEvents: [], hints: [],
}
const stats = (uptime: number, p99: number): SimulationStats => ({
  uptimePercent: uptime, avgLatencyMs: 0, p99LatencyMs: p99, currentRps: 0, servedRps: 0, failedRps: 0, totalServed: 0, totalFailed: 0,
})
const s = () => useChallengeStore.getState()

describe("challengeStore (Epic 16)", () => {
  beforeEach(() => {
    useChallengeStore.setState({ activeChallenge: null, attemptState: "idle", lastResult: null, bestStars: {} })
  })

  it("selectChallenge enters building mode", () => {
    s().selectChallenge(challenge)
    expect(s().activeChallenge?.id).toBe("c1")
    expect(s().attemptState).toBe("building")
    expect(isChallengeMode(s())).toBe(true)
  })

  it("startAttempt moves building → running; no-op without a challenge", () => {
    s().startAttempt()
    expect(s().attemptState).toBe("idle") // no challenge
    s().selectChallenge(challenge)
    s().startAttempt()
    expect(s().attemptState).toBe("running")
  })

  it("scoreAttempt records the rubric result, scores, and updates bestStars", () => {
    s().selectChallenge(challenge)
    s().startAttempt()
    const r = s().scoreAttempt(stats(100, 50), 0, 100) // 3★
    expect(r?.stars).toBe(3)
    expect(s().attemptState).toBe("scored")
    expect(s().lastResult?.stars).toBe(3)
    expect(s().bestStars["c1"]).toBe(3)
  })

  it("bestStars keeps the maximum across attempts", () => {
    s().selectChallenge(challenge)
    s().scoreAttempt(stats(100, 50), 0, 100) // 3★
    s().selectChallenge(challenge) // retry
    s().scoreAttempt(stats(99.5, 150), 2, 500) // 1★
    expect(s().bestStars["c1"]).toBe(3) // keeps best
  })

  it("scoreAttempt is a no-op (null) without an active challenge", () => {
    expect(s().scoreAttempt(stats(100, 50), 0, 100)).toBeNull()
  })

  it("reset leaves challenge mode but keeps bestStars", () => {
    s().selectChallenge(challenge)
    s().scoreAttempt(stats(100, 50), 0, 100)
    s().reset()
    expect(s().activeChallenge).toBeNull()
    expect(s().attemptState).toBe("idle")
    expect(isChallengeMode(s())).toBe(false)
    expect(s().bestStars["c1"]).toBe(3) // history preserved
  })
})
