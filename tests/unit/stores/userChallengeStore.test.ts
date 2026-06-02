import { describe, it, expect, beforeEach } from "vitest"
import { useUserChallengeStore, namespaceUserId, stripUserPrefix } from "@/stores/userChallengeStore"
import type { Challenge } from "@/lib/challengeTypes"

const sample: Challenge = {
  id: "my-test",
  title: "Test Challenge",
  brief: "A test.",
  difficulty: "beginner",
  budgetCap: 50,
  durationSeconds: 60,
  trafficCurve: [{ t: 0, rps: 0 }, { t: 60, rps: 100 }],
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
  origin: "user",
}

describe("namespaceUserId / stripUserPrefix", () => {
  it("prefixes a bare id", () => {
    expect(namespaceUserId("my-challenge")).toBe("user/my-challenge")
  })

  it("does not double-prefix", () => {
    expect(namespaceUserId("user/my-challenge")).toBe("user/my-challenge")
  })

  it("strips the prefix for display", () => {
    expect(stripUserPrefix("user/my-challenge")).toBe("my-challenge")
    expect(stripUserPrefix("builtin-id")).toBe("builtin-id")
  })
})

describe("useUserChallengeStore", () => {
  beforeEach(() => {
    useUserChallengeStore.setState({ challenges: [] })
  })

  it("adds a challenge with user/ prefix", () => {
    useUserChallengeStore.getState().addChallenge(sample)
    const all = useUserChallengeStore.getState().challenges
    expect(all).toHaveLength(1)
    expect(all[0].id).toBe("user/my-test")
    expect(all[0].origin).toBe("user")
  })

  it("prevents duplicate ids", () => {
    useUserChallengeStore.getState().addChallenge(sample)
    useUserChallengeStore.getState().addChallenge(sample)
    expect(useUserChallengeStore.getState().challenges).toHaveLength(1)
  })

  it("removes a challenge by id", () => {
    useUserChallengeStore.getState().addChallenge(sample)
    useUserChallengeStore.getState().removeChallenge("user/my-test")
    expect(useUserChallengeStore.getState().challenges).toHaveLength(0)
  })

  it("updates an existing challenge", () => {
    useUserChallengeStore.getState().addChallenge(sample)
    useUserChallengeStore.getState().updateChallenge({ ...sample, id: "user/my-test", title: "Updated Title", origin: "user" })
    expect(useUserChallengeStore.getState().challenges[0].title).toBe("Updated Title")
  })
})
