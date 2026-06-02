import { dump } from "js-yaml"
import { ChallengeYamlSchema } from "@/schemas/challengeSchema"
import type { Challenge } from "@/lib/challengeTypes"

/**
 * Serialize a Challenge object back to snake_case YAML (Phase 5 — Challenge Forge, D45).
 * Mirrors the exportArchitecture pattern: assemble a snake_case plain object, re-validate
 * it against the same ChallengeYamlSchema (no hand-rolled inverse that can drift), then
 * dump via js-yaml. Throws on validation failure (should never happen for well-formed
 * runtime objects — indicates a bug, not bad user input).
 *
 * The `origin` field is deliberately OMITTED from the output: it's a runtime-only
 * provenance tag that must never appear in the YAML (the schema is .strict()).
 */
export function exportChallenge(c: Challenge): string {
  const obj: Record<string, unknown> = {
    schema_version: c.schemaVersion,
    id: c.id,
    title: c.title,
    brief: c.brief,
    difficulty: c.difficulty,
    budget_cap: c.budgetCap,
    duration_seconds: c.durationSeconds,
    traffic_curve: c.trafficCurve,
    required_components: c.requiredComponents,
    target_metrics: {
      uptime_percent: c.targetMetrics.uptimePercent,
      p99_latency_ms: c.targetMetrics.p99LatencyMs,
    },
  }
  if (c.scheduledEvents.length > 0) obj.scheduled_events = c.scheduledEvents
  if (c.hints.length > 0) obj.hints = c.hints
  if (c.allowedCategories?.length) obj.allowed_categories = c.allowedCategories
  if (c.track) obj.track = c.track
  if (c.tier !== undefined) obj.tier = c.tier
  if (c.requires.length > 0) obj.requires = c.requires
  if (c.unlocks.length > 0) obj.unlocks = c.unlocks
  if (c.availableBlocks.length > 0) obj.available_blocks = c.availableBlocks
  if (c.grants.length > 0) obj.grants = c.grants
  if (c.rewards) obj.rewards = { xp: c.rewards.xp }

  const validation = ChallengeYamlSchema.safeParse(obj)
  if (!validation.success) {
    if (import.meta.env.DEV) {
      console.warn("Challenge export validation failed:", validation.error.flatten().fieldErrors)
    }
    throw new Error("Export failed: challenge data failed internal validation")
  }

  return dump(obj)
}
