import { test, expect } from "@playwright/test"
import { waitForComponentLibrary, dragComponentToCanvas } from "./helpers/canvas-helpers"

const SCREENSHOT_DIR = "test-results/radial-menu-journey"

test.describe("Radial Menu E2E", () => {
  test("right-click opens radial menu, actions work, keyboard closes", async ({ page }) => {
    await page.goto("/")
    await page.waitForSelector('[data-testid="canvas-panel"]', { timeout: 15000 })
    const hasComponents = await waitForComponentLibrary(page)
    test.skip(!hasComponents, "Skipped: Firestore has no seeded component data")
    await page.screenshot({ path: `${SCREENSHOT_DIR}/01-canvas-loaded.png`, fullPage: true })

    // Place a node via the HTML5 drop path (React Flow nodes are placed by the drop handler reading
    // application/archie-component — a native mouse drag from the toolbox does NOT create a node).
    const canvasBox = await page.locator('[data-testid="canvas-panel"]').boundingBox()
    await dragComponentToCanvas(page, "node-express", canvasBox!.x + canvasBox!.width / 2, canvasBox!.y + canvasBox!.height / 2)
    await page.screenshot({ path: `${SCREENSHOT_DIR}/02-component-placed.png`, fullPage: true })

    // Verify the node exists (the app renders archie-node, not React Flow's internal rf__node-).
    const node = page.locator('[data-testid="archie-node"]').first()
    await expect(node).toBeVisible({ timeout: 5000 })

    // Right-click to open radial menu
    await node.click({ button: "right" })
    await page.waitForTimeout(400)
    await page.screenshot({ path: `${SCREENSHOT_DIR}/03-radial-menu-open.png`, fullPage: true })

    const radialMenu = page.locator('[data-testid="radial-menu"]')
    await expect(radialMenu).toBeVisible()

    // Verify all 6 items present
    for (const item of ["inspect", "duplicate", "swap", "trade-offs", "connect", "delete"]) {
      await expect(page.locator(`[data-testid="radial-item-${item}"]`)).toBeVisible()
    }

    // Connect button should be disabled
    await expect(page.locator('[data-testid="radial-item-connect"]')).toBeDisabled()

    // Test Inspect — selects node and closes menu
    await page.locator('[data-testid="radial-item-inspect"]').click()
    await page.waitForTimeout(300)
    await expect(radialMenu).not.toBeVisible()
    await page.screenshot({ path: `${SCREENSHOT_DIR}/04-after-inspect.png`, fullPage: true })

    // Re-open for duplicate test
    await node.click({ button: "right" })
    await page.waitForTimeout(400)
    await page.locator('[data-testid="radial-item-duplicate"]').click()
    await page.waitForTimeout(500)
    const nodeCount = await page.locator('[data-testid^="rf__node-"]').count()
    expect(nodeCount).toBe(2)
    await page.screenshot({ path: `${SCREENSHOT_DIR}/05-after-duplicate.png`, fullPage: true })

    // Re-open for Escape test
    const firstNode = page.locator('[data-testid^="rf__node-"]').first()
    await firstNode.click({ button: "right" })
    await page.waitForTimeout(400)
    await expect(radialMenu).toBeVisible()
    await page.keyboard.press("Escape")
    await page.waitForTimeout(300)
    await expect(radialMenu).not.toBeVisible()
    await page.screenshot({ path: `${SCREENSHOT_DIR}/06-after-escape.png`, fullPage: true })

    // Re-open for delete test
    await firstNode.click({ button: "right" })
    await page.waitForTimeout(400)
    await page.screenshot({ path: `${SCREENSHOT_DIR}/07-menu-before-delete.png`, fullPage: true })
    await page.locator('[data-testid="radial-item-delete"]').click()
    await page.waitForTimeout(300)
    const nodesAfterDelete = await page.locator('[data-testid^="rf__node-"]').count()
    expect(nodesAfterDelete).toBe(1)
    await page.screenshot({ path: `${SCREENSHOT_DIR}/08-after-delete.png`, fullPage: true })
  })
})
