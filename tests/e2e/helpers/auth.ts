import type { Page } from "@playwright/test"
import { readFileSync } from "node:fs"
import { join } from "node:path"

/**
 * Firebase Auth storage key format.
 * Firebase stores auth state under this key in localStorage.
 */
export function getFirebaseAuthStorageKey(apiKey: string): string {
  return `firebase:authUser:${apiKey}:[DEFAULT]`
}

/** Read a VITE_* var from process.env, falling back to .env.local (Playwright's node process does
 *  not auto-load .env.local — Vite does that at build/serve time, not here). */
function envVar(name: string): string | undefined {
  if (process.env[name]) return process.env[name]
  try {
    for (const line of readFileSync(join(process.cwd(), ".env.local"), "utf8").split("\n")) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/)
      if (m && m[1] === name) return m[2].replace(/^["']|["']$/g, "")
    }
  } catch {
    /* no .env.local — rely on process.env (CI) */
  }
  return undefined
}

/**
 * Log in using the dev-only "Test Login" button.
 * This uses email/password auth configured via VITE_TEST_EMAIL env vars.
 */
export async function loginWithTestCredentials(page: Page): Promise<void> {
  // Capture console messages for debugging
  page.on("console", (msg) => {
    if (msg.type() === "error") {
      console.log(`[browser error] ${msg.text()}`)
    }
  })

  await page.goto("/login")

  // The dev-only "Test Login" button renders only under `import.meta.env.DEV` (the Vite dev server).
  // When E2E runs against a BUILT app (e.g. a static-served dist, used for local observe-and-fix
  // where the Vite dev server can't run), that button is absent — fall back to the email/password
  // form, which works in any build. Same VITE_TEST_EMAIL/PASSWORD account either way.
  const devButton = page.locator('[data-testid="test-login-button"]')
  const hasDevButton = await devButton.isVisible().catch(() => false)
    || await devButton.waitFor({ state: "visible", timeout: 5_000 }).then(() => true).catch(() => false)

  if (hasDevButton) {
    await page.click('[data-testid="test-login-button"]')
  } else {
    const email = envVar("VITE_TEST_EMAIL")
    const password = envVar("VITE_TEST_PASSWORD")
    if (!email || !password) {
      throw new Error("Test login: no dev button and VITE_TEST_EMAIL/PASSWORD not set for the email fallback")
    }
    await page.getByTestId("email-toggle").click()
    await page.getByTestId("email-input").fill(email)
    await page.getByTestId("password-input").fill(password)
    await page.getByTestId("email-password-submit").click()
  }

  // Check for auth error first
  const errorOrToolbar = await Promise.race([
    page
      .waitForSelector('[data-testid="toolbar"]', { state: "visible", timeout: 20_000 })
      .then(() => "toolbar" as const),
    page
      .waitForSelector('[data-testid="auth-error"]', { state: "visible", timeout: 20_000 })
      .then(async (el) => {
        const text = await el.textContent()
        return `auth-error: ${text}` as const
      }),
  ])

  if (errorOrToolbar !== "toolbar") {
    throw new Error(`Test login failed: ${errorOrToolbar}`)
  }
}

/**
 * Log in as the dedicated "unlocked" replay account via the dev-only "Test Login — Unlocked" button.
 * The account is auto-created on first use (create-or-sign-in) and kept seeded with every quest
 * complete by the unlocked-setup, so replay specs can replay any quest. Requires VITE_TEST_UNLOCKED_*.
 */
export async function loginWithUnlockedTestCredentials(page: Page): Promise<void> {
  await page.goto("/login")
  await page.waitForSelector('[data-testid="test-login-unlocked-button"]', { state: "visible", timeout: 10_000 })
  await page.click('[data-testid="test-login-unlocked-button"]')

  const errorOrToolbar = await Promise.race([
    page.waitForSelector('[data-testid="toolbar"]', { state: "visible", timeout: 20_000 }).then(() => "toolbar" as const),
    page
      .waitForSelector('[data-testid="auth-error"]', { state: "visible", timeout: 20_000 })
      .then(async (el) => `auth-error: ${await el.textContent()}` as const),
  ])
  if (errorOrToolbar !== "toolbar") {
    throw new Error(`Unlocked test login failed: ${errorOrToolbar}`)
  }
}

/**
 * Sign out from the app shell.
 */
export async function signOut(page: Page): Promise<void> {
  await page.click('button:has-text("Sign out")')
  await page.waitForSelector('[data-testid="sign-in-button"]', {
    state: "visible",
    timeout: 10_000,
  })
}
