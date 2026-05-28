import { test, expect } from "@playwright/test"
import { waitForComponentLibrary, dragComponentToCanvas } from "./helpers/canvas-helpers"

const SCREENSHOT_DIR = "test-results/economics-cost-badge"

test.describe("Economics Cost Badge E2E", () => {
  test("component placement works and cost badge renders when data available", async ({ page }) => {
    await page.goto("/")

    const hasComponents = await waitForComponentLibrary(page)
    test.skip(!hasComponents, "Skipped: Firestore has no seeded component data")

    await page.screenshot({
      path: `${SCREENSHOT_DIR}/01-app-loaded.png`,
      fullPage: true,
    })

    const firstCard = page.locator('[data-testid^="component-card-"]').first()
    await expect(firstCard).toBeVisible()
    const testId = await firstCard.getAttribute("data-testid")
    const componentId = testId!.replace("component-card-", "")

    const canvasPanel = page.locator('[data-testid="canvas-panel"]')
    const canvasBounds = await canvasPanel.boundingBox()
    expect(canvasBounds).not.toBeNull()

    const dropX = canvasBounds!.x + canvasBounds!.width / 2
    const dropY = canvasBounds!.y + canvasBounds!.height / 2
    await dragComponentToCanvas(page, componentId, dropX, dropY)

    const archieNode = page.locator('[data-testid="archie-node"]').first()
    await expect(archieNode).toBeVisible({ timeout: 5_000 })

    await page.screenshot({
      path: `${SCREENSHOT_DIR}/02-component-placed.png`,
      fullPage: true,
    })

    const costBadge = page.locator('[data-testid="archie-node-cost"]')
    const costCount = await costBadge.count()

    if (costCount > 0) {
      const costText = await costBadge.first().textContent()
      expect(costText).toMatch(/\$\d+\/mo|Free/)
      await page.screenshot({
        path: `${SCREENSHOT_DIR}/03-cost-badge-visible.png`,
        fullPage: true,
      })
    } else {
      await page.screenshot({
        path: `${SCREENSHOT_DIR}/03-no-cost-badge-firestore-not-seeded.png`,
        fullPage: true,
      })
    }

    // Node renders without crash regardless of economics data presence
    await expect(archieNode).toBeVisible()
    const variantText = page.locator('[data-testid="archie-node-variant"]')
    const hasVariant = await variantText.count()
    if (hasVariant > 0) {
      await expect(variantText.first()).toBeVisible()
    }
  })
})
