import rank00 from "@/../docs/gabe/plans/2026-06-02-mastery-tracks/avatars/rank-00-novice.png"
import rank01 from "@/../docs/gabe/plans/2026-06-02-mastery-tracks/avatars/rank-01-apprentice.png"
import rank02 from "@/../docs/gabe/plans/2026-06-02-mastery-tracks/avatars/rank-02-builder.png"
import rank03 from "@/../docs/gabe/plans/2026-06-02-mastery-tracks/avatars/rank-03-engineer.png"
import rank04 from "@/../docs/gabe/plans/2026-06-02-mastery-tracks/avatars/rank-04-architect.png"
import rank05 from "@/../docs/gabe/plans/2026-06-02-mastery-tracks/avatars/rank-05-grand-architect.png"
import trackFoundations from "@/../docs/gabe/plans/2026-06-02-mastery-tracks/avatars/track-foundations-scaler.png"
import trackData from "@/../docs/gabe/plans/2026-06-02-mastery-tracks/avatars/track-data-archivist.png"
import trackEdge from "@/../docs/gabe/plans/2026-06-02-mastery-tracks/avatars/track-edge-courier.png"
import trackRealtime from "@/../docs/gabe/plans/2026-06-02-mastery-tracks/avatars/track-realtime-conductor.png"
import trackReliability from "@/../docs/gabe/plans/2026-06-02-mastery-tracks/avatars/track-reliability-sentinel.png"
import trackSecurity from "@/../docs/gabe/plans/2026-06-02-mastery-tracks/avatars/track-security-warden.png"
import trackAiml from "@/../docs/gabe/plans/2026-06-02-mastery-tracks/avatars/track-aiml-oracle.png"

/** Resolve a mastery rank (0–4) to its local avatar PNG. Full set: Novice → Grand Architect. */
const RANK_AVATARS: ReadonlyMap<number, string> = new Map([
  [0, rank00],
  [1, rank01],
  [2, rank02],
  [3, rank03],
  [4, rank04],
])

/** Rank 5 (Grand Architect) is the legacy max-rank avatar from the design phase. */
export const GRAND_ARCHITECT_AVATAR = rank05

export function getMasteryAvatar(rank: number): string | null {
  if (rank >= 4) return GRAND_ARCHITECT_AVATAR
  return RANK_AVATARS.get(rank) ?? null
}

/** Resolve a track id to its local avatar PNG. Full set: all 7 tracks. */
const TRACK_AVATARS: ReadonlyMap<string, string> = new Map([
  ["foundations", trackFoundations],
  ["data", trackData],
  ["edge", trackEdge],
  ["realtime", trackRealtime],
  ["reliability", trackReliability],
  ["security", trackSecurity],
  ["aiml", trackAiml],
])

export function getTrackAvatar(trackId: string): string | null {
  return TRACK_AVATARS.get(trackId) ?? null
}
