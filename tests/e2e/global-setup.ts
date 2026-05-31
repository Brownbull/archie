import { test as setup } from "@playwright/test"
import { loginWithTestCredentials } from "./helpers/auth"

const AUTH_FILE = "tests/e2e/.auth/user.json"

setup("authenticate with test credentials", async ({ page }) => {
  await loginWithTestCredentials(page)

  // Mark the first-run guided tour (P6) as already seen so its modal never blocks the rest of
  // the E2E suite. The dedicated tour test re-triggers it explicitly via Settings → Restart tour.
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

  // Save authenticated state (cookies + localStorage) for reuse
  await page.context().storageState({ path: AUTH_FILE })
})
