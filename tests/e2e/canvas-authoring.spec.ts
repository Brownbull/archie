import { test, expect } from "@playwright/test"
import { waitForComponentLibrary, waitForBlueprints } from "./helpers/canvas-helpers"

const SCREENSHOT_DIR = "test-results/canvas-authoring"

test.describe("Canvas authoring fixes (P2)", () => {
  test("auto-fits the viewport when a blueprint is loaded", async ({ page }) => {
    await page.goto("/")
    const hasComponents = await waitForComponentLibrary(page)
    test.skip(!hasComponents, "Skipped: Firestore has no seeded component data")

    const hasBlueprints = await waitForBlueprints(page)
    test.skip(!hasBlueprints, "Skipped: no seeded blueprints")

    // Empty canvas → loading a blueprint runs immediately (no replace-confirm) and triggers
    // loadArchitecture, which bumps loadNonce and auto-fits the new graph.
    await page.locator('[data-testid="blueprint-load-button"]').first().click()

    const nodes = page.locator('[data-testid="archie-node"]')
    await expect(nodes.first()).toBeVisible({ timeout: 5_000 })
    // Let the fitView animation settle.
    await page.waitForTimeout(700)

    const canvas = page.locator('[data-testid="canvas-panel"]')
    const canvasBox = await canvas.boundingBox()
    if (!canvasBox) throw new Error("canvas-panel has no bounding box")

    // Auto-fit means the loaded nodes are framed INSIDE the viewport (not off-screen / minimap-only).
    const count = await nodes.count()
    expect(count).toBeGreaterThan(0)
    for (let i = 0; i < count; i++) {
      const box = await nodes.nth(i).boundingBox()
      if (!box) continue
      const cx = box.x + box.width / 2
      const cy = box.y + box.height / 2
      expect(cx).toBeGreaterThanOrEqual(canvasBox.x)
      expect(cx).toBeLessThanOrEqual(canvasBox.x + canvasBox.width)
      expect(cy).toBeGreaterThanOrEqual(canvasBox.y)
      expect(cy).toBeLessThanOrEqual(canvasBox.y + canvasBox.height)
    }

    await page.screenshot({ path: `${SCREENSHOT_DIR}/01-blueprint-autofit.png`, fullPage: true })
  })

  test("challenge budget label reads '$X of $Y/mo' (no ambiguous double-slash)", async ({ page }) => {
    await page.goto("/")
    const hasComponents = await waitForComponentLibrary(page)
    test.skip(!hasComponents, "Skipped: Firestore has no seeded component data")

    await page.locator('[data-testid="open-challenges"]').click()
    await expect(page.locator('[data-testid="challenge-selector"]')).toBeVisible()
    await page.locator('[data-testid="challenge-card-first-service"]').click()

    const label = page.locator('[data-testid="challenge-budget-label"]')
    await expect(label).toBeVisible()
    // New clear format: "$<spent> of $<cap>/mo" — not the old "$<spent>/$<cap>/mo".
    await expect(label).toHaveText(/^\$\d+ of \$\d+\/mo$/)

    await page.screenshot({ path: `${SCREENSHOT_DIR}/02-budget-label.png`, fullPage: true })
  })
})
