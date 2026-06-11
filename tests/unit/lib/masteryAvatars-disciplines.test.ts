import { describe, it, expect } from "vitest"
import { getDisciplineAvatars } from "@/lib/masteryAvatars"

/**
 * S6 (D93) lockstep: the discipline-avatar resolver globs PNGs by filename, and the LEVEL in each
 * filename IS the unlock threshold (DisciplineRow shows the highest avatar with completedCount ≥
 * level; the useProgressPersistence toast fires on crossing). Nothing else guards the set — this
 * test pins the D93 Table-2 ladder (uniform 4 tiers per track, top tier = full track clear) so a
 * stray rename/deletion in the disciplines/ folder fails CI instead of silently shifting unlocks.
 */
const D93_LADDER: Record<string, number[]> = {
  foundations: [3, 5, 7, 11],
  data: [3, 5, 7, 17],
  edge: [2, 4, 6, 8],
  realtime: [2, 4, 6, 7],
  reliability: [2, 4, 6, 10],
  security: [2, 3, 4, 5],
  aiml: [2, 3, 4, 5],
}

describe("discipline avatars — D93 ladder lockstep", () => {
  for (const [track, levels] of Object.entries(D93_LADDER)) {
    it(`${track}: exactly the ${levels.join("/")} tiers exist on disk`, () => {
      const avatars = getDisciplineAvatars(track)
      expect(avatars.map((a) => a.level)).toEqual(levels)
      for (const a of avatars) expect(a.src).toBeTruthy()
    })
  }

  it("no track outside the D93 set has discipline avatars", () => {
    expect(getDisciplineAvatars("not-a-track")).toEqual([])
  })
})
