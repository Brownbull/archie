import { test, expect } from "@playwright/test"
import { waitForComponentLibrary } from "./helpers/canvas-helpers"

const SCREENSHOT_DIR = "test-results/ux-connections"

// Guards the cross-surface connectivity added in the UX sprint: the empty-canvas
// Get-started card routes to each surface, Challenges opens from multiple places,
// and an active challenge guides the component palette.

test.describe("Cross-surface UX connections", () => {
  test("Get-started card: every option is enabled and routes to its surface", async ({ page }) => {
    await page.goto("/")
    test.skip(!(await waitForComponentLibrary(page)), "no seeded data")

    await expect(page.locator('[data-testid="canvas-empty-state"]')).toBeVisible()
    for (const id of [
      "suggestion-blueprints",
      "suggestion-stacks",
      "suggestion-components",
      "suggestion-challenge",
      "suggestion-import",
    ]) {
      await expect(page.locator(`[data-testid="${id}"]`)).toBeEnabled()
    }

    await page.locator('[data-testid="suggestion-stacks"]').click()
    await expect(page.locator('[data-testid="stacks-tab"]')).toBeVisible({ timeout: 5_000 })
    await page.screenshot({ path: `${SCREENSHOT_DIR}/01-stacks-from-getstarted.png`, fullPage: true })
  })

  test("Get-started 'Take a Challenge' opens the challenge picker", async ({ page }) => {
    await page.goto("/")
    test.skip(!(await waitForComponentLibrary(page)), "no seeded data")
    await page.locator('[data-testid="suggestion-challenge"]').click()
    await expect(page.locator('[data-testid="challenge-selector"]')).toBeVisible({ timeout: 5_000 })
  })

  test("Stacks tab lists the full catalog (12+)", async ({ page }) => {
    await page.goto("/")
    test.skip(!(await waitForComponentLibrary(page)), "no seeded data")
    await page.locator('[data-testid="suggestion-stacks"]').click()
    await expect(page.locator('[data-testid="stacks-tab"]')).toBeVisible()
    await page.waitForTimeout(600)
    const count = await page.locator('[data-testid^="stack-card-"]').count()
    expect(count).toBeGreaterThanOrEqual(12)
  })

  test("active challenge surfaces the component-guidance banner", async ({ page }) => {
    await page.goto("/")
    test.skip(!(await waitForComponentLibrary(page)), "no seeded data")
    await page.locator('[data-testid="open-challenges"]').click()
    await page.locator('[data-testid="challenge-card-first-service"]').click()
    await expect(page.locator('[data-testid="challenge-hud"]')).toBeVisible({ timeout: 5_000 })

    await page.getByRole("tab", { name: "Blocks" }).click()
    await expect(page.locator('[data-testid="challenge-component-guidance"]')).toBeVisible({ timeout: 5_000 })
    await page.screenshot({ path: `${SCREENSHOT_DIR}/02-challenge-guidance.png`, fullPage: true })
  })

  test("History empty state offers a Start-a-challenge button", async ({ page }) => {
    await page.goto("/")
    test.skip(!(await waitForComponentLibrary(page)), "no seeded data")
    await page.getByRole("tab", { name: "History" }).click()
    const startBtn = page.locator('[data-testid="history-start-challenge"]')
    // The button only appears when the user has no prior attempts; skip otherwise.
    test.skip(!(await startBtn.isVisible().catch(() => false)), "user already has attempt history")
    await startBtn.click()
    await expect(page.locator('[data-testid="challenge-selector"]')).toBeVisible({ timeout: 5_000 })
  })
})
