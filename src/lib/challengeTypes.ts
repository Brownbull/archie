import type { TrafficCurve, ScheduledEvent } from "@/lib/simulationTypes"

export type ChallengeDifficulty = "beginner" | "intermediate" | "advanced"

export interface ChallengeTargetMetrics {
  uptimePercent: number
  p99LatencyMs: number
}

/** A Challenge Mode level (Epic 16). Authored as YAML, loaded at build time. */
export interface Challenge {
  id: string
  title: string
  brief: string
  difficulty: ChallengeDifficulty
  /** Max monthly architecture cost ($) for the budget star. */
  budgetCap: number
  durationSeconds: number
  trafficCurve: TrafficCurve
  /** Component category ids that must be present on the canvas. */
  requiredComponents: string[]
  targetMetrics: ChallengeTargetMetrics
  scheduledEvents: ScheduledEvent[]
  hints: string[]
  /** When set, only these component categories may be used. */
  allowedCategories?: string[]
}

/** Result of scoring an attempt against a challenge's rubric (Epic 16). */
export interface StarBreakdown {
  stars: 0 | 1 | 2 | 3
  /** Base pass: uptime ≥ target AND p99 ≤ target. Required for any star. */
  passedMetrics: boolean
  /** Total cost ≤ budgetCap (only awarded if passedMetrics). */
  underBudget: boolean
  /** Zero topology issues (only awarded if passedMetrics). */
  cleanTopology: boolean
}

/**
 * The measured inputs captured at score time, so the results modal can show actual-vs-target
 * even after the user edits the canvas (which would change live cost/topology).
 */
export interface MeasuredAttempt {
  uptimePercent: number
  p99LatencyMs: number
  totalCost: number
  topologyIssueCount: number
}
