/**
 * Mastery Tracks — the 7 disciplines a challenge can belong to (D40). Each authored challenge
 * declares one primary `track` + a `tier` (1–5); together they place the challenge on the
 * learning tree. Tracks are curated groupings of the component categories, NOT a 1:1 mirror —
 * they're the progression spine the tech-tree resolver and (later) the profile/leveling UX read.
 *
 * Mirrors docs/gabe/plans/2026-06-02-mastery-tracks/index.html (the design artifact). Keep the
 * ids in lockstep with that artifact and the recast challenge YAML files.
 */
export interface ChallengeTrack {
  id: string
  name: string
  /** One-line "what this track is about", shown on track headers. */
  short: string
  /** CSS custom-property name carrying the track's accent colour (defined in the canvas theme). */
  colorVar: string
}

const TRACK_LIST: ChallengeTrack[] = [
  { id: "foundations", name: "Foundations", short: "Compute & Scale", colorVar: "--track-foundations" },
  { id: "data", name: "Data", short: "Persistence", colorVar: "--track-data" },
  { id: "edge", name: "Edge & Delivery", short: "Get traffic in", colorVar: "--track-edge" },
  { id: "realtime", name: "Realtime", short: "Async & live", colorVar: "--track-realtime" },
  { id: "reliability", name: "Reliability & Ops", short: "Survive failure", colorVar: "--track-reliability" },
  { id: "security", name: "Security & Identity", short: "Defend", colorVar: "--track-security" },
  { id: "aiml", name: "AI / ML", short: "Intelligence", colorVar: "--track-aiml" },
]

/** Lookup by id. */
export const CHALLENGE_TRACKS: ReadonlyMap<string, ChallengeTrack> = new Map(
  TRACK_LIST.map((t) => [t.id, t]),
)

/** Ordered track ids — drives deterministic tree ordering (track index, then tier, then id). */
export const CHALLENGE_TRACK_IDS: readonly string[] = TRACK_LIST.map((t) => t.id)

/** The display/progression rank of a track (its index), or a large fallback for unknown tracks. */
export function trackOrder(trackId: string | null | undefined): number {
  const i = trackId ? CHALLENGE_TRACK_IDS.indexOf(trackId) : -1
  return i === -1 ? CHALLENGE_TRACK_IDS.length : i
}

export function isKnownTrackId(trackId: string): boolean {
  return CHALLENGE_TRACKS.has(trackId)
}

/** Tiers run 1 (entry) → 5 (capstone) within every track. */
export const MIN_CHALLENGE_TIER = 1
export const MAX_CHALLENGE_TIER = 5

/**
 * Blocks a brand-new player can use before completing any challenge — the minimum to stand up a
 * first service. Everything else is earned via a challenge's `grants` (the permanent unlock
 * reward). Used as the seed of the tech-tree resolver's `unlockedBlocks`.
 */
export const BASE_UNLOCKED_BLOCKS: readonly string[] = ["traffic-source", "compute"]
