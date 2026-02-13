import type { Page } from "@playwright/test"

/**
 * Firebase Auth storage key format.
 * Firebase stores auth state under this key in localStorage.
 */
export function getFirebaseAuthStorageKey(apiKey: string): string {
  return `firebase:authUser:${apiKey}:[DEFAULT]`
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
  await page.waitForSelector('[data-testid="test-login-button"]', {
    state: "visible",
    timeout: 10_000,
  })
  await page.click('[data-testid="test-login-button"]')

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
 * Sign out from the app shell.
 */
export async function signOut(page: Page): Promise<void> {
  await page.click('button:has-text("Sign out")')
  await page.waitForSelector('[data-testid="sign-in-button"]', {
    state: "visible",
    timeout: 10_000,
  })
}
