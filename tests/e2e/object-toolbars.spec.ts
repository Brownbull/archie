import { test, expect } from "@playwright/test"
import {
  waitForComponentLibrary,
  addComponentToCanvas,
  placeTwoComponents,
  connectNodes,
} from "./helpers/canvas-helpers"

const SCREENSHOT_DIR = "test-results/object-toolbars"

test.describe("On-object Remove/Duplicate toolbars (P1)", () => {
  test("node toolbar: select shows Duplicate + Remove; actions work", async ({ page }) => {
    await page.goto("/")

    const hasComponents = await waitForComponentLibrary(page)
    test.skip(!hasComponents, "Skipped: Firestore has no seeded component data")

    await addComponentToCanvas(page, 0)
    const nodes = page.locator('[data-testid="archie-node"]')
    await expect(nodes).toHaveCount(1)

    // Select the node — the on-object toolbar appears (same selection that opens the inspector).
    await nodes.first().click()
    const toolbar = page.locator('[data-testid="node-action-toolbar"]')
    await expect(toolbar).toBeVisible({ timeout: 5_000 })
    await expect(page.locator('[data-testid="node-action-toolbar-duplicate"]')).toBeVisible()
    await expect(page.locator('[data-testid="node-action-toolbar-remove"]')).toBeVisible()

    await page.screenshot({ path: `${SCREENSHOT_DIR}/01-node-toolbar-visible.png`, fullPage: true })

    // Duplicate → a second node appears.
    await page.locator('[data-testid="node-action-toolbar-duplicate"]').click()
    await expect(nodes).toHaveCount(2, { timeout: 5_000 })
    await page.screenshot({ path: `${SCREENSHOT_DIR}/02-node-duplicated.png`, fullPage: true })

    // Remove the (now selected) clone → back to one node.
    await page.locator('[data-testid="node-action-toolbar-remove"]').click()
    await expect(nodes).toHaveCount(1, { timeout: 5_000 })
    await page.screenshot({ path: `${SCREENSHOT_DIR}/03-node-removed.png`, fullPage: true })
  })

  test("edge toolbar: selecting a connector exposes a Remove button (previously keyboard-only)", async ({ page }) => {
    await page.goto("/")

    const hasComponents = await waitForComponentLibrary(page)
    test.skip(!hasComponents, "Skipped: Firestore has no seeded component data")

    const placed = await placeTwoComponents(page)
    test.skip(placed < 2, "Skipped: Need at least 2 components")

    await connectNodes(page, 0, 1)
    const edges = page.locator(".react-flow__edge")
    await expect(edges.first()).toBeVisible({ timeout: 5_000 })

    // Click the connector to select it — the Remove toolbar appears at the edge midpoint.
    await edges.first().click({ force: true })
    const edgeToolbar = page.locator('[data-testid="edge-action-toolbar"]')
    await expect(edgeToolbar).toBeVisible({ timeout: 5_000 })
    await expect(page.locator('[data-testid="edge-action-toolbar-remove"]')).toBeVisible()
    await page.screenshot({ path: `${SCREENSHOT_DIR}/04-edge-toolbar-visible.png`, fullPage: true })

    // Remove the connection via the button (no keyboard needed).
    await page.locator('[data-testid="edge-action-toolbar-remove"]').click()
    await expect(edges).toHaveCount(0, { timeout: 5_000 })
    await page.screenshot({ path: `${SCREENSHOT_DIR}/05-edge-removed.png`, fullPage: true })
  })
})
