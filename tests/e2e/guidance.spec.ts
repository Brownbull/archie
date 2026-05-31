import { test, expect } from "@playwright/test"
import { waitForComponentLibrary } from "./helpers/canvas-helpers"

const SCREENSHOT_DIR = "test-results/guidance"

test.describe("Live guidance: tour + build health (P6)", () => {
  test("guided tour is restartable from Settings and steps through", async ({ page }) => {
    await page.goto("/")
    // Baseline auth state marks the tour seen (so it never blocks the suite); restart it explicitly.
    const tour = page.locator('[data-testid="guided-tour"]')
    await page.locator('[data-testid="settings-menu-trigger"]').click()
    await page.locator('[data-testid="restart-tour"]').click()

    await expect(tour).toBeVisible({ timeout: 10_000 })
    await expect(page.locator('[data-testid="tour-title"]')).toContainText("Welcome to Archie")
    await page.screenshot({ path: `${SCREENSHOT_DIR}/01-tour-welcome.png`, fullPage: true })

    // Step forward, then skip the rest.
    await page.locator('[data-testid="tour-next"]').click()
    await expect(page.locator('[data-testid="tour-title"]')).toContainText("Pick a component type")
    await page.locator('[data-testid="tour-skip"]').click()
    await expect(tour).toBeHidden()
  })

  test("build-health panel guides free-building and stays out of the empty/challenge states", async ({ page }) => {
    await page.goto("/")
    const hasComponents = await waitForComponentLibrary(page)
    test.skip(!hasComponents, "Skipped: Firestore has no seeded component data")

    // Empty canvas → the Get-started state guides, so the panel stays hidden.
    await expect(page.locator('[data-testid="build-health-panel"]')).toBeHidden()

    // Add a component → live build-health guidance appears.
    await page.locator('[data-testid^="add-to-canvas-"]').first().click()
    const panel = page.locator('[data-testid="build-health-panel"]')
    await expect(panel).toBeVisible({ timeout: 5_000 })
    await expect(page.locator('[data-testid="build-health-score"]')).toBeVisible()
    // A lone component is not yet a full architecture → at least one check is unmet.
    await expect(page.locator('[data-testid^="guidance-"]').first()).toBeVisible()
    await page.screenshot({ path: `${SCREENSHOT_DIR}/02-build-health.png`, fullPage: true })
  })
})
