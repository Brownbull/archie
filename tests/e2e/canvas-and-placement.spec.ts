import { test, expect } from "@playwright/test"
import { waitForComponentLibrary, dragComponentToCanvas } from "./helpers/canvas-helpers"

const SCREENSHOT_DIR = "test-results/canvas-and-placement"

test.describe("Canvas & Component Placement E2E (Story 1-3)", () => {
  test("AC-3: empty canvas shows suggestions on load", async ({ page }) => {
    await page.goto("/")

    // Wait for app to be ready
    await expect(page.locator('[data-testid="canvas-panel"]')).toBeVisible({ timeout: 15_000 })

    // Empty-state overlay with the start-option suggestions (post-first-run-fork; the suite seeds
    // firstRunChoice="free" in global-setup so it lands here, not on the S1 fork).
    const emptyState = page.locator('[data-testid="canvas-empty-state"]')
    await expect(emptyState).toBeVisible()

    await expect(page.locator('[data-testid="suggestion-blueprints"]')).toBeVisible()
    await expect(page.locator('[data-testid="suggestion-components"]')).toBeVisible()
    await expect(page.locator('[data-testid="suggestion-import"]')).toBeVisible()

    // Verify suggestion text
    await expect(page.locator('[data-testid="suggestion-blueprints"]')).toContainText("Start from a Blueprint")
    await expect(page.locator('[data-testid="suggestion-components"]')).toContainText("Browse Components")
    await expect(page.locator('[data-testid="suggestion-import"]')).toContainText("Import a YAML file")

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

    // D23: the default toolbox renders type-block cards (type-block-<typeId>), not the old
    // component-card-* grid. Drag a known base component by id.
    const block = page.locator('[data-testid^="type-block-"]').first()
    await expect(block).toBeVisible()
    await expect(block).toHaveAttribute("draggable", "true")

    // Get canvas bounds for drop target
    const canvasPanel = page.locator('[data-testid="canvas-panel"]')
    const canvasBounds = await canvasPanel.boundingBox()
    expect(canvasBounds).not.toBeNull()

    // Drop in center of canvas
    const dropX = canvasBounds!.x + canvasBounds!.width / 2
    const dropY = canvasBounds!.y + canvasBounds!.height / 2

    await dragComponentToCanvas(page, "node-express", dropX, dropY)

    // Wait for node to appear
    const archieNode = page.locator('[data-testid="archie-node"]').first()
    await expect(archieNode).toBeVisible({ timeout: 5_000 })

    // AC-1: Node displays category color stripe
    const stripe = page.locator('[data-testid="archie-node-stripe"]').first()
    await expect(stripe).toBeVisible()

    // AC-1: Node has connection handles
    await expect(page.locator('[data-testid="archie-node"]').first().locator(".react-flow__handle.target").first()).toBeAttached()
    await expect(page.locator('[data-testid="archie-node"]').first().locator(".react-flow__handle.source").first()).toBeAttached()

    // Empty state should be gone now
    await expect(page.locator('[data-testid="canvas-empty-state"]')).not.toBeVisible()

    await page.screenshot({
      path: `${SCREENSHOT_DIR}/03-component-dropped-on-canvas.png`,
      fullPage: true,
    })
  })

  test("AC-1: dropped node width is within the variable-width range", async ({ page }) => {
    await page.goto("/")

    const hasComponents = await waitForComponentLibrary(page)
    test.skip(!hasComponents, "Skipped: Firestore has no seeded component data")

    // D23: the default toolbox renders type-block cards (no component-card-* grid). Drop a known
    // base component by id rather than reading an id off a card.
    const canvasPanel = page.locator('[data-testid="canvas-panel"]')
    const canvasBounds = await canvasPanel.boundingBox()

    await dragComponentToCanvas(
      page,
      "node-express",
      canvasBounds!.x + canvasBounds!.width / 2,
      canvasBounds!.y + canvasBounds!.height / 2,
    )

    // Nodes are variable-width (NODE_MIN_WIDTH 176 … NODE_MAX_WIDTH 280) — they grow to fit content,
    // so assert the rendered CSS width falls in that range, not a brittle fixed px (the old "208px"
    // literal predates the variable-width model and drifts on any content change).
    const archieNode = page.locator('[data-testid="archie-node"]').first()
    await expect(archieNode).toBeVisible({ timeout: 5_000 })
    const widthPx = await archieNode.evaluate((el) => parseFloat(getComputedStyle(el).width))
    expect(widthPx).toBeGreaterThanOrEqual(176)
    expect(widthPx).toBeLessThanOrEqual(280)

    await page.screenshot({
      path: `${SCREENSHOT_DIR}/04-node-width.png`,
      fullPage: true,
    })
  })

  test("multiple components can be placed on canvas", async ({ page }) => {
    await page.goto("/")

    const hasComponents = await waitForComponentLibrary(page)
    test.skip(!hasComponents, "Skipped: Firestore has no seeded component data")

    const canvasPanel = page.locator('[data-testid="canvas-panel"]')
    const canvasBounds = await canvasPanel.boundingBox()

    // D23: the default toolbox renders type-block cards (no component-card-* grid). Drop two known
    // base components by id at distinct positions.
    // Drop first component on left side
    await dragComponentToCanvas(
      page,
      "node-express",
      canvasBounds!.x + canvasBounds!.width * 0.3,
      canvasBounds!.y + canvasBounds!.height / 2,
    )

    // Drop second component on right side
    await dragComponentToCanvas(
      page,
      "postgresql",
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

    // D23: the default toolbox renders type-block cards. The draggable card is now type-block-*.
    const firstCard = page.locator('[data-testid^="type-block-"]').first()
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

    // D23: the "add to canvas" button inside each type-block card is now add-type-*.
    const addBtn = page.locator('[data-testid^="add-type-"]').first()
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

    // D23: the "add to canvas" buttons are now add-type-* (one per type-block card).
    const addBtns = page.locator('[data-testid^="add-type-"]')
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

    // D23: the "add to canvas" button inside each type-block card is now add-type-* (the default
    // toolbox no longer renders the component-card-* grid with a readable h4 name). Target the
    // Compute block specifically — `.first()` is the traffic-source, which has only a SOURCE handle
    // (traffic originates there), so its node has no target handle and the structure check below fails.
    const addBtn = page.locator('[data-testid="add-type-compute"]')
    await addBtn.click()

    // Verify node structure
    const archieNode = page.locator('[data-testid="archie-node"]').first()
    await expect(archieNode).toBeVisible({ timeout: 5_000 })

    // Node displays a component name — asserted on the placed node itself (the card no longer
    // exposes a name to compare against; the node renders data.componentName).
    await expect(archieNode).not.toHaveText("")

    // Node has category color stripe
    await expect(page.locator('[data-testid="archie-node-stripe"]').first()).toBeVisible()

    // Node has connection handles
    await expect(page.locator('[data-testid="archie-node"]').first().locator(".react-flow__handle.target").first()).toBeAttached()
    await expect(page.locator('[data-testid="archie-node"]').first().locator(".react-flow__handle.source").first()).toBeAttached()

    // Node has correct width
    await expect(archieNode).toHaveCSS("width", "208px")

    await page.screenshot({
      path: `${SCREENSHOT_DIR}/09-node-structure-via-button.png`,
      fullPage: true,
    })
  })
})
