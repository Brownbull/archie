import { describe, it, expect } from "vitest"
import { load } from "js-yaml"
import { exportChallenge } from "@/services/challengeExporter"
import { ChallengeYamlSchema } from "@/schemas/challengeSchema"
import type { Challenge } from "@/lib/challengeTypes"

const sample: Challenge = {
  id: "test-export",
  title: "Export Test",
  brief: "A challenge to test the exporter.",
  difficulty: "beginner",
  budgetCap: 100,
  durationSeconds: 60,
  trafficCurve: [{ t: 0, rps: 0 }, { t: 60, rps: 500 }],
  requiredComponents: ["compute"],
  targetMetrics: { uptimePercent: 95, p99LatencyMs: 400 },
  scheduledEvents: [],
  hints: [],
  schemaVersion: 2,
  track: "foundations",
  tier: 1,
  requires: [],
  unlocks: [],
  availableBlocks: ["traffic-source", "compute"],
  grants: [],
  rewards: { xp: 100 },
  origin: "builtin",
}

describe("exportChallenge", () => {
  it("round-trips: export → parse YAML → re-validate against schema", () => {
    const yaml = exportChallenge(sample)
    const parsed = load(yaml)
    const result = ChallengeYamlSchema.safeParse(parsed)
    expect(result.success).toBe(true)
    if (!result.success) return
    expect(result.data.id).toBe("test-export")
    expect(result.data.track).toBe("foundations")
    expect(result.data.rewards?.xp).toBe(100)
  })

  it("omits origin from the YAML output", () => {
    const yaml = exportChallenge(sample)
    expect(yaml).not.toContain("origin")
  })

  it("omits empty optional arrays", () => {
    const yaml = exportChallenge(sample)
    expect(yaml).not.toContain("scheduled_events")
    expect(yaml).not.toContain("hints")
    expect(yaml).not.toContain("requires")
  })
})
