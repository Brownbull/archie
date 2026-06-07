import { test, expect } from "@playwright/test"
import { waitForComponentLibrary } from "./helpers/canvas-helpers"

const SCREENSHOT_DIR = "test-results/connection-inspection"
const FIXTURE = "tests/e2e/fixtures/connection/two-node-edge.architecture.yaml"

/**
 * Helper: seed a 2-node, 1-edge build and select the edge.
 * D23: import a fixture (the reliable path the CI-gated specs use — loadArchitecture renders the edge)
 * instead of React Flow's connection handle-drag, which isn't reliably drivable in Playwright. This
 * spec's subject is the connection INSPECTOR, not edge creation (that's port-edge-creation's job).
 */
async function setupConnectionAndSelect(page: import("@playwright/test").Page) {
  await page.locator('[data-testid="import-file-input"]').setInputFiles(FIXTURE)

  // Edge renders once loadArchitecture re-paints the canvas (SVG edges fail visibility — use count).
  const edges = page.locator(".react-flow__edge")
  await expect(edges).toHaveCount(1, { timeout: 15_000 })

  // Click the edge to select it (force: true for SVG path elements)
  await edges.first().click({ force: true })

  // Wait for connection inspector to appear
  await expect(page.locator('[data-testid="connection-detail"]')).toBeVisible({ timeout: 5_000 })
}

test.describe("Connection Inspection E2E (Story 4-3)", () => {
  test("AC-FUNC-1: click connection opens inspector with properties", async ({ page }) => {
    await page.goto("/")

    const hasComponents = await waitForComponentLibrary(page)
    test.skip(!hasComponents, "Skipped: Firestore has no seeded component data")

    await setupConnectionAndSelect(page)

    const connectionDetail = page.locator('[data-testid="connection-detail"]')

    // Verify header shows "Connection" heading
    await expect(connectionDetail.locator("h2")).toHaveText("Connection")

    // Verify source → target description is present
    const description = connectionDetail.locator("p").first()
    const descText = await description.textContent()
    expect(descText).toContain("\u2192") // right arrow entity

    // Either connection-properties or no-connection-properties must show
    const hasProperties = await page.locator('[data-testid="connection-properties"]').isVisible()
    const hasNoProperties = await page.locator('[data-testid="no-connection-properties"]').isVisible()
    expect(hasProperties || hasNoProperties).toBe(true)

    if (hasProperties) {
      const propsSection = page.locator('[data-testid="connection-properties"]')
      await expect(propsSection.getByText("Protocol")).toBeVisible()
      await expect(propsSection.getByText("Latency")).toBeVisible()
      await expect(propsSection.getByText("Co-location")).toBeVisible()
      await expect(propsSection.getByText("Patterns")).toBeVisible()
    }

    await page.screenshot({
      path: `${SCREENSHOT_DIR}/01-connection-inspector-opens.png`,
      fullPage: true,
    })
  })

  test("AC-FUNC-3: endpoint health displays for both source and target", async ({ page }) => {
    await page.goto("/")

    const hasComponents = await waitForComponentLibrary(page)
    test.skip(!hasComponents, "Skipped: Firestore has no seeded component data")

    await setupConnectionAndSelect(page)

    // Endpoint health section should be visible
    const healthSection = page.locator('[data-testid="endpoint-health"]')
    await expect(healthSection).toBeVisible()
    await expect(healthSection.locator("h3")).toHaveText("Endpoint Health")

    // Should show source and target endpoint rows
    await expect(healthSection.locator('[data-testid="endpoint-health-source"]')).toBeVisible()
    await expect(healthSection.locator('[data-testid="endpoint-health-target"]')).toBeVisible()

    // Connection heatmap section should also be visible
    const connectionHeatmap = page.locator('[data-testid="connection-heatmap"]')
    await expect(connectionHeatmap).toBeVisible()
    await expect(connectionHeatmap.locator("h3")).toHaveText("Connection Health")

    await page.screenshot({
      path: `${SCREENSHOT_DIR}/02-endpoint-health-displayed.png`,
      fullPage: true,
    })
  })

  test("AC-FUNC-4: deselecting (Escape) clears the connection and closes the inspector", async ({
    page,
  }) => {
    await page.goto("/")

    const hasComponents = await waitForComponentLibrary(page)
    test.skip(!hasComponents, "Skipped: Firestore has no seeded component data")

    await setupConnectionAndSelect(page)

    // Connection inspector should be open
    await expect(page.locator('[data-testid="connection-detail"]')).toBeVisible()

    // Deselect via Escape — the canvas keydown handler clears selection (same outcome as an empty pane
    // click, but deterministic; a programmatic React Flow .pane click is flaky in Playwright).
    await page.keyboard.press("Escape")

    // Inspector panel should close (no selection)
    await expect(page.locator('[data-testid="inspector-panel"]')).not.toBeVisible({
      timeout: 3_000,
    })

    await page.screenshot({
      path: `${SCREENSHOT_DIR}/03-pane-click-deselects-connection.png`,
      fullPage: true,
    })
  })

  test("AC-FUNC-5: protocol label visible on edge when connectionProperties exists", async ({
    page,
  }) => {
    await page.goto("/")

    const hasComponents = await waitForComponentLibrary(page)
    test.skip(!hasComponents, "Skipped: Firestore has no seeded component data")

    await page.locator('[data-testid="import-file-input"]').setInputFiles(FIXTURE)

    // Wait for edge in DOM (SVG edges — use count not visibility)
    const edges = page.locator(".react-flow__edge")
    await expect(edges).toHaveCount(1, { timeout: 15_000 })

    // Protocol label only renders when source component has connectionProperties
    const edgeLabels = page.locator('[data-testid^="edge-label-"]')
    const labelCount = await edgeLabels.count()
    test.skip(
      labelCount === 0,
      "Skipped: source component has no connectionProperties — label not rendered",
    )

    const label = edgeLabels.first()
    await expect(label).toBeVisible()
    const labelText = await label.textContent()
    expect(labelText!.trim().length).toBeGreaterThan(0)

    // Verify label has cursor-grab styling (draggable)
    await expect(label).toHaveClass(/cursor-grab/)

    await page.screenshot({
      path: `${SCREENSHOT_DIR}/04-protocol-label-on-edge.png`,
      fullPage: true,
    })
  })

  test("AC-FUNC-7: no-properties fallback when connectionProperties missing", async ({
    page,
  }) => {
    await page.goto("/")

    const hasComponents = await waitForComponentLibrary(page)
    test.skip(!hasComponents, "Skipped: Firestore has no seeded component data")

    await setupConnectionAndSelect(page)

    // Verify exactly one of the two states is displayed
    const propertiesVisible = await page
      .locator('[data-testid="connection-properties"]')
      .isVisible()
    const noPropertiesVisible = await page
      .locator('[data-testid="no-connection-properties"]')
      .isVisible()

    expect(propertiesVisible || noPropertiesVisible).toBe(true)
    // They must be mutually exclusive
    expect(propertiesVisible && noPropertiesVisible).toBe(false)

    if (noPropertiesVisible) {
      await expect(
        page.locator('[data-testid="no-connection-properties"]'),
      ).toContainText("No connection properties available")
    }

    // Endpoint health should still show regardless of connectionProperties
    await expect(page.locator('[data-testid="endpoint-health"]')).toBeVisible()

    await page.screenshot({
      path: `${SCREENSHOT_DIR}/05-connection-properties-state.png`,
      fullPage: true,
    })
  })

  test("switching between node and edge selection updates inspector content", async ({
    page,
  }) => {
    await page.goto("/")

    const hasComponents = await waitForComponentLibrary(page)
    test.skip(!hasComponents, "Skipped: Firestore has no seeded component data")

    // D23: import the 2-node, 1-edge build (no handle-drag).
    await page.locator('[data-testid="import-file-input"]').setInputFiles(FIXTURE)
    await expect(page.locator(".react-flow__edge")).toHaveCount(1, { timeout: 15_000 })

    // Select the first node — the read-only ComponentDetail (inspector-heading) shows. Click the node's
    // top-left header, not its center (the center carries the on-node dropdowns).
    const firstNode = page.locator('[data-testid="archie-node"]').first()
    await firstNode.click({ position: { x: 12, y: 6 } })
    await expect(page.locator('[data-testid="inspector-panel"]')).toBeVisible({ timeout: 5_000 })
    await expect(page.locator('[data-testid="inspector-heading"]')).toBeVisible({ timeout: 3_000 })

    await page.screenshot({
      path: `${SCREENSHOT_DIR}/06-node-selected-component-detail.png`,
      fullPage: true,
    })

    // Deselect via Escape (deterministic; the canvas keydown handler clears selection).
    await page.keyboard.press("Escape")
    await expect(page.locator('[data-testid="inspector-panel"]')).not.toBeVisible({
      timeout: 3_000,
    })

    // Select the edge — ConnectionDetail shows; ComponentDetail (inspector-heading) does not.
    await page.locator(".react-flow__edge").first().click({ force: true })
    await expect(page.locator('[data-testid="connection-detail"]')).toBeVisible({ timeout: 5_000 })
    await expect(page.locator('[data-testid="inspector-heading"]')).not.toBeVisible()

    await page.screenshot({
      path: `${SCREENSHOT_DIR}/07-edge-selected-connection-detail.png`,
      fullPage: true,
    })

    // Click back on a node — ComponentDetail returns, ConnectionDetail gone.
    await firstNode.click({ position: { x: 12, y: 6 } })
    await expect(page.locator('[data-testid="inspector-heading"]')).toBeVisible({ timeout: 5_000 })
    await expect(page.locator('[data-testid="connection-detail"]')).not.toBeVisible()

    await page.screenshot({
      path: `${SCREENSHOT_DIR}/08-back-to-node-selection.png`,
      fullPage: true,
    })
  })

  test("connection inspector collapse and expand works", async ({ page }) => {
    await page.goto("/")

    const hasComponents = await waitForComponentLibrary(page)
    test.skip(!hasComponents, "Skipped: Firestore has no seeded component data")

    await setupConnectionAndSelect(page)

    const inspector = page.locator('[data-testid="inspector"]')
    await expect(inspector).toHaveCSS("width", "300px")

    // Collapse the inspector
    const collapseBtn = page.locator('[data-testid="inspector-collapse-btn"]')
    await collapseBtn.click()
    await expect(inspector).toHaveCSS("width", "40px")

    await page.screenshot({
      path: `${SCREENSHOT_DIR}/09-connection-inspector-collapsed.png`,
      fullPage: true,
    })

    // Expand it back
    await page.locator('[data-testid="inspector-collapse-btn"]').click()
    await expect(inspector).toHaveCSS("width", "300px")

    // ConnectionDetail should still be visible after expand
    await expect(page.locator('[data-testid="connection-detail"]')).toBeVisible()

    await page.screenshot({
      path: `${SCREENSHOT_DIR}/10-connection-inspector-expanded.png`,
      fullPage: true,
    })
  })
})
