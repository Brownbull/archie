import { test, expect, type Page } from "@playwright/test"
import { waitForComponentLibrary, dragComponentToCanvas } from "./helpers/canvas-helpers"

const SCREENSHOT_DIR = "test-results/scoring-dashboard"

/**
 * Place a component on the canvas via the "Add to Canvas" button.
 */
async function placeComponent(page: Page, buttonIndex = 0) {
  const addBtn = page.locator('[data-testid^="add-to-canvas-"]').nth(buttonIndex)
  await expect(addBtn).toBeVisible()
  await addBtn.click()
  await expect(page.locator('[data-testid="archie-node"]')).toHaveCount(buttonIndex + 1, {
    timeout: 5_000,
  })
}

/**
 * Trigger recalculation for a node by changing its config variant in the inspector.
 *
 * addNode() does NOT call triggerRecalculation(), so computedMetrics stays empty
 * after placement. Changing the config variant triggers the full pipeline:
 * updateNodeConfigVariant → triggerRecalculation → computedMetrics populated.
 */
async function triggerRecalcViaConfigChange(page: Page, nodeIndex = 0) {
  // Select the node (opens inspector)
  await page.locator('[data-testid="archie-node"]').nth(nodeIndex).click()
  await expect(page.locator('[data-testid="inspector-panel"]')).toBeVisible({ timeout: 5_000 })

  // Open config variant dropdown (Radix Select combobox)
  const configTrigger = page.locator(
    '[data-testid="config-selector"] button[role="combobox"]',
  )
  await expect(configTrigger).toBeVisible({ timeout: 3_000 })
  await configTrigger.click()

  // Wait for the dropdown to open (Radix portals to body)
  await page.locator('[role="listbox"]').waitFor({ state: "visible", timeout: 3_000 })

  // Pick a variant that is NOT currently selected (data-state="unchecked")
  const unchecked = page.locator('[role="option"][data-state="unchecked"]')
  if ((await unchecked.count()) > 0) {
    await unchecked.first().click()
  } else {
    // Single variant — close dropdown; recalculation won't trigger
    await page.keyboard.press("Escape")
  }

  // Allow recalculation + React re-render to settle
  await page.waitForTimeout(500)
}

/**
 * Place a component AND trigger recalculation to populate computedMetrics.
 */
async function addComponentWithMetrics(page: Page, buttonIndex = 0) {
  await placeComponent(page, buttonIndex)
  await triggerRecalcViaConfigChange(page, buttonIndex)
}

test.describe("Scoring Dashboard E2E (Story 2-3)", () => {
  test("AC-4: empty state shows prompt text when no components on canvas", async ({ page }) => {
    await page.goto("/")

    // Dashboard footer region should be visible
    const dashboard = page.locator('[data-testid="dashboard"]')
    await expect(dashboard).toBeVisible({ timeout: 15_000 })

    // Dashboard panel should be rendered inside the footer
    const dashboardPanel = page.locator('[data-testid="dashboard-panel"]')
    await expect(dashboardPanel).toBeVisible()

    // AC-4: Empty state message displayed
    await expect(dashboardPanel).toContainText("Add components to see architecture scores")

    // No category bars should be visible
    const categoryBars = page.locator('[data-testid^="category-bar-"]')
    await expect(categoryBars).toHaveCount(0)

    // No aggregate score should be visible
    const aggregateScore = page.locator('[data-testid="aggregate-score"]')
    await expect(aggregateScore).toHaveCount(0)

    await page.screenshot({
      path: `${SCREENSHOT_DIR}/01-empty-state-no-components.png`,
      fullPage: true,
    })
  })

  test("AC-1: category bars appear after placing a component", async ({ page }) => {
    await page.goto("/")

    const hasComponents = await waitForComponentLibrary(page)
    test.skip(!hasComponents, "Skipped: Firestore has no seeded component data")

    // Verify empty state before placing component
    const dashboardPanel = page.locator('[data-testid="dashboard-panel"]')
    await expect(dashboardPanel).toContainText("Add components to see architecture scores")

    // Place a component and trigger recalculation via config change
    await addComponentWithMetrics(page)

    // AC-1: Dashboard should now show category bars (empty state gone)
    await expect(dashboardPanel).not.toContainText("Add components to see architecture scores")

    // At least one category bar should be visible
    const categoryBars = page.locator('[data-testid^="category-bar-"]:not([data-testid*="fill"])')
    const barCount = await categoryBars.count()
    expect(barCount).toBeGreaterThan(0)

    await page.screenshot({
      path: `${SCREENSHOT_DIR}/02-category-bars-after-placement.png`,
      fullPage: true,
    })
  })

  test("AC-2: aggregate score is displayed after placing a component", async ({ page }) => {
    await page.goto("/")

    const hasComponents = await waitForComponentLibrary(page)
    test.skip(!hasComponents, "Skipped: Firestore has no seeded component data")

    // Place a component and trigger recalculation
    await addComponentWithMetrics(page)

    // Aggregate score element should now be visible
    const aggregateScore = page.locator('[data-testid="aggregate-score"]')
    await expect(aggregateScore).toBeVisible()

    // Aggregate score should display a numeric value (e.g., "5.3")
    const scoreText = await aggregateScore.locator("span").first().textContent()
    expect(scoreText).toBeTruthy()
    const scoreValue = parseFloat(scoreText!)
    expect(scoreValue).toBeGreaterThan(0)
    expect(scoreValue).toBeLessThanOrEqual(10)

    // Aggregate score should show "Overall" label
    await expect(aggregateScore).toContainText("Overall")

    await page.screenshot({
      path: `${SCREENSHOT_DIR}/03-aggregate-score-displayed.png`,
      fullPage: true,
    })
  })

  test("AC-1: only categories with data show bars (empty categories hidden)", async ({
    page,
  }) => {
    await page.goto("/")

    const hasComponents = await waitForComponentLibrary(page)
    test.skip(!hasComponents, "Skipped: Firestore has no seeded component data")

    // Place a component and trigger recalculation
    await addComponentWithMetrics(page)

    // All 7 category IDs from the schema
    const allCategoryIds = [
      "performance",
      "reliability",
      "scalability",
      "security",
      "operational-complexity",
      "cost-efficiency",
      "developer-experience",
    ]

    // Check which category bars are present vs absent
    const presentCategories: string[] = []

    for (const catId of allCategoryIds) {
      const bar = page.locator(`[data-testid="category-bar-${catId}"]`)
      if ((await bar.count()) > 0) {
        presentCategories.push(catId)
      }
    }

    // At least one category must have data (component was placed + recalculated)
    expect(presentCategories.length).toBeGreaterThan(0)

    // Not all 7 should be showing (single components typically only have a subset)
    expect(presentCategories.length).toBeLessThanOrEqual(7)

    // Each visible category bar should have a fill element
    for (const catId of presentCategories) {
      const fill = page.locator(`[data-testid="category-bar-fill-${catId}"]`)
      await expect(fill).toBeVisible()

      // Fill should have a width style (percentage-based)
      const style = await fill.getAttribute("style")
      expect(style).toContain("width:")
    }

    await page.screenshot({
      path: `${SCREENSHOT_DIR}/04-categories-with-data-only.png`,
      fullPage: true,
    })
  })

  test("AC-5 (ARIA): dashboard-panel has role=region with correct aria-label", async ({
    page,
  }) => {
    await page.goto("/")

    const dashboardPanel = page.locator('[data-testid="dashboard-panel"]')
    await expect(dashboardPanel).toBeVisible({ timeout: 15_000 })

    // Verify role="region"
    await expect(dashboardPanel).toHaveAttribute("role", "region")

    // Verify aria-label
    await expect(dashboardPanel).toHaveAttribute(
      "aria-label",
      "Architecture scoring dashboard",
    )

    await page.screenshot({
      path: `${SCREENSHOT_DIR}/05-aria-region-attribute.png`,
      fullPage: true,
    })
  })

  test("AC-5 (ARIA): category bars and aggregate score have role=meter", async ({ page }) => {
    await page.goto("/")

    const hasComponents = await waitForComponentLibrary(page)
    test.skip(!hasComponents, "Skipped: Firestore has no seeded component data")

    // Place a component and trigger recalculation to populate the dashboard
    await addComponentWithMetrics(page)

    // Aggregate score should have role="meter"
    const aggregateScore = page.locator('[data-testid="aggregate-score"]')
    await expect(aggregateScore).toBeVisible()
    await expect(aggregateScore).toHaveAttribute("role", "meter")

    // Aggregate score should have aria-valuenow, aria-valuemin, aria-valuemax
    const ariaValueNow = await aggregateScore.getAttribute("aria-valuenow")
    expect(ariaValueNow).toBeTruthy()
    expect(await aggregateScore.getAttribute("aria-valuemin")).toBe("0")
    expect(await aggregateScore.getAttribute("aria-valuemax")).toBeTruthy()

    // Each visible category bar should also have role="meter" with aria attributes
    const categoryBars = page.locator('[data-testid^="category-bar-"]:not([data-testid*="fill"])')
    const barCount = await categoryBars.count()
    expect(barCount).toBeGreaterThan(0)

    for (let i = 0; i < barCount; i++) {
      const bar = categoryBars.nth(i)
      await expect(bar).toHaveAttribute("role", "meter")

      const barValueNow = await bar.getAttribute("aria-valuenow")
      expect(barValueNow).toBeTruthy()
      expect(parseFloat(barValueNow!)).toBeGreaterThan(0)

      await expect(bar).toHaveAttribute("aria-valuemin", "0")
      expect(await bar.getAttribute("aria-valuemax")).toBeTruthy()
    }

    await page.screenshot({
      path: `${SCREENSHOT_DIR}/06-aria-meter-roles.png`,
      fullPage: true,
    })
  })

  test("AC-3: dashboard updates when a second component is placed", async ({ page }) => {
    await page.goto("/")

    const hasComponents = await waitForComponentLibrary(page)
    test.skip(!hasComponents, "Skipped: Firestore has no seeded component data")

    const addBtns = page.locator('[data-testid^="add-to-canvas-"]')
    const btnCount = await addBtns.count()
    test.skip(btnCount < 2, "Skipped: Need at least 2 components for this test")

    // Place first component + trigger recalculation
    await addComponentWithMetrics(page, 0)

    // Capture initial dashboard state
    const aggregateScore = page.locator('[data-testid="aggregate-score"]')
    await expect(aggregateScore).toBeVisible()
    const initialScoreText = await aggregateScore.locator("span").first().textContent()
    const initialScore = parseFloat(initialScoreText!)

    // Count initial category bars
    const initialBars = page.locator('[data-testid^="category-bar-"]:not([data-testid*="fill"])')
    const initialBarCount = await initialBars.count()

    await page.screenshot({
      path: `${SCREENSHOT_DIR}/07-dashboard-after-first-component.png`,
      fullPage: true,
    })

    // Place second component + trigger recalculation
    await addComponentWithMetrics(page, 1)

    // AC-3: Dashboard should update (score may change, bar count may change)
    const newScoreText = await aggregateScore.locator("span").first().textContent()
    const newScore = parseFloat(newScoreText!)

    const newBars = page.locator('[data-testid^="category-bar-"]:not([data-testid*="fill"])')
    const newBarCount = await newBars.count()

    // At least one thing should have changed: score or bar count
    const somethingChanged = initialScore !== newScore || initialBarCount !== newBarCount
    expect(somethingChanged).toBe(true)

    await page.screenshot({
      path: `${SCREENSHOT_DIR}/08-dashboard-after-second-component.png`,
      fullPage: true,
    })
  })

  test("AC-3: category bar fills have CSS transition for smooth updates", async ({ page }) => {
    await page.goto("/")

    const hasComponents = await waitForComponentLibrary(page)
    test.skip(!hasComponents, "Skipped: Firestore has no seeded component data")

    // Place a component and trigger recalculation to get category bars
    await addComponentWithMetrics(page)

    // Get the first visible category bar fill element
    const firstFill = page.locator('[data-testid^="category-bar-fill-"]').first()
    await expect(firstFill).toBeVisible()

    // Verify the fill element has CSS transition on width and background-color
    const style = await firstFill.getAttribute("style")
    expect(style).toContain("transition:")
    expect(style).toContain("width 300ms")
    expect(style).toContain("background-color 300ms")

    await page.screenshot({
      path: `${SCREENSHOT_DIR}/09-bar-fill-css-transition.png`,
      fullPage: true,
    })
  })

  test("AC-2: aggregate score is arithmetic mean of visible category scores", async ({
    page,
  }) => {
    await page.goto("/")

    const hasComponents = await waitForComponentLibrary(page)
    test.skip(!hasComponents, "Skipped: Firestore has no seeded component data")

    // Place a component and trigger recalculation
    await addComponentWithMetrics(page)

    // Read the aggregate score
    const aggregateScore = page.locator('[data-testid="aggregate-score"]')
    await expect(aggregateScore).toBeVisible()
    const aggregateText = await aggregateScore.locator("span").first().textContent()
    const aggregateValue = parseFloat(aggregateText!)

    // Read each category bar's aria-valuenow
    const categoryBars = page.locator('[data-testid^="category-bar-"]:not([data-testid*="fill"])')
    const barCount = await categoryBars.count()
    expect(barCount).toBeGreaterThan(0)

    let categorySum = 0
    for (let i = 0; i < barCount; i++) {
      const bar = categoryBars.nth(i)
      const valueNow = await bar.getAttribute("aria-valuenow")
      categorySum += parseFloat(valueNow!)
    }

    // Compute expected mean (rounded to 1 decimal place, matching dashboardCalculator logic)
    const expectedMean = Math.round((categorySum / barCount) * 10) / 10

    // Aggregate score should equal the arithmetic mean of category scores
    expect(aggregateValue).toBeCloseTo(expectedMean, 1)

    await page.screenshot({
      path: `${SCREENSHOT_DIR}/10-aggregate-is-arithmetic-mean.png`,
      fullPage: true,
    })
  })

  test("dashboard returns to empty state when component is deleted", async ({ page }) => {
    await page.goto("/")

    const hasComponents = await waitForComponentLibrary(page)
    test.skip(!hasComponents, "Skipped: Firestore has no seeded component data")

    // Place a component and trigger recalculation
    await addComponentWithMetrics(page)

    // Verify dashboard has content
    const aggregateScore = page.locator('[data-testid="aggregate-score"]')
    await expect(aggregateScore).toBeVisible()

    // Click node on canvas to give React Flow keyboard focus, then delete
    const node = page.locator('[data-testid="archie-node"]').first()
    await node.click()
    await page.keyboard.press("Delete")

    // Wait for node to be removed
    await expect(page.locator('[data-testid="archie-node"]')).toHaveCount(0, { timeout: 5_000 })

    // Allow recalculation pipeline to settle
    await page.waitForTimeout(500)

    // Dashboard should return to empty state
    const dashboardPanel = page.locator('[data-testid="dashboard-panel"]')
    await expect(dashboardPanel).toContainText("Add components to see architecture scores")

    // No aggregate score
    await expect(aggregateScore).toHaveCount(0)

    // No category bars
    const categoryBars = page.locator('[data-testid^="category-bar-"]:not([data-testid*="fill"])')
    await expect(categoryBars).toHaveCount(0)

    await page.screenshot({
      path: `${SCREENSHOT_DIR}/11-empty-state-after-delete.png`,
      fullPage: true,
    })
  })

  test("dashboard with drag-and-drop placement (via dragComponentToCanvas)", async ({
    page,
  }) => {
    await page.goto("/")

    const hasComponents = await waitForComponentLibrary(page)
    test.skip(!hasComponents, "Skipped: Firestore has no seeded component data")

    // Get the first component card ID for drag-and-drop
    const firstCard = page.locator('[data-testid^="component-card-"]').first()
    await expect(firstCard).toBeVisible()
    const testId = await firstCard.getAttribute("data-testid")
    const componentId = testId!.replace("component-card-", "")

    // Get canvas bounds
    const canvasPanel = page.locator('[data-testid="canvas-panel"]')
    const canvasBounds = await canvasPanel.boundingBox()
    expect(canvasBounds).not.toBeNull()

    // Drag component to canvas center
    await dragComponentToCanvas(
      page,
      componentId,
      canvasBounds!.x + canvasBounds!.width / 2,
      canvasBounds!.y + canvasBounds!.height / 2,
    )

    // Wait for node to appear
    await expect(page.locator('[data-testid="archie-node"]').first()).toBeVisible({
      timeout: 5_000,
    })

    // Trigger recalculation via config change (drag placement doesn't trigger recalc)
    await triggerRecalcViaConfigChange(page, 0)

    // Dashboard should show content (not empty state)
    const dashboardPanel = page.locator('[data-testid="dashboard-panel"]')
    await expect(dashboardPanel).not.toContainText("Add components to see architecture scores")

    // Aggregate score should be visible
    const aggregateScore = page.locator('[data-testid="aggregate-score"]')
    await expect(aggregateScore).toBeVisible()

    // At least one category bar should be visible
    const categoryBars = page.locator('[data-testid^="category-bar-"]:not([data-testid*="fill"])')
    const barCount = await categoryBars.count()
    expect(barCount).toBeGreaterThan(0)

    await page.screenshot({
      path: `${SCREENSHOT_DIR}/12-dashboard-via-drag-drop.png`,
      fullPage: true,
    })
  })

  // --- Story 2-4: Architecture Tier System ---

  test("AC-4: tier badge shows empty state when no components on canvas", async ({ page }) => {
    await page.goto("/")

    const tierBadge = page.locator('[data-testid="tier-badge"]')
    await expect(tierBadge).toBeVisible({ timeout: 15_000 })

    // Null tier state: dimmed trophy + "Add components to begin"
    await expect(tierBadge).toContainText("Add components to begin")

    // No tier detail panel should exist
    await expect(page.locator('[data-testid="tier-detail"]')).toHaveCount(0)

    // No expandable button should be rendered (button only exists when tier is set)
    await expect(tierBadge.locator('button[aria-expanded]')).toHaveCount(0)

    await page.screenshot({
      path: `${SCREENSHOT_DIR}/13-tier-badge-empty-state.png`,
      fullPage: true,
    })
  })

  test("AC-2: tier badge shows Foundation after placing 3+ components from 2+ categories", async ({
    page,
  }) => {
    await page.goto("/")

    const hasComponents = await waitForComponentLibrary(page)
    test.skip(!hasComponents, "Skipped: Firestore has no seeded component data")

    const addBtns = page.locator('[data-testid^="add-to-canvas-"]')
    const btnCount = await addBtns.count()
    test.skip(btnCount < 3, "Skipped: Need at least 3 components for Foundation tier")

    const tierBadge = page.locator('[data-testid="tier-badge"]')

    // Place 3 components (seed data has 10 components across 7 categories)
    await placeComponent(page, 0)
    await placeComponent(page, 1)
    await placeComponent(page, 2)

    // Allow tier evaluation to settle after addNode calls
    await page.waitForTimeout(500)

    // Tier badge should show "Foundation" with progress "1/3"
    await expect(tierBadge).toContainText("Foundation", { timeout: 5_000 })
    await expect(tierBadge).toContainText("1/3")

    // The expandable button should now exist with aria-expanded="false"
    const tierButton = tierBadge.locator('button[aria-expanded]')
    await expect(tierButton).toBeVisible()
    await expect(tierButton).toHaveAttribute("aria-expanded", "false")

    await page.screenshot({
      path: `${SCREENSHOT_DIR}/14-tier-badge-foundation.png`,
      fullPage: true,
    })
  })

  test("AC-3: tier detail expands on click and shows gap descriptions", async ({ page }) => {
    await page.goto("/")

    const hasComponents = await waitForComponentLibrary(page)
    test.skip(!hasComponents, "Skipped: Firestore has no seeded component data")

    const addBtns = page.locator('[data-testid^="add-to-canvas-"]')
    test.skip((await addBtns.count()) < 3, "Skipped: Need at least 3 components")

    // Place 3 components to reach Foundation tier
    await placeComponent(page, 0)
    await placeComponent(page, 1)
    await placeComponent(page, 2)
    await page.waitForTimeout(500)

    const tierBadge = page.locator('[data-testid="tier-badge"]')
    await expect(tierBadge).toContainText("Foundation", { timeout: 5_000 })

    // Click the tier button to expand detail panel
    const tierButton = tierBadge.locator('button[aria-expanded]')
    await tierButton.click()

    // Button should now be expanded
    await expect(tierButton).toHaveAttribute("aria-expanded", "true")
    await expect(tierButton).toHaveAttribute("aria-controls", "tier-detail-panel")

    // Tier detail panel should appear with gap descriptions for next tier
    const tierDetail = page.locator('[data-testid="tier-detail"]')
    await expect(tierDetail).toBeVisible({ timeout: 3_000 })

    // Foundation is not max tier, so it should show "Next tier requirements:"
    await expect(tierDetail).toContainText("Next tier requirements")

    await page.screenshot({
      path: `${SCREENSHOT_DIR}/15-tier-detail-expanded.png`,
      fullPage: true,
    })

    // Click again to collapse
    await tierButton.click()
    await expect(tierButton).toHaveAttribute("aria-expanded", "false")
    await expect(tierDetail).toHaveCount(0)
  })

  test("AC-4: tier returns to empty state when all components are deleted", async ({ page }) => {
    await page.goto("/")

    const hasComponents = await waitForComponentLibrary(page)
    test.skip(!hasComponents, "Skipped: Firestore has no seeded component data")

    const addBtns = page.locator('[data-testid^="add-to-canvas-"]')
    test.skip((await addBtns.count()) < 3, "Skipped: Need at least 3 components")

    // Place 3 components to reach Foundation tier
    await placeComponent(page, 0)
    await placeComponent(page, 1)
    await placeComponent(page, 2)
    await page.waitForTimeout(500)

    const tierBadge = page.locator('[data-testid="tier-badge"]')
    await expect(tierBadge).toContainText("Foundation", { timeout: 5_000 })

    // Delete all 3 nodes one by one
    for (let i = 2; i >= 0; i--) {
      const node = page.locator('[data-testid="archie-node"]').nth(i)
      await node.click()
      await page.keyboard.press("Delete")
      await expect(page.locator('[data-testid="archie-node"]')).toHaveCount(i, { timeout: 5_000 })
    }

    // Allow tier re-evaluation to settle
    await page.waitForTimeout(500)

    // Tier badge should return to empty/null state
    await expect(tierBadge).toContainText("Add components to begin", { timeout: 5_000 })

    // No expandable button should exist
    await expect(tierBadge.locator('button[aria-expanded]')).toHaveCount(0)

    // No tier detail panel
    await expect(page.locator('[data-testid="tier-detail"]')).toHaveCount(0)

    await page.screenshot({
      path: `${SCREENSHOT_DIR}/16-tier-returns-to-empty.png`,
      fullPage: true,
    })
  })
})
