import { describe, it, expect } from "vitest"
import { getMasteryAvatar } from "@/lib/masteryAvatars"

describe("getMasteryAvatar", () => {
  it("returns null for rank 0 (Novice — no avatar generated yet)", () => {
    expect(getMasteryAvatar(0)).toBeNull()
  })

  it("returns a string URL for rank 1 (Apprentice)", () => {
    const url = getMasteryAvatar(1)
    expect(typeof url).toBe("string")
    expect(url!.length).toBeGreaterThan(0)
  })

  it("returns the rank-05 avatar for rank 4 (Architect)", () => {
    const url = getMasteryAvatar(4)
    expect(typeof url).toBe("string")
    expect(url!.length).toBeGreaterThan(0)
  })

  it("falls back to the nearest lower rank that has an avatar", () => {
    const rank2 = getMasteryAvatar(2)
    const rank1 = getMasteryAvatar(1)
    expect(rank2).toBe(rank1)
  })
})
