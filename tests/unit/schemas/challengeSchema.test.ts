import { describe, it, expect } from "vitest"
import { ChallengeYamlSchema, ScheduledEventSchema } from "@/schemas/challengeSchema"

const valid = {
  id: "challenge-1",
  title: "Static Site with CDN",
  brief: "Serve a static site globally with low latency.",
  difficulty: "beginner",
  budget_cap: 50,
  duration_seconds: 60,
  traffic_curve: [{ t: 0, rps: 0 }, { t: 60, rps: 500 }],
  required_components: ["delivery-network"],
  target_metrics: { uptime_percent: 99, p99_latency_ms: 200 },
  scheduled_events: [{ t: 30, type: "latency_spike", target: "n1", multiplier: 3 }],
  hints: ["Put a CDN in front."],
}

describe("ChallengeYamlSchema (Epic 16)", () => {
  it("parses a valid challenge and transforms snake_case → camelCase", () => {
    const r = ChallengeYamlSchema.safeParse(valid)
    expect(r.success).toBe(true)
    if (!r.success) return
    expect(r.data.budgetCap).toBe(50)
    expect(r.data.durationSeconds).toBe(60)
    expect(r.data.targetMetrics).toEqual({ uptimePercent: 99, p99LatencyMs: 200 })
    expect(r.data.requiredComponents).toEqual(["delivery-network"])
    expect(r.data.scheduledEvents[0]).toMatchObject({ type: "latency_spike", target: "n1", multiplier: 3 })
  })

  it("defaults scheduled_events and hints to empty arrays when omitted", () => {
    const { scheduled_events, hints, ...rest } = valid
    const r = ChallengeYamlSchema.safeParse(rest)
    expect(r.success).toBe(true)
    if (!r.success) return
    expect(r.data.scheduledEvents).toEqual([])
    expect(r.data.hints).toEqual([])
  })

  it("rejects an invalid difficulty", () => {
    expect(ChallengeYamlSchema.safeParse({ ...valid, difficulty: "expert" }).success).toBe(false)
  })

  it("rejects an out-of-range uptime target", () => {
    expect(ChallengeYamlSchema.safeParse({ ...valid, target_metrics: { uptime_percent: 150, p99_latency_ms: 200 } }).success).toBe(false)
  })

  it("rejects unknown keys (strict)", () => {
    expect(ChallengeYamlSchema.safeParse({ ...valid, extra: 1 }).success).toBe(false)
  })

  it("ScheduledEventSchema rejects an unknown event type", () => {
    expect(ScheduledEventSchema.safeParse({ t: 10, type: "meteor", target: "n1" }).success).toBe(false)
  })
})
