import { load } from "js-yaml"
import { ChallengeYamlSchema } from "@/schemas/challengeSchema"
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
