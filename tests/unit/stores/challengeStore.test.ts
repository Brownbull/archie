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
  schemaVersion: 2, requires: [], unlocks: [], minXp: 0, requiredTypes: [], availableBlocks: [], grants: [], origin: "builtin",
}
const stats = (uptime: number, p99: number): SimulationStats => ({
  uptimePercent: uptime, avgLatencyMs: 0, p99LatencyMs: p99, currentRps: 0, servedRps: 0, failedRps: 0, totalServed: 0, totalFailed: 0,
})
const s = () => useChallengeStore.getState()

describe("challengeStore (Epic 16)", () => {
  beforeEach(() => {
    useChallengeStore.setState({ activeChallenge: null, attemptState: "idle", lastResult: null, lastMeasured: null, bestStars: {} })
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

  it("scoreAttempt captures the measured actuals for the results modal", () => {
    s().selectChallenge(challenge)
    s().startAttempt()
    s().scoreAttempt(stats(99.5, 175), 2, 420)
    expect(s().lastMeasured).toMatchObject({
      uptimePercent: 99.5,
      p99LatencyMs: 175,
      totalCost: 420,
      topologyIssueCount: 2,
    })
    // ED7: cost-efficiency = $/million-req at peak demand (peak 100 rps, $420/mo) ≈ 1.62.
    expect(s().lastMeasured?.costPerRequest).toBeCloseTo(1.6204, 3)
    s().reset()
    expect(s().lastMeasured).toBeNull() // cleared on leaving challenge mode
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

  it("D20: lastRecordable — pre-3★ always recordable; post-3★ only a re-earned 3★ counts", () => {
    s().selectChallenge(challenge)
    s().scoreAttempt(stats(99.5, 150), 2, 500) // 1★, not yet cleared
    expect(s().lastRecordable).toBe(true) // pre-3★ climb is always recorded
    s().selectChallenge(challenge)
    s().scoreAttempt(stats(100, 50), 0, 100) // 3★ — challenge cleared (unlocks)
    expect(s().lastRecordable).toBe(true)
    s().selectChallenge(challenge) // post-clear sandbox tinker that REGRESSES
    s().scoreAttempt(stats(99.5, 150), 2, 500) // 1★ after unlock
    expect(s().lastRecordable).toBe(false) // not re-earned 3★ → not recorded
    s().selectChallenge(challenge) // post-clear run that re-earns 3★
    s().scoreAttempt(stats(100, 50), 0, 80)
    expect(s().lastRecordable).toBe(true) // a fresh 3★ clear is recorded
  })

  it("startAttempt is a no-op from 'scored' — a retry must go through selectChallenge first", () => {
    s().selectChallenge(challenge)
    s().startAttempt()
    s().scoreAttempt(stats(100, 50), 0, 100) // → scored
    s().startAttempt() // stale call from scored
    expect(s().attemptState).toBe("scored") // not re-entered into running
    s().selectChallenge(challenge) // proper retry path
    s().startAttempt()
    expect(s().attemptState).toBe("running")
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

describe("challengeStore — port-enforcement snapshot (D87)", () => {
  beforeEach(() => {
    useChallengeStore.setState({ activeChallenge: null, attemptState: "idle", lastResult: null, lastMeasured: null, attemptSnapshot: null, bestStars: {} })
  })

  it("freezes portMismatchCount in the snapshot and gates the well-formed star at score time", () => {
    s().selectChallenge(challenge)
    s().startAttempt({ totalCost: 100, topologyIssueCount: 0, portMismatchCount: 1 })
    expect(s().attemptSnapshot?.portMismatchCount).toBe(1)
    // metrics pass + under budget + clean blocking topology, but the frozen mismatch costs the 3rd star.
    const r = s().scoreAttempt(stats(100, 50), 0, 100)
    expect(r?.stars).toBe(2)
    expect(r?.portsWellFormed).toBe(false)
  })

  it("scores 3★ when the snapshot has zero port mismatches (omitted ⇒ 0)", () => {
    s().selectChallenge(challenge)
    s().startAttempt({ totalCost: 100, topologyIssueCount: 0 }) // no portMismatchCount → defaults to 0
    const r = s().scoreAttempt(stats(100, 50), 0, 100)
    expect(r?.stars).toBe(3)
    expect(r?.portsWellFormed).toBe(true)
  })

  it("a mid-run edit can't recover the star — scoring reads the frozen snapshot, not live edges", () => {
    s().selectChallenge(challenge)
    s().startAttempt({ totalCost: 100, topologyIssueCount: 0, portMismatchCount: 2 })
    // Even though the player might delete the bad edge after Start, the snapshot still says 2.
    const r = s().scoreAttempt(stats(100, 50), 0, 100)
    expect(r?.stars).toBe(2)
  })
})

describe("injectedBlockFailure — post-3★ per-block injection (P5-S3 / D95)", () => {
  const quest = (id: string) => ({
    id, title: id, brief: "b", difficulty: "beginner", budgetCap: 100, durationSeconds: 60,
    trafficCurve: [{ t: 0, rps: 0 }], requiredComponents: [],
    targetMetrics: { uptimePercent: 95, p99LatencyMs: 400 }, scheduledEvents: [], hints: [],
  }) as never

  it("persists across a SAME-quest re-arm (the break-it style loop) but clears on quest switch", () => {
    const s = useChallengeStore.getState()
    s.selectChallenge(quest("c1"))
    s.setInjectedBlockFailure("n-db")
    s.selectChallenge(quest("c1")) // re-arm after a scored run
    expect(useChallengeStore.getState().injectedBlockFailure).toBe("n-db")
    s.selectChallenge(quest("c2")) // different quest
    expect(useChallengeStore.getState().injectedBlockFailure).toBeNull()
  })

  it("clears on reset (leaving challenge mode)", () => {
    const s = useChallengeStore.getState()
    s.selectChallenge(quest("c1"))
    s.setInjectedBlockFailure("n-db")
    s.reset()
    expect(useChallengeStore.getState().injectedBlockFailure).toBeNull()
  })
})
