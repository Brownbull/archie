import { test, expect } from "@playwright/test"
import { waitForComponentLibrary } from "./helpers/canvas-helpers"

const SCREENSHOT_DIR = "test-results/component-icons"

test.describe("Pixel-art component icons E2E (Epic 17 polish)", () => {
  test("toolbox component cards render their pixel-art icons", async ({ page }) => {
    await page.goto("/")
    const hasComponents = await waitForComponentLibrary(page)
    test.skip(!hasComponents, "Skipped: Firestore has no seeded component data")

    // Every authored component has a pixel icon, so the toolbox cards render <img> icons.
    const icons = page.locator('[data-testid="component-pixel-icon"]')
    await expect(icons.first()).toBeVisible()
    expect(await icons.count()).toBeGreaterThan(0)
    // The src points at a local /icons/*.png asset (same-origin, no external URL surface).
    await expect(icons.first()).toHaveAttribute("src", /^\/icons\/.+\.png$/)
    await page.screenshot({ path: `${SCREENSHOT_DIR}/01-toolbox-icons.png`, fullPage: true })
  })
})
