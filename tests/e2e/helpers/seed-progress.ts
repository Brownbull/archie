import { readFileSync, readdirSync } from "node:fs"
import { join } from "node:path"
import type { Page } from "@playwright/test"

/**
 * Dedicated "unblocked E2E user" seeding (D72 capstone E2E). The E2E runs against REAL Firebase (no
 * emulator), so to replay any quest — including the tier-gated Tier-6 capstones — we write the test
 * user's `userProgress` doc: every challenge complete + max track XP, so the tech tree unlocks
 * everything and the Quest Log offers "Replay Quest" on each node.
 *
 * The write goes through the ALREADY-AUTHENTICATED BROWSER session (not a node Firebase client):
 *  - the web API key is referrer-restricted, so a node sign-in fails — but the page is already logged in;
 *  - the Firestore rules require `updatedAt == request.time`, so we use the REST `:commit` endpoint with a
 *    `REQUEST_TIME` field transform (a client timestamp would never equal request.time).
 * Node side only reads the project id (.env.local / process.env) + challenge ids (authoring YAMLs).
 */

const TRACKS = ["foundations", "data", "edge", "realtime", "reliability", "security", "aiml"] as const
const PROGRESS_GENERATION = 3 // must equal userProgressStore.PROGRESS_GENERATION or the reader wipes it
// expertCurrency/breaksByChallenge/requiredFilterUnlocked (P4-S2) reset to zero each setup run so the
// break-it journey spec (feedback-phase4) always collects FRESH breaks — the seed is the fixture.
const ALLOWED_KEYS = ["trackXp", "completedChallenges", "bestStarsCloud", "equippedAvatar", "hintsUnlocked", "expertCurrency", "breaksByChallenge", "requiredFilterUnlocked", "generation"] as const

function loadEnv(): Record<string, string> {
  const env: Record<string, string> = { ...process.env } as Record<string, string>
  try {
    for (const line of readFileSync(join(process.cwd(), ".env.local"), "utf8").split("\n")) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/)
      if (m && env[m[1]] === undefined) env[m[1]] = m[2].replace(/^["']|["']$/g, "")
    }
  } catch {
    /* no .env.local — rely on process.env (CI) */
  }
  return env
}

/** All built-in challenge ids, read from the authoring YAMLs (parses `id:`, filename-independent). */
function allChallengeIds(): string[] {
  const dir = join(process.cwd(), "src/data/challenges")
  return readdirSync(dir)
    .filter((f) => f.endsWith(".yaml"))
    .map((f) => readFileSync(join(dir, f), "utf8").match(/^id:\s*(\S+)/m)?.[1])
    .filter((id): id is string => !!id)
}

export function seedProjectId(): string | undefined {
  return loadEnv().VITE_FIREBASE_PROJECT_ID
}

/**
 * Write `userProgress/{uid}` from the authed browser session via Firestore REST `:commit`, setting the
 * given completedChallenges + per-track XP. `updatedAt` uses a REQUEST_TIME transform to satisfy the
 * server-timestamp rule. `page` must already be authenticated (storageState) and on an app page.
 */
async function writeProgress(page: Page, projectId: string, completedChallenges: string[], xp: number): Promise<void> {
  const result = await page.evaluate(
    async ({ projectId, completedChallenges, tracks, xp, generation, allowedKeys }) => {
      const authKey = Object.keys(localStorage).find((k) => k.startsWith("firebase:authUser:"))
      if (!authKey) return { ok: false, error: "no firebase auth in localStorage" }
      const user = JSON.parse(localStorage.getItem(authKey) as string)
      const uid: string | undefined = user?.uid
      const token: string | undefined = user?.stsTokenManager?.accessToken
      if (!uid || !token) return { ok: false, error: "no uid/accessToken in auth state" }

      const trackFields: Record<string, { integerValue: string }> = {}
      for (const t of tracks) trackFields[t] = { integerValue: String(xp) }
      const fields = {
        trackXp: { mapValue: { fields: trackFields } },
        completedChallenges: { arrayValue: { values: completedChallenges.map((id: string) => ({ stringValue: id })) } },
        bestStarsCloud: { mapValue: { fields: {} } },
        equippedAvatar: { nullValue: null },
        hintsUnlocked: { mapValue: { fields: {} } },
        expertCurrency: { integerValue: "0" },
        breaksByChallenge: { mapValue: { fields: {} } },
        requiredFilterUnlocked: { mapValue: { fields: {} } },
        generation: { integerValue: String(generation) },
      }
      const docName = `projects/${projectId}/databases/(default)/documents/userProgress/${uid}`
      const body = {
        writes: [
          {
            update: { name: docName, fields },
            updateMask: { fieldPaths: allowedKeys },
            // updatedAt must equal request.time per the rules — a transform is the only way.
            updateTransforms: [{ fieldPath: "updatedAt", setToServerValue: "REQUEST_TIME" }],
          },
        ],
      }
      const res = await fetch(`https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents:commit`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      if (!res.ok) return { ok: false, error: `commit ${res.status}: ${(await res.text()).slice(0, 300)}` }
      return { ok: true, uid }
    },
    { projectId, completedChallenges, tracks: [...TRACKS], xp, generation: PROGRESS_GENERATION, allowedKeys: [...ALLOWED_KEYS] },
  )
  if (!result.ok) throw new Error(`seed-progress write failed: ${result.error}`)
}

/** Seed the signed-in account's progress so EVERY quest is unlocked + replayable (all complete + max XP). */
export async function seedUnlockedProgress(page: Page, projectId: string): Promise<void> {
  await writeProgress(page, projectId, allChallengeIds(), 1_000_000)
}
