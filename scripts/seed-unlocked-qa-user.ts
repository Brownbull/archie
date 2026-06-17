/**
 * Seed the "all-quests-complete" QA user in Firebase Auth + Firestore.
 *
 * Usage:
 *   npx tsx scripts/seed-unlocked-qa-user.ts
 *
 * Requires:
 *   - GOOGLE_APPLICATION_CREDENTIALS env var pointing to a service account JSON
 *   - QA_UNLOCKED_EMAIL and QA_UNLOCKED_PASSWORD env vars (from .env.local or exported)
 *
 * Idempotent: re-running creates-or-updates the auth user and overwrites the
 * userProgress doc to all-complete + max XP (the account is MEANT to stay maxed).
 */

import { initializeApp, cert, type ServiceAccount } from "firebase-admin/app"
import { getAuth } from "firebase-admin/auth"
import { getFirestore, FieldValue } from "firebase-admin/firestore"
import { existsSync, readFileSync, readdirSync } from "node:fs"
import { resolve, join } from "node:path"
import { fileURLToPath } from "node:url"
import { config } from "dotenv"

const __dirname = fileURLToPath(new URL(".", import.meta.url))
const envPath = resolve(__dirname, "..", ".env.local")
if (existsSync(envPath)) config({ path: envPath })

const email = process.env.QA_UNLOCKED_EMAIL
const password = process.env.QA_UNLOCKED_PASSWORD

if (!email || !password) {
  console.error("Missing QA_UNLOCKED_EMAIL or QA_UNLOCKED_PASSWORD. Set them in .env.local or export them.")
  process.exit(1)
}

const saPath = process.env.GOOGLE_APPLICATION_CREDENTIALS
if (!saPath || !existsSync(saPath)) {
  console.error("GOOGLE_APPLICATION_CREDENTIALS not set or file missing.")
  process.exit(1)
}

const TRACKS = ["foundations", "data", "edge", "realtime", "reliability", "security", "aiml"] as const
const PROGRESS_GENERATION = 4 // must match userProgressStore.PROGRESS_GENERATION
const XP_PER_TRACK = 1_000_000

function allChallengeIds(): string[] {
  const dir = join(__dirname, "..", "src", "data", "challenges")
  return readdirSync(dir)
    .filter((f) => f.endsWith(".yaml"))
    .map((f) => readFileSync(join(dir, f), "utf8").match(/^id:\s*(\S+)/m)?.[1])
    .filter((id): id is string => !!id)
}

const sa = JSON.parse(readFileSync(saPath, "utf-8")) as ServiceAccount
const app = initializeApp({ credential: cert(sa) })
const authAdmin = getAuth(app)
const firestoreAdmin = getFirestore(app)

async function ensureAuthUser(): Promise<string> {
  try {
    const existing = await authAdmin.getUserByEmail(email!)
    console.log(`Auth user already exists: uid=${existing.uid}`)
    return existing.uid
  } catch (err: unknown) {
    const code = (err as { code?: string }).code
    if (code === "auth/user-not-found") {
      const created = await authAdmin.createUser({
        email: email!,
        password: password!,
        displayName: "QA Unlocked",
        emailVerified: true,
      })
      console.log(`Auth user created: uid=${created.uid}`)
      return created.uid
    }
    throw err
  }
}

async function seedProgress(uid: string): Promise<void> {
  const challenges = allChallengeIds()
  console.log(`Seeding ${challenges.length} challenges as complete...`)

  const trackXp: Record<string, number> = {}
  for (const t of TRACKS) trackXp[t] = XP_PER_TRACK

  const bestStarsCloud: Record<string, number> = {}
  for (const id of challenges) bestStarsCloud[id] = 3

  const progressDoc = {
    trackXp,
    completedChallenges: challenges,
    bestStarsCloud,
    equippedAvatar: null,
    hintsUnlocked: {},
    expertCurrency: 0,
    breaksByChallenge: {},
    requiredFilterUnlocked: {},
    resilienceClears: {},
    breakMethods: {},
    unlockedVendors: {},
    unlockedTiers: {},
    starsSpentOnUnlocks: 0,
    bonusStars: 0,
    displayName: "QA Unlocked",
    nickname: "qa-unlocked",
    isTestAccount: true,
    expertEarned: 0,
    totalXp: XP_PER_TRACK * TRACKS.length,
    generation: PROGRESS_GENERATION,
    updatedAt: FieldValue.serverTimestamp(),
  }

  await firestoreAdmin.doc(`userProgress/${uid}`).set(progressDoc)
  console.log(`userProgress/${uid} written: ${challenges.length} challenges, ${XP_PER_TRACK * TRACKS.length} total XP, isTestAccount=true`)
}

async function main() {
  const uid = await ensureAuthUser()
  await seedProgress(uid)
  console.log("Done. Account is all-quests-complete and excluded from leaderboard.")
}

void main()
