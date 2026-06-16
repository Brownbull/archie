import { test as setup } from "@playwright/test"
import { loginWithTestCredentials } from "./helpers/auth"
import { stampTestAccount, seedProjectId } from "./helpers/seed-progress"

const AUTH_FILE = "tests/e2e/.auth/user.json"

setup("authenticate with test credentials", async ({ page }) => {
  // This setup does real network work — login + a Firestore stamp + a cache pre-warm (loads the app
  // and waits for the component library). That exceeds the default 30s test budget, so give it room.
  setup.setTimeout(120_000)
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

  // Pre-warm the reference-data cache (refDataCache → archie-refdata-* in localStorage) so it lands
  // in the saved storageState. The desktop project runs at --workers=4; without a warm cache, all 4
  // workers cold-fetch the full component library (114 components + stacks + blueprints) from
  // Firestore on their first test simultaneously — contention that makes the toolbox load slowly or
  // flakily (the chronic e2e-desktop component-card failures). Loading the app once here, and waiting
  // for the first component card, populates the cache; every worker then starts warm with one tiny
  // isCacheValid read instead of a full fetch. Best-effort: a miss just falls back to the old behavior.
  try {
    await page.goto("/")
    await page.locator('[data-testid^="component-card-"]').first().waitFor({ state: "visible", timeout: 30_000 })
  } catch {
    /* cache pre-warm is an optimization, not a gate — proceed even if it didn't populate */
  }

  // Save authenticated state (cookies + localStorage, now incl. the warm refdata cache) for reuse
  await page.context().storageState({ path: AUTH_FILE })
})
