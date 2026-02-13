import { test, expect } from "@playwright/test"

const SCREENSHOT_DIR = "test-results/connection-wiring"

/**
 * Helper: wait for the component library to finish loading.
 */
async function waitForComponentLibrary(page: import("@playwright/test").Page) {
  await Promise.race([
    page.locator('[data-testid="component-tab"]').waitFor({ state: "visible", timeout: 15_000 }),
    page.locator('[data-testid="component-tab-empty"]').waitFor({ state: "visible", timeout: 15_000 }),
  ])
  return page.locator('[data-testid="component-tab"]').isVisible()
}

/**
 * Helper: simulate HTML5 drag-and-drop from toolbox to canvas.
 * (Reused from canvas-and-placement spec)
 */
async function dragComponentToCanvas(
  page: import("@playwright/test").Page,
  componentId: string,
  targetX: number,
  targetY: number,
) {
  await page.evaluate(
    ({ compId, x, y }) => {
      const canvasPanel = document.querySelector('[data-testid="canvas-panel"]')
      if (!canvasPanel) throw new Error("canvas-panel not found")

      const dragOverEvent = new DragEvent("dragover", {
        bubbles: true,
        cancelable: true,
      })
      Object.defineProperty(dragOverEvent, "dataTransfer", {
        value: { dropEffect: "", types: ["application/archie-component"] },
      })
      canvasPanel.dispatchEvent(dragOverEvent)

      const dropEvent = new DragEvent("drop", {
        bubbles: true,
        cancelable: true,
        clientX: x,
        clientY: y,
      })
      Object.defineProperty(dropEvent, "dataTransfer", {
        value: {
          getData: (type: string) =>
            type === "application/archie-component" ? compId : "",
          types: ["application/archie-component"],
        },
      })
      canvasPanel.dispatchEvent(dropEvent)
    },
    { compId: componentId, x: targetX, y: targetY },
  )
}

/**
 * Helper: connect two nodes by dragging from source handle to target handle.
 * React Flow uses mouse events (not HTML5 drag) for port connections.
 */
async function connectNodes(
  page: import("@playwright/test").Page,
  sourceNodeIndex: number,
  targetNodeIndex: number,
) {
  // Get source handle (right side of source node)
  const sourceHandle = page
    .locator('[data-testid="archie-node-handle-source"]')
    .nth(sourceNodeIndex)
  const sourceBox = await sourceHandle.boundingBox()
  if (!sourceBox) throw new Error(`Source handle ${sourceNodeIndex} not found`)

  // Get target handle (left side of target node)
  const targetHandle = page
    .locator('[data-testid="archie-node-handle-target"]')
    .nth(targetNodeIndex)
  const targetBox = await targetHandle.boundingBox()
  if (!targetBox) throw new Error(`Target handle ${targetNodeIndex} not found`)

  const srcX = sourceBox.x + sourceBox.width / 2
  const srcY = sourceBox.y + sourceBox.height / 2
  const tgtX = targetBox.x + targetBox.width / 2
  const tgtY = targetBox.y + targetBox.height / 2

  // Mouse drag: down on source, move to target, up on target
  await page.mouse.move(srcX, srcY)
  await page.mouse.down()
  // Intermediate move to trigger React Flow's connection detection
  await page.mouse.move((srcX + tgtX) / 2, (srcY + tgtY) / 2, { steps: 5 })
  await page.mouse.move(tgtX, tgtY, { steps: 5 })
  await page.mouse.up()
}

/**
 * Helper: place two components on the canvas and return their IDs.
 * Returns the count of nodes placed.
 */
async function placeTwoComponents(page: import("@playwright/test").Page) {
  const canvasPanel = page.locator('[data-testid="canvas-panel"]')
  const canvasBounds = await canvasPanel.boundingBox()
  if (!canvasBounds) throw new Error("canvas-panel not found")

  const cards = page.locator('[data-testid^="component-card-"]')
  const cardCount = await cards.count()
  if (cardCount < 2) return 0

  // Drop first component on left side
  const firstTestId = await cards.nth(0).getAttribute("data-testid")
  await dragComponentToCanvas(
    page,
    firstTestId!.replace("component-card-", ""),
    canvasBounds.x + canvasBounds.width * 0.3,
    canvasBounds.y + canvasBounds.height / 2,
  )

  // Wait for first node before dropping second
  await expect(page.locator('[data-testid="archie-node"]')).toHaveCount(1, { timeout: 5_000 })

  // Drop second component on right side
  const secondTestId = await cards.nth(1).getAttribute("data-testid")
  await dragComponentToCanvas(
    page,
    secondTestId!.replace("component-card-", ""),
    canvasBounds.x + canvasBounds.width * 0.7,
    canvasBounds.y + canvasBounds.height / 2,
  )

  await expect(page.locator('[data-testid="archie-node"]')).toHaveCount(2, { timeout: 5_000 })
  return 2
}

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
