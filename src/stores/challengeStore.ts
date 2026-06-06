import { create } from "zustand"
import { evaluateAttempt } from "@/engine/rubricScorer"
import { writeSavedChallenge } from "@/services/challengeAutosave"
import { costPerMillionRequests, peakCurveRps, usageCostPerMonth } from "@/lib/challengeBudget"
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
  /** D20 (D74): whether the just-scored attempt should be PERSISTED. Pre-3★ every attempt is recorded
   *  (the climb). Once a challenge is 3★ the traffic node unlocks for sandbox experimentation, and a
   *  subsequent run is recorded only if it RE-EARNS 3★ (an improvement-worthy clear) — a worse tinker
   *  doesn't pollute history or look like a regression. */
  lastRecordable: boolean
  /** Enter challenge mode with a challenge — clears any prior result, ready to build. */
  selectChallenge: (challenge: Challenge) => void
  /** Mark the attempt as running; records the start-time cost/topology snapshot used for scoring. */
  startAttempt: (snapshot?: AttemptSnapshot) => void
  /** Score the finished attempt against the rubric and record best stars. topologyIssueCount is the
   *  BLOCKING count (orphan/unreachable); advisoryTopologyCount (SPOF/LB) feeds the resilient flag;
   *  bottleneck is the most-overloaded node (LX2); originBoundRps (EN5) is the post-CDN peak load that
   *  usage-based fees bill against (0 / omitted ⇒ no usage cost, byte-identical to the capacity model). */
  scoreAttempt: (stats: SimulationStats, topologyIssueCount: number, totalCost: number, canvasTypeIds?: ReadonlySet<string>, advisoryTopologyCount?: number, bottleneck?: MeasuredAttempt["bottleneck"], originBoundRps?: number) => StarBreakdown | null
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
  lastRecordable: true,

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

  scoreAttempt: (stats, topologyIssueCount, totalCost, canvasTypeIds, advisoryTopologyCount = 0, bottleneck, originBoundRps) => {
    const challenge = get().activeChallenge
    if (!challenge) return null
    // EN5 (D74): fold usage-based fees into the bill the budget + cost_per_request gates see. A CDN that
    // absorbs requests at the edge lowers originBoundRps → lower usage cost. 0 when no usage_rates.
    const usageCost = usageCostPerMonth(challenge.usageRates, originBoundRps ?? 0)
    const effectiveCost = totalCost + usageCost
    // Cost-efficiency (ED7, D74): $ per MILLION requests at the challenge's peak demand — a real,
    // transferable unit. (Was monthly-$ ÷ ~90s of served traffic, a meaningless mixed-timescale ratio.)
    const costPerRequest = costPerMillionRequests(effectiveCost, peakCurveRps(challenge.trafficCurve))
    // required_topology is graded against the frozen start-time graph (D66), pulled from the snapshot.
    const topologyGraph = get().attemptSnapshot?.topologyGraph
    const result = evaluateAttempt(stats, challenge, topologyIssueCount, effectiveCost, canvasTypeIds, costPerRequest, topologyGraph, advisoryTopologyCount)
    const prevBest = get().bestStars[challenge.id] ?? 0
    // D20: pre-3★ record every attempt (the climb); once unlocked (prevBest 3) only a re-earned 3★ counts.
    const recordable = prevBest < 3 || result.stars === 3
    set({
      lastResult: result,
      lastRecordable: recordable,
      lastMeasured: {
        uptimePercent: stats.uptimePercent,
        p99LatencyMs: stats.p99LatencyMs,
        p95LatencyMs: stats.p95LatencyMs,
        totalCost: effectiveCost,
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
