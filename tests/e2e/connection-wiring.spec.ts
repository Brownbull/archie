import { test, expect } from "@playwright/test"
import { waitForComponentLibrary, dragComponentToCanvas } from "./helpers/canvas-helpers"

const SCREENSHOT_DIR = "test-results/connection-wiring"
const FIXTURE = "tests/e2e/fixtures/connection/two-node-edge.architecture.yaml"

/**
 * Connection wiring & management (Story 1-4).
 *
 * D23: placing a node uses dragComponentToCanvas (the toolbox redesign removed the legacy
 * `add-to-canvas-*` cards). Tests that need a pre-existing EDGE import a 2-node/1-edge fixture —
 * React Flow's connection handle-drag does not reliably fire onConnect under headless Playwright,
 * so the drag-to-create gesture is store-tested (architectureStore-ports.test.ts) while the edge
 * selection / deletion / cascade behaviors below are driven from the imported edge.
 */
async function placeOneNode(page: import("@playwright/test").Page) {
  const canvasBounds = await page.locator('[data-testid="canvas-panel"]').boundingBox()
  if (!canvasBounds) throw new Error("canvas-panel not found")
  await dragComponentToCanvas(
    page,
    "node-express",
    canvasBounds.x + canvasBounds.width / 2,
    canvasBounds.y + canvasBounds.height / 2,
  )
  await expect(page.locator('[data-testid="archie-node"]')).toHaveCount(1, { timeout: 5_000 })
}

async function importEdgeFixture(page: import("@playwright/test").Page) {
  await page.locator('[data-testid="import-file-input"]').setInputFiles(FIXTURE)
  const edges = page.locator(".react-flow__edge")
  await expect(edges).toHaveCount(1, { timeout: 15_000 })
  return edges
}

test.describe("Connection Wiring & Management E2E (Story 1-4)", () => {
  test("AC-1: connection handles appear on hover", async ({ page }) => {
    await page.goto("/")

    const hasComponents = await waitForComponentLibrary(page)
    test.skip(!hasComponents, "Skipped: Firestore has no seeded component data")

    await placeOneNode(page)
    const node = page.locator('[data-testid="archie-node"]').first()

    // Before hover — handles exist but are invisible (opacity: 0). Node-scoped + type-based so it
    // works whether the placed component has typed ports (Epic 12) or generic fallback handles.
    const sourceHandle = node.locator(".react-flow__handle.source").first()
    await expect(sourceHandle).toBeAttached()
    await expect(sourceHandle).toHaveCSS("opacity", "0")

    // Hover over the node — handles become visible (opacity: 1)
    await node.hover()
    await expect(sourceHandle).toHaveCSS("opacity", "1")

    await page.screenshot({
      path: `${SCREENSHOT_DIR}/01-handles-visible-on-hover.png`,
      fullPage: true,
    })
  })

  test("AC-2: an imported connection renders as an edge", async ({ page }) => {
    await page.goto("/")

    const hasComponents = await waitForComponentLibrary(page)
    test.skip(!hasComponents, "Skipped: Firestore has no seeded component data")

    // The drag-to-create gesture lives in the store (architectureStore-ports.test.ts); here we verify
    // a connection between two nodes hydrates and paints as exactly one edge.
    await importEdgeFixture(page)
    await expect(page.locator('[data-testid="archie-node"]')).toHaveCount(2)

    await page.screenshot({
      path: `${SCREENSHOT_DIR}/02-connection-created.png`,
      fullPage: true,
    })
  })

  test("AC-3: select edge and press Delete removes it", async ({ page }) => {
    await page.goto("/")

    const hasComponents = await waitForComponentLibrary(page)
    test.skip(!hasComponents, "Skipped: Firestore has no seeded component data")

    const edges = await importEdgeFixture(page)

    // Click the edge to select it (animated SVG edge — bypass the stability wait)
    await edges.first().click({ force: true })

    // Press Delete to remove
    await page.keyboard.press("Delete")

    // Edge should be gone
    await expect(edges).toHaveCount(0, { timeout: 5_000 })

    await page.screenshot({
      path: `${SCREENSHOT_DIR}/03-edge-deleted.png`,
      fullPage: true,
    })
  })

  test("AC-4: delete component cascades its connections", async ({ page }) => {
    await page.goto("/")

    const hasComponents = await waitForComponentLibrary(page)
    test.skip(!hasComponents, "Skipped: Firestore has no seeded component data")

    const edges = await importEdgeFixture(page)

    // Click first node to select it (top-left header — the center carries on-node dropdowns)
    const firstNode = page.locator('[data-testid="archie-node"]').first()
    await firstNode.click({ position: { x: 12, y: 6 } })

    // Press Delete to remove the node
    await page.keyboard.press("Delete")

    // Node should be removed (only 1 left)
    await expect(page.locator('[data-testid="archie-node"]')).toHaveCount(1, { timeout: 5_000 })

    // Connection should also be gone (cascade)
    await expect(edges).toHaveCount(0, { timeout: 5_000 })

    await page.screenshot({
      path: `${SCREENSHOT_DIR}/04-cascade-delete.png`,
      fullPage: true,
    })
  })

  test("AC-6: Escape deselects everything", async ({ page }) => {
    await page.goto("/")

    const hasComponents = await waitForComponentLibrary(page)
    test.skip(!hasComponents, "Skipped: Firestore has no seeded component data")

    await placeOneNode(page)
    const node = page.locator('[data-testid="archie-node"]').first()

    // Click node to select it (React Flow adds .selected class). Top-left header, not the center.
    await node.click({ position: { x: 12, y: 6 } })

    // Press Escape on the canvas
    const canvas = page.locator('[data-testid="canvas-panel"]')
    await canvas.press("Escape")

    // Verify node is deselected (no .selected class on the React Flow node wrapper)
    const rfNode = page.locator(".react-flow__node.selected")
    await expect(rfNode).toHaveCount(0, { timeout: 3_000 })

    await page.screenshot({
      path: `${SCREENSHOT_DIR}/05-escape-deselects.png`,
      fullPage: true,
    })
  })

  test("dark theme: controls and minimap match app theme", async ({ page }) => {
    await page.goto("/")

    await expect(page.locator('[data-testid="canvas-panel"]')).toBeVisible({ timeout: 15_000 })

    // Controls should be visible with dark styling
    const controls = page.locator(".react-flow__controls")
    await expect(controls).toBeVisible()

    // MiniMap should be visible
    const minimap = page.locator(".react-flow__minimap")
    await expect(minimap).toBeVisible()

    // Verify dark theme is active (html has .dark class)
    const isDark = await page.evaluate(() => document.documentElement.classList.contains("dark"))
    if (isDark) {
      // Controls should have dark background
      const controlBtn = page.locator(".react-flow__controls-button").first()
      const bgColor = await controlBtn.evaluate((el) => getComputedStyle(el).backgroundColor)
      // Should NOT be white/light (rgb(255,255,255))
      expect(bgColor).not.toBe("rgb(255, 255, 255)")
    }

    await page.screenshot({
      path: `${SCREENSHOT_DIR}/06-dark-themed-controls.png`,
      fullPage: true,
    })
  })
})
