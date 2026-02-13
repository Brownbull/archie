import { test, expect } from "@playwright/test"
import { waitForComponentLibrary } from "./helpers/canvas-helpers"

const SCREENSHOT_DIR = "test-results/inspector-and-config"

/**
 * Helper: place a component on the canvas via the Add to Canvas button.
 * Returns the index (0-based) of the button clicked.
 */
async function addComponentToCanvas(
  page: import("@playwright/test").Page,
  buttonIndex = 0,
) {
  const addBtn = page.locator('[data-testid^="add-to-canvas-"]').nth(buttonIndex)
  await expect(addBtn).toBeVisible()
  await addBtn.click()
  // Wait for the node to appear
  const expectedCount = buttonIndex + 1
  await expect(page.locator('[data-testid="archie-node"]')).toHaveCount(expectedCount, {
    timeout: 5_000,
  })
}

/**
 * Helper: click a canvas node to select it and open the inspector.
 * Waits for the inspector panel to become visible.
 */
async function selectNodeOnCanvas(
  page: import("@playwright/test").Page,
  nodeIndex = 0,
) {
  const node = page.locator('[data-testid="archie-node"]').nth(nodeIndex)
  await expect(node).toBeVisible()
  await node.click()
  // Wait for inspector panel to appear
  await expect(page.locator('[data-testid="inspector-panel"]')).toBeVisible({ timeout: 5_000 })
}

test.describe("Component Inspector & Configuration E2E (Story 1-5)", () => {
  test("AC-1: click component node opens inspector with detail card", async ({ page }) => {
    await page.goto("/")

    const hasComponents = await waitForComponentLibrary(page)
    test.skip(!hasComponents, "Skipped: Firestore has no seeded component data")

    // Place a component on the canvas
    await addComponentToCanvas(page)

    // Inspector should NOT be visible before selection
    await expect(page.locator('[data-testid="inspector-panel"]')).not.toBeVisible()

    // Click the node to select it
    await selectNodeOnCanvas(page)

    // Inspector panel opens on the right side
    const inspector = page.locator('[data-testid="inspector"]')
    await expect(inspector).toBeVisible()

    // Verify inspector width is 300px (INSPECTOR_WIDTH constant)
    await expect(inspector).toHaveCSS("width", "300px")

    // Inspector panel shows component detail content
    const inspectorPanel = page.locator('[data-testid="inspector-panel"]')
    await expect(inspectorPanel).toBeVisible()

    // AC-1: Name displayed (h2 heading inside inspector)
    const heading = inspectorPanel.locator("h2")
    await expect(heading).toBeVisible()
    const componentName = await heading.textContent()
    expect(componentName!.length).toBeGreaterThan(0)

    // AC-1: Category badge displayed
    const badge = inspectorPanel.locator('[data-slot="badge"]')
    await expect(badge.first()).toBeVisible()

    // AC-1: Description displayed
    const descriptionParagraph = inspectorPanel.locator("p").first()
    await expect(descriptionParagraph).toBeVisible()

    // AC-1: Gains section displayed
    const gainsHeading = inspectorPanel.locator("h3", { hasText: "Gains" })
    await expect(gainsHeading).toBeVisible()

    // AC-1: Costs section displayed
    const costsHeading = inspectorPanel.locator("h3", { hasText: "Costs" })
    await expect(costsHeading).toBeVisible()

    await page.screenshot({
      path: `${SCREENSHOT_DIR}/01-inspector-opens-with-detail.png`,
      fullPage: true,
    })
  })

  test("AC-2: config variant dropdown shows current variant and lists all variants", async ({
    page,
  }) => {
    await page.goto("/")

    const hasComponents = await waitForComponentLibrary(page)
    test.skip(!hasComponents, "Skipped: Firestore has no seeded component data")

    // Place a component and select it
    await addComponentToCanvas(page)
    await selectNodeOnCanvas(page)

    // Config selector should be visible
    const configSelector = page.locator('[data-testid="config-selector"]')
    await expect(configSelector).toBeVisible()

    // Verify dropdown trigger shows the current variant name (non-empty text)
    const triggerButton = configSelector.locator("button").first()
    await expect(triggerButton).toBeVisible()
    const currentVariantText = await triggerButton.textContent()
    expect(currentVariantText!.trim().length).toBeGreaterThan(0)

    await page.screenshot({
      path: `${SCREENSHOT_DIR}/02-config-selector-current-variant.png`,
      fullPage: true,
    })

    // Open the dropdown to see all variants
    await triggerButton.click()

    // Wait for dropdown content to appear (radix select renders in a portal)
    const selectContent = page.locator("[role=listbox]")
    await expect(selectContent).toBeVisible({ timeout: 3_000 })

    // Verify at least one option is listed
    const options = selectContent.locator("[role=option]")
    const optionCount = await options.count()
    expect(optionCount).toBeGreaterThanOrEqual(1)

    await page.screenshot({
      path: `${SCREENSHOT_DIR}/03-config-selector-dropdown-open.png`,
      fullPage: true,
    })

    // Close dropdown by pressing Escape
    await page.keyboard.press("Escape")
  })

  test("AC-3: switch variant updates metrics to new variant values", async ({ page }) => {
    await page.goto("/")

    const hasComponents = await waitForComponentLibrary(page)
    test.skip(!hasComponents, "Skipped: Firestore has no seeded component data")

    // Place a component and select it
    await addComponentToCanvas(page)
    await selectNodeOnCanvas(page)

    // Verify config selector exists with more than 1 variant
    const configSelector = page.locator('[data-testid="config-selector"]')
    await expect(configSelector).toBeVisible()

    const triggerButton = configSelector.locator("button").first()
    const initialVariantText = await triggerButton.textContent()

    // Open dropdown
    await triggerButton.click()
    const selectContent = page.locator("[role=listbox]")
    await expect(selectContent).toBeVisible({ timeout: 3_000 })

    // Count options — skip if only one variant available
    const options = selectContent.locator("[role=option]")
    const optionCount = await options.count()
    test.skip(optionCount < 2, "Skipped: Component has only one config variant")

    // Capture initial metric bars state
    const metricBars = page.locator('[data-testid="metric-bar"]')
    const initialMetricCount = await metricBars.count()

    // Capture initial fill widths for comparison
    const initialFills: string[] = []
    const fillCount = await page.locator('[data-testid="metric-bar-fill"]').count()
    for (let i = 0; i < fillCount; i++) {
      const style = await page.locator('[data-testid="metric-bar-fill"]').nth(i).getAttribute("style")
      initialFills.push(style ?? "")
    }

    // Select a different variant (not the currently selected one)
    for (let i = 0; i < optionCount; i++) {
      const optionText = await options.nth(i).textContent()
      if (optionText?.trim() !== initialVariantText?.trim()) {
        await options.nth(i).click()
        break
      }
    }

    // Dropdown should close after selection
    await expect(selectContent).not.toBeVisible({ timeout: 3_000 })

    // Verify variant text changed in the trigger
    const newVariantText = await triggerButton.textContent()
    expect(newVariantText?.trim()).not.toBe(initialVariantText?.trim())

    // Wait for metrics to re-render (deterministic check)
    await expect(metricBars.first()).toBeVisible()

    // Verify metrics still display (count may differ between variants)
    const newMetricCount = await metricBars.count()
    expect(newMetricCount).toBeGreaterThan(0)

    // Check if at least one fill width changed (metrics updated)
    const newFills: string[] = []
    const newFillCount = await page.locator('[data-testid="metric-bar-fill"]').count()
    for (let i = 0; i < newFillCount; i++) {
      const style = await page.locator('[data-testid="metric-bar-fill"]').nth(i).getAttribute("style")
      newFills.push(style ?? "")
    }

    // Either the count changed or at least one fill value changed
    const fillsChanged =
      initialMetricCount !== newMetricCount ||
      initialFills.length !== newFills.length ||
      initialFills.some((f, i) => f !== newFills[i])
    expect(fillsChanged).toBe(true)

    await page.screenshot({
      path: `${SCREENSHOT_DIR}/04-variant-switched-metrics-updated.png`,
      fullPage: true,
    })
  })

  test("AC-4: collapse inspector to 40px and expand back to 300px", async ({ page }) => {
    await page.goto("/")

    const hasComponents = await waitForComponentLibrary(page)
    test.skip(!hasComponents, "Skipped: Firestore has no seeded component data")

    // Place and select a component to open inspector
    await addComponentToCanvas(page)
    await selectNodeOnCanvas(page)

    const inspector = page.locator('[data-testid="inspector"]')
    await expect(inspector).toHaveCSS("width", "300px")

    // Click the collapse button
    const collapseBtn = page.locator('[data-testid="inspector-collapse-btn"]')
    await expect(collapseBtn).toBeVisible()
    await collapseBtn.click()

    // CSS assertion waits for transition to complete (TD-1-5a Item 1)

    // Inspector should be collapsed to 40px
    await expect(inspector).toHaveCSS("width", "40px")

    await page.screenshot({
      path: `${SCREENSHOT_DIR}/05-inspector-collapsed-40px.png`,
      fullPage: true,
    })

    // Expand button should be visible (collapse btn is reused with different icon)
    const expandBtn = page.locator('[data-testid="inspector-collapse-btn"]')
    await expect(expandBtn).toBeVisible()
    await expandBtn.click()

    // Assertion-based wait replaces waitForTimeout (TD-1-5a Item 1)

    // Inspector should be back to 300px
    await expect(inspector).toHaveCSS("width", "300px")

    // Full content should be visible again
    await expect(page.locator('[data-testid="inspector-panel"]')).toBeVisible()
    await expect(page.locator('[data-testid="config-selector"]')).toBeVisible()

    await page.screenshot({
      path: `${SCREENSHOT_DIR}/06-inspector-expanded-300px.png`,
      fullPage: true,
    })
  })

  test("AC-5: metrics display with visual bars grouped by category", async ({ page }) => {
    await page.goto("/")

    const hasComponents = await waitForComponentLibrary(page)
    test.skip(!hasComponents, "Skipped: Firestore has no seeded component data")

    // Place and select a component
    await addComponentToCanvas(page)
    await selectNodeOnCanvas(page)

    const inspectorPanel = page.locator('[data-testid="inspector-panel"]')
    await expect(inspectorPanel).toBeVisible()

    // Verify "Metrics" section heading exists
    const metricsHeading = inspectorPanel.locator("h3", { hasText: "Metrics" })
    await expect(metricsHeading).toBeVisible()

    // Verify at least one metric card (category group) is rendered
    const metricCards = page.locator('[data-testid^="metric-card-"]')
    const cardCount = await metricCards.count()
    expect(cardCount).toBeGreaterThanOrEqual(1)

    // Verify each metric card has a category label in its header
    for (let i = 0; i < cardCount; i++) {
      const card = metricCards.nth(i)
      await expect(card).toBeVisible()
      // Card should contain at least one metric bar
      const bars = card.locator('[data-testid="metric-bar"]')
      expect(await bars.count()).toBeGreaterThanOrEqual(1)
    }

    // Verify metric bars have fill elements with width styling
    const allBars = page.locator('[data-testid="metric-bar"]')
    const barCount = await allBars.count()
    expect(barCount).toBeGreaterThan(0)

    // Verify fills have width percentage style
    const firstFill = page.locator('[data-testid="metric-bar-fill"]').first()
    await expect(firstFill).toBeVisible()
    const fillStyle = await firstFill.getAttribute("style")
    expect(fillStyle).toContain("width:")

    // Verify fill colors match heatmap semantics (green/yellow/red classes)
    const fillClasses = await firstFill.getAttribute("class")
    expect(fillClasses).toMatch(/bg-(green|yellow|red)-500/)

    await page.screenshot({
      path: `${SCREENSHOT_DIR}/07-metrics-grouped-by-category.png`,
      fullPage: true,
    })
  })

  test("click canvas background hides inspector (clears selection)", async ({ page }) => {
    await page.goto("/")

    const hasComponents = await waitForComponentLibrary(page)
    test.skip(!hasComponents, "Skipped: Firestore has no seeded component data")

    // Place and select a component to open inspector
    await addComponentToCanvas(page)
    await selectNodeOnCanvas(page)

    const inspector = page.locator('[data-testid="inspector"]')
    await expect(inspector).toHaveCSS("width", "300px")

    // Click on the canvas background (pane click) to deselect
    // Use the React Flow pane element which covers the canvas background
    const canvasPane = page.locator(".react-flow__pane")
    await canvasPane.click({ position: { x: 50, y: 50 } })

    // Assertion-based wait: inspector-panel hidden confirms transition complete (TD-1-5a Item 1)
    await expect(page.locator('[data-testid="inspector-panel"]')).not.toBeVisible({ timeout: 3_000 })

    // Inspector should collapse (no selected node) — border-box + border-l
    // means minimum computed width is 1px from the border, not 0px
    const inspectorWidth = await inspector.evaluate((el) => el.getBoundingClientRect().width)
    expect(inspectorWidth).toBeLessThanOrEqual(1)

    await page.screenshot({
      path: `${SCREENSHOT_DIR}/08-inspector-hidden-after-pane-click.png`,
      fullPage: true,
    })
  })

  test("delete selected node clears inspector", async ({ page }) => {
    await page.goto("/")

    const hasComponents = await waitForComponentLibrary(page)
    test.skip(!hasComponents, "Skipped: Firestore has no seeded component data")

    // Place and select a component
    await addComponentToCanvas(page)
    await selectNodeOnCanvas(page)

    // Inspector should be open
    await expect(page.locator('[data-testid="inspector-panel"]')).toBeVisible()

    // The node should be selected in React Flow (click already selects it)
    // Press Delete to remove the selected node
    await page.keyboard.press("Delete")

    // Node should be removed from canvas
    await expect(page.locator('[data-testid="archie-node"]')).toHaveCount(0, { timeout: 5_000 })

    // Assertion-based wait: panel hidden confirms transition complete (TD-1-5a Item 1)
    await expect(page.locator('[data-testid="inspector-panel"]')).not.toBeVisible({ timeout: 3_000 })

    // Inspector should hide (selectedNodeId cleared) — border-box + border-l
    // means minimum computed width is 1px, not 0px
    const inspector = page.locator('[data-testid="inspector"]')
    const inspectorWidth = await inspector.evaluate((el) => el.getBoundingClientRect().width)
    expect(inspectorWidth).toBeLessThanOrEqual(1)

    await page.screenshot({
      path: `${SCREENSHOT_DIR}/09-inspector-cleared-after-node-delete.png`,
      fullPage: true,
    })
  })

  test("edge selection does NOT show component inspector", async ({ page }) => {
    await page.goto("/")

    const hasComponents = await waitForComponentLibrary(page)
    test.skip(!hasComponents, "Skipped: Firestore has no seeded component data")

    const cards = page.locator('[data-testid^="component-card-"]')
    const cardCount = await cards.count()
    test.skip(cardCount < 2, "Skipped: Need at least 2 components to create an edge")

    // Place two components on the canvas
    await addComponentToCanvas(page, 0)
    await addComponentToCanvas(page, 1)

    // Connect the two nodes
    const sourceHandle = page.locator('[data-testid="archie-node-handle-source"]').nth(0)
    const targetHandle = page.locator('[data-testid="archie-node-handle-target"]').nth(1)

    // Hover first node to make handles visible
    await page.locator('[data-testid="archie-node"]').nth(0).hover()

    const sourceBox = await sourceHandle.boundingBox()
    const targetBox = await targetHandle.boundingBox()

    if (sourceBox && targetBox) {
      const srcX = sourceBox.x + sourceBox.width / 2
      const srcY = sourceBox.y + sourceBox.height / 2
      const tgtX = targetBox.x + targetBox.width / 2
      const tgtY = targetBox.y + targetBox.height / 2

      await page.mouse.move(srcX, srcY)
      await page.mouse.down()
      await page.mouse.move((srcX + tgtX) / 2, (srcY + tgtY) / 2, { steps: 5 })
      await page.mouse.move(tgtX, tgtY, { steps: 5 })
      await page.mouse.up()
    }

    // Wait for edge to appear in DOM (SVG edges may not pass Playwright visibility check)
    const edges = page.locator(".react-flow__edge")
    await expect(edges).toHaveCount(1, { timeout: 5_000 })

    // Click the edge path to select it (force: true for SVG elements)
    await edges.first().click({ force: true })

    // Assertion-based wait: panel hidden confirms no inspector for edges (TD-1-5a Item 1)
    await expect(page.locator('[data-testid="inspector-panel"]')).not.toBeVisible({ timeout: 3_000 })

    // Inspector should NOT show component details (edge selection sets selectedEdgeId,
    // which clears selectedNodeId — InspectorPanel returns null)
    const inspector = page.locator('[data-testid="inspector"]')
    const inspectorWidth = await inspector.evaluate((el) => el.getBoundingClientRect().width)
    expect(inspectorWidth).toBeLessThanOrEqual(1)

    await page.screenshot({
      path: `${SCREENSHOT_DIR}/10-edge-click-no-inspector.png`,
      fullPage: true,
    })
  })

  test("selecting different nodes updates inspector content", async ({ page }) => {
    await page.goto("/")

    const hasComponents = await waitForComponentLibrary(page)
    test.skip(!hasComponents, "Skipped: Firestore has no seeded component data")

    const cards = page.locator('[data-testid^="component-card-"]')
    const cardCount = await cards.count()
    test.skip(cardCount < 2, "Skipped: Need at least 2 different components")

    // Place two different components
    await addComponentToCanvas(page, 0)
    await addComponentToCanvas(page, 1)

    // Select the first node
    await selectNodeOnCanvas(page, 0)
    const inspectorPanel = page.locator('[data-testid="inspector-panel"]')
    const firstName = await inspectorPanel.locator("h2").textContent()

    await page.screenshot({
      path: `${SCREENSHOT_DIR}/11-first-node-selected.png`,
      fullPage: true,
    })

    // Select the second node
    const secondNode = page.locator('[data-testid="archie-node"]').nth(1)
    await secondNode.click()

    // Assertion-based wait: inspector visible confirms re-render complete (TD-1-5a Item 1)
    await expect(inspectorPanel).toBeVisible({ timeout: 3_000 })

    const secondName = await inspectorPanel.locator("h2").textContent()

    // If different components were placed, names should differ
    // (they could be the same component type if only one type exists)
    // At minimum, the inspector should still be visible with valid content
    await expect(inspectorPanel).toBeVisible()
    expect(secondName!.length).toBeGreaterThan(0)

    await page.screenshot({
      path: `${SCREENSHOT_DIR}/12-second-node-selected.png`,
      fullPage: true,
    })

    // If components are different, names should differ
    if (cardCount >= 2) {
      const firstCardName = await cards.nth(0).locator("h4").textContent()
      const secondCardName = await cards.nth(1).locator("h4").textContent()
      if (firstCardName !== secondCardName) {
        expect(firstName).not.toBe(secondName)
      }
    }
  })

  test("inspector CSS transition animates width changes", async ({ page }) => {
    await page.goto("/")

    const hasComponents = await waitForComponentLibrary(page)
    test.skip(!hasComponents, "Skipped: Firestore has no seeded component data")

    // Verify the inspector aside has CSS transition property set
    const inspector = page.locator('[data-testid="inspector"]')
    await expect(inspector).toBeVisible()

    // Check that the transition property includes width
    const transition = await inspector.evaluate((el) => getComputedStyle(el).transitionProperty)
    expect(transition).toContain("width")

    // Check transition duration is 200ms (0.2s)
    const duration = await inspector.evaluate((el) => getComputedStyle(el).transitionDuration)
    expect(duration).toBe("0.2s")

    await page.screenshot({
      path: `${SCREENSHOT_DIR}/13-inspector-has-css-transition.png`,
      fullPage: true,
    })
  })
})
