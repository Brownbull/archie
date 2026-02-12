import { test, expect } from "@playwright/test"
import { signOut } from "./helpers/auth"

const SCREENSHOT_DIR = "test-results/auth-and-app-shell"

test.describe("Auth & App Shell E2E", () => {
  test("authenticated user sees app shell with all regions", async ({ page }) => {
    await page.goto("/")

    // Toolbar
    const toolbar = page.locator('[data-testid="toolbar"]')
    await expect(toolbar).toBeVisible()
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

  test("sign out returns to login page", async ({ page }) => {
    await page.goto("/")
    await expect(page.locator('[data-testid="toolbar"]')).toBeVisible()

    await signOut(page)

    await expect(page.locator('[data-testid="sign-in-button"]')).toBeVisible()
    await expect(page.locator('text=Sign in with Google')).toBeVisible()

    await page.screenshot({
      path: `${SCREENSHOT_DIR}/03-signed-out-login-page.png`,
      fullPage: true,
    })
  })

  test.describe("unauthenticated", () => {
    test.use({ storageState: { cookies: [], origins: [] } })

    test("unauthenticated user is redirected to login", async ({ page }) => {
      await page.goto("/")

      // Should redirect to /login
      await expect(page.locator('[data-testid="sign-in-button"]')).toBeVisible({ timeout: 10_000 })

      await page.screenshot({
        path: `${SCREENSHOT_DIR}/04-unauthenticated-redirect.png`,
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
