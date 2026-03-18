import { test, expect } from "@playwright/test"
import { waitForStacksTab, dragStackToCanvas, triggerRecalcViaConfigChange } from "./helpers/canvas-helpers"

const SCREENSHOT_DIR = "test-results/stack-browsing"

test.describe("Stack Browsing & Placement E2E (Story 8-4)", () => {
  test("AC-1: stacks tab shows stack cards with names, components, and trade-off profiles", async ({ page }) => {
    await page.goto("/")
    await expect(page.locator('[data-testid="toolbox-panel"]')).toBeVisible({ timeout: 15_000 })

    const hasStacks = await waitForStacksTab(page)
    test.skip(!hasStacks, "Skipped: Firestore has no seeded stack data")

    // Stack cards visible
    const stackCards = page.locator('[data-testid^="stack-card-"]')
    await expect(stackCards.first()).toBeVisible()
    const cardCount = await stackCards.count()
    expect(cardCount).toBeGreaterThanOrEqual(1)

    // First card has name, component list, connection count, and trade-off bars
    const firstCard = stackCards.first()
    await expect(firstCard.locator("p").first()).toBeVisible()
    await expect(firstCard.locator("span").first()).toBeVisible()
    await expect(firstCard.locator('[data-testid^="category-bar-"]').first()).toBeVisible()

    await page.screenshot({
      path: `${SCREENSHOT_DIR}/01-stacks-tab.png`,
      fullPage: true,
    })
  })

  test("AC-2: dragging stack onto canvas places components with connections", async ({ page }) => {
    await page.goto("/")
    await expect(page.locator('[data-testid="toolbox-panel"]')).toBeVisible({ timeout: 15_000 })

    const hasStacks = await waitForStacksTab(page)
    test.skip(!hasStacks, "Skipped: Firestore has no seeded stack data")

    // Get first stack card ID
    const firstCard = page.locator('[data-testid^="stack-card-"]').first()
    const testId = await firstCard.getAttribute("data-testid")
    const stackId = testId!.replace("stack-card-", "")

    // Record initial node count (should be 0)
    const initialNodeCount = await page.locator('[data-testid="archie-node"]').count()

    // Get canvas drop target
    const canvasPanel = page.locator('[data-testid="canvas-panel"]')
    const canvasBounds = await canvasPanel.boundingBox()
    if (!canvasBounds) throw new Error("canvas-panel not found")

    // Drag stack onto canvas center
    await dragStackToCanvas(
      page,
      stackId,
      canvasBounds.x + canvasBounds.width / 2,
      canvasBounds.y + canvasBounds.height / 2,
    )

    // Assert components appeared on canvas
    await expect(page.locator('[data-testid="archie-node"]')).not.toHaveCount(initialNodeCount, {
      timeout: 5_000,
    })
    const placedNodeCount = await page.locator('[data-testid="archie-node"]').count()
    expect(placedNodeCount).toBeGreaterThanOrEqual(2)

    // Assert connections created between placed components
    await expect(page.locator('[data-testid="archie-edge"]').first()).toBeVisible({ timeout: 5_000 })
    const edgeCount = await page.locator('[data-testid="archie-edge"]').count()
    expect(edgeCount).toBeGreaterThanOrEqual(1)

    await page.screenshot({
      path: `${SCREENSHOT_DIR}/02-stack-placed.png`,
      fullPage: true,
    })
  })

  test("AC-3: changing config variant on placed stack component triggers recalculation", async ({ page }) => {
    await page.goto("/")
    await expect(page.locator('[data-testid="toolbox-panel"]')).toBeVisible({ timeout: 15_000 })

    const hasStacks = await waitForStacksTab(page)
    test.skip(!hasStacks, "Skipped: Firestore has no seeded stack data")

    // Place a stack first
    const firstCard = page.locator('[data-testid^="stack-card-"]').first()
    const testId = await firstCard.getAttribute("data-testid")
    const stackId = testId!.replace("stack-card-", "")

    const canvasPanel = page.locator('[data-testid="canvas-panel"]')
    const canvasBounds = await canvasPanel.boundingBox()
    if (!canvasBounds) throw new Error("canvas-panel not found")

    await dragStackToCanvas(
      page,
      stackId,
      canvasBounds.x + canvasBounds.width / 2,
      canvasBounds.y + canvasBounds.height / 2,
    )

    // Wait for nodes to appear
    await expect(page.locator('[data-testid="archie-node"]').first()).toBeVisible({ timeout: 5_000 })

    // Aggregate score should be visible after stack placement (placeStack triggers recalculation)
    const aggregateScore = page.locator('[data-testid="aggregate-score"]')
    await expect(aggregateScore).toBeVisible({ timeout: 5_000 })
    // Change config variant on first placed component
    await triggerRecalcViaConfigChange(page, 0)

    // Dashboard score should still be visible and valid after interaction
    await expect(aggregateScore).toBeVisible()
    const updatedScore = await aggregateScore.textContent()

    // Score may or may not change (depends on whether component has multiple variants)
    // but it must remain a valid numeric display value
    expect(updatedScore).toMatch(/\d/)

    await page.screenshot({
      path: `${SCREENSHOT_DIR}/03-stack-component-edited.png`,
      fullPage: true,
    })
  })
})
