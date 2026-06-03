import { describe, it, expect } from "vitest"
import {
  rankForXp,
  xpToNextRank,
  relativeLevelForTier,
  MASTERY_RANKS,
  RANK_XP_THRESHOLDS,
  RELATIVE_LEVEL_COLORS,
  MAX_LEVEL,
  TIER_XP_GATES,
} from "@/lib/challengeTracks"

describe("rankForXp (10-level Fibonacci system)", () => {
  it("returns Novice (level 0) at 0 XP", () => {
    expect(rankForXp(0)).toEqual({ rank: 0, name: "Novice" })
  })

  it("reaches Apprentice (level 1) at 150 XP", () => {
    expect(rankForXp(150)).toEqual({ rank: 1, name: "Apprentice" })
  })

  it("reaches Builder (level 2) at 400 XP", () => {
    expect(rankForXp(400)).toEqual({ rank: 2, name: "Builder" })
  })

  it("reaches Grand Architect (level 9) at 22000 XP", () => {
    expect(rankForXp(22000)).toEqual({ rank: 9, name: "Grand Architect" })
    expect(rankForXp(30000)).toEqual({ rank: 9, name: "Grand Architect" })
  })

  it("stays at Practitioner between 1500 and 2799", () => {
    expect(rankForXp(1500).name).toBe("Practitioner")
    expect(rankForXp(2799).name).toBe("Practitioner")
  })
})

describe("xpToNextRank (10-level system)", () => {
  it("returns distance to next threshold", () => {
    expect(xpToNextRank(0)).toBe(150)
    expect(xpToNextRank(100)).toBe(50)
    expect(xpToNextRank(150)).toBe(250) // level 1 → level 2 at 400
  })

  it("returns 0 at the level cap", () => {
    expect(xpToNextRank(22000)).toBe(0)
    expect(xpToNextRank(30000)).toBe(0)
  })
})

describe("tier XP gates", () => {
  it("tier 1 has no XP gate", () => {
    expect(TIER_XP_GATES[1]).toBe(0)
  })

  it("tier 2 requires 494 XP (~65% of tier 1 total)", () => {
    expect(TIER_XP_GATES[2]).toBe(494)
  })

  it("tier 5 requires 10520 XP", () => {
    expect(TIER_XP_GATES[5]).toBe(10520)
  })

  it("gates are strictly ascending", () => {
    for (let i = 2; i < TIER_XP_GATES.length; i++) {
      expect(TIER_XP_GATES[i]).toBeGreaterThan(TIER_XP_GATES[i - 1])
    }
  })
})

describe("relativeLevelForTier", () => {
  it("returns on-level when player rank matches challenge tier-1", () => {
    expect(relativeLevelForTier(0, 1)).toBe("on-level")
    expect(relativeLevelForTier(2, 3)).toBe("on-level")
  })

  it("returns locked when gap >= 3", () => {
    expect(relativeLevelForTier(0, 4)).toBe("locked")
  })
})

describe("constants (10-level Fibonacci system)", () => {
  it("has 10 ranks matching 11 thresholds", () => {
    expect(MASTERY_RANKS).toHaveLength(10)
    expect(RANK_XP_THRESHOLDS).toHaveLength(11)
    expect(MAX_LEVEL).toBe(9)
  })

  it("thresholds are strictly ascending", () => {
    for (let i = 1; i < RANK_XP_THRESHOLDS.length; i++) {
      expect(RANK_XP_THRESHOLDS[i]).toBeGreaterThan(RANK_XP_THRESHOLDS[i - 1])
    }
  })

  it("level cap (Grand Architect) requires 22000 XP", () => {
    expect(RANK_XP_THRESHOLDS[MAX_LEVEL + 1]).toBe(22000)
  })

  it("has a colour for every relative level", () => {
    const levels = ["trivial", "easy", "on-level", "tough", "hard", "locked"] as const
    for (const l of levels) {
      expect(RELATIVE_LEVEL_COLORS[l]).toMatch(/^#[0-9a-f]{6}$/i)
    }
  })
})
