import { describe, it, expect } from "vitest"
import { getAllChallenges, getChallenge, isKnownChallengeId } from "@/services/challengeLoader"

describe("challengeLoader (Epic 16 P5)", () => {
  it("loads all 10 authored challenge levels via the build-time glob", () => {
    const all = getAllChallenges()
    expect(all.length).toBe(10)
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
