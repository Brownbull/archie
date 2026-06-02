import rank01 from "@/../docs/gabe/plans/2026-06-02-mastery-tracks/avatars/rank-01-apprentice.png"
import rank05 from "@/../docs/gabe/plans/2026-06-02-mastery-tracks/avatars/rank-05-grand-architect.png"

/**
 * Resolve a mastery rank (0–4) to its local avatar PNG. Ranks without a generated avatar yet
 * fall back to the nearest lower rank that has one. The full 5-rank + 7-track set (≈12 avatars)
 * is scheduled for Phase 3 batch generation once PixelLab balance is topped up; this resolver
 * degrades gracefully until then.
 */
const RANK_AVATARS: ReadonlyMap<number, string> = new Map([
  [1, rank01],
  [4, rank05],
])

export function getMasteryAvatar(rank: number): string | null {
  for (let r = rank; r >= 0; r--) {
    const url = RANK_AVATARS.get(r)
    if (url) return url
  }
  return null
}
