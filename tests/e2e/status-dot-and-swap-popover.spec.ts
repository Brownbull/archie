import { test, expect, type Page } from "@playwright/test"
import {
  waitForComponentLibrary,
  placeTwoComponents,
  triggerRecalcViaConfigChange,
} from "./helpers/canvas-helpers"

const SCREENSHOT_DIR = "test-results/status-dot-and-swap-popover"
const EDGE_FIXTURE = "tests/e2e/fixtures/connection/two-node-edge.architecture.yaml"

async function focusCanvas(page: Page): Promise<void> {
  await page.locator('[data-testid="canvas-panel"]').click({ position: { x: 10, y: 10 }, force: true })
}

async function toggleHeatmap(page: Page): Promise<void> {
  await page.locator('[data-testid="canvas-panel"]').press("h")
}

async function setupConnectedCanvas(page: Page): Promise<boolean> {
  // D24b: import a 2-node/1-edge build instead of React Flow's unreliable connection handle-drag.
  // loadArchitecture renders the edge; the recalc populates the connection-health status dots.
  await page.locator('[data-testid="import-file-input"]').setInputFiles(EDGE_FIXTURE)
  await expect(page.locator(".react-flow__edge")).toHaveCount(1, { timeout: 15_000 })

  await triggerRecalcViaConfigChange(page, 0)
  await page.waitForTimeout(500)

  await page.locator(".react-flow__pane").click({ position: { x: 50, y: 50 } })
  await page.waitForTimeout(300)
  return true
}

// ---------------------------------------------------------------------------

test.describe("Status Dot & Swap Popover E2E (Phase 5)", () => {
  // -------------------------------------------------------------------------
  // Status Dot: visible on nodes when heatmap enabled + recalculated
  // -------------------------------------------------------------------------

  test("AC-STATUS-1: status dots appear on nodes after recalculation with heatmap on", async ({ page }) => {
    await page.goto("/")
    const hasComponents = await waitForComponentLibrary(page)
    test.skip(!hasComponents, "Skipped: no seeded component data")

    const ready = await setupConnectedCanvas(page)
    test.skip(!ready, "Skipped: need at least 2 components")

    const statusDots = page.locator('[data-testid="status-dot"]')
    const dotCount = await statusDots.count()
    expect(dotCount).toBeGreaterThan(0)

    const firstStatus = await statusDots.first().getAttribute("data-status")
    expect(["healthy", "warning", "bottleneck"]).toContain(firstStatus)

    await page.screenshot({ path: `${SCREENSHOT_DIR}/01-status-dots-visible.png`, fullPage: true })
  })

  test("AC-STATUS-2: status dots have correct aria-label for accessibility", async ({ page }) => {
    await page.goto("/")
    const hasComponents = await waitForComponentLibrary(page)
    test.skip(!hasComponents, "Skipped: no seeded component data")

    const ready = await setupConnectedCanvas(page)
    test.skip(!ready, "Skipped: need at least 2 components")

    const statusDots = page.locator('[data-testid="status-dot"]')
    const count = await statusDots.count()
    test.skip(count === 0, "Skipped: no status dots rendered")

    const ariaLabel = await statusDots.first().getAttribute("aria-label")
    expect(ariaLabel).toMatch(/^Connection health: (healthy|warning|bottleneck)$/)

    await page.screenshot({ path: `${SCREENSHOT_DIR}/02-status-dot-a11y.png`, fullPage: true })
  })

  test("AC-STATUS-3: status dots disappear when heatmap is toggled off", async ({ page }) => {
    await page.goto("/")
    const hasComponents = await waitForComponentLibrary(page)
    test.skip(!hasComponents, "Skipped: no seeded component data")

    const ready = await setupConnectedCanvas(page)
    test.skip(!ready, "Skipped: need at least 2 components")

    const statusDots = page.locator('[data-testid="status-dot"]')
    const initialCount = await statusDots.count()
    test.skip(initialCount === 0, "Skipped: no status dots rendered")

    await focusCanvas(page)
    await toggleHeatmap(page)
    await page.waitForTimeout(300)

    await expect(statusDots).toHaveCount(0)

    await page.screenshot({ path: `${SCREENSHOT_DIR}/03-status-dots-gone-heatmap-off.png`, fullPage: true })

    await focusCanvas(page)
    await toggleHeatmap(page)
    await page.waitForTimeout(300)

    expect(await statusDots.count()).toBe(initialCount)

    await page.screenshot({ path: `${SCREENSHOT_DIR}/04-status-dots-restored.png`, fullPage: true })
  })

  // -------------------------------------------------------------------------
  // Ripple animation: verify CSS class is present in the DOM
  // -------------------------------------------------------------------------

  test("AC-RIPPLE-1: archie-ripple CSS keyframes exist in stylesheet", async ({ page }) => {
    await page.goto("/")
    await expect(page.locator('[data-testid="canvas-panel"]')).toBeVisible({ timeout: 15_000 })

    const hasRippleKeyframes = await page.evaluate(() => {
      for (const sheet of document.styleSheets) {
        try {
          for (const rule of sheet.cssRules) {
            if (rule instanceof CSSKeyframesRule && rule.name === "archie-ripple") {
              return true
            }
          }
        } catch { /* cross-origin sheets */ }
      }
      return false
    })

    expect(hasRippleKeyframes).toBe(true)

    await page.screenshot({ path: `${SCREENSHOT_DIR}/05-ripple-keyframes-exist.png`, fullPage: true })
  })

  // -------------------------------------------------------------------------
  // Swap Popover: radial menu "swap" action opens the popover
  // -------------------------------------------------------------------------

  test("AC-SWAP-1: radial menu swap opens swap popover next to node", async ({ page }) => {
    await page.goto("/")
    const hasComponents = await waitForComponentLibrary(page)
    test.skip(!hasComponents, "Skipped: no seeded component data")

    const placed = await placeTwoComponents(page)
    test.skip(placed < 2, "Skipped: need at least 2 components")

    const node = page.locator('[data-testid="archie-node"]').first()
    const rfNode = page.locator('[data-testid^="rf__node-"]').first()
    await expect(rfNode).toBeVisible()

    await rfNode.click({ button: "right" })
    await page.waitForTimeout(400)

    const radialMenu = page.locator('[data-testid="radial-menu"]')
    await expect(radialMenu).toBeVisible()

    await page.locator('[data-testid="radial-item-swap"]').click()
    await page.waitForTimeout(400)

    await expect(radialMenu).not.toBeVisible()

    const swapPopover = page.locator('[data-testid="swap-popover"]')

    const isVisible = await swapPopover.isVisible().catch(() => false)
    if (!isVisible) {
      // SwapPopover only renders when alternatives exist for the category
      test.skip(true, "Skipped: node has no same-category alternatives for swap")
    }

    await expect(swapPopover).toBeVisible()
    expect(await swapPopover.locator("button[data-testid^='swap-option-']").count()).toBeGreaterThan(0)

    await page.screenshot({ path: `${SCREENSHOT_DIR}/06-swap-popover-open.png`, fullPage: true })
  })

  test("AC-SWAP-2: clicking swap option replaces the component", async ({ page }) => {
    await page.goto("/")
    const hasComponents = await waitForComponentLibrary(page)
    test.skip(!hasComponents, "Skipped: no seeded component data")

    const placed = await placeTwoComponents(page)
    test.skip(placed < 2, "Skipped: need at least 2 components")

    const originalName = await page.locator('[data-testid="archie-node"]').first().textContent()

    const rfNode = page.locator('[data-testid^="rf__node-"]').first()
    await rfNode.click({ button: "right" })
    await page.waitForTimeout(400)
    await page.locator('[data-testid="radial-item-swap"]').click()
    await page.waitForTimeout(400)

    const swapPopover = page.locator('[data-testid="swap-popover"]')
    const isVisible = await swapPopover.isVisible().catch(() => false)
    test.skip(!isVisible, "Skipped: no swap alternatives available")

    const swapOption = swapPopover.locator("button[data-testid^='swap-option-']").first()
    const swapName = await swapOption.textContent()
    await swapOption.click()
    await page.waitForTimeout(300)

    await expect(swapPopover).not.toBeVisible()

    const newName = await page.locator('[data-testid="archie-node"]').first().textContent()
    expect(newName).toContain(swapName?.trim())
    expect(newName).not.toBe(originalName)

    await expect(page.locator('[data-testid="archie-node"]')).toHaveCount(2)

    await page.screenshot({ path: `${SCREENSHOT_DIR}/07-after-swap-popover-replace.png`, fullPage: true })
  })

  test("AC-SWAP-3: swap popover closes on Escape", async ({ page }) => {
    await page.goto("/")
    const hasComponents = await waitForComponentLibrary(page)
    test.skip(!hasComponents, "Skipped: no seeded component data")

    const placed = await placeTwoComponents(page)
    test.skip(placed < 2, "Skipped: need at least 2 components")

    const rfNode = page.locator('[data-testid^="rf__node-"]').first()
    await rfNode.click({ button: "right" })
    await page.waitForTimeout(400)
    await page.locator('[data-testid="radial-item-swap"]').click()
    await page.waitForTimeout(400)

    const swapPopover = page.locator('[data-testid="swap-popover"]')
    const isVisible = await swapPopover.isVisible().catch(() => false)
    test.skip(!isVisible, "Skipped: no swap alternatives available")

    // Press Escape ON the canvas panel — that's where the keydown handler that calls clearSwapTarget
    // lives (CanvasView). A bare page.keyboard.press would land on the swap button, not the container.
    await page.locator('[data-testid="canvas-panel"]').press("Escape")
    await page.waitForTimeout(300)

    await expect(swapPopover).not.toBeVisible()

    await page.screenshot({ path: `${SCREENSHOT_DIR}/08-swap-popover-closed-escape.png`, fullPage: true })
  })

  test("AC-SWAP-4: swap popover closes when clicking empty canvas", async ({ page }) => {
    await page.goto("/")
    const hasComponents = await waitForComponentLibrary(page)
    test.skip(!hasComponents, "Skipped: no seeded component data")

    const placed = await placeTwoComponents(page)
    test.skip(placed < 2, "Skipped: need at least 2 components")

    const rfNode = page.locator('[data-testid^="rf__node-"]').first()
    await rfNode.click({ button: "right" })
    await page.waitForTimeout(400)
    await page.locator('[data-testid="radial-item-swap"]').click()
    await page.waitForTimeout(400)

    const swapPopover = page.locator('[data-testid="swap-popover"]')
    const isVisible = await swapPopover.isVisible().catch(() => false)
    test.skip(!isVisible, "Skipped: no swap alternatives available")

    await page.locator(".react-flow__pane").click({ position: { x: 50, y: 50 } })
    await page.waitForTimeout(300)

    await expect(swapPopover).not.toBeVisible()

    await page.screenshot({ path: `${SCREENSHOT_DIR}/09-swap-popover-closed-pane-click.png`, fullPage: true })
  })
})
