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

/**
 * Mastery level names (10-level system, Season 1). Index = level (0-based).
 * Level 10 requires completing ~94% of all challenges at high star count.
 */
export const MASTERY_RANKS = [
  "Novice", "Apprentice", "Builder", "Journeyman", "Practitioner",
  "Specialist", "Expert", "Architect", "Master", "Grand Architect",
] as const
export type MasteryRank = (typeof MASTERY_RANKS)[number]
export const MAX_LEVEL = MASTERY_RANKS.length - 1

/**
 * Cumulative XP thresholds for each level. Fibonacci-like growth curve.
 * Total XP pool is ~25785 (41 challenges with tier-scaled rewards).
 * Level 10 (Grand Architect) at 22000 XP requires ~85% of all content.
 *
 * XP is GLOBAL (sum of all challenge XP earned), not per-track.
 * Tier gates (65% cumulative) control access to higher-tier challenges separately.
 */
export const RANK_XP_THRESHOLDS: readonly number[] = [0, 150, 400, 800, 1500, 2800, 5000, 8000, 11500, 16000, 22000]

/**
 * Minimum cumulative XP needed to access challenges at each tier. Based on 65% of the
 * cumulative XP from all previous tiers. Forces players to complete ~65% of the previous
 * tier before accessing the next, preventing tier-skipping.
 */
export const TIER_XP_GATES: readonly number[] = [0, 0, 494, 1976, 5138, 10520]

/** Derive the mastery level for a given cumulative XP value. */
export function rankForXp(xp: number): { rank: number; name: MasteryRank } {
  let rank = 0
  for (let i = RANK_XP_THRESHOLDS.length - 1; i >= 0; i--) {
    if (xp >= RANK_XP_THRESHOLDS[i]) {
      rank = Math.min(i, MAX_LEVEL)
      break
    }
  }
  return { rank, name: MASTERY_RANKS[rank] }
}

/** XP needed to reach the next level, or 0 if already at the cap. */
export function xpToNextRank(xp: number): number {
  const { rank } = rankForXp(xp)
  if (rank >= MAX_LEVEL) return 0
  return RANK_XP_THRESHOLDS[rank + 1] - xp
}

/**
 * WoW item-rarity relative-level coloring (D40). Given the player's rank in a track and a
 * challenge's tier, return the difficulty bucket that drives the selector card's color.
 * The ≥3 gap lock is the hard-gate — the challenge is unenterable, not just hard.
 */
export type RelativeLevel = "trivial" | "easy" | "on-level" | "tough" | "hard" | "locked"

export function relativeLevelForTier(playerRank: number, challengeTier: number): RelativeLevel {
  const gap = challengeTier - 1 - playerRank
  if (gap <= -2) return "trivial"
  if (gap === -1) return "easy"
  if (gap === 0) return "on-level"
  if (gap === 1) return "tough"
  if (gap === 2) return "hard"
  return "locked"
}

/** Hex colours for relative-level badges (WoW item-rarity ramp from the design artifact). */
export const RELATIVE_LEVEL_COLORS: Record<RelativeLevel, string> = {
  trivial: "#9aa3b0",
  easy: "#e8edf5",
  "on-level": "#3fcf6a",
  tough: "#3b9dff",
  hard: "#b06bff",
  locked: "#ff8a3d",
}
