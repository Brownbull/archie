import { describe, it, expect } from "vitest"
import {
  rankForXp,
  xpToNextRank,
  relativeLevelForTier,
  MASTERY_RANKS,
  RANK_XP_THRESHOLDS,
  RELATIVE_LEVEL_COLORS,
} from "@/lib/challengeTracks"

describe("rankForXp", () => {
  it("returns Novice (rank 0) at 0 XP", () => {
    expect(rankForXp(0)).toEqual({ rank: 0, name: "Novice" })
  })

  it("reaches Apprentice at exactly 100 XP", () => {
    expect(rankForXp(100)).toEqual({ rank: 1, name: "Apprentice" })
  })

  it("reaches Architect at 1000+ XP", () => {
    expect(rankForXp(1000)).toEqual({ rank: 4, name: "Architect" })
    expect(rankForXp(9999)).toEqual({ rank: 4, name: "Architect" })
  })

  it("stays at Practitioner between 300 and 599", () => {
    expect(rankForXp(300).name).toBe("Practitioner")
    expect(rankForXp(599).name).toBe("Practitioner")
  })
})

describe("xpToNextRank", () => {
  it("returns distance to next threshold", () => {
    expect(xpToNextRank(0)).toBe(100)
    expect(xpToNextRank(50)).toBe(50)
    expect(xpToNextRank(100)).toBe(200)
  })

  it("returns 0 at the cap", () => {
    expect(xpToNextRank(1000)).toBe(0)
    expect(xpToNextRank(5000)).toBe(0)
  })
})

describe("relativeLevelForTier", () => {
  it("returns on-level when player rank matches challenge tier-1", () => {
    expect(relativeLevelForTier(0, 1)).toBe("on-level")
    expect(relativeLevelForTier(2, 3)).toBe("on-level")
  })

  it("returns trivial when player is far above", () => {
    expect(relativeLevelForTier(4, 1)).toBe("trivial")
  })

  it("returns locked when gap >= 3", () => {
    expect(relativeLevelForTier(0, 4)).toBe("locked")
    expect(relativeLevelForTier(0, 5)).toBe("locked")
  })

  it("returns tough and hard for intermediate gaps", () => {
    expect(relativeLevelForTier(0, 2)).toBe("tough")
    expect(relativeLevelForTier(0, 3)).toBe("hard")
  })
})

describe("constants", () => {
  it("has 5 ranks matching 5 thresholds", () => {
    expect(MASTERY_RANKS).toHaveLength(5)
    expect(RANK_XP_THRESHOLDS).toHaveLength(5)
  })

  it("thresholds are strictly ascending", () => {
    for (let i = 1; i < RANK_XP_THRESHOLDS.length; i++) {
      expect(RANK_XP_THRESHOLDS[i]).toBeGreaterThan(RANK_XP_THRESHOLDS[i - 1])
    }
  })

  it("has a colour for every relative level", () => {
    const levels = ["trivial", "easy", "on-level", "tough", "hard", "locked"] as const
    for (const l of levels) {
      expect(RELATIVE_LEVEL_COLORS[l]).toMatch(/^#[0-9a-f]{6}$/i)
    }
  })
})
