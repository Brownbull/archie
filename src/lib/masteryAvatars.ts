import rank01 from "@/../docs/gabe/plans/2026-06-02-mastery-tracks/avatars/rank-01-apprentice.png"
import rank05 from "@/../docs/gabe/plans/2026-06-02-mastery-tracks/avatars/rank-05-grand-architect.png"
import trackData from "@/../docs/gabe/plans/2026-06-02-mastery-tracks/avatars/track-data-archivist.png"

/**
 * Resolve a mastery rank (0–4) to its local avatar PNG. Ranks without a generated avatar yet
 * fall back to the nearest lower rank that has one. The full 5-rank + 7-track set (~12 avatars)
 * will be batch-generated via PixelLab when the MCP server is available.
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

/**
 * Resolve a track id to its local avatar PNG. Tracks without a generated avatar return null
 * (the UI shows a Shield placeholder). Generated incrementally as PixelLab assets arrive.
 */
const TRACK_AVATARS: ReadonlyMap<string, string> = new Map([
  ["data", trackData],
])

export function getTrackAvatar(trackId: string): string | null {
  return TRACK_AVATARS.get(trackId) ?? null
}
