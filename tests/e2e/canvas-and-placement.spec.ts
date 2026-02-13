import { test, expect } from "@playwright/test"

const SCREENSHOT_DIR = "test-results/canvas-and-placement"

/**
 * Helper: wait for the component library to finish loading.
 * Returns true if components were loaded, false if empty state.
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
 * Playwright doesn't natively support dataTransfer in drag events,
 * so we dispatch synthetic DragEvents via page.evaluate.
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

      // Dispatch dragover (required for drop to work)
      const dragOverEvent = new DragEvent("dragover", {
        bubbles: true,
        cancelable: true,
      })
      Object.defineProperty(dragOverEvent, "dataTransfer", {
        value: { dropEffect: "", types: ["application/archie-component"] },
      })
      canvasPanel.dispatchEvent(dragOverEvent)

      // Dispatch drop with componentId in dataTransfer
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

test.describe("Canvas & Component Placement E2E (Story 1-3)", () => {
  test("AC-3: empty canvas shows suggestions on load", async ({ page }) => {
    await page.goto("/")

    // Wait for app to be ready
    await expect(page.locator('[data-testid="canvas-panel"]')).toBeVisible({ timeout: 15_000 })

    // Empty state overlay with three suggestions
    const emptyState = page.locator('[data-testid="canvas-empty-state"]')
    await expect(emptyState).toBeVisible()

    await expect(page.locator('[data-testid="suggestion-import"]')).toBeVisible()
    await expect(page.locator('[data-testid="suggestion-example"]')).toBeVisible()
    await expect(page.locator('[data-testid="suggestion-drag"]')).toBeVisible()

    // Verify suggestion text
    await expect(page.locator('[data-testid="suggestion-import"]')).toContainText("Import a YAML file")
    await expect(page.locator('[data-testid="suggestion-example"]')).toContainText("Try an example from Blueprints")
    await expect(page.locator('[data-testid="suggestion-drag"]')).toContainText("Drag a component from the toolbox")

    await page.screenshot({
      path: `${SCREENSHOT_DIR}/01-empty-canvas-with-suggestions.png`,
      fullPage: true,
    })
  })

  test("AC-4: canvas renders React Flow with minimap and controls", async ({ page }) => {
    await page.goto("/")

    await expect(page.locator('[data-testid="canvas-panel"]')).toBeVisible({ timeout: 15_000 })

    // React Flow renders its own internal structure
    const reactFlowWrapper = page.locator(".react-flow")
    await expect(reactFlowWrapper).toBeVisible()

    // Background dots pattern
    const background = page.locator(".react-flow__background")
    await expect(background).toBeVisible()

    // Minimap for navigation
    const minimap = page.locator(".react-flow__minimap")
    await expect(minimap).toBeVisible()

    // Controls (zoom in/out/fit)
    const controls = page.locator(".react-flow__controls")
    await expect(controls).toBeVisible()

    await page.screenshot({
      path: `${SCREENSHOT_DIR}/02-react-flow-with-minimap-controls.png`,
      fullPage: true,
    })
  })

  test("AC-1: drag component from toolbox creates node on canvas", async ({ page }) => {
    await page.goto("/")

    const hasComponents = await waitForComponentLibrary(page)
    test.skip(!hasComponents, "Skipped: Firestore has no seeded component data")

    // Get the first component card's ID
    const firstCard = page.locator('[data-testid^="component-card-"]').first()
    await expect(firstCard).toBeVisible()
    const testId = await firstCard.getAttribute("data-testid")
    const componentId = testId!.replace("component-card-", "")

    // Verify card is draggable
    await expect(firstCard).toHaveAttribute("draggable", "true")

    // Get canvas bounds for drop target
    const canvasPanel = page.locator('[data-testid="canvas-panel"]')
    const canvasBounds = await canvasPanel.boundingBox()
    expect(canvasBounds).not.toBeNull()

    // Drop in center of canvas
    const dropX = canvasBounds!.x + canvasBounds!.width / 2
    const dropY = canvasBounds!.y + canvasBounds!.height / 2

    // Simulate drag-and-drop
    await dragComponentToCanvas(page, componentId, dropX, dropY)

    // Wait for node to appear
    const archieNode = page.locator('[data-testid="archie-node"]').first()
    await expect(archieNode).toBeVisible({ timeout: 5_000 })

    // AC-1: Node displays component name
    const componentName = await firstCard.locator("h4").textContent()
    await expect(archieNode).toContainText(componentName!)

    // AC-1: Node displays category color stripe
    const stripe = page.locator('[data-testid="archie-node-stripe"]').first()
    await expect(stripe).toBeVisible()

    // AC-1: Node has connection handles
    await expect(page.locator('[data-testid="archie-node-handle-target"]').first()).toBeAttached()
    await expect(page.locator('[data-testid="archie-node-handle-source"]').first()).toBeAttached()

    // Empty state should be gone now
    await expect(page.locator('[data-testid="canvas-empty-state"]')).not.toBeVisible()

    await page.screenshot({
      path: `${SCREENSHOT_DIR}/03-component-dropped-on-canvas.png`,
      fullPage: true,
    })
  })

  test("AC-1: dropped node has correct 140px width", async ({ page }) => {
    await page.goto("/")

    const hasComponents = await waitForComponentLibrary(page)
    test.skip(!hasComponents, "Skipped: Firestore has no seeded component data")

    // Get first component and drop it
    const firstCard = page.locator('[data-testid^="component-card-"]').first()
    await expect(firstCard).toBeVisible()
    const testId = await firstCard.getAttribute("data-testid")
    const componentId = testId!.replace("component-card-", "")

    const canvasPanel = page.locator('[data-testid="canvas-panel"]')
    const canvasBounds = await canvasPanel.boundingBox()

    await dragComponentToCanvas(
      page,
      componentId,
      canvasBounds!.x + canvasBounds!.width / 2,
      canvasBounds!.y + canvasBounds!.height / 2,
    )

    // Verify node CSS width is 140px (UX16) — use CSS check, not boundingBox
    // (boundingBox includes React Flow transforms which may scale the element)
    const archieNode = page.locator('[data-testid="archie-node"]').first()
    await expect(archieNode).toBeVisible({ timeout: 5_000 })
    await expect(archieNode).toHaveCSS("width", "140px")

    await page.screenshot({
      path: `${SCREENSHOT_DIR}/04-node-140px-width.png`,
      fullPage: true,
    })
  })

  test("multiple components can be placed on canvas", async ({ page }) => {
    await page.goto("/")

    const hasComponents = await waitForComponentLibrary(page)
    test.skip(!hasComponents, "Skipped: Firestore has no seeded component data")

    const cards = page.locator('[data-testid^="component-card-"]')
    const cardCount = await cards.count()
    test.skip(cardCount < 2, "Skipped: Need at least 2 components")

    const canvasPanel = page.locator('[data-testid="canvas-panel"]')
    const canvasBounds = await canvasPanel.boundingBox()

    // Drop first component on left side
    const firstTestId = await cards.nth(0).getAttribute("data-testid")
    await dragComponentToCanvas(
      page,
      firstTestId!.replace("component-card-", ""),
      canvasBounds!.x + canvasBounds!.width * 0.3,
      canvasBounds!.y + canvasBounds!.height / 2,
    )

    // Drop second component on right side
    const secondTestId = await cards.nth(1).getAttribute("data-testid")
    await dragComponentToCanvas(
      page,
      secondTestId!.replace("component-card-", ""),
      canvasBounds!.x + canvasBounds!.width * 0.7,
      canvasBounds!.y + canvasBounds!.height / 2,
    )

    // Wait and verify both nodes exist
    const nodes = page.locator('[data-testid="archie-node"]')
    await expect(nodes).toHaveCount(2, { timeout: 5_000 })

    // Empty state gone
    await expect(page.locator('[data-testid="canvas-empty-state"]')).not.toBeVisible()

    await page.screenshot({
      path: `${SCREENSHOT_DIR}/05-multiple-components-on-canvas.png`,
      fullPage: true,
    })
  })

  test("ComponentCard has correct drag behavior", async ({ page }) => {
    await page.goto("/")

    const hasComponents = await waitForComponentLibrary(page)
    test.skip(!hasComponents, "Skipped: Firestore has no seeded component data")

    const firstCard = page.locator('[data-testid^="component-card-"]').first()
    await expect(firstCard).toBeVisible()

    // Verify HTML5 draggable attribute
    await expect(firstCard).toHaveAttribute("draggable", "true")

    // Verify card has grab cursor styling
    const cursor = await firstCard.evaluate((el) => getComputedStyle(el).cursor)
    expect(cursor).toBe("grab")

    await page.screenshot({
      path: `${SCREENSHOT_DIR}/06-component-card-draggable.png`,
      fullPage: true,
    })
  })

  test("Add to Canvas button creates node on canvas (click-based)", async ({ page }) => {
    await page.goto("/")

    const hasComponents = await waitForComponentLibrary(page)
    test.skip(!hasComponents, "Skipped: Firestore has no seeded component data")

    // Find first add-to-canvas button
    const addBtn = page.locator('[data-testid^="add-to-canvas-"]').first()
    await expect(addBtn).toBeVisible()

    // Click it to add to canvas
    await addBtn.click()

    // Node should appear on canvas
    const archieNode = page.locator('[data-testid="archie-node"]').first()
    await expect(archieNode).toBeVisible({ timeout: 5_000 })

    // Empty state should disappear
    await expect(page.locator('[data-testid="canvas-empty-state"]')).not.toBeVisible()

    await page.screenshot({
      path: `${SCREENSHOT_DIR}/07-add-to-canvas-button-click.png`,
      fullPage: true,
    })
  })

  test("Add to Canvas button: multiple clicks place non-overlapping nodes", async ({ page }) => {
    await page.goto("/")

    const hasComponents = await waitForComponentLibrary(page)
    test.skip(!hasComponents, "Skipped: Firestore has no seeded component data")

    const addBtns = page.locator('[data-testid^="add-to-canvas-"]')
    const btnCount = await addBtns.count()
    test.skip(btnCount < 2, "Skipped: Need at least 2 components")

    // Click first add button
    await addBtns.nth(0).click()
    await expect(page.locator('[data-testid="archie-node"]')).toHaveCount(1, { timeout: 5_000 })

    // Click second add button
    await addBtns.nth(1).click()
    await expect(page.locator('[data-testid="archie-node"]')).toHaveCount(2, { timeout: 5_000 })

    await page.screenshot({
      path: `${SCREENSHOT_DIR}/08-multiple-nodes-via-button.png`,
      fullPage: true,
    })
  })

  test("Add to Canvas button: node has correct structure", async ({ page }) => {
    await page.goto("/")

    const hasComponents = await waitForComponentLibrary(page)
    test.skip(!hasComponents, "Skipped: Firestore has no seeded component data")

    // Get first card name for comparison
    const firstCard = page.locator('[data-testid^="component-card-"]').first()
    const componentName = await firstCard.locator("h4").textContent()

    // Click the add button
    const addBtn = page.locator('[data-testid^="add-to-canvas-"]').first()
    await addBtn.click()

    // Verify node structure
    const archieNode = page.locator('[data-testid="archie-node"]').first()
    await expect(archieNode).toBeVisible({ timeout: 5_000 })

    // Node displays the component name
    await expect(archieNode).toContainText(componentName!)

    // Node has category color stripe
    await expect(page.locator('[data-testid="archie-node-stripe"]').first()).toBeVisible()

    // Node has connection handles
    await expect(page.locator('[data-testid="archie-node-handle-target"]').first()).toBeAttached()
    await expect(page.locator('[data-testid="archie-node-handle-source"]').first()).toBeAttached()

    // Node has correct width
    await expect(archieNode).toHaveCSS("width", "140px")

    await page.screenshot({
      path: `${SCREENSHOT_DIR}/09-node-structure-via-button.png`,
      fullPage: true,
    })
  })
})
