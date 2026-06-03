import { describe, it, expect } from "vitest"
import {
  rankForXp,
  xpToNextRank,
  relativeLevelForTier,
  MASTERY_RANKS,
  RANK_XP_THRESHOLDS,
  RELATIVE_LEVEL_COLORS,
  MAX_LEVEL,
} from "@/lib/challengeTracks"

describe("rankForXp (10-level system)", () => {
  it("returns Novice (level 0) at 0 XP", () => {
    expect(rankForXp(0)).toEqual({ rank: 0, name: "Novice" })
  })

  it("reaches Apprentice (level 1) at 20 XP", () => {
    expect(rankForXp(20)).toEqual({ rank: 1, name: "Apprentice" })
  })

  it("reaches Builder (level 2) at 100 XP", () => {
    expect(rankForXp(100)).toEqual({ rank: 2, name: "Builder" })
  })

  it("reaches Grand Architect (level 9) at 7700 XP", () => {
    expect(rankForXp(7700)).toEqual({ rank: 9, name: "Grand Architect" })
    expect(rankForXp(9999)).toEqual({ rank: 9, name: "Grand Architect" })
  })

  it("stays at Practitioner between 600 and 1099", () => {
    expect(rankForXp(600).name).toBe("Practitioner")
    expect(rankForXp(1099).name).toBe("Practitioner")
  })
})

describe("xpToNextRank (10-level system)", () => {
  it("returns distance to next threshold", () => {
    expect(xpToNextRank(0)).toBe(20)
    expect(xpToNextRank(10)).toBe(10)
    expect(xpToNextRank(20)).toBe(80) // level 1 → level 2 needs 100
  })

  it("returns 0 at the level cap", () => {
    expect(xpToNextRank(7700)).toBe(0)
    expect(xpToNextRank(9000)).toBe(0)
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

describe("constants (10-level system)", () => {
  it("has 10 ranks matching 11 thresholds (0 + 10 levels)", () => {
    expect(MASTERY_RANKS).toHaveLength(10)
    expect(RANK_XP_THRESHOLDS).toHaveLength(11) // includes level 0 threshold
    expect(MAX_LEVEL).toBe(9)
  })

  it("thresholds are strictly ascending", () => {
    for (let i = 1; i < RANK_XP_THRESHOLDS.length; i++) {
      expect(RANK_XP_THRESHOLDS[i]).toBeGreaterThan(RANK_XP_THRESHOLDS[i - 1])
    }
  })

  it("level cap (Grand Architect) requires 7700 XP", () => {
    expect(RANK_XP_THRESHOLDS[MAX_LEVEL + 1]).toBe(7700)
  })

  it("has a colour for every relative level", () => {
    const levels = ["trivial", "easy", "on-level", "tough", "hard", "locked"] as const
    for (const l of levels) {
      expect(RELATIVE_LEVEL_COLORS[l]).toMatch(/^#[0-9a-f]{6}$/i)
    }
  })
})
