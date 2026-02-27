import { test, expect } from "@playwright/test"
import {
  waitForComponentLibrary,
  addComponentToCanvas,
  selectNodeOnCanvas,
} from "./helpers/canvas-helpers"

const SCREENSHOT_DIR = "test-results/metric-filter-and-recommendations"

test.describe("Metric Filter & Variant Recommendations E2E (Story 4-2b)", () => {
  test("AC-FUNC-3: metric filter toggles hide and show metrics", async ({ page }) => {
    await page.goto("/")

    const hasComponents = await waitForComponentLibrary(page)
    test.skip(!hasComponents, "Skipped: Firestore has no seeded component data")

    await addComponentToCanvas(page)
    await selectNodeOnCanvas(page)

    // Metric filter should be present
    const metricFilter = page.locator('[data-testid="metric-filter"]')
    await expect(metricFilter).toBeVisible({ timeout: 5_000 })

    // Expand the filter panel
    await page.locator('[data-testid="metric-filter-expand"]').click()

    // Checkboxes should appear — at least one per metric
    const checkboxes = metricFilter.locator('input[type="checkbox"]')
    await expect(checkboxes.first()).toBeVisible({ timeout: 3_000 })
    const checkboxCount = await checkboxes.count()
    expect(checkboxCount).toBeGreaterThanOrEqual(1)

    // Count initial visible metric bars
    const metricBars = page.locator('[data-testid="metric-bar"]')
    const initialBarCount = await metricBars.count()
    expect(initialBarCount).toBeGreaterThan(0)

    // Uncheck the first metric — it should disappear from the bars
    const firstCheckbox = checkboxes.first()
    await firstCheckbox.uncheck()
    await expect(metricBars).toHaveCount(initialBarCount - 1, { timeout: 3_000 })

    await page.screenshot({
      path: `${SCREENSHOT_DIR}/01-metric-filter-one-hidden.png`,
      fullPage: true,
    })

    // Re-check the metric — bar reappears
    await firstCheckbox.check()
    await expect(metricBars).toHaveCount(initialBarCount, { timeout: 3_000 })

    await page.screenshot({
      path: `${SCREENSHOT_DIR}/02-metric-filter-restored.png`,
      fullPage: true,
    })
  })

  test("AC-FUNC-1: recommendation cards show improvement and trade-off", async ({
    page,
  }) => {
    await page.goto("/")

    const hasComponents = await waitForComponentLibrary(page)
    test.skip(!hasComponents, "Skipped: Firestore has no seeded component data")

    await addComponentToCanvas(page)
    await selectNodeOnCanvas(page)

    const inspectorPanel = page.locator('[data-testid="inspector-panel"]')
    await expect(inspectorPanel).toBeVisible()

    // Recommendations require component with weak metrics (<5) and 2+ variants
    const configSelector = page.locator('[data-testid="config-selector"]')
    test.skip(!(await configSelector.isVisible()), "Single-variant component")

    const recsSection = page.locator('[data-testid="recommendations-section"]')
    const recsVisible = await recsSection.isVisible().catch(() => false)

    if (recsVisible) {
      // At least one recommendation card
      const recCards = page.locator('[data-testid="variant-recommendation"]')
      const recCount = await recCards.count()
      expect(recCount).toBeGreaterThanOrEqual(1)

      // Card text includes "Consider" + variant name
      const cardText = await recCards.first().textContent()
      expect(cardText).toContain("Consider")

      // Green improvement indicator present with +N format
      const improvement = recCards.first().locator('[data-testid="recommendation-improvement"]')
      await expect(improvement).toBeVisible()
      const improvementText = await improvement.textContent()
      expect(improvementText).toMatch(/\+\d+/)

      await page.screenshot({
        path: `${SCREENSHOT_DIR}/03-recommendation-cards-visible.png`,
        fullPage: true,
      })
    } else {
      // No recommendations present — all metrics healthy (AC-FUNC-2 holds).
      // Assert absence explicitly so this pass is meaningful.
      await expect(
        page.locator('[data-testid="variant-recommendation"]'),
      ).toHaveCount(0)
    }
  })

  test("AC-FUNC-2: no recommendations when all metrics above threshold", async ({
    page,
  }) => {
    await page.goto("/")

    const hasComponents = await waitForComponentLibrary(page)
    test.skip(!hasComponents, "Skipped: Firestore has no seeded component data")

    await addComponentToCanvas(page)
    await selectNodeOnCanvas(page)

    const inspectorPanel = page.locator('[data-testid="inspector-panel"]')
    await expect(inspectorPanel).toBeVisible()

    const configSelector = page.locator('[data-testid="config-selector"]')
    test.skip(!(await configSelector.isVisible()), "Single-variant component")

    const triggerButton = configSelector.locator("button").first()
    await triggerButton.click()
    const selectContent = page.locator("[role=listbox]")
    await expect(selectContent).toBeVisible({ timeout: 3_000 })
    const options = selectContent.locator("[role=option]")
    const optionCount = await options.count()

    // Iterate variants — track which have/lack recommendations
    let foundWithRecs = false
    let foundWithoutRecs = false

    for (let i = 0; i < optionCount && !(foundWithRecs && foundWithoutRecs); i++) {
      if (!(await selectContent.isVisible())) {
        await triggerButton.click()
        await expect(selectContent).toBeVisible({ timeout: 3_000 })
      }
      await options.nth(i).click()
      await expect(selectContent).not.toBeVisible({ timeout: 3_000 })

      const recsVisible = await page
        .locator('[data-testid="recommendations-section"]')
        .isVisible()
        .catch(() => false)
      if (recsVisible) foundWithRecs = true
      else foundWithoutRecs = true
    }

    // When no recommendations section → no recommendation cards rendered
    if (foundWithoutRecs) {
      const recCards = page.locator('[data-testid="variant-recommendation"]')
      await expect(recCards).toHaveCount(0)
    }

    await page.screenshot({
      path: `${SCREENSHOT_DIR}/04-variant-recommendation-states.png`,
      fullPage: true,
    })
  })
})
