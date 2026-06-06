import { describe, it, expect } from "vitest"
import { getAllChallenges, getChallenge, isKnownChallengeId, loadChallengeFromYaml } from "@/services/challengeLoader"
import { validateTechTree } from "@/engine/techTree"
import { isKnownTrackId } from "@/lib/challengeTracks"
import { MAX_FILE_SIZE } from "@/lib/constants"

describe("challengeLoader (Epic 16 P5)", () => {
  it("loads every authored challenge level via the build-time glob", () => {
    const all = getAllChallenges()
    expect(all.length).toBe(57)
  })

  it("orders by difficulty (beginner first, advanced last)", () => {
    const order = { beginner: 0, intermediate: 1, advanced: 2 }
    const diffs = getAllChallenges().map((c) => order[c.difficulty])
    expect(diffs).toEqual([...diffs].sort((a, b) => a - b))
  })

  it("resolves a known challenge by id and rejects unknown ids", () => {
    expect(getChallenge("first-service")?.title).toBe("First Service")
    expect(isKnownChallengeId("chaos-day")).toBe(true)
    expect(isKnownChallengeId("no-such-level")).toBe(false)
  })
})

describe("challengeLoader — Mastery Tracks tech-tree spine", () => {
  it("recasts every challenge as schema v2 with a known track, tier, and xp reward", () => {
    for (const c of getAllChallenges()) {
      expect(c.schemaVersion).toBe(2)
      expect(c.track && isKnownTrackId(c.track)).toBe(true)
      expect(c.tier).toBeGreaterThanOrEqual(1)
      expect(c.tier).toBeLessThanOrEqual(6) // Tier 6 = absurd capstones (D70)
      expect(c.rewards?.xp).toBeGreaterThan(0)
    }
  })

  it("forms a sound DAG — no duplicate ids, dangling refs, or cycles", () => {
    expect(validateTechTree(getAllChallenges())).toEqual([])
  })

  it("roots the spine at first-service (no prerequisites)", () => {
    expect(getChallenge("first-service")?.requires).toEqual([])
    // every other challenge has at least one prerequisite
    for (const c of getAllChallenges()) {
      if (c.id !== "first-service") expect(c.requires.length).toBeGreaterThan(0)
    }
  })
})

describe("loadChallengeFromYaml (runtime import)", () => {
  const yaml = [
    "schema_version: 2",
    "id: imported-1",
    "title: Imported Challenge",
    "brief: A runtime-loaded challenge.",
    "difficulty: beginner",
    "budget_cap: 50",
    "duration_seconds: 60",
    "traffic_curve: [{ t: 0, rps: 0 }, { t: 60, rps: 100 }]",
    "required_components: [compute]",
    "target_metrics: { uptime_percent: 95, p99_latency_ms: 400 }",
    "track: foundations",
    "tier: 1",
    "available_blocks: [traffic-source, compute]",
    "rewards: { xp: 100 }",
  ].join("\n")

  it("loads and validates a well-formed v2 challenge", () => {
    const r = loadChallengeFromYaml(yaml)
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.challenge.id).toBe("imported-1")
    expect(r.challenge.track).toBe("foundations")
    expect(r.challenge.rewards?.xp).toBe(100)
  })

  it("rejects empty input", () => {
    expect(loadChallengeFromYaml("   ")).toMatchObject({ ok: false })
  })

  it("rejects input larger than the size cap before parsing", () => {
    const huge = "id: x\n" + "#".padEnd(MAX_FILE_SIZE + 10, "#")
    const r = loadChallengeFromYaml(huge)
    expect(r.ok).toBe(false)
    if (r.ok) return
    expect(r.error).toMatch(/too large/i)
  })

  it("returns a readable error for malformed YAML", () => {
    const r = loadChallengeFromYaml("id: x\n  : : bad")
    expect(r.ok).toBe(false)
    if (r.ok) return
    expect(r.error).toMatch(/invalid yaml/i)
  })

  it("returns a readable error for a schema violation (unknown track)", () => {
    const r = loadChallengeFromYaml(yaml.replace("track: foundations", "track: wizardry"))
    expect(r.ok).toBe(false)
    if (r.ok) return
    expect(r.error).toMatch(/track/i)
  })
})

describe("challenge origin stamping (D45)", () => {
  it("stamps all build-time challenges as origin=builtin", () => {
    for (const c of getAllChallenges()) {
      expect(c.origin).toBe("builtin")
    }
  })

  it("stamps runtime-imported challenges as origin=user", () => {
    const yaml = [
      "schema_version: 2",
      "id: user-test",
      "title: User Test",
      "brief: Test challenge.",
      "difficulty: beginner",
      "budget_cap: 50",
      "duration_seconds: 60",
      "traffic_curve: [{ t: 0, rps: 0 }, { t: 60, rps: 100 }]",
      "required_components: [compute]",
      "target_metrics: { uptime_percent: 95, p99_latency_ms: 400 }",
      "track: foundations",
      "tier: 1",
      "available_blocks: [traffic-source, compute]",
      "rewards: { xp: 100 }",
    ].join("\n")
    const r = loadChallengeFromYaml(yaml)
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.challenge.origin).toBe("user")
  })
})
