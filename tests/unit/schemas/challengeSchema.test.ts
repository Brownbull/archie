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
    const { scheduled_events: _se, hints: _hints, ...rest } = valid
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

describe("ChallengeYamlSchema v2 tech-tree fields (Mastery Tracks)", () => {
  const v2 = {
    ...valid,
    schema_version: 2,
    track: "foundations",
    tier: 1,
    requires: [],
    unlocks: ["scale-out"],
    available_blocks: ["traffic-source", "compute"],
    grants: ["load-balancer"],
    rewards: { xp: 100 },
  }

  it("defaults schema_version to 1 and the tree fields to empty for a legacy file", () => {
    const r = ChallengeYamlSchema.safeParse(valid)
    expect(r.success).toBe(true)
    if (!r.success) return
    expect(r.data.schemaVersion).toBe(1)
    expect(r.data.requires).toEqual([])
    expect(r.data.unlocks).toEqual([])
    expect(r.data.availableBlocks).toEqual([])
    expect(r.data.grants).toEqual([])
    expect(r.data.track).toBeUndefined()
    expect(r.data.rewards).toBeUndefined()
  })

  it("parses a full v2 challenge and transforms the tree fields", () => {
    const r = ChallengeYamlSchema.safeParse(v2)
    expect(r.success).toBe(true)
    if (!r.success) return
    expect(r.data.schemaVersion).toBe(2)
    expect(r.data.track).toBe("foundations")
    expect(r.data.tier).toBe(1)
    expect(r.data.availableBlocks).toEqual(["traffic-source", "compute"])
    expect(r.data.grants).toEqual(["load-balancer"])
    expect(r.data.rewards).toEqual({ xp: 100 })
  })

  it("requires track, tier, and rewards when schema_version is 2", () => {
    const { track: _track, tier: _tier, rewards: _rewards, ...missing } = v2
    expect(ChallengeYamlSchema.safeParse(missing).success).toBe(false)
  })

  it("rejects an unknown track id", () => {
    expect(ChallengeYamlSchema.safeParse({ ...v2, track: "wizardry" }).success).toBe(false)
  })

  it("rejects a tier outside 1–6", () => {
    expect(ChallengeYamlSchema.safeParse({ ...v2, tier: 7 }).success).toBe(false)
    expect(ChallengeYamlSchema.safeParse({ ...v2, tier: 6 }).success).toBe(true) // Tier 6 = absurd capstones (D70)
  })

  it("rejects an unknown component type id in available_blocks / grants", () => {
    expect(ChallengeYamlSchema.safeParse({ ...v2, available_blocks: ["not-a-real-block"] }).success).toBe(false)
    expect(ChallengeYamlSchema.safeParse({ ...v2, grants: ["not-a-real-block"] }).success).toBe(false)
  })
})

describe("ChallengeYamlSchema traffic_sources (ISAPivot)", () => {
  it("parses traffic_sources and applies kind/workload/origin defaults", () => {
    const r = ChallengeYamlSchema.safeParse({
      ...valid,
      traffic_sources: [{ type: "web-users", rps: 5000 }],
    })
    expect(r.success).toBe(true)
    if (!r.success) return
    expect(r.data.trafficSources).toEqual([
      { type: "web-users", rps: 5000, kind: "steady", workload: "mixed", origin: "one-region" },
    ])
  })

  it("accepts an explicit kind/workload/origin including the new search shape", () => {
    const r = ChallengeYamlSchema.safeParse({
      ...valid,
      traffic_sources: [{ type: "api-client", rps: 12000, kind: "search", workload: "write", origin: "multi-region" }],
    })
    expect(r.success).toBe(true)
    if (!r.success) return
    expect(r.data.trafficSources?.[0]).toMatchObject({ kind: "search", workload: "write", origin: "multi-region" })
  })

  it("rejects a second source of the same type (one per type)", () => {
    const r = ChallengeYamlSchema.safeParse({
      ...valid,
      traffic_sources: [
        { type: "web-users", rps: 5000 },
        { type: "web-users", rps: 9000 },
      ],
    })
    expect(r.success).toBe(false)
  })

  it("rejects more than four sources", () => {
    const r = ChallengeYamlSchema.safeParse({
      ...valid,
      traffic_sources: [
        { type: "web-users", rps: 1 },
        { type: "api-client", rps: 1 },
        { type: "iot-sensors", rps: 1 },
        { type: "mobile-users", rps: 1 },
        { type: "web-users", rps: 1 },
      ],
    })
    expect(r.success).toBe(false)
  })

  it("rejects an unknown source type and an out-of-range rps", () => {
    expect(ChallengeYamlSchema.safeParse({ ...valid, traffic_sources: [{ type: "aliens", rps: 5000 }] }).success).toBe(false)
    expect(ChallengeYamlSchema.safeParse({ ...valid, traffic_sources: [{ type: "web-users", rps: 0 }] }).success).toBe(false)
  })

  it("allows omitting traffic_curve when traffic_sources is present (at-least-one rule)", () => {
    const { traffic_curve: _omit, ...noCurve } = valid
    const r = ChallengeYamlSchema.safeParse({ ...noCurve, traffic_sources: [{ type: "web-users", rps: 5000 }] })
    expect(r.success).toBe(true)
    if (!r.success) return
    expect(r.data.trafficCurve).toEqual([])
  })

  it("rejects a challenge with neither traffic_curve nor traffic_sources", () => {
    const { traffic_curve: _omit, ...noCurve } = valid
    expect(ChallengeYamlSchema.safeParse(noCurve).success).toBe(false)
  })
})
