import { test as setup } from "@playwright/test"
import { loginWithTestCredentials } from "./helpers/auth"
import { stampTestAccount, seedProjectId } from "./helpers/seed-progress"

const AUTH_FILE = "tests/e2e/.auth/user.json"

setup("authenticate with test credentials", async ({ page }) => {
  await loginWithTestCredentials(page)

  // Mark the first-run guided tour (P6) as already seen so its modal never blocks the rest of
  // the E2E suite. The dedicated tour test re-triggers it explicitly via Settings → Restart tour.
  // S1 (Kane QA): also answer the first-run mode fork (firstRunChoice) so the suite lands in the
  // normal app (empty-state suggestions / canvas), not the novice/expert fork overlay. The fork's
  // own behavior is covered by FirstRunFork.test.tsx. "free" = the sandbox the specs expect.
  await page.evaluate(() => {
    const KEY = "archie-preferences"
    let parsed: { state?: Record<string, unknown>; version?: number } = {}
    try {
      const raw = localStorage.getItem(KEY)
      if (raw) parsed = JSON.parse(raw)
    } catch {
      parsed = {}
    }
    const state = { ...(parsed.state ?? {}), tourSeen: true, firstRunChoice: "free" }
    localStorage.setItem(KEY, JSON.stringify({ state, version: parsed.version ?? 0 }))
  })

  // D105b: the test account never ranks on the leaderboard.
  const projectId = seedProjectId()
  if (projectId) await stampTestAccount(page, projectId)

  // Save authenticated state (cookies + localStorage) for reuse
  await page.context().storageState({ path: AUTH_FILE })
})
