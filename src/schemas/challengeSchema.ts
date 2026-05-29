import { z } from "zod"
import { TrafficCurveSchema } from "@/schemas/demandSchema"
import { MAX_SCHEMA_STRING_LENGTH } from "@/lib/constants"
import { sanitizeDisplayString } from "@/lib/sanitize"

const CHALLENGE_BRIEF_MAX = 600
const CHALLENGE_HINT_MAX = 300

// Scheduled failure event (Epic 16) — mirrors simulationTypes.ScheduledEvent.
export const ScheduledEventSchema = z
  .object({
    t: z.number().min(0).max(3600),
    type: z.enum(["component_failure", "latency_spike", "az_outage"]),
    target: z.string().min(1).max(MAX_SCHEMA_STRING_LENGTH),
    durationS: z.number().min(0).max(3600).optional(),
    multiplier: z.number().min(1).max(100).optional(),
  })
  .strict()

const TargetMetricsYamlSchema = z
  .object({
    uptime_percent: z.number().min(0).max(100),
    p99_latency_ms: z.number().min(0).max(60_000),
  })
  .strict()

/**
 * YAML variant for a Challenge (snake_case → camelCase transform). Used by challengeLoader.
 * Defense-in-depth bounds on every numeric + sanitized display strings.
 */
export const ChallengeYamlSchema = z
  .object({
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
  })
  .strict()
  .transform((d) => ({
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
  }))
