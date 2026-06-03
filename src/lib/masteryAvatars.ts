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

/**
 * Map 10 levels to the 6 rank avatars (Novice → Grand Architect).
 * Levels 0-1: Novice, 2-3: Apprentice, 4-5: Builder/Engineer, 6-7: Architect, 8-9: Grand Architect.
 */
const RANK_AVATARS: ReadonlyMap<number, string> = new Map([
  [0, rank00],   // Novice
  [2, rank01],   // Apprentice
  [4, rank02],   // Builder
  [6, rank03],   // Engineer/Architect
  [8, rank04],   // Master
  [9, rank05],   // Grand Architect (level cap)
])

export const GRAND_ARCHITECT_AVATAR = rank05

export function getMasteryAvatar(rank: number): string | null {
  if (rank >= 9) return GRAND_ARCHITECT_AVATAR
  for (let r = rank; r >= 0; r--) {
    const url = RANK_AVATARS.get(r)
    if (url) return url
  }
  return null
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

/** Discipline-tier avatars: each track has tiered avatars that unlock at specific quest completion counts. */
const DISCIPLINE_AVATARS: Record<string, Array<{ level: number; src: string }>> = {}

// Lazy-load discipline avatars (they're in a subdirectory)
let disciplineLoaded = false
function loadDisciplineAvatars() {
  if (disciplineLoaded) return
  disciplineLoaded = true
  const modules = import.meta.glob(
    "@/../docs/gabe/plans/2026-06-02-mastery-tracks/avatars/disciplines/*.png",
    { eager: true, import: "default" },
  ) as Record<string, string>
  for (const [path, src] of Object.entries(modules)) {
    const match = path.match(/\/([a-z]+)-(\d+)\.png$/)
    if (!match) continue
    const [, track, levelStr] = match
    const level = parseInt(levelStr, 10)
    if (!DISCIPLINE_AVATARS[track]) DISCIPLINE_AVATARS[track] = []
    DISCIPLINE_AVATARS[track].push({ level, src })
  }
  for (const arr of Object.values(DISCIPLINE_AVATARS)) arr.sort((a, b) => a.level - b.level)
}

/** Get all discipline tier avatars for a track (sorted by level ascending). */
export function getDisciplineAvatars(trackId: string): Array<{ level: number; src: string }> {
  loadDisciplineAvatars()
  return DISCIPLINE_AVATARS[trackId] ?? []
}

/** Get the highest unlocked discipline avatar for a track given the player's completed count. */
export function getDisciplineAvatar(trackId: string, completedInTrack: number): string | null {
  const avatars = getDisciplineAvatars(trackId)
  let best: string | null = null
  for (const a of avatars) {
    if (completedInTrack >= a.level) best = a.src
  }
  return best
}
