import { test, expect } from "@playwright/test"

const SCREENSHOT_DIR = "test-results/auth-and-app-shell"

test.describe("Auth & App Shell E2E", () => {
  test("authenticated user sees app shell with all regions", async ({ page }) => {
    // The app now lives at /app (the marketing landing is "/"). An authed visit to "/" auto-redirects
    // here, but go direct to avoid the redirect + lazy-chunk hop in this shell assertion.
    await page.goto("/app")

    // Toolbar
    const toolbar = page.locator('[data-testid="toolbar"]')
    await expect(toolbar).toBeVisible({ timeout: 20_000 })
    await expect(toolbar).toContainText("Archie")
    await expect(toolbar).toContainText("Test User")

    await page.screenshot({
      path: `${SCREENSHOT_DIR}/01-app-shell-authenticated.png`,
      fullPage: true,
    })

    // All five layout regions present
    await expect(page.locator('[data-testid="toolbox"]')).toBeVisible()
    await expect(page.locator('[data-testid="canvas"]')).toBeVisible()
    await expect(page.locator('[data-testid="inspector"]')).toBeVisible()
    await expect(page.locator('[data-testid="dashboard"]')).toBeVisible()

    await page.screenshot({
      path: `${SCREENSHOT_DIR}/02-all-regions-visible.png`,
      fullPage: true,
    })
  })

  test("sign out returns to the landing", async ({ page }) => {
    await page.goto("/app")
    await expect(page.locator('[data-testid="toolbar"]')).toBeVisible({ timeout: 20_000 })

    // Sign out now lives inside the account dropdown (data-testid="account-sign-out"),
    // opened via the account-menu trigger — it is no longer a top-level "Sign out" button.
    await page.getByTestId("account-menu-trigger").click()
    await page.getByTestId("account-sign-out").click()

    // Signing out clears the user; AuthGuard sends them to the marketing landing ("/"), where they
    // can pick guest mode or sign in again.
    await expect(page.getByTestId("landing-guest-cta")).toBeVisible({ timeout: 10_000 })

    await page.screenshot({
      path: `${SCREENSHOT_DIR}/03-signed-out-landing.png`,
      fullPage: true,
    })
  })

  test.describe("unauthenticated", () => {
    test.use({ storageState: { cookies: [], origins: [] } })

    test("unauthenticated user sees the landing at / and is kept out of /app", async ({ page }) => {
      // "/" is now the marketing landing for first-time visitors (not the login page).
      await page.goto("/")
      await expect(page.getByTestId("landing-guest-cta")).toBeVisible({ timeout: 10_000 })
      await expect(page.locator('[data-testid="toolbar"]')).toHaveCount(0)

      // A direct hit on /app without auth/guest bounces back to the landing.
      await page.goto("/app")
      await expect(page.getByTestId("landing-guest-cta")).toBeVisible({ timeout: 10_000 })

      await page.screenshot({
        path: `${SCREENSHOT_DIR}/04-unauthenticated-landing.png`,
        fullPage: true,
      })
    })

    test("login page shows test login button in dev mode", async ({ page }) => {
      await page.goto("/login")

      await expect(page.locator('[data-testid="sign-in-button"]')).toBeVisible()
      await expect(page.locator('[data-testid="test-login-button"]')).toBeVisible()
      await expect(page.locator('text=Test Login (Dev Only)')).toBeVisible()

      await page.screenshot({
        path: `${SCREENSHOT_DIR}/05-login-page-with-test-button.png`,
        fullPage: true,
      })
    })
  })
})
