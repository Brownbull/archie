import { test, expect } from "@playwright/test"

const SCREENSHOT_DIR = "test-results/landing"

/**
 * Marketing landing page ("/") + the entry routing it gates. Runs unauthenticated (empty
 * storageState) — an authenticated user / in-progress guest is redirected straight to /app, so the
 * landing only shows to first-time visitors.
 */
test.describe("Landing page", () => {
  test.use({ storageState: { cookies: [], origins: [] } })

  test("renders the hero + both CTAs for a first-time visitor", async ({ page }) => {
    await page.goto("/")
    await expect(page.getByTestId("landing-guest-cta")).toBeVisible({ timeout: 15_000 })
    await expect(page.getByRole("heading", { level: 1 })).toContainText(/software architecture/i)
    await expect(page.getByTestId("landing-signin-cta")).toBeVisible()
    // The heavy app shell must NOT be mounted on the landing (the cold-load win) — no toolbar/canvas.
    await expect(page.locator('[data-testid="toolbar"]')).toHaveCount(0)
    await page.screenshot({ path: `${SCREENSHOT_DIR}/01-landing-hero.png`, fullPage: false })
  })

  test("guest CTA enters guest mode and lands in /app", async ({ page }) => {
    test.setTimeout(60_000)
    await page.goto("/")
    await page.getByTestId("landing-guest-cta").click()
    await expect(page).toHaveURL(/\/app$/)
    // The app shell now loads (lazy chunk) — toolbar appears, and the account chip shows the guest state.
    await expect(page.locator('[data-testid="toolbar"]')).toBeVisible({ timeout: 20_000 })
    await page.getByTestId("account-menu-trigger").click()
    await expect(page.getByTestId("guest-sign-in")).toBeVisible({ timeout: 5_000 })
  })

  test("sign-in CTA routes to /login, and the login page can return to the landing", async ({ page }) => {
    await page.goto("/")
    await page.getByTestId("landing-signin-cta").click()
    await expect(page).toHaveURL(/\/login$/)
    await expect(page.getByTestId("login-page")).toBeVisible({ timeout: 10_000 })

    // "Back to home" returns to the marketing landing.
    await page.getByTestId("login-back-home").click()
    await expect(page).toHaveURL(/\/$/)
    await expect(page.getByTestId("landing-guest-cta")).toBeVisible({ timeout: 10_000 })
  })

  // GIF preview variant (/gif): same CTAs, GIF hero background + motion clips.
  test("the /gif preview variant renders and its guest CTA enters the app", async ({ page }) => {
    test.setTimeout(60_000)
    await page.goto("/gif")
    await expect(page.getByTestId("landing-guest-cta")).toBeVisible({ timeout: 15_000 })
    await expect(page.getByRole("heading", { level: 1 })).toContainText(/software architecture/i)
    await expect(page.locator('[data-testid="toolbar"]')).toHaveCount(0)
    await page.getByTestId("landing-guest-cta").click()
    await expect(page).toHaveURL(/\/app$/)
    await expect(page.locator('[data-testid="toolbar"]')).toBeVisible({ timeout: 20_000 })
  })
})
