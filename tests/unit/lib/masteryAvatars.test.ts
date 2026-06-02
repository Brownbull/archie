import { describe, it, expect } from "vitest"
import { getMasteryAvatar, getTrackAvatar } from "@/lib/masteryAvatars"

describe("getMasteryAvatar", () => {
  it("returns a URL for every rank 0–4", () => {
    for (let r = 0; r <= 4; r++) {
      const url = getMasteryAvatar(r)
      expect(typeof url).toBe("string")
      expect(url!.length).toBeGreaterThan(0)
    }
  })

  it("returns the Grand Architect avatar for rank 4+", () => {
    const r4 = getMasteryAvatar(4)
    const r5 = getMasteryAvatar(5)
    expect(r4).toBe(r5)
  })

  it("returns null for negative ranks", () => {
    expect(getMasteryAvatar(-1)).toBeNull()
  })
})

describe("getTrackAvatar", () => {
  const ALL_TRACKS = ["foundations", "data", "edge", "realtime", "reliability", "security", "aiml"]

  it("returns a URL for every track", () => {
    for (const t of ALL_TRACKS) {
      const url = getTrackAvatar(t)
      expect(typeof url).toBe("string")
      expect(url!.length).toBeGreaterThan(0)
    }
  })

  it("returns null for unknown tracks", () => {
    expect(getTrackAvatar("unknown")).toBeNull()
  })
})
