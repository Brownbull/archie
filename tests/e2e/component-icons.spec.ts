import { test, expect } from "@playwright/test"
import { waitForComponentLibrary } from "./helpers/canvas-helpers"

const SCREENSHOT_DIR = "test-results/component-icons"

test.describe("Pixel-art component icons E2E (Epic 17 polish)", () => {
  test("toolbox component cards render their pixel-art icons", async ({ page }) => {
    await page.goto("/")
    const hasComponents = await waitForComponentLibrary(page)
    test.skip(!hasComponents, "Skipped: Firestore has no seeded component data")

    // D23: the default toolbox renders type-block cards (type-block-<typeId>), not the old
    // per-vendor component-card grid. Each card carries the logical-block TYPE icon — in the
    // default `pixel` icon set that's the animated concept-loop (block-loop-<typeId>), Archie's
    // signature pixel-art block visual. Assert the cards render those type icons.
    const block = page.locator('[data-testid^="type-block-"]').first()
    await expect(block).toBeVisible()

    const icons = page.locator('[data-testid^="block-loop-"]')
    await expect(icons.first()).toBeVisible()
    expect(await icons.count()).toBeGreaterThan(0)
    // The concept-loop is an inline SVG marked as an image for a11y (same-origin, no external URL).
    await expect(icons.first()).toHaveAttribute("role", "img")
    await page.screenshot({ path: `${SCREENSHOT_DIR}/01-toolbox-icons.png`, fullPage: true })
  })
})
