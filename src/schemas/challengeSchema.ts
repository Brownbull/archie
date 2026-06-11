import { z } from "zod"
import { TrafficCurveSchema } from "@/schemas/demandSchema"
import { MAX_SCHEMA_STRING_LENGTH, MAX_BUILDABLE_PEAK_RPS } from "@/lib/constants"
import { MAX_MONTHLY_COST } from "@/schemas/componentSchema"
import { sanitizeDisplayString } from "@/lib/sanitize"
import { COMPONENT_TYPES } from "@/lib/componentTypes"
import { isKnownTrackId, MIN_CHALLENGE_TIER, MAX_CHALLENGE_TIER } from "@/lib/challengeTracks"
import { CHALLENGE_TRAFFIC_SOURCE_TYPES } from "@/lib/challengeTypes"

const CHALLENGE_BRIEF_MAX = 600
const CHALLENGE_HINT_MAX = 300

// ISAPivot traffic-source bounds. RPS ceiling mirrors TRAFFIC_RPS_STEPS' top step (10M).
const TRAFFIC_SOURCE_RPS_MIN = 1
const TRAFFIC_SOURCE_RPS_MAX = 10_000_000
const MAX_TRAFFIC_SOURCES = 4 // one per CHALLENGE_TRAFFIC_SOURCE_TYPES entry

/**
 * A configurable traffic source on a challenge (ISAPivot). `kind` = shape, `workload` = read/write
 * mix, `origin` = graded-as-architecture. All but `type`/`rps` default so terse authoring works.
 */
const TrafficSourceYamlSchema = z
  .object({
    type: z.enum(CHALLENGE_TRAFFIC_SOURCE_TYPES),
    rps: z.number().int().min(TRAFFIC_SOURCE_RPS_MIN).max(TRAFFIC_SOURCE_RPS_MAX),
    kind: z.enum(["steady", "realistic", "periodic", "search"]).default("steady"),
    workload: z.enum(["read", "write", "mixed"]).default("mixed"),
    origin: z.enum(["one-region", "multi-region"]).default("one-region"),
    // ED5 (D74): fraction of THIS source's requests that are cacheable (0–1). A user behavior — IoT
    // telemetry is ~0% cacheable, a read-heavy content site ~0.95. Default 1 (fully cacheable) so sources
    // that omit it behave as before. MUST snake→camel HERE (the schema has no outer per-source transform).
    cacheable_fraction: z.number().min(0).max(1).optional(),
  })
  .strict()
  .transform((d) => ({
    type: d.type,
    rps: d.rps,
    kind: d.kind,
    workload: d.workload,
    origin: d.origin,
    ...(d.cacheable_fraction !== undefined ? { cacheableFraction: d.cacheable_fraction } : {}),
  }))

// Scheduled failure event (Epic 16) — mirrors simulationTypes.ScheduledEvent.
export const ScheduledEventSchema = z
  .object({
    t: z.number().min(0).max(3600),
    type: z.enum(["component_failure", "latency_spike", "az_outage"]),
    target: z.string().min(1).max(MAX_SCHEMA_STRING_LENGTH),
    durationS: z.number().min(1).max(3600).optional(),
    multiplier: z.number().min(1).max(100).optional(),
  })
  .strict()

const TargetMetricsYamlSchema = z
  .object({
    uptime_percent: z.number().min(0).max(100),
    p99_latency_ms: z.number().min(0).max(60_000),
    // ISAPivot Phase 3 — optional richer gates. Absent on the 41 built-ins, so they score identically.
    p95_latency_ms: z.number().min(0).max(60_000).optional(),
    cost_per_request: z.number().min(0).max(1_000_000).optional(),
  })
  .strict()

const RewardsYamlSchema = z
  .object({
    xp: z.number().int().min(0).max(100_000),
  })
  .strict()

// Usage-based cost rates (EN5, D74). Snake→camel via the top-level challenge transform.
const UsageRatesYamlSchema = z
  .object({
    per_million_requests: z.number().min(0).max(MAX_MONTHLY_COST),
  })
  .strict()

// A challenge id reference (requires/unlocks) — same bounds as an id, allowlisted at tree level.
const challengeIdRef = z.string().min(1).max(MAX_SCHEMA_STRING_LENGTH)

// A component TYPE id (available_blocks / grants). Allowlisted against the real type registry so a
// typo'd block id is rejected at load time rather than silently producing an unusable gate.
const blockTypeId = z
  .string()
  .min(1)
  .max(MAX_SCHEMA_STRING_LENGTH)
  .refine((id) => COMPONENT_TYPES.has(id), { message: "Unknown component type id" })

/**
 * A required-topology assertion (ISAPivot Phase 3, D66). snake_case → camelCase. Per-rule field
 * requirements enforced in superRefine so a malformed assertion is rejected at load, not silently
 * un-passable at score time. blockTypeId reuse rejects typo'd component type ids.
 */
const RequiredTopologyAssertionSchema = z
  .object({
    rule_type: z.enum(["CACHE_BETWEEN", "LB_UPSTREAM", "FAN_OUT_GTE"]),
    source_type: blockTypeId.optional(),
    target_type: blockTypeId.optional(),
    min_count: z.number().int().min(1).max(50).optional(),
    description: z.string().min(1).max(CHALLENGE_HINT_MAX).optional(),
  })
  .strict()
  .superRefine((d, ctx) => {
    if (d.rule_type === "CACHE_BETWEEN" && (!d.source_type || !d.target_type)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["source_type"], message: "CACHE_BETWEEN requires source_type and target_type" })
    }
    if (d.rule_type === "LB_UPSTREAM" && !d.target_type) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["target_type"], message: "LB_UPSTREAM requires target_type" })
    }
    if (d.rule_type === "FAN_OUT_GTE" && !d.source_type) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["source_type"], message: "FAN_OUT_GTE requires source_type" })
    }
  })
  .transform((d) => ({
    ruleType: d.rule_type,
    sourceType: d.source_type,
    targetType: d.target_type,
    minCount: d.min_count,
    description: d.description ? sanitizeDisplayString(d.description, CHALLENGE_HINT_MAX) : undefined,
  }))

/**
 * YAML variant for a Challenge (snake_case → camelCase transform). Used by challengeLoader.
 * Defense-in-depth bounds on every numeric + sanitized display strings.
 *
 * schema v2 (Mastery Tracks, D40) adds the tech-tree fields: track / tier / requires / unlocks /
 * available_blocks / grants / rewards.xp. v1 files (no `schema_version`) still parse — the tree
 * fields default to empty so the resolver simply treats them as un-placed, ungated, reward-less.
 * When `schema_version: 2`, track + tier + rewards.xp are required (see superRefine below).
 */
export const ChallengeYamlSchema = z
  .object({
    schema_version: z.number().int().min(1).max(2).default(1),
    id: z.string().min(1).max(MAX_SCHEMA_STRING_LENGTH),
    title: z.string().min(1).transform((s) => sanitizeDisplayString(s, MAX_SCHEMA_STRING_LENGTH)),
    brief: z.string().min(1).transform((s) => sanitizeDisplayString(s, CHALLENGE_BRIEF_MAX)),
    difficulty: z.enum(["beginner", "intermediate", "advanced"]),
    budget_cap: z.number().min(0).max(1_000_000),
    duration_seconds: z.number().min(1).max(3600),
    // Optional (ISAPivot): a challenge supplies its load via `traffic_curve` OR `traffic_sources`
    // (or both). The at-least-one rule is enforced in superRefine below.
    traffic_curve: TrafficCurveSchema.optional(),
    traffic_sources: z.array(TrafficSourceYamlSchema).max(MAX_TRAFFIC_SOURCES).optional(),
    required_components: z.array(z.string().min(1).max(MAX_SCHEMA_STRING_LENGTH)).max(20),
    target_metrics: TargetMetricsYamlSchema,
    scheduled_events: z.array(ScheduledEventSchema).max(20).default([]),
    hints: z.array(z.string().min(1).transform((s) => sanitizeDisplayString(s, CHALLENGE_HINT_MAX))).max(5).default([]),
    allowed_categories: z.array(z.string().min(1).max(MAX_SCHEMA_STRING_LENGTH)).max(20).optional(),
    // --- v2 tech-tree fields ---
    track: z
      .string()
      .min(1)
      .max(MAX_SCHEMA_STRING_LENGTH)
      .refine(isKnownTrackId, { message: "Unknown track id" })
      .optional(),
    tier: z.number().int().min(MIN_CHALLENGE_TIER).max(MAX_CHALLENGE_TIER).optional(),
    requires: z.array(challengeIdRef).max(20).default([]),
    unlocks: z.array(challengeIdRef).max(40).default([]),
    min_xp: z.number().int().min(0).max(100000).default(0),
    required_types: z.array(blockTypeId).max(20).default([]),
    forbidden_types: z.array(blockTypeId).max(20).default([]),
    required_topology: z.array(RequiredTopologyAssertionSchema).max(10).default([]),
    // ISAPivot Phase 3 (3e) — latency-spike difficulty knob. Optional; absent ⇒ 1 (as-authored) at the
    // sim use-site, so the 41 built-ins are byte-identical. Never read by scoring.
    chaos_intensity: z.number().min(0).max(10).optional(),
    available_blocks: z.array(blockTypeId).max(40).default([]),
    grants: z.array(blockTypeId).max(40).default([]),
    rewards: RewardsYamlSchema.optional(),
    usage_rates: UsageRatesYamlSchema.optional(),
    // ED6/EN4 (D74): cross-region RTT penalty (ms) per cross-region hop + the consistency (max read
    // staleness, ms) scoring target. Both optional + NEVER auto-defaulted — challenges that omit them
    // (incl. the 7 existing multi-region ones) are byte-identical.
    cross_region_rtt_ms: z.number().min(0).max(10_000).optional(),
    consistency_target_ms: z.number().min(0).max(60_000).optional(),
    // P4-S7 (D94): curated resilience extra-challenges — failure-preset ids (Test conditions) this
    // quest rewards surviving. A post-3★ build whose metric probe shows NO new bottleneck under the
    // preset clears the extra (+1 expert, once per condition). Optional + never defaulted at this
    // layer — absent ⇒ undefined ⇒ the other 60 quests are byte-identical.
    resilience_conditions: z.array(z.string().min(1).max(MAX_SCHEMA_STRING_LENGTH).regex(/^failure-[a-z0-9-]+$/)).max(6).optional(),
  })
  .strict()
  .superRefine((d, ctx) => {
    if (d.schema_version >= 2) {
      if (!d.track) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["track"], message: "schema_version 2 requires a track" })
      }
      if (d.tier === undefined) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["tier"], message: "schema_version 2 requires a tier (1–6)" })
      }
      if (!d.rewards) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["rewards"], message: "schema_version 2 requires rewards.xp" })
      }
    }
    // ISAPivot: a challenge must define its load somehow.
    const hasCurve = !!d.traffic_curve && d.traffic_curve.length > 0
    const hasSources = !!d.traffic_sources && d.traffic_sources.length > 0
    if (!hasCurve && !hasSources) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["traffic_curve"],
        message: "a challenge needs traffic_curve or at least one traffic_sources entry",
      })
    }
    // ISAPivot: at most one source per type (≤4, one each).
    if (d.traffic_sources) {
      const seen = new Set<string>()
      d.traffic_sources.forEach((s, i) => {
        if (seen.has(s.type)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["traffic_sources", i, "type"],
            message: `duplicate traffic source type "${s.type}" — one per type only`,
          })
        }
        seen.add(s.type)
      })
      // Buildability ceiling (D71): the summed source peak must be clearable within the canvas budget
      // (≤50 nodes × ≤20 replicas). The front tier ingests the full peak, so a higher peak yields a
      // quest no player can build. Mirrors the challenge-creator gate + the capped solvability harness.
      const peak = d.traffic_sources.reduce((sum, s) => sum + s.rps, 0)
      if (peak > MAX_BUILDABLE_PEAK_RPS) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["traffic_sources"],
          message: `combined traffic peak ${peak} exceeds the buildable maximum ${MAX_BUILDABLE_PEAK_RPS} (50 nodes × 20 replicas)`,
        })
      }
    }
  })
  .transform((d) => ({
    schemaVersion: d.schema_version,
    id: d.id,
    title: d.title,
    brief: d.brief,
    difficulty: d.difficulty,
    budgetCap: d.budget_cap,
    durationSeconds: d.duration_seconds,
    // Phase 1 derives the combined curve from traffic_sources when traffic_curve is absent; until
    // then a source-only challenge yields []. All built-in challenges supply traffic_curve, so the
    // empty path is unreachable by current content (guarded by the at-least-one rule above).
    trafficCurve: d.traffic_curve ?? [],
    trafficSources: d.traffic_sources,
    requiredComponents: d.required_components,
    targetMetrics: {
      uptimePercent: d.target_metrics.uptime_percent,
      p99LatencyMs: d.target_metrics.p99_latency_ms,
      ...(d.target_metrics.p95_latency_ms !== undefined ? { p95LatencyMs: d.target_metrics.p95_latency_ms } : {}),
      ...(d.target_metrics.cost_per_request !== undefined ? { costPerRequest: d.target_metrics.cost_per_request } : {}),
    },
    scheduledEvents: d.scheduled_events,
    hints: d.hints,
    allowedCategories: d.allowed_categories,
    track: d.track,
    tier: d.tier,
    requires: d.requires,
    unlocks: d.unlocks,
    minXp: d.min_xp,
    requiredTypes: d.required_types,
    forbiddenTypes: d.forbidden_types,
    requiredTopology: d.required_topology,
    ...(d.chaos_intensity !== undefined ? { chaosIntensity: d.chaos_intensity } : {}),
    availableBlocks: d.available_blocks,
    grants: d.grants,
    rewards: d.rewards,
    ...(d.usage_rates !== undefined ? { usageRates: { perMillionRequests: d.usage_rates.per_million_requests } } : {}),
    ...(d.cross_region_rtt_ms !== undefined ? { crossRegionRttMs: d.cross_region_rtt_ms } : {}),
    ...(d.consistency_target_ms !== undefined ? { consistencyTargetMs: d.consistency_target_ms } : {}),
    ...(d.resilience_conditions !== undefined ? { resilienceConditions: d.resilience_conditions } : {}),
  }))
