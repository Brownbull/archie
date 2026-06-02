import { create } from "zustand"
import { evaluateAttempt } from "@/engine/rubricScorer"
import { writeSavedChallenge } from "@/services/challengeAutosave"
import type { Challenge, StarBreakdown, MeasuredAttempt } from "@/lib/challengeTypes"
import type { SimulationStats } from "@/lib/simulationStats"

export type AttemptState = "idle" | "building" | "running" | "scored"

/** Cost + topology snapshot of the architecture as it was when the attempt's simulation began. */
export interface AttemptSnapshot {
  totalCost: number
  topologyIssueCount: number
}

interface ChallengeState {
  activeChallenge: Challenge | null
  attemptState: AttemptState
  lastResult: StarBreakdown | null
  /** Measured actuals captured at score time, for the results modal (decoupled from live canvas). */
  lastMeasured: MeasuredAttempt | null
  /**
   * Cost/topology snapshot taken when the simulation started — the simulation runs on a graph
   * snapshot, so scoring must use the cost/topology from that same moment, not the live canvas
   * (which the user can edit mid-run). null outside a running attempt.
   */
  attemptSnapshot: AttemptSnapshot | null
  /** Best stars earned per challenge id (persists across attempts within the session). */
  bestStars: Record<string, number>
  /** Enter challenge mode with a challenge — clears any prior result, ready to build. */
  selectChallenge: (challenge: Challenge) => void
  /** Mark the attempt as running; records the start-time cost/topology snapshot used for scoring. */
  startAttempt: (snapshot?: AttemptSnapshot) => void
  /** Score the finished attempt against the rubric and record best stars. */
  scoreAttempt: (stats: SimulationStats, topologyIssueCount: number, totalCost: number, canvasTypeIds?: ReadonlySet<string>) => StarBreakdown | null
  /** Leave challenge mode (keeps bestStars history). */
  reset: () => void
}

export const useChallengeStore = create<ChallengeState>((set, get) => ({
  activeChallenge: null,
  attemptState: "idle",
  lastResult: null,
  lastMeasured: null,
  attemptSnapshot: null,
  bestStars: {} as Record<string, number>,

  selectChallenge: (challenge) => {
    set({ activeChallenge: challenge, attemptState: "building", lastResult: null, lastMeasured: null, attemptSnapshot: null })
    writeSavedChallenge(challenge.id, "building")
  },

  startAttempt: (snapshot) => {
    // Only startable from 'building' — a retry after 'scored' goes back through selectChallenge,
    // preventing a stale scored→running re-entry that could double-score the same attempt.
    if (!get().activeChallenge || get().attemptState !== "building") return
    set({ attemptState: "running", lastResult: null, attemptSnapshot: snapshot ?? null })
  },

  scoreAttempt: (stats, topologyIssueCount, totalCost, canvasTypeIds) => {
    const challenge = get().activeChallenge
    if (!challenge) return null
    const result = evaluateAttempt(stats, challenge, topologyIssueCount, totalCost, canvasTypeIds)
    const prevBest = get().bestStars[challenge.id] ?? 0
    set({
      lastResult: result,
      lastMeasured: {
        uptimePercent: stats.uptimePercent,
        p99LatencyMs: stats.p99LatencyMs,
        totalCost,
        topologyIssueCount,
      },
      attemptState: "scored",
      bestStars: { ...get().bestStars, [challenge.id]: Math.max(prevBest, result.stars) },
    })
    return result
  },

  reset: () => {
    set({ activeChallenge: null, attemptState: "idle", lastResult: null, lastMeasured: null, attemptSnapshot: null })
    writeSavedChallenge("", "idle")
  },
}))

/** Whether challenge mode is active (a challenge is selected). */
export function isChallengeMode(state: ChallengeState): boolean {
  return state.activeChallenge !== null
}
