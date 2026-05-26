import { test, expect } from "@playwright/test"

const SCREENSHOT_DIR = "test-results/radial-menu-journey"

test.describe("Radial Menu E2E", () => {
  test("right-click opens radial menu, actions work, keyboard closes", async ({ page }) => {
    await page.goto("/")
    await page.waitForSelector('[data-testid="canvas-panel"]', { timeout: 15000 })
    await page.waitForTimeout(500)
    await page.screenshot({ path: `${SCREENSHOT_DIR}/01-canvas-loaded.png`, fullPage: true })

    // Drag a component onto the canvas
    const draggable = page.locator('[draggable="true"]').first()
    if (await draggable.count()) {
      const canvas = page.locator('[data-testid="canvas-panel"]')
      const canvasBox = await canvas.boundingBox()
      const dragBox = await draggable.boundingBox()
      if (canvasBox && dragBox) {
        await page.mouse.move(dragBox.x + dragBox.width / 2, dragBox.y + dragBox.height / 2)
        await page.mouse.down()
        await page.mouse.move(canvasBox.x + canvasBox.width / 2, canvasBox.y + canvasBox.height / 2, { steps: 10 })
        await page.mouse.up()
        await page.waitForTimeout(500)
      }
    }
    await page.screenshot({ path: `${SCREENSHOT_DIR}/02-component-placed.png`, fullPage: true })

    // Verify a node exists
    const node = page.locator('[data-testid^="rf__node-"]').first()
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
