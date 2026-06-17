import { test, expect, type Page } from "@playwright/test"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import {
  waitForComponentLibrary,
  dragComponentToCanvas,
  useAdvancedLevel,
} from "./helpers/canvas-helpers"

const SCREENSHOT_DIR = "test-results/scoring-dashboard"

// Playwright runs from the project root; fixtures live under tests/e2e/fixtures/scoring.
const FIXTURE_DIR = join(process.cwd(), "tests", "e2e", "fixtures", "scoring")
function fixtureBuf(name: string): Buffer {
  return readFileSync(join(FIXTURE_DIR, name))
}



/**
 * Load a CONNECTED, scorable architecture so the dashboard leaves its empty state and shows real
 * category bars + an aggregate score.
 *
 * OBSERVED (2026-06-17, live): the score dashboard needs a CONNECTED architecture with traffic flow —
 * a single unconnected node has cost ($/mo) but NO architecture score (computedMetrics stays empty),
 * so the dashboard correctly keeps "Add components to see architecture scores". Placing one node and
 * expecting scores was a stale premise. We IMPORT a small connected fixture instead: import is the
 * reliable path (placing via add-type + dragging handle-to-handle fails because the placed nodes
 * stack at the same position, so the connection drag never lands). `buttonIndex` selects fixture size
 * so the "first then second component" tests still see the score change: 0 → 2-node, 1 → 3-node.
 */
async function addComponentWithMetrics(page: Page, buttonIndex = 0) {
  const name = buttonIndex >= 1 ? "three-node-scored.architecture.yaml" : "two-node-scored.architecture.yaml"
  const expectedNodes = buttonIndex >= 1 ? 3 : 2
  await page.getByTestId("import-file-input").setInputFiles({
    name,
    mimeType: "text/yaml",
    buffer: fixtureBuf(name),
  })
  await expect(page.locator('[data-testid="archie-node"]')).toHaveCount(expectedNodes, { timeout: 10_000 })
}

/** Import the 3-node connected fixture (traffic + compute + db = 3 nodes, 2+ categories) so the tier
 *  badge reaches Foundation. Replaces 3× placeComponent index-clicks, which hang on gated blocks
 *  (e.g. add-type-payments) and stack nodes. */
async function loadThreeNodeScored(page: Page): Promise<void> {
  const name = "three-node-scored.architecture.yaml"
  await page.getByTestId("import-file-input").setInputFiles({ name, mimeType: "text/yaml", buffer: fixtureBuf(name) })
  await expect(page.locator('[data-testid="archie-node"]')).toHaveCount(3, { timeout: 10_000 })
}

test.describe("Scoring Dashboard E2E (Story 2-3)", () => {
  // D22: run at advanced level — the default "beginner" gates the toolbox/cards and inspector sections.
  test.beforeEach(async ({ page }) => {
    await useAdvancedLevel(page)
  })

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

    // D23: count the always-visible type-block "+" buttons (add-type-*); the old per-vendor
    // add-to-canvas-* cards are no longer in the default toolbox view.
    const addBtns = page.locator('[data-testid^="add-type-"]')
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

  test("AC-2: aggregate score is a valid mean (>= weakest visible category, <= 10)", async ({
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

    // Fluidity P2: the footer now shows only the WEAKEST category inline (the full per-category set
    // moved into the expand overlay). The aggregate is the mean over ALL categories, so it must be a
    // valid mean: at least the weakest visible category's score, and at most 10. (The exact arithmetic
    // mean is covered by dashboardCalculator unit tests.)
    const weakestBar = page
      .locator('[data-testid="dashboard-weakest"] [data-testid^="category-bar-"]:not([data-testid*="fill"])')
      .first()
    await expect(weakestBar).toBeVisible()
    const weakestValue = parseFloat((await weakestBar.getAttribute("aria-valuenow"))!)
    expect(weakestValue).toBeGreaterThan(0)

    expect(aggregateValue).toBeGreaterThanOrEqual(weakestValue)
    expect(aggregateValue).toBeLessThanOrEqual(10)

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

    // Remove ALL nodes (the scored fixture has 2 — a single node wouldn't score). Select each by its
    // top-left header (above the on-node vendor/config dropdowns) and use the deterministic inspector
    // Remove button — more robust than node.click()+keyboard Delete, which can land on a control.
    let remaining = await page.locator('[data-testid="archie-node"]').count()
    while (remaining > 0) {
      // force the header click: the node carries an entry ripple/transition (archie-ripple) that can
      // keep Playwright's actionability check "retrying click action" past the 30s cap under heavy
      // parallel CI load (observed: 1 hard fail, retries exhausted). The position is still the header
      // (above the on-node dropdowns); force only skips the stability/intercept wait, not the position.
      await page.locator('[data-testid="archie-node"]').first().click({ position: { x: 12, y: 6 }, force: true })
      await page.getByTestId("inspector-remove-node").click()
      await expect(page.locator('[data-testid="archie-node"]')).toHaveCount(remaining - 1, { timeout: 5_000 })
      remaining -= 1
    }

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

  // D23: migrated off the removed `component-card-` grid to drag a known base component by id
  // (node-express), matching the reference migration in canvas-and-placement.spec.ts.
  test("dashboard with drag-and-drop placement (via dragComponentToCanvas)", async ({
    page,
  }) => {
    await page.goto("/")

    const hasComponents = await waitForComponentLibrary(page)
    test.skip(!hasComponents, "Skipped: Firestore has no seeded component data")

    // Get canvas bounds
    const canvasPanel = page.locator('[data-testid="canvas-panel"]')
    const canvasBounds = await canvasPanel.boundingBox()
    expect(canvasBounds).not.toBeNull()

    // Drag a known base component to canvas center (the old component-card-* grid is gone post-D23)
    await dragComponentToCanvas(
      page,
      "node-express",
      canvasBounds!.x + canvasBounds!.width / 2,
      canvasBounds!.y + canvasBounds!.height / 2,
    )

    // The drag-and-drop placed a node (proves the drop path works).
    await expect(page.locator('[data-testid="archie-node"]')).toHaveCount(1, { timeout: 5_000 })

    // A single UNCONNECTED node has cost but no architecture SCORE (computedMetrics needs traffic flow
    // through a connected graph). Import a connected fixture to verify the dashboard scores.
    const fx = "two-node-scored.architecture.yaml"
    await page.getByTestId("import-file-input").setInputFiles({ name: fx, mimeType: "text/yaml", buffer: fixtureBuf(fx) })
    await expect(page.locator('[data-testid="archie-node"]')).toHaveCount(2, { timeout: 10_000 })

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

    // No tier-detail TOGGLE should be rendered when empty (it only exists when a tier is set). Scope to
    // aria-controls so the always-present ⓘ PanelInfoButton (also aria-expanded) isn't miscounted.
    await expect(tierBadge.locator('button[aria-controls="tier-detail-panel"]')).toHaveCount(0)

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

    // D23: count type-block "+" buttons (add-type-*) — the per-vendor add-to-canvas-* cards are gone.
    const addBtns = page.locator('[data-testid^="add-type-"]')
    const btnCount = await addBtns.count()
    test.skip(btnCount < 3, "Skipped: Need at least 3 components for Foundation tier")

    const tierBadge = page.locator('[data-testid="tier-badge"]')

    // Place 3 components (seed data has 10 components across 7 categories)
    await loadThreeNodeScored(page)

    // Allow tier evaluation to settle after addNode calls
    await page.waitForTimeout(500)

    // Tier badge should show "Foundation" with progress "1/3"
    await expect(tierBadge).toContainText("Foundation", { timeout: 5_000 })
    await expect(tierBadge).toContainText("1/3")

    // The expandable button should now exist with aria-expanded="false"
    // Scope to the tier toggle specifically — the pathway-suggestions link is also aria-expanded.
    const tierButton = tierBadge.locator('button[aria-controls="tier-detail-panel"]')
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

    // D23: count type-block "+" buttons (add-type-*) — the per-vendor add-to-canvas-* cards are gone.
    const addBtns = page.locator('[data-testid^="add-type-"]')
    test.skip((await addBtns.count()) < 3, "Skipped: Need at least 3 components")

    // Place 3 components to reach Foundation tier
    await loadThreeNodeScored(page)
    await page.waitForTimeout(500)

    const tierBadge = page.locator('[data-testid="tier-badge"]')
    await expect(tierBadge).toContainText("Foundation", { timeout: 5_000 })

    // Click the tier button to expand detail panel
    // Scope to the tier toggle specifically — the pathway-suggestions link is also aria-expanded.
    const tierButton = tierBadge.locator('button[aria-controls="tier-detail-panel"]')
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

    // D23: count type-block "+" buttons (add-type-*) — the per-vendor add-to-canvas-* cards are gone.
    const addBtns = page.locator('[data-testid^="add-type-"]')
    test.skip((await addBtns.count()) < 3, "Skipped: Need at least 3 components")

    // Place 3 components to reach Foundation tier
    await loadThreeNodeScored(page)
    await page.waitForTimeout(500)

    const tierBadge = page.locator('[data-testid="tier-badge"]')
    await expect(tierBadge).toContainText("Foundation", { timeout: 5_000 })

    // Delete all nodes one by one via header-select + inspector Remove (center-click opens the
    // on-node dropdown instead of selecting, so native Delete never fires).
    let left = await page.locator('[data-testid="archie-node"]').count()
    while (left > 0) {
      await page.locator('[data-testid="archie-node"]').first().click({ position: { x: 12, y: 6 } })
      await page.getByTestId("inspector-remove-node").click()
      await expect(page.locator('[data-testid="archie-node"]')).toHaveCount(left - 1, { timeout: 5_000 })
      left -= 1
    }

    // Allow tier re-evaluation to settle
    await page.waitForTimeout(500)

    // Tier badge should return to empty/null state
    await expect(tierBadge).toContainText("Add components to begin", { timeout: 5_000 })

    // No tier-toggle button should exist (scope by aria-controls — the always-present ⓘ
    // PanelInfoButton is also aria-expanded and would otherwise be miscounted).
    await expect(tierBadge.locator('button[aria-controls="tier-detail-panel"]')).toHaveCount(0)

    // No tier detail panel
    await expect(page.locator('[data-testid="tier-detail"]')).toHaveCount(0)

    await page.screenshot({
      path: `${SCREENSHOT_DIR}/16-tier-returns-to-empty.png`,
      fullPage: true,
    })
  })
})
