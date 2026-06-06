import { create } from "zustand"
import { evaluateAttempt } from "@/engine/rubricScorer"
import { writeSavedChallenge } from "@/services/challengeAutosave"
import { SIM_TICKS } from "@/lib/constants"
import type { Challenge, StarBreakdown, MeasuredAttempt } from "@/lib/challengeTypes"
import type { SimulationStats } from "@/lib/simulationStats"
import type { TopologyGraphInput } from "@/engine/topologyAssertions"

export type AttemptState = "idle" | "building" | "running" | "scored"

/** Cost + topology snapshot of the architecture as it was when the attempt's simulation began. */
export interface AttemptSnapshot {
  totalCost: number
  /** BLOCKING topology issues (orphan + unreachable) at start — gates the well-formed star (D72). */
  topologyIssueCount: number
  /** Advisory topology issues (SPOF + replicas-without-LB) at start — feeds the resilient flag (D72). */
  topologyAdvisoryCount?: number
  /**
   * Frozen structural graph (node-id→TYPE-id + edges) for required_topology assertions (ISAPivot
   * Phase 3, D66). Captured at start like cost/topology so scoring grades the simulated architecture,
   * not a mid-run edit. Absent when the attempt started outside the Start button.
   */
  topologyGraph?: TopologyGraphInput
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
  /** Score the finished attempt against the rubric and record best stars. topologyIssueCount is the
   *  BLOCKING count (orphan/unreachable); advisoryTopologyCount (SPOF/LB) feeds the resilient flag;
   *  bottleneck is the most-overloaded node (LX2) for actionable failure feedback. */
  scoreAttempt: (stats: SimulationStats, topologyIssueCount: number, totalCost: number, canvasTypeIds?: ReadonlySet<string>, advisoryTopologyCount?: number, bottleneck?: MeasuredAttempt["bottleneck"]) => StarBreakdown | null
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

  scoreAttempt: (stats, topologyIssueCount, totalCost, canvasTypeIds, advisoryTopologyCount = 0, bottleneck) => {
    const challenge = get().activeChallenge
    if (!challenge) return null
    // Cost-efficiency (ISAPivot Phase 3): monthly cost ÷ requests served during the run. totalServed
    // is per-tick served RPS summed over SIM_TICKS ticks; each tick spans durationSeconds/SIM_TICKS
    // seconds, so requests = totalServed × secondsPerTick. undefined when no traffic was served.
    const secondsPerTick = challenge.durationSeconds / SIM_TICKS
    const requestCount = stats.totalServed * secondsPerTick
    const costPerRequest = requestCount > 0 ? totalCost / requestCount : undefined
    // required_topology is graded against the frozen start-time graph (D66), pulled from the snapshot.
    const topologyGraph = get().attemptSnapshot?.topologyGraph
    const result = evaluateAttempt(stats, challenge, topologyIssueCount, totalCost, canvasTypeIds, costPerRequest, topologyGraph, advisoryTopologyCount)
    const prevBest = get().bestStars[challenge.id] ?? 0
    set({
      lastResult: result,
      lastMeasured: {
        uptimePercent: stats.uptimePercent,
        p99LatencyMs: stats.p99LatencyMs,
        p95LatencyMs: stats.p95LatencyMs,
        totalCost,
        topologyIssueCount,
        costPerRequest,
        bottleneck,
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
