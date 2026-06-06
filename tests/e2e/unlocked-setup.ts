import { test as setup, expect } from "@playwright/test"
import { loginWithUnlockedTestCredentials } from "./helpers/auth"
import { seedUnlockedProgress, seedProjectId } from "./helpers/seed-progress"

const UNLOCKED_AUTH_FILE = "tests/e2e/.auth/unlocked-user.json"

/**
 * Setup for the dedicated "unlocked" replay account (D72). Authenticates (auto-creating the account on
 * first run), seeds its userProgress with every quest complete + max XP, and saves the resulting auth
 * state. The `desktop-unlocked` project reuses this storageState, so capstone/replay specs land on a
 * user where any quest is replayable — without ever touching the primary test account's progression.
 *
 * Idempotent: re-seeding all-complete each run keeps the account in the expected state, so no teardown
 * is needed (unlike the primary user, this account is SUPPOSED to be permanently all-complete).
 */
setup("seed the unlocked replay account", async ({ page }) => {
  const projectId = seedProjectId()
  expect(projectId, "VITE_FIREBASE_PROJECT_ID must be set to seed the unlocked replay account").toBeTruthy()

  await loginWithUnlockedTestCredentials(page)

  // Mark the first-run guided tour (P6) as already seen so its modal never blocks replay specs.
  await page.evaluate(() => {
    const KEY = "archie-preferences"
    let parsed: { state?: Record<string, unknown>; version?: number } = {}
    try {
      const raw = localStorage.getItem(KEY)
      if (raw) parsed = JSON.parse(raw)
    } catch {
      parsed = {}
    }
    const state = { ...(parsed.state ?? {}), tourSeen: true }
    localStorage.setItem(KEY, JSON.stringify({ state, version: parsed.version ?? 0 }))
  })

  // Seed every quest complete + max track XP (writes THIS account's userProgress via the authed session).
  await seedUnlockedProgress(page, projectId as string)

  await page.context().storageState({ path: UNLOCKED_AUTH_FILE })
})
