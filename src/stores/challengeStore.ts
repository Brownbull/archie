import { create } from "zustand"
import { evaluateAttempt } from "@/engine/rubricScorer"
import type { Challenge, StarBreakdown } from "@/lib/challengeTypes"
import type { SimulationStats } from "@/lib/simulationStats"

export type AttemptState = "idle" | "building" | "running" | "scored"

interface ChallengeState {
  activeChallenge: Challenge | null
  attemptState: AttemptState
  lastResult: StarBreakdown | null
  /** Best stars earned per challenge id (persists across attempts within the session). */
  bestStars: Record<string, number>
  /** Enter challenge mode with a challenge — clears any prior result, ready to build. */
  selectChallenge: (challenge: Challenge) => void
  /** Mark the attempt as running (the Start button also kicks off the simulation). */
  startAttempt: () => void
  /** Score the finished attempt against the rubric and record best stars. */
  scoreAttempt: (stats: SimulationStats, topologyIssueCount: number, totalCost: number) => StarBreakdown | null
  /** Leave challenge mode (keeps bestStars history). */
  reset: () => void
}

export const useChallengeStore = create<ChallengeState>((set, get) => ({
  activeChallenge: null,
  attemptState: "idle",
  lastResult: null,
  bestStars: {},

  selectChallenge: (challenge) => {
    set({ activeChallenge: challenge, attemptState: "building", lastResult: null })
  },

  startAttempt: () => {
    // Only startable from 'building' — a retry after 'scored' goes back through selectChallenge,
    // preventing a stale scored→running re-entry that could double-score the same attempt.
    if (!get().activeChallenge || get().attemptState !== "building") return
    set({ attemptState: "running", lastResult: null })
  },

  scoreAttempt: (stats, topologyIssueCount, totalCost) => {
    const challenge = get().activeChallenge
    if (!challenge) return null
    const result = evaluateAttempt(stats, challenge, topologyIssueCount, totalCost)
    const prevBest = get().bestStars[challenge.id] ?? 0
    set({
      lastResult: result,
      attemptState: "scored",
      bestStars: { ...get().bestStars, [challenge.id]: Math.max(prevBest, result.stars) },
    })
    return result
  },

  reset: () => {
    set({ activeChallenge: null, attemptState: "idle", lastResult: null })
  },
}))

/** Whether challenge mode is active (a challenge is selected). */
export function isChallengeMode(state: ChallengeState): boolean {
  return state.activeChallenge !== null
}
