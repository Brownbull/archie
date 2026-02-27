import { test, expect } from "@playwright/test"
import { waitForComponentLibrary, placeTwoComponents, connectNodes } from "./helpers/canvas-helpers"

const SCREENSHOT_DIR = "test-results/connection-wiring"

test.describe("Connection Wiring & Management E2E (Story 1-4)", () => {
  test("AC-1: connection handles appear on hover", async ({ page }) => {
    await page.goto("/")

    const hasComponents = await waitForComponentLibrary(page)
    test.skip(!hasComponents, "Skipped: Firestore has no seeded component data")

    // Place one component
    const addBtn = page.locator('[data-testid^="add-to-canvas-"]').first()
    await addBtn.click()
    const node = page.locator('[data-testid="archie-node"]').first()
    await expect(node).toBeVisible({ timeout: 5_000 })

    // Before hover — handles exist but are invisible (opacity: 0)
    const sourceHandle = page.locator('[data-testid="archie-node-handle-source"]').first()
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

  test("AC-2: drag from source to target creates a connection", async ({ page }) => {
    await page.goto("/")

    const hasComponents = await waitForComponentLibrary(page)
    test.skip(!hasComponents, "Skipped: Firestore has no seeded component data")

    const placed = await placeTwoComponents(page)
    test.skip(placed < 2, "Skipped: Need at least 2 components")

    // No edges before connecting
    const edges = page.locator(".react-flow__edge")
    await expect(edges).toHaveCount(0)

    // Connect node 0 -> node 1
    await connectNodes(page, 0, 1)

    // Wait for edge to appear
    await expect(edges.first()).toBeVisible({ timeout: 5_000 })

    await page.screenshot({
      path: `${SCREENSHOT_DIR}/02-connection-created.png`,
      fullPage: true,
    })
  })

  test("AC-3: select edge and press Delete removes it", async ({ page }) => {
    await page.goto("/")

    const hasComponents = await waitForComponentLibrary(page)
    test.skip(!hasComponents, "Skipped: Firestore has no seeded component data")

    const placed = await placeTwoComponents(page)
    test.skip(placed < 2, "Skipped: Need at least 2 components")

    // Create connection
    await connectNodes(page, 0, 1)

    const edges = page.locator(".react-flow__edge")
    await expect(edges.first()).toBeVisible({ timeout: 5_000 })

    // Click the edge to select it
    const edgePath = page.locator(".react-flow__edge").first()
    await edgePath.click()

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

    const placed = await placeTwoComponents(page)
    test.skip(placed < 2, "Skipped: Need at least 2 components")

    // Create connection between the two
    await connectNodes(page, 0, 1)
    const edges = page.locator(".react-flow__edge")
    await expect(edges.first()).toBeVisible({ timeout: 5_000 })

    // Click first node to select it
    const firstNode = page.locator('[data-testid="archie-node"]').first()
    await firstNode.click()

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

    // Place a component
    const addBtn = page.locator('[data-testid^="add-to-canvas-"]').first()
    await addBtn.click()
    const node = page.locator('[data-testid="archie-node"]').first()
    await expect(node).toBeVisible({ timeout: 5_000 })

    // Click node to select it (React Flow adds .selected class)
    await node.click()

    // Press Escape on the canvas
    const canvas = page.locator('[data-testid="canvas-panel"]')
    await canvas.press("Escape")

    // Verify node is deselected (no .selected class on the React Flow node wrapper)
    // React Flow wraps nodes in .react-flow__node elements
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
