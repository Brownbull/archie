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

  it("rejects traffic_sources whose combined peak exceeds the buildable maximum (D71)", () => {
    // 4 sources × 1M = 4M > 2M buildable ceiling — unbuildable within 50 nodes × 20 replicas.
    const over = {
      ...valid,
      traffic_sources: [
        { type: "web-users", rps: 1_000_000 },
        { type: "api-client", rps: 1_000_000 },
        { type: "mobile-users", rps: 1_000_000 },
        { type: "iot-sensors", rps: 1_000_000 },
      ],
    }
    const r = ChallengeYamlSchema.safeParse(over)
    expect(r.success).toBe(false)
    if (r.success) return
    expect(JSON.stringify(r.error.issues)).toMatch(/buildable maximum/i)
  })

  it("accepts traffic_sources summing to exactly the buildable maximum", () => {
    const atMax = { ...valid, traffic_sources: [{ type: "web-users", rps: 2_000_000 }] }
    expect(ChallengeYamlSchema.safeParse(atMax).success).toBe(true)
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

describe("initial_architecture — brownfield starts (P5-S1 / D95)", () => {
  const seed = {
    nodes: [
      { id: "n-traffic", component_id: "web-users", config_variant_id: "moderate", position: { x: 0, y: 0 }, replicas: 1, traffic_rps: 800 },
      { id: "n-compute", component_id: "fastapi", config_variant_id: "small", position: { x: 220, y: 0 }, replicas: 2 },
    ],
    edges: [{ id: "e0", source_node_id: "n-traffic", target_node_id: "n-compute" }],
  }

  it("parses a valid brownfield seed and transforms to camelCase", () => {
    const r = ChallengeYamlSchema.safeParse({ ...valid, initial_architecture: seed })
    expect(r.success).toBe(true)
    if (!r.success) return
    expect(r.data.initialArchitecture?.nodes).toHaveLength(2)
    expect(r.data.initialArchitecture?.nodes[0]).toMatchObject({ id: "n-traffic", componentId: "web-users", trafficRps: 800 })
    expect(r.data.initialArchitecture?.edges[0]).toMatchObject({ sourceNodeId: "n-traffic", targetNodeId: "n-compute" })
  })

  it("absent ⇒ no initialArchitecture key (the other 60+ quests are byte-identical)", () => {
    const r = ChallengeYamlSchema.safeParse(valid)
    expect(r.success).toBe(true)
    if (!r.success) return
    expect("initialArchitecture" in r.data).toBe(false)
  })

  it("rejects duplicate node ids", () => {
    const dup = { ...seed, nodes: [seed.nodes[0], { ...seed.nodes[1], id: "n-traffic" }], edges: [] }
    const r = ChallengeYamlSchema.safeParse({ ...valid, initial_architecture: dup })
    expect(r.success).toBe(false)
  })

  it("rejects an edge referencing a node id not in the seed", () => {
    const dangling = { ...seed, edges: [{ id: "e0", source_node_id: "n-traffic", target_node_id: "n-ghost" }] }
    const r = ChallengeYamlSchema.safeParse({ ...valid, initial_architecture: dangling })
    expect(r.success).toBe(false)
  })

  it("rejects unknown keys (strict) and an empty node list", () => {
    expect(ChallengeYamlSchema.safeParse({ ...valid, initial_architecture: { ...seed, bogus: 1 } }).success).toBe(false)
    expect(ChallengeYamlSchema.safeParse({ ...valid, initial_architecture: { nodes: [], edges: [] } }).success).toBe(false)
  })
})

describe("chain metadata (P5-S5 / D95)", () => {
  it("parses a chain member and transforms continues_from → continuesFrom", () => {
    const r = ChallengeYamlSchema.safeParse({ ...valid, chain: { id: "data-backbone", stage: 2, continues_from: "async-pipeline" } })
    expect(r.success).toBe(true)
    if (!r.success) return
    expect(r.data.chain).toEqual({ id: "data-backbone", stage: 2, continuesFrom: "async-pipeline" })
  })

  it("stage 1 must be a root; stage >1 must name its build parent", () => {
    expect(ChallengeYamlSchema.safeParse({ ...valid, chain: { id: "c", stage: 1, continues_from: "x" } }).success).toBe(false)
    expect(ChallengeYamlSchema.safeParse({ ...valid, chain: { id: "c", stage: 2 } }).success).toBe(false)
    expect(ChallengeYamlSchema.safeParse({ ...valid, chain: { id: "c", stage: 1 } }).success).toBe(true)
  })
})
