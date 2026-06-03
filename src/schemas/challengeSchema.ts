import { z } from "zod"
import { TrafficCurveSchema } from "@/schemas/demandSchema"
import { MAX_SCHEMA_STRING_LENGTH } from "@/lib/constants"
import { sanitizeDisplayString } from "@/lib/sanitize"
import { COMPONENT_TYPES } from "@/lib/componentTypes"
import { isKnownTrackId, MIN_CHALLENGE_TIER, MAX_CHALLENGE_TIER } from "@/lib/challengeTracks"

const CHALLENGE_BRIEF_MAX = 600
const CHALLENGE_HINT_MAX = 300

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
  })
  .strict()

const RewardsYamlSchema = z
  .object({
    xp: z.number().int().min(0).max(100_000),
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
    traffic_curve: TrafficCurveSchema,
    required_components: z.array(z.string().min(1).max(MAX_SCHEMA_STRING_LENGTH)).max(20),
    target_metrics: TargetMetricsYamlSchema,
    scheduled_events: z.array(ScheduledEventSchema).max(20).default([]),
    hints: z.array(z.string().min(1).transform((s) => sanitizeDisplayString(s, CHALLENGE_HINT_MAX))).max(10).default([]),
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
    available_blocks: z.array(blockTypeId).max(40).default([]),
    grants: z.array(blockTypeId).max(40).default([]),
    rewards: RewardsYamlSchema.optional(),
  })
  .strict()
  .superRefine((d, ctx) => {
    if (d.schema_version >= 2) {
      if (!d.track) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["track"], message: "schema_version 2 requires a track" })
      }
      if (d.tier === undefined) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["tier"], message: "schema_version 2 requires a tier (1–5)" })
      }
      if (!d.rewards) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["rewards"], message: "schema_version 2 requires rewards.xp" })
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
    trafficCurve: d.traffic_curve,
    requiredComponents: d.required_components,
    targetMetrics: { uptimePercent: d.target_metrics.uptime_percent, p99LatencyMs: d.target_metrics.p99_latency_ms },
    scheduledEvents: d.scheduled_events,
    hints: d.hints,
    allowedCategories: d.allowed_categories,
    track: d.track,
    tier: d.tier,
    requires: d.requires,
    unlocks: d.unlocks,
    minXp: d.min_xp,
    requiredTypes: d.required_types,
    availableBlocks: d.available_blocks,
    grants: d.grants,
    rewards: d.rewards,
  }))
