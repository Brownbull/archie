import type { TrafficCurve, ScheduledEvent } from "@/lib/simulationTypes"

export type ChallengeDifficulty = "beginner" | "intermediate" | "advanced"

export interface ChallengeTargetMetrics {
  uptimePercent: number
  p99LatencyMs: number
}

/** Per-challenge rewards granted on completion (Mastery Tracks, D40). */
export interface ChallengeRewards {
  /** Experience points awarded toward the challenge's track on a first/improved clear. */
  xp: number
}

/**
 * A Challenge Mode level (Epic 16), extended into the Mastery Tracks tech tree (D40, schema v2).
 * Authored as YAML, loaded at build time (and now also at runtime via `loadChallengeFromYaml`).
 *
 * v1 fields (id…allowedCategories) are unchanged. The v2 tree fields below place a challenge on
 * the learning tree and define its progression rewards; legacy v1 files parse with tree defaults
 * (schemaVersion 1, no track/tier, empty requires/unlocks/grants) so nothing breaks before recast.
 */
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

  // --- v2 tech-tree fields (Mastery Tracks) ---
  /** Schema version of the source file (1 = pre-tree legacy, 2 = Mastery Tracks). */
  schemaVersion: number
  /** Primary discipline this challenge belongs to (a CHALLENGE_TRACKS id). Absent on v1 files. */
  track?: string
  /** Tier 1 (entry) → 5 (capstone) within the track. Absent on v1 files. */
  tier?: number
  /** Challenge ids that must be completed before this one becomes available. */
  requires: string[]
  /** Challenge ids this challenge opens once completed (display/graph edges; resolver uses requires). */
  unlocks: string[]
  /** Component TYPE ids usable inside this challenge (Phase 2 hard-gate input). Empty = no gate. */
  availableBlocks: string[]
  /** Component TYPE ids permanently unlocked for the player on completion. */
  grants: string[]
  /** Progression rewards (XP). Absent on v1 files. */
  rewards?: ChallengeRewards
}

/** Status of a challenge node relative to a player's completed set (pure tech-tree resolver). */
export type TechTreeStatus = "completed" | "available" | "locked"

/** A resolved challenge node: its status + which prerequisites (if any) are still missing. */
export interface TechTreeNode {
  challenge: Challenge
  status: TechTreeStatus
  /** `requires` ids not yet in the completed set (empty when available or completed). */
  missingRequirements: string[]
}

/** The full resolved tree for a given completed set. */
export interface TechTreeResult {
  /** Resolved node per challenge id. */
  nodes: Map<string, TechTreeNode>
  /** Deterministic ordering: track order, then tier, then id. */
  ordered: TechTreeNode[]
  /** Component TYPE ids the player has unlocked: BASE_UNLOCKED_BLOCKS ∪ grants of completed. */
  unlockedBlocks: Set<string>
}

/** A structural problem found while validating a set of challenges as a tech tree. */
export interface TechTreeIssue {
  kind: "duplicate-id" | "unknown-requires" | "unknown-unlocks" | "cycle"
  /** Challenge id the issue is attached to. */
  challengeId: string
  /** Human-readable detail (e.g. the missing ref id, or the cycle path). */
  detail: string
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
