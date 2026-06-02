import { load } from "js-yaml"
import { ChallengeYamlSchema } from "@/schemas/challengeSchema"
import { MAX_FILE_SIZE } from "@/lib/constants"
import type { Challenge } from "@/lib/challengeTypes"

// Load all challenge YAML files at build time (Vite eager glob) — mirrors scenarioLoader.
const challengeModules = import.meta.glob("/src/data/challenges/*.yaml", {
  eager: true,
  query: "?raw",
  import: "default",
}) as Record<string, string>

const challengeMap = new Map<string, Challenge>()
const challengeList: Challenge[] = []

for (const [, raw] of Object.entries(challengeModules)) {
  const parsed = load(raw)
  const result = ChallengeYamlSchema.safeParse(parsed)
  if (result.success) {
    challengeMap.set(result.data.id, result.data)
    challengeList.push(result.data)
  } else if (import.meta.env.DEV) {
    console.warn("Invalid challenge preset:", result.error.issues)
  }
}

const DIFFICULTY_ORDER: Record<Challenge["difficulty"], number> = { beginner: 0, intermediate: 1, advanced: 2 }
// Stable order: by difficulty, then id (so the selector lists beginner → advanced).
challengeList.sort((a, b) => DIFFICULTY_ORDER[a.difficulty] - DIFFICULTY_ORDER[b.difficulty] || a.id.localeCompare(b.id))

export function getChallenge(id: string): Challenge | undefined {
  return challengeMap.get(id)
}

export function getAllChallenges(): Challenge[] {
  return challengeList
}

export function isKnownChallengeId(id: string): boolean {
  return challengeMap.has(id)
}

/** Outcome of a runtime "Load Challenge…" import — a validated challenge or a human-readable error. */
export type ChallengeImportResult =
  | { ok: true; challenge: Challenge }
  | { ok: false; error: string }

/**
 * Parse + validate a user-provided challenge YAML string at runtime (Mastery Tracks, Phase 1).
 * Defense-in-depth: rejects oversized input before parsing, uses js-yaml's safe `load` (no
 * arbitrary object instantiation), and runs the full `ChallengeYamlSchema` (allowlisted keys,
 * bounded numerics, known track + block ids). Never throws — every failure path returns an error
 * string so the (later) import UI can surface it without a crash.
 */
export function loadChallengeFromYaml(raw: string): ChallengeImportResult {
  if (typeof raw !== "string" || raw.trim().length === 0) {
    return { ok: false, error: "Challenge file is empty." }
  }
  if (raw.length > MAX_FILE_SIZE) {
    return { ok: false, error: `Challenge file too large (max ${Math.round(MAX_FILE_SIZE / 1024)} KB).` }
  }

  let parsed: unknown
  try {
    parsed = load(raw)
  } catch (err: unknown) {
    return { ok: false, error: `Invalid YAML: ${err instanceof Error ? err.message : "could not parse"}` }
  }

  const result = ChallengeYamlSchema.safeParse(parsed)
  if (!result.success) {
    const first = result.error.issues[0]
    const where = first?.path.length ? `${first.path.join(".")}: ` : ""
    return { ok: false, error: `Invalid challenge: ${where}${first?.message ?? "schema validation failed"}` }
  }

  return { ok: true, challenge: result.data }
}
