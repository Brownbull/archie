import { test, expect, type Page } from "@playwright/test"
import { addComponentToCanvas, selectNodeOnCanvas } from "./helpers/canvas-helpers"

/**
 * Visual audit — drives every major surface and screenshots it so spacing, font-size adherence,
 * and overlap regressions can be eyeballed. Not assertion-heavy by design; the artifacts are the
 * point. Screenshots land in test-results/visual-audit/ (git-ignored except INDEX.md).
 */
const SCREENSHOT_DIR = "test-results/visual-audit"

async function ready(page: Page) {
  await page.goto("/")
  await expect(page.locator('[data-testid="toolbox-panel"]')).toBeVisible({ timeout: 15_000 })
  await page.waitForTimeout(500)
}

test.describe("Visual audit", () => {
  test("toolbox tabs do not overlap the palette (pixel icons)", async ({ page }) => {
    await ready(page)
    await page.screenshot({ path: `${SCREENSHOT_DIR}/01-app-shell.png`, fullPage: true })

    // The 2×2 tab grid must sit ABOVE the TRAFFIC palette, not over it. Assert the bottom of the
    // last tab row is above the top of the first palette category.
    const lastTab = page.locator('[data-testid="toolbox-tab-history"]')
    const firstCategory = page.locator('[data-testid="toolbox-panel"]').getByText("TRAFFIC", { exact: false }).first()
    const tabBox = await lastTab.boundingBox()
    const catBox = await firstCategory.boundingBox()
    if (tabBox && catBox) {
      expect(tabBox.y + tabBox.height, "tab grid should not overlap palette").toBeLessThanOrEqual(catBox.y + 4)
    }

    // Show all patterns (incl. advanced) so stacks/blueprints + their stats rows are captured.
    await page.locator('[data-testid="settings-menu-trigger"]').click()
    await page.locator('[data-testid="experience-option-advanced"]').click()
    await page.keyboard.press("Escape")
    await page.waitForTimeout(300)

    for (const tab of ["stacks", "blueprints", "history", "components"] as const) {
      await page.locator(`[data-testid="toolbox-tab-${tab}"]`).click()
      await page.waitForTimeout(400)
      await page.screenshot({ path: `${SCREENSHOT_DIR}/02-toolbox-${tab}.png`, fullPage: true })
      if (tab === "stacks") {
        const c = page.locator('[data-testid^="stack-card-"]').first()
        if ((await c.count()) > 0) await c.screenshot({ path: `${SCREENSHOT_DIR}/13-stack-card.png` })
      }
      if (tab === "blueprints") {
        const c = page.locator('[data-testid="blueprint-card"]').first()
        if ((await c.count()) > 0) await c.screenshot({ path: `${SCREENSHOT_DIR}/14-blueprint-card.png` })
      }
    }

    // Palette card crop — long type names ("Traffic Source", "Load Balancer", "Object Storage")
    // should wrap at word boundaries, not break mid-word.
    const palette = page.locator('[data-testid="component-tab"]')
    if ((await palette.count()) > 0) await palette.screenshot({ path: `${SCREENSHOT_DIR}/12-palette-cards.png` })
  })

  test("on-node provider dropdown + build-health overlay", async ({ page }) => {
    await ready(page)
    await addComponentToCanvas(page, 0) // first block = default vendor; multi-provider → dropdown
    await page.waitForTimeout(600)
    await page.screenshot({ path: `${SCREENSHOT_DIR}/03-node-and-build-health.png`, fullPage: true })
    // Tight crop of the build-health overlay for legible font verification.
    const bh = page.locator('[data-testid="build-health-panel"]')
    if ((await bh.count()) > 0) await bh.screenshot({ path: `${SCREENSHOT_DIR}/09-build-health-crop.png` })

    // Regression guard: the build-health panel must not overlap the centered overlay toolbar.
    // (rem-scaled widths grow the panel at larger font sizes — this used to cover its score.)
    const bhBox = await bh.boundingBox()
    const toolbarBox = await page.locator('[data-testid="overlay-selector"]').boundingBox()
    if (bhBox && toolbarBox) {
      const overlapX = Math.min(bhBox.x + bhBox.width, toolbarBox.x + toolbarBox.width) - Math.max(bhBox.x, toolbarBox.x)
      const overlapY = Math.min(bhBox.y + bhBox.height, toolbarBox.y + toolbarBox.height) - Math.max(bhBox.y, toolbarBox.y)
      expect(overlapX > 0 && overlapY > 0, "build-health panel overlaps the overlay toolbar").toBe(false)
    }

    const trigger = page.locator('[data-testid="archie-node-provider"]')
    if ((await trigger.count()) > 0) {
      await trigger.first().click()
      await page.waitForTimeout(400)
      await page.screenshot({ path: `${SCREENSHOT_DIR}/04-provider-dropdown-open.png`, fullPage: true })
      const content = page.locator('[data-slot="select-content"]')
      if ((await content.count()) > 0) await content.screenshot({ path: `${SCREENSHOT_DIR}/10-dropdown-crop.png` })
      await page.keyboard.press("Escape")
    }
  })

  test("inspector panel", async ({ page }) => {
    await ready(page)
    await addComponentToCanvas(page, 0)
    await selectNodeOnCanvas(page, 0)
    await page.waitForTimeout(400)
    await page.screenshot({ path: `${SCREENSHOT_DIR}/05-inspector.png`, fullPage: true })
  })

  test("heatmap legend + settings menu", async ({ page }) => {
    await ready(page)
    await addComponentToCanvas(page, 0)
    await page.waitForTimeout(400)
    // Heatmap is enabled by default → CanvasLegend (bottom-left) is visible.
    await page.screenshot({ path: `${SCREENSHOT_DIR}/06-heatmap-legend.png`, fullPage: true })
    const legend = page.locator('[data-testid="canvas-legend"]')
    if ((await legend.count()) > 0) await legend.screenshot({ path: `${SCREENSHOT_DIR}/11-legend-crop.png` })

    await page.locator('[data-testid="settings-menu-trigger"]').click()
    await page.waitForTimeout(300)
    await page.screenshot({ path: `${SCREENSHOT_DIR}/07-settings-menu.png`, fullPage: true })
    await page.keyboard.press("Escape")
  })

  test("official icon set — tabs + node logo", async ({ page }) => {
    await ready(page)
    await addComponentToCanvas(page, 0)
    // Flip to official icons via Settings.
    await page.locator('[data-testid="settings-menu-trigger"]').click()
    await page.locator('[data-testid="icon-set-official"]').click()
    await page.keyboard.press("Escape")
    await page.waitForTimeout(500)
    await page.screenshot({ path: `${SCREENSHOT_DIR}/08-official-icons.png`, fullPage: true })
  })
})
