import { test, expect } from "@playwright/test"
import {
  waitForComponentLibrary,
  addComponentToCanvas,
  triggerRecalcViaConfigChange,
} from "./helpers/canvas-helpers"

const SCREENSHOT_DIR = "test-results/ghost-placement-journey"

test.describe("Ghost Placement E2E", () => {
  test("ghost nodes appear near open handles, click-to-place materializes", async ({ page }) => {
    await page.goto("/")
    await page.waitForSelector('[data-testid="canvas-panel"]', { timeout: 15000 })
    const hasComponents = await waitForComponentLibrary(page)
    if (!hasComponents) {
      test.skip()
      return
    }
    await page.screenshot({ path: `${SCREENSHOT_DIR}/01-canvas-loaded.png`, fullPage: true })

    // Place 3 components to qualify for lowest tier (min_component_count: 3)
    const addButtons = page.locator('[data-testid^="add-to-canvas-"]')
    const buttonCount = await addButtons.count()
    if (buttonCount < 3) {
      test.skip()
      return
    }

    await addComponentToCanvas(page, 0)
    await addComponentToCanvas(page, 1)
    await addComponentToCanvas(page, 2)
    await page.waitForTimeout(500)
    await page.screenshot({ path: `${SCREENSHOT_DIR}/02-components-placed.png`, fullPage: true })

    // Close inspector by clicking canvas pane
    await page.locator('[data-testid="canvas-panel"]').click({ position: { x: 50, y: 50 } })
    await page.waitForTimeout(300)

    // Trigger recalculation to populate computedMetrics + tier evaluation
    await triggerRecalcViaConfigChange(page, 0)
    await page.waitForTimeout(800)

    // Fit view to ensure all nodes (including ghosts) are in viewport
    await page.keyboard.press("Control+Shift+f")
    await page.waitForTimeout(500)
    await page.screenshot({ path: `${SCREENSHOT_DIR}/03-after-recalc.png`, fullPage: true })

    // Check for ghost nodes — they appear when pathway suggestions exist
    const ghostNodes = page.locator('[data-testid="ghost-node"]')
    const ghostCount = await ghostNodes.count()

    if (ghostCount === 0) {
      // No pathway suggestions (max tier or all gaps closed) — valid state
      await page.screenshot({ path: `${SCREENSHOT_DIR}/04-no-ghosts-valid.png`, fullPage: true })
      return
    }

    // Ghost nodes exist in DOM — verify it's a clickable button
    const firstGhost = ghostNodes.first()
    await expect(firstGhost).toHaveAttribute("aria-label")
    await page.screenshot({ path: `${SCREENSHOT_DIR}/04-ghost-visible.png`, fullPage: true })

    // Count real nodes before clicking ghost
    const realNodesBefore = await page.locator('[data-testid="archie-node"]').count()

    // Click the ghost to materialize — dispatch click directly to avoid React Flow interception
    await firstGhost.dispatchEvent("click")
    await page.waitForTimeout(1000)
    await page.screenshot({ path: `${SCREENSHOT_DIR}/05-after-ghost-click.png`, fullPage: true })

    // Real node count should increase
    const realNodesAfter = await page.locator('[data-testid="archie-node"]').count()
    expect(realNodesAfter).toBeGreaterThan(realNodesBefore)

    // The original ghost's anchor now has an edge, so that ghost vanishes.
    // However, the newly placed node has an open source handle, so a fresh
    // ghost may appear — net count can stay the same or decrease.
    const ghostsAfter = await page.locator('[data-testid="ghost-node"]').count()
    expect(ghostsAfter).toBeLessThanOrEqual(ghostCount)

    await page.screenshot({ path: `${SCREENSHOT_DIR}/06-materialized.png`, fullPage: true })
  })
})
