import type { TrafficCurve, ScheduledEvent } from "@/lib/simulationTypes"
import type { TrafficKind } from "@/engine/trafficPatterns"

export type ChallengeDifficulty = "beginner" | "intermediate" | "advanced"

/**
 * The four traffic-source archetypes (ISAPivot). These are the `traffic-source` component's
 * provider variants — a challenge may declare up to one source of each type (≤4 total).
 */
export const CHALLENGE_TRAFFIC_SOURCE_TYPES = ["api-client", "iot-sensors", "mobile-users", "web-users"] as const
export type ChallengeTrafficSourceType = (typeof CHALLENGE_TRAFFIC_SOURCE_TYPES)[number]

/** Read/write mix of a source's requests — the lever that exercises the DB write path vs cache (D56). */
export type ChallengeTrafficWorkload = "read" | "write" | "mixed"

/** Where a source's traffic originates — graded as an architecture requirement in the rubric (D55). */
export type ChallengeTrafficOrigin = "one-region" | "multi-region"

/**
 * A first-class, configurable traffic source on a challenge (ISAPivot). `kind` is the SHAPE,
 * `workload` is the read/write mix, `origin` is graded as architecture (not a demand multiplier).
 * Authored on the challenge YAML and editable in the inspector + on the canvas block (Phase 1).
 */
export interface ChallengeTrafficSource {
  type: ChallengeTrafficSourceType
  /** Average requests/sec for this source (arbitrary, bounded). */
  rps: number
  kind: TrafficKind
  workload: ChallengeTrafficWorkload
  origin: ChallengeTrafficOrigin
}

/**
 * Structural-wiring rules a challenge can require (ISAPivot Phase 3, D66). Graded against the
 * UNDIRECTED adjacency of the attempt's frozen graph — the canvas edge convention (source→target)
 * does not affect the verdict. The author specifies the endpoint TYPE ids per assertion; the
 * intermediary (cache / load-balancer) is implied by the rule name.
 */
export type RequiredTopologyRule = "CACHE_BETWEEN" | "LB_UPSTREAM" | "FAN_OUT_GTE"

/**
 * One authored topology assertion. `sourceType`/`targetType` are component TYPE ids (allowlisted).
 * - CACHE_BETWEEN: a cache node is adjacent to both a `sourceType` node and a `targetType` node.
 * - LB_UPSTREAM: every `targetType` node is adjacent to a load-balancer node (≥1 target required).
 * - FAN_OUT_GTE: some `sourceType` node has ≥ `minCount` distinct adjacent nodes (default 2).
 */
export interface RequiredTopologyAssertion {
  ruleType: RequiredTopologyRule
  sourceType?: string
  targetType?: string
  minCount?: number
  /** Human-readable intent, surfaced in the results modal. */
  description?: string
}

/** Provenance of a challenge — determines whether it grants Mastery Tracks progression (D45). */
export type ChallengeOrigin = "builtin" | "user"

export interface ChallengeTargetMetrics {
  uptimePercent: number
  p99LatencyMs: number
  /** Optional tighter latency gate (ISAPivot Phase 3). When set, p95 ≤ this is also required for the metrics star. */
  p95LatencyMs?: number
  /**
   * Optional cost-efficiency gate. UNIT (ED7, D74): $ per MILLION requests at peak demand
   * (monthlyCost ÷ a month of traffic at the challenge's peak rps, ×1e6) — a real, transferable
   * figure. When set, the measured value must be ≤ this for the metrics star. Lower = more
   * cost-effective. (Pre-D74 this was monthly-$ ÷ ~90s of served traffic — a meaningless ratio.)
   */
  costPerRequest?: number
}

/** Per-challenge rewards granted on completion (Mastery Tracks, D40). */
export interface ChallengeRewards {
  /** Experience points awarded toward the challenge's track on a first/improved clear. */
  xp: number
}

/**
 * Usage-based cost rates (EN5, D74): cloud fees billed per request that reaches the ORIGIN (the served
 * traffic a CDN does NOT absorb at the edge), ON TOP of the flat capacity cost. A CDN cuts the origin
 * bill — the "front it with a CDN to slash per-request/egress fees" lesson. Absent ⇒ no usage cost
 * (the capacity-only model, byte-identical to pre-D74).
 */
export interface ChallengeUsageRates {
  /** $ per MILLION origin-bound (post-CDN) requests, per month. */
  perMillionRequests: number
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
  /**
   * First-class traffic sources (ISAPivot, ≤4, one per type). Optional + additive: legacy
   * challenges drive the sim from `trafficCurve` alone; when present, Phase 1 derives the combined
   * curve by summing each source's `buildPatternCurve`.
   */
  trafficSources?: ChallengeTrafficSource[]
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
  /** Minimum cumulative XP needed to access this challenge (tier gate, E2 redesign). */
  minXp: number
  /** Component TYPE ids that MUST be on the canvas to pass (validated at scoring). */
  requiredTypes: string[]
  /** Component TYPE ids that MUST NOT be on the canvas — present ⇒ hard 0★ (ISAPivot Phase 3). */
  forbiddenTypes?: string[]
  /**
   * Structural wiring assertions (ISAPivot Phase 3, D66). Empty/absent ⇒ no structural requirement.
   * When present, ALL must pass for the clean-topology star (folded in alongside zero topology issues).
   */
  requiredTopology?: RequiredTopologyAssertion[]
  /**
   * Difficulty knob for latency-spike events (ISAPivot Phase 3, 3e). Scales each spike's intensity:
   * effective multiplier = 1 + (authored − 1) × chaosIntensity. 0 = inert (no spike), 1 = as-authored,
   * >1 = harsher (bounded [0,10]). A SIM-runtime lever only — NEVER read by scoring. Absent ⇒ 1.
   */
  chaosIntensity?: number
  /** Component TYPE ids usable inside this challenge (Phase 2 hard-gate input). Empty = no gate. */
  availableBlocks: string[]
  /** Component TYPE ids permanently unlocked for the player on completion. */
  grants: string[]
  /** Progression rewards (XP). Absent on v1 files. */
  rewards?: ChallengeRewards
  /** Usage-based cost rates (EN5, D74). When set, per-origin-request fees are added to totalCost for the
   *  budget + cost_per_request gates; a CDN that absorbs requests at the edge lowers the bill. */
  usageRates?: ChallengeUsageRates
  /**
   * Runtime-only provenance (D45, NOT in the YAML schema). `builtin` is stamped at the build-time
   * glob (the only path that can produce it); `user` is stamped at loadChallengeFromYaml (runtime
   * import). Only `builtin` challenges grant XP/block grants toward Mastery Tracks progression.
   */
  origin: ChallengeOrigin
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
  /** All required_types present on canvas. Separate from metrics (architecture, not performance). */
  hasRequiredBlocks: boolean
  /** Total cost ≤ budgetCap (only awarded if passedMetrics). */
  underBudget: boolean
  /** Well-formed: zero BLOCKING topology issues — no orphaned/unreachable nodes (D72). Awards the 3rd
   *  star (with requiredTopologyOk, only if passedMetrics). SPOF / replicas-without-LB are ADVISORY and
   *  do NOT affect this star. */
  cleanTopology: boolean
  /** Resilient (non-star recognition, D72): zero topology issues of ANY kind — no orphans/unreachable
   *  AND no single-point-of-failure or replicas-without-LB advisories. Surfaced as a "Resilient" badge. */
  resilient: boolean
  /** Resilience EARNED (restore-redundancy, D74): a no-SPOF build that PASSED a challenge which actually
   *  exercises a zone outage (az_outage) — the redundancy demonstrably paid off. Optional: only the
   *  rubric populates it; absent ⇒ false. A recognition, not a star (no D72 budget-vs-redundancy tension). */
  resilienceEarned?: boolean
  /** No forbidden component type present (ISAPivot Phase 3). False ⇒ hard 0★. Absent forbiddenTypes ⇒ always true. */
  forbiddenTypesOk: boolean
  /**
   * All required_topology assertions pass (ISAPivot Phase 3, D66). Folded into the clean-topology star
   * (star = zero issues AND this). Absent requiredTopology ⇒ always true (the 41 built-ins).
   */
  requiredTopologyOk: boolean
  /**
   * Multi-region origin requirement met (ISAPivot Phase 3, D55/D66): when any traffic source is
   * multi-region, the architecture must include CDN + DNS + a database. Folded into basePass (an
   * architecture gate, like required_types). No multi-region source ⇒ always true (the 41 built-ins).
   */
  originRequirementOk: boolean
}

/**
 * The measured inputs captured at score time, so the results modal can show actual-vs-target
 * even after the user edits the canvas (which would change live cost/topology).
 */
export interface MeasuredAttempt {
  uptimePercent: number
  p99LatencyMs: number
  /** Measured p95 latency (ISAPivot Phase 3). Shown in the results modal when a p95 target is defined. */
  p95LatencyMs?: number
  totalCost: number
  topologyIssueCount: number
  /** Derived cost-efficiency at score time, in $/million-requests at peak demand (ED7, D74). undefined when no demand. */
  costPerRequest?: number
  /**
   * The most-overloaded node during the run (LX2, D74) — the actionable culprit when metrics fail.
   * `capacityPercent` is its peak load ÷ capacity (1 = at capacity, >1 = overloaded). undefined when
   * nothing was meaningfully loaded.
   */
  bottleneck?: { typeId: string; capacityPercent: number; failedRps: number }
}
