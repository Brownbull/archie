import { test, expect, type Page } from "@playwright/test"
import {
  waitForComponentLibrary,
  placeTwoComponents,
  connectNodes,
  triggerRecalcViaConfigChange,
} from "./helpers/canvas-helpers"

const SCREENSHOT_DIR = "test-results/flow-particles-and-legend"

/**
 * Focus the canvas panel (tabIndex={-1}) so keyboard events are dispatched to it.
 */
async function focusCanvas(page: Page): Promise<void> {
  await page.locator('[data-testid="canvas-panel"]').click({ position: { x: 10, y: 10 }, force: true })
}

/**
 * Press H on the canvas panel to toggle the heatmap.
 */
async function toggleHeatmap(page: Page): Promise<void> {
  await page.locator('[data-testid="canvas-panel"]').press("h")
}

/**
 * Place two components, connect them, trigger recalculation, and deselect.
 * Waits for at least one flow particle to appear (assertion-based wait).
 * Returns true if setup succeeded (edge created with particles).
 */
async function setupConnectedCanvas(page: Page): Promise<boolean> {
  const placed = await placeTwoComponents(page)
  if (placed < 2) return false

  await connectNodes(page, 0, 1)
  await expect(page.locator(".react-flow__edge")).toHaveCount(1, { timeout: 5_000 })

  await triggerRecalcViaConfigChange(page, 0)

  // Assertion-based wait: particle must appear after recalc (replaces bare waitForTimeout)
  await page.locator('[data-testid^="flow-particle-"]').first().waitFor({
    state: "attached",
    timeout: 3_000,
  })

  // Deselect node — click empty canvas pane area
  await page.locator(".react-flow__pane").click({ position: { x: 50, y: 50 } })
  await page.waitForTimeout(300)
  return true
}

// ---------------------------------------------------------------------------

test.describe("Flow Particles & Canvas Legend E2E (Story 4-5)", () => {
  // -------------------------------------------------------------------------
  // Legend: visible by default, dismissible
  // -------------------------------------------------------------------------

  test("AC-LEGEND-1: legend is visible by default when heatmap is enabled", async ({ page }) => {
    await page.goto("/")

    await expect(page.locator('[data-testid="canvas-panel"]')).toBeVisible({ timeout: 15_000 })

    // Legend container and inner panel should both be in DOM (heatmapEnabled=true by default)
    await expect(page.locator('[data-testid="canvas-legend-container"]')).toBeAttached({
      timeout: 5_000,
    })
    await expect(page.locator('[data-testid="canvas-legend"]')).toBeVisible({ timeout: 5_000 })

    await page.screenshot({ path: `${SCREENSHOT_DIR}/01-legend-visible-on-load.png`, fullPage: true })
  })

  test("AC-LEGEND-2: dismiss button hides the legend panel", async ({ page }) => {
    await page.goto("/")

    await expect(page.locator('[data-testid="canvas-panel"]')).toBeVisible({ timeout: 15_000 })
    await expect(page.locator('[data-testid="canvas-legend"]')).toBeVisible({ timeout: 5_000 })

    await page.locator('[data-testid="canvas-legend-dismiss"]').click()

    await expect(page.locator('[data-testid="canvas-legend"]')).toHaveCount(0)

    await page.screenshot({ path: `${SCREENSHOT_DIR}/02-legend-dismissed.png`, fullPage: true })
  })

  // -------------------------------------------------------------------------
  // Legend: heatmap toggle removes and restores the legend
  // -------------------------------------------------------------------------

  test("AC-LEGEND-3: heatmap off removes legend; re-enable restores it", async ({ page }) => {
    await page.goto("/")

    await expect(page.locator('[data-testid="canvas-panel"]')).toBeVisible({ timeout: 15_000 })
    await expect(page.locator('[data-testid="canvas-legend"]')).toBeVisible({ timeout: 5_000 })

    // Toggle heatmap OFF — legend disappears
    await focusCanvas(page)
    await toggleHeatmap(page)
    await page.waitForTimeout(300)

    await expect(page.locator('[data-testid="canvas-legend"]')).toHaveCount(0)

    await page.screenshot({ path: `${SCREENSHOT_DIR}/03-legend-gone-heatmap-off.png`, fullPage: true })

    // Toggle heatmap ON — legend reappears (toggleHeatmap resets legendDismissed=false)
    await focusCanvas(page)
    await toggleHeatmap(page)
    await page.waitForTimeout(300)

    await expect(page.locator('[data-testid="canvas-legend"]')).toBeVisible({ timeout: 3_000 })

    await page.screenshot({ path: `${SCREENSHOT_DIR}/04-legend-reappears-heatmap-on.png`, fullPage: true })
  })

  test("AC-LEGEND-4: dismissed legend reappears after heatmap off→on cycle", async ({ page }) => {
    await page.goto("/")

    await expect(page.locator('[data-testid="canvas-panel"]')).toBeVisible({ timeout: 15_000 })
    await expect(page.locator('[data-testid="canvas-legend"]')).toBeVisible({ timeout: 5_000 })

    // Dismiss legend, then toggle heatmap off → on
    await page.locator('[data-testid="canvas-legend-dismiss"]').click()
    await expect(page.locator('[data-testid="canvas-legend"]')).toHaveCount(0)

    await page.screenshot({ path: `${SCREENSHOT_DIR}/05-dismissed-before-cycle.png`, fullPage: true })

    await focusCanvas(page)
    await toggleHeatmap(page)
    await page.waitForTimeout(300)

    await focusCanvas(page)
    await toggleHeatmap(page)
    await page.waitForTimeout(300)

    // toggleHeatmap resets legendDismissed → legend must be visible again
    await expect(page.locator('[data-testid="canvas-legend"]')).toBeVisible({ timeout: 3_000 })

    await page.screenshot({ path: `${SCREENSHOT_DIR}/06-legend-reset-after-off-on-cycle.png`, fullPage: true })
  })

  // -------------------------------------------------------------------------
  // Particles: present when heatmap on and connection+recalc exists
  // -------------------------------------------------------------------------

  test("AC-PARTICLE-1: particles absent when canvas has no connections", async ({ page }) => {
    await page.goto("/")

    const hasComponents = await waitForComponentLibrary(page)
    test.skip(!hasComponents, "Skipped: Firestore has no seeded component data")

    // Place only one component — no connection, no particles
    const addBtn = page.locator('[data-testid^="add-to-canvas-"]').first()
    await expect(addBtn).toBeVisible()
    await addBtn.click()
    await expect(page.locator('[data-testid="archie-node"]')).toHaveCount(1, { timeout: 5_000 })

    await page.waitForTimeout(300)

    // Heatmap is ON — but no edges means no particles
    await expect(page.locator('[data-testid^="flow-particle-"]')).toHaveCount(0)

    await page.screenshot({ path: `${SCREENSHOT_DIR}/08-no-particles-no-edge.png`, fullPage: true })
  })

  test("AC-PARTICLE-2: particles disappear when heatmap is disabled", async ({ page }) => {
    await page.goto("/")

    const hasComponents = await waitForComponentLibrary(page)
    test.skip(!hasComponents, "Skipped: Firestore has no seeded component data")

    const ready = await setupConnectedCanvas(page)
    test.skip(!ready, "Skipped: Need at least 2 components in the library")

    const particles = page.locator('[data-testid^="flow-particle-"]')

    // Particles must exist before we toggle (validates setup, prevents trivial pass)
    expect(await particles.count()).toBeGreaterThan(0)

    await page.screenshot({ path: `${SCREENSHOT_DIR}/09-before-toggle-off.png`, fullPage: true })

    // Toggle heatmap off — particles must be removed
    await focusCanvas(page)
    await toggleHeatmap(page)
    await page.waitForTimeout(300)

    await expect(particles).toHaveCount(0)

    // Edge (connection) persists — only the visual overlay is removed
    await expect(page.locator(".react-flow__edge")).toHaveCount(1)

    await page.screenshot({ path: `${SCREENSHOT_DIR}/10-particles-gone-heatmap-off.png`, fullPage: true })
  })

  test("AC-PARTICLE-3: particles reappear when heatmap is re-enabled", async ({ page }) => {
    await page.goto("/")

    const hasComponents = await waitForComponentLibrary(page)
    test.skip(!hasComponents, "Skipped: Firestore has no seeded component data")

    const ready = await setupConnectedCanvas(page)
    test.skip(!ready, "Skipped: Need at least 2 components in the library")

    const particles = page.locator('[data-testid^="flow-particle-"]')
    const initialCount = await particles.count()
    expect(initialCount).toBeGreaterThan(0)

    // Toggle off
    await focusCanvas(page)
    await toggleHeatmap(page)
    await page.waitForTimeout(300)
    await expect(particles).toHaveCount(0)

    await page.screenshot({ path: `${SCREENSHOT_DIR}/11-particles-gone.png`, fullPage: true })

    // Toggle back on — particles must return to their original count
    await focusCanvas(page)
    await toggleHeatmap(page)
    await page.waitForTimeout(300)

    const restoredCount = await particles.count()
    expect(restoredCount).toBe(initialCount)

    await page.screenshot({ path: `${SCREENSHOT_DIR}/12-particles-restored.png`, fullPage: true })
  })

  // -------------------------------------------------------------------------
  // Combined: full journey — legend + particles through full heatmap cycle
  // -------------------------------------------------------------------------

  test("AC-COMBINED-1: full cycle — heatmap on has legend; heatmap off removes both", async ({
    page,
  }) => {
    await page.goto("/")

    const hasComponents = await waitForComponentLibrary(page)
    test.skip(!hasComponents, "Skipped: Firestore has no seeded component data")

    const ready = await setupConnectedCanvas(page)
    test.skip(!ready, "Skipped: Need at least 2 components in the library")

    // Phase 1: heatmap ON — legend visible, edge present
    await expect(page.locator('[data-testid="canvas-legend"]')).toBeVisible({ timeout: 5_000 })
    await expect(page.locator(".react-flow__edge")).toHaveCount(1)

    await page.screenshot({ path: `${SCREENSHOT_DIR}/13-phase1-heatmap-on.png`, fullPage: true })

    // Phase 2: toggle heatmap OFF — legend gone, particles gone, edge remains
    await focusCanvas(page)
    await toggleHeatmap(page)
    await page.waitForTimeout(300)

    await expect(page.locator('[data-testid="canvas-legend"]')).toHaveCount(0)
    await expect(page.locator('[data-testid^="flow-particle-"]')).toHaveCount(0)
    await expect(page.locator(".react-flow__edge")).toHaveCount(1)

    await page.screenshot({ path: `${SCREENSHOT_DIR}/14-phase2-heatmap-off.png`, fullPage: true })

    // Phase 3: toggle heatmap back ON — legend reappears
    await focusCanvas(page)
    await toggleHeatmap(page)
    await page.waitForTimeout(300)

    await expect(page.locator('[data-testid="canvas-legend"]')).toBeVisible({ timeout: 3_000 })

    await page.screenshot({ path: `${SCREENSHOT_DIR}/15-phase3-heatmap-on-again.png`, fullPage: true })
  })
})
