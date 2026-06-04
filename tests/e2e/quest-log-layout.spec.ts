import { test, expect } from "@playwright/test"
import { waitForComponentLibrary } from "./helpers/canvas-helpers"

const SCREENSHOT_DIR = "test-results/quest-log-layout"

/**
 * Quest Log tier-banded layout (Journey tree rework) — verifies the new vertical layout:
 * tier separators stacked top→bottom (Tier I … V), quests banded by tier, and same-tier
 * dependents in lower sub-rows. Screenshots the full SVG so every tier band is captured.
 */
test.describe("Quest Log tier-banded layout", () => {
  test("renders tier separators + tier-banded quest nodes", async ({ page }) => {
    test.setTimeout(120_000)
    // Tall viewport so the dialog's scroll container fits all 5 tier bands without clipping the SVG capture.
    await page.setViewportSize({ width: 1200, height: 2200 })
    await page.goto("/")
    const hasComponents = await waitForComponentLibrary(page)
    test.skip(!hasComponents, "Skipped: no seeded data")
    await page.waitForTimeout(3000)

    // Open the Quest Log via the Quest Mode toggle (confirm dialog may appear).
    await page.getByTestId("mode-toggle-quest").click()
    if (await page.getByTestId("mode-toggle-dialog").isVisible({ timeout: 1500 }).catch(() => false)) {
      await page.getByTestId("mode-toggle-confirm").click()
    }
    await expect(page.getByTestId("quest-log")).toBeVisible({ timeout: 5000 })

    // Five tier bands (Tiers I–V across the 41 built-ins), each with a separator.
    await expect(page.locator('[data-testid^="tier-separator-"]')).toHaveCount(5)
    // Tier-1 root + a tier-2 quest are both present (banded vertically).
    await expect(page.getByTestId("tree-node-first-service")).toBeAttached()
    await expect(page.getByTestId("tree-node-scale-out")).toBeAttached()

    // Full-tree screenshot (the SVG element, so scrolled-out lower tiers are captured too).
    const svg = page.locator('[data-testid="quest-log"] svg').first()
    await svg.screenshot({ path: `${SCREENSHOT_DIR}/01-tier-banded-tree.png` })

    // Selecting a quest still opens the detail panel.
    await page.getByTestId("tree-node-first-service").click()
    await expect(page.getByTestId("tree-detail-panel")).toBeVisible()
    await page.screenshot({ path: `${SCREENSHOT_DIR}/02-quest-selected.png`, fullPage: true })
  })
})
