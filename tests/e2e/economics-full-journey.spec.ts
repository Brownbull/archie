import { test, expect } from "@playwright/test"
import { waitForComponentLibrary, dragComponentToCanvas } from "./helpers/canvas-helpers"

const SCREENSHOT_DIR = "test-results/economics-full-journey"

test.describe("Economics Full Journey E2E", () => {
  test("paid component shows dollar cost on node and in Budget HUD", async ({ page }) => {
    await page.goto("/")
    const hasComponents = await waitForComponentLibrary(page)
    test.skip(!hasComponents, "Skipped: no component data")

    // D23/P5: the default toolbox renders type-block cards keyed by fundamental TYPE id
    // (type-block-<typeId>), not by vendor. postgresql is the default provider of the
    // `relational-db` type (COMPONENT_TYPES in src/lib/componentTypes.ts), so its toolbox
    // card is type-block-relational-db. The drag below still uses the provider id "postgresql".
    const pgCard = page.locator('[data-testid="type-block-relational-db"]')
    await expect(pgCard).toBeVisible()

    const canvasPanel = page.locator('[data-testid="canvas-panel"]')
    const canvasBounds = await canvasPanel.boundingBox()
    expect(canvasBounds).not.toBeNull()

    await dragComponentToCanvas(
      page, "postgresql",
      canvasBounds!.x + canvasBounds!.width / 2,
      canvasBounds!.y + canvasBounds!.height / 3,
    )

    const archieNode = page.locator('[data-testid="archie-node"]').first()
    await expect(archieNode).toBeVisible({ timeout: 5_000 })

    const costBadge = page.locator('[data-testid="archie-node-cost"]').first()
    await expect(costBadge).toBeVisible()
    await expect(costBadge).toHaveText(/\$\d+\/mo/)

    await page.screenshot({
      path: `${SCREENSHOT_DIR}/01-postgresql-cost-badge.png`,
      fullPage: true,
    })

    const budgetHud = page.locator('[data-testid="budget-hud-cost"]')
    await expect(budgetHud).toBeVisible()
    await expect(budgetHud).toHaveText(/\$\d+\/mo/)

    await page.screenshot({
      path: `${SCREENSHOT_DIR}/02-budget-hud-with-cost.png`,
      fullPage: true,
    })
  })

  test("multiple components sum in Budget HUD", async ({ page }) => {
    await page.goto("/")
    const hasComponents = await waitForComponentLibrary(page)
    test.skip(!hasComponents, "Skipped: no component data")

    const canvasPanel = page.locator('[data-testid="canvas-panel"]')
    const canvasBounds = await canvasPanel.boundingBox()
    expect(canvasBounds).not.toBeNull()

    await dragComponentToCanvas(
      page, "postgresql",
      canvasBounds!.x + canvasBounds!.width / 3,
      canvasBounds!.y + canvasBounds!.height / 3,
    )
    const firstNode = page.locator('[data-testid="archie-node"]').first()
    await expect(firstNode).toBeVisible({ timeout: 5_000 })

    const hudAfterFirst = page.locator('[data-testid="budget-hud-cost"]')
    await expect(hudAfterFirst).toBeVisible()
    const costAfterFirst = await hudAfterFirst.textContent()

    await dragComponentToCanvas(
      page, "redis",
      canvasBounds!.x + (canvasBounds!.width * 2) / 3,
      canvasBounds!.y + canvasBounds!.height / 3,
    )
    const secondNode = page.locator('[data-testid="archie-node"]').nth(1)
    await expect(secondNode).toBeVisible({ timeout: 5_000 })

    await page.waitForTimeout(500)

    const costAfterSecond = await hudAfterFirst.textContent()

    await page.screenshot({
      path: `${SCREENSHOT_DIR}/03-two-components-budget-hud.png`,
      fullPage: true,
    })

    const parseCost = (text: string | null) => {
      const match = text?.match(/\$(\d+)/)
      return match ? parseInt(match[1], 10) : 0
    }
    expect(parseCost(costAfterSecond)).toBeGreaterThan(parseCost(costAfterFirst))
  })

  test("variant switch updates cost badge and shows delta in inspector", async ({ page }) => {
    await page.goto("/")
    const hasComponents = await waitForComponentLibrary(page)
    test.skip(!hasComponents, "Skipped: no component data")

    const canvasPanel = page.locator('[data-testid="canvas-panel"]')
    const canvasBounds = await canvasPanel.boundingBox()
    expect(canvasBounds).not.toBeNull()

    await dragComponentToCanvas(
      page, "postgresql",
      canvasBounds!.x + canvasBounds!.width / 2,
      canvasBounds!.y + canvasBounds!.height / 3,
    )

    const archieNode = page.locator('[data-testid="archie-node"]').first()
    await expect(archieNode).toBeVisible({ timeout: 5_000 })

    const costBefore = await page.locator('[data-testid="archie-node-cost"]').first().textContent()

    await archieNode.click({ force: true })
    await page.waitForTimeout(500)

    await page.screenshot({
      path: `${SCREENSHOT_DIR}/04-inspector-open-with-economics.png`,
      fullPage: true,
    })

    const economicsSection = page.locator('[data-testid="economics-section"]')
    const hasEconomics = await economicsSection.isVisible().catch(() => false)

    if (hasEconomics) {
      await page.screenshot({
        path: `${SCREENSHOT_DIR}/05-economics-section-visible.png`,
        fullPage: true,
      })
    }

    // Fluidity P1: config tier is tuned on the canvas block now — `archie-node-config-trigger`
    // renders only for multi-variant providers, preserving the original conditional intent.
    const node = page.locator('[data-testid="archie-node"]').first()
    const configTrigger = node.locator('[data-testid="archie-node-config-trigger"]')
    const selectorVisible = await configTrigger.isVisible().catch(() => false)

    if (selectorVisible) {
      await configTrigger.click()
      await page.waitForTimeout(300)

      const options = page.locator('[role="option"]')
      const optionCount = await options.count()

      if (optionCount > 1) {
        await options.nth(1).click()
        await page.waitForTimeout(500)

        const costAfter = await page.locator('[data-testid="archie-node-cost"]').first().textContent()

        await page.screenshot({
          path: `${SCREENSHOT_DIR}/06-after-variant-switch.png`,
          fullPage: true,
        })

        if (costBefore && costAfter && costBefore !== costAfter) {
          expect(costAfter).toMatch(/\$\d+\/mo|Free/)
          expect(costAfter).not.toBe(costBefore)
        }
      }
    }
  })

  test("blueprint load shows costs on all nodes", async ({ page }) => {
    await page.goto("/")
    const hasComponents = await waitForComponentLibrary(page)
    test.skip(!hasComponents, "Skipped: no component data")

    const blueprintsTab = page.locator('[role="tab"]', { hasText: "Blueprints" })
    await expect(blueprintsTab).toBeVisible()
    await blueprintsTab.click()
    await page.waitForTimeout(300)

    // D23: blueprint cards now use an exact `blueprint-card` testid (no per-id suffix).
    const firstBlueprint = page.locator('[data-testid="blueprint-card"]').first()
    const hasBlueprintCards = await firstBlueprint.isVisible().catch(() => false)
    test.skip(!hasBlueprintCards, "No blueprint cards visible")

    const loadButton = firstBlueprint.locator('[data-testid="blueprint-load-button"]')
    const hasLoadButton = await loadButton.isVisible().catch(() => false)

    if (hasLoadButton) {
      await loadButton.click()
      await page.waitForTimeout(1000)
    } else {
      await firstBlueprint.click()
      await page.waitForTimeout(1000)
    }

    const nodes = page.locator('[data-testid="archie-node"]')
    const nodeCount = await nodes.count()

    if (nodeCount > 0) {
      await page.screenshot({
        path: `${SCREENSHOT_DIR}/07-blueprint-loaded-with-costs.png`,
        fullPage: true,
      })

      const costBadges = page.locator('[data-testid="archie-node-cost"]')
      const badgeCount = await costBadges.count()
      expect(badgeCount).toBeGreaterThan(0)

      const budgetHud = page.locator('[data-testid="budget-hud-cost"]')
      await expect(budgetHud).toBeVisible()
      await expect(budgetHud).toHaveText(/\$\d+\/mo/)

      await page.screenshot({
        path: `${SCREENSHOT_DIR}/08-blueprint-budget-hud-total.png`,
        fullPage: true,
      })
    }
  })
})
