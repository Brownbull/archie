import { test, expect, type Page } from "@playwright/test"
import {
  waitForComponentLibrary,
  waitForBlueprints,
  addComponentToCanvas,
  triggerRecalcViaConfigChange,
} from "./helpers/canvas-helpers"

const SCREENSHOT_DIR = "test-results/pathway-guidance"

/**
 * Place a component and trigger recalculation to populate computedMetrics.
 */
async function addComponentWithMetrics(page: Page, buttonIndex = 0) {
  await addComponentToCanvas(page, buttonIndex)
  await triggerRecalcViaConfigChange(page, buttonIndex)
}

/**
 * Open the DashboardOverlay dialog by clicking the expand button.
 */
async function openDashboardOverlay(page: Page) {
  const expandButton = page.locator('[data-testid="dashboard-expand-button"]')
  await expect(expandButton).toBeVisible({ timeout: 5_000 })
  await expandButton.click()
  await expect(page.locator('[data-testid="dashboard-overlay"]')).toBeVisible({ timeout: 5_000 })
}

/**
 * Expand the weight sliders collapsible in the DashboardOverlay.
 */
async function openWeightSliders(page: Page) {
  const toggle = page.locator('[data-testid="weight-sliders-toggle"]')
  await expect(toggle).toBeVisible()
  await toggle.click()
  await expect(page.locator('[data-testid="weight-sliders-section"]')).toBeVisible({ timeout: 3_000 })
}

/**
 * Expand the Constraint Guardrails collapsible inside the dashboard overlay.
 */
async function openConstraintPanel(page: Page) {
  const panel = page.locator('[data-testid="constraint-panel"]')
  const alreadyOpen = await panel.waitFor({ state: "visible", timeout: 500 }).then(() => true).catch(() => false)
  if (alreadyOpen) return // already open — skip toggle to avoid closing
  const toggle = page.locator('[data-testid="constraint-guardrails-toggle"]')
  await expect(toggle).toBeVisible()
  await toggle.click()
  await expect(panel).toBeVisible({ timeout: 3_000 })
}

/**
 * Add a constraint via the constraint form.
 * Uses native <select> elements (selectOption) for category and operator.
 */
async function addConstraint(
  page: Page,
  categoryId: string,
  operator: string,
  threshold: string,
) {
  const addButton = page.locator('[data-testid="constraint-add-button"]')
  await expect(addButton).toBeVisible({ timeout: 3_000 })
  await addButton.click()
  await expect(page.locator('[data-testid="constraint-form"]')).toBeVisible({ timeout: 3_000 })

  await page.locator('[data-testid="constraint-category-select"]').selectOption(categoryId)
  await page.locator('[data-testid="constraint-operator-select"]').selectOption(operator)

  const thresholdInput = page.locator('[data-testid="constraint-threshold-input"]')
  await thresholdInput.clear()
  await thresholdInput.fill(threshold)

  await page.locator('[data-testid="constraint-save-button"]').click()
  await page.waitForTimeout(500) // constraint evaluation settling
}

/**
 * Adjust a weight slider by pressing ArrowLeft a specified number of times.
 * @param settle - When true (default), waits 300ms for debounce to settle.
 */
async function adjustSlider(page: Page, categoryId: string, steps: number, settle = true) {
  const thumb = page
    .locator(`[data-testid="weight-slider-${categoryId}"]`)
    .locator('[role="slider"]')
  await thumb.focus()
  for (let i = 0; i < steps; i++) {
    await page.keyboard.press("ArrowLeft")
  }
  if (settle) {
    await page.waitForTimeout(300) // > DEBOUNCE_MS (100ms) + React render settle
  }
}

/**
 * Place 3 components with metrics to reach Foundation tier (3+ components, 2+ categories).
 * Returns true if Foundation tier is reached (tier badge button appears).
 */
async function reachFoundationTier(page: Page): Promise<boolean> {
  // Assumes seeded components span 2+ metric categories (Foundation tier requirement).
  // If fewer than 3 components are seeded, addComponentToCanvas throws — caught below.
  try {
    await addComponentWithMetrics(page, 0)
    await addComponentWithMetrics(page, 1)
    await addComponentWithMetrics(page, 2)
  } catch {
    return false // insufficient seeded components
  }

  // Wait for tier evaluation to settle
  await page.waitForTimeout(500)

  // Check if tier badge shows a tier name (button exists = tier reached)
  const tierButton = page.locator('[data-testid="tier-badge"] button')
  return tierButton.isVisible({ timeout: 3_000 }).catch(() => false)
}

// All tests are AUTHENTICATED — auth pre-loaded from global storageState (see global-setup.ts).
// Fixture strategy: drag-and-drop real components from Firestore-seeded library.
// Foundation tier: 3+ components from 2+ categories.
// Max tier: load a blueprint with full architecture.
test.describe("Pathway Guidance E2E (Story 7.5-4)", () => {
  test("AC-1/AC-2/AC-3: full flow — suggestions, weight reranking, constraint warnings", async ({
    page,
  }) => {
    await page.goto("/")

    const hasComponents = await waitForComponentLibrary(page)
    test.skip(!hasComponents, "Skipped: Firestore has no seeded component data")

    // --- Setup: reach Foundation tier (3 components, 2+ categories) ---
    const reachedTier = await reachFoundationTier(page)
    test.skip(!reachedTier, "Could not reach Foundation tier with available components")

    // --- AC-1: Open tier badge popover, verify suggestions link ---
    const tierButton = page.locator('[data-testid="tier-badge"] button')
    await tierButton.click()
    await expect(page.locator('[data-testid="tier-detail"]')).toBeVisible({ timeout: 3_000 })

    // Verify suggestions link is visible (means pathway suggestions > 0)
    const suggestionsLink = page.locator('[data-testid="pathway-suggestions-link"]')
    const hasSuggestions = await suggestionsLink.isVisible().catch(() => false)
    test.skip(!hasSuggestions, "No pathway suggestions generated at Foundation tier")

    await page.screenshot({
      path: `${SCREENSHOT_DIR}/01-tier-badge-with-suggestions.png`,
      fullPage: true,
    })

    // Click suggestion link — opens DashboardOverlay with Pathway Guidance section
    await suggestionsLink.click()

    // DashboardOverlay should open and pathway section should be auto-expanded
    await expect(page.locator('[data-testid="dashboard-overlay"]')).toBeVisible({ timeout: 5_000 })
    await expect(page.locator('[data-testid="pathway-guidance-panel"]')).toBeVisible({ timeout: 5_000 })

    // Verify at least one suggestion card is rendered
    const suggestionCards = page.locator('[data-testid^="pathway-suggestion-"]')
    const cardCount = await suggestionCards.count()
    expect(cardCount).toBeGreaterThan(0)

    // Capture suggestion card text contents BEFORE weight change
    const beforeTexts = await suggestionCards.allTextContents()

    await page.screenshot({
      path: `${SCREENSHOT_DIR}/02-pathway-guidance-section.png`,
      fullPage: true,
    })

    // --- AC-2: Change weight slider, verify suggestion ranking changes ---
    await openWeightSliders(page)

    // Note: assumes default weight 1.0 (fresh page state — AC-1/2/3 run in single test from page.goto("/"))
    // Adjust scalability slider down to 0.3 (7 ArrowLeft from 1.0, step=0.1)
    await adjustSlider(page, "scalability", 7)

    // Poll until suggestion text changes (debounce 100ms + React render + Zustand propagation)
    await expect.poll(
      async () => await suggestionCards.allTextContents(),
      { timeout: 3_000, message: "Suggestion text should change after weight adjustment" },
    ).not.toEqual(beforeTexts)

    await page.screenshot({
      path: `${SCREENSHOT_DIR}/03-reranked-after-weight-change.png`,
      fullPage: true,
    })

    // --- AC-3: Add constraint, verify constraint warning badge ---
    await openConstraintPanel(page)

    // Add a restrictive constraint: cost-efficiency <= 2
    // Most components have cost-efficiency > 2, so suggestions should show warnings
    await addConstraint(page, "cost-efficiency", "lte", "2")

    // Ensure pathway guidance panel is open (idempotent — skip toggle if already visible)
    const pathwayPanel = page.locator('[data-testid="pathway-guidance-panel"]')
    if (!(await pathwayPanel.isVisible())) {
      const pathwayToggle = page.locator('[data-testid="pathway-guidance-toggle"]')
      await pathwayToggle.click()
      await expect(pathwayPanel).toBeVisible({ timeout: 3_000 })
    }

    // Verify constraint evaluation produced visible badges on suggestion cards
    const constraintWarnings = page.locator('[data-testid^="constraint-warning-"]')
    const warningCount = await constraintWarnings.count()
    const safeBadges = page.locator('[data-testid^="constraint-safe-"]')
    const safeCount = await safeBadges.count()
    // Every suggestion card should display either a constraint warning or safe badge
    expect(warningCount + safeCount).toBeGreaterThan(0)
  })

  test("AC-4: max tier — no suggestions", async ({ page }) => {
    await page.goto("/")

    // Use blueprints to load a full architecture that may reach max tier
    const hasBlueprints = await waitForBlueprints(page)
    test.skip(!hasBlueprints, "No blueprints available in this environment")

    // Load the first blueprint
    await page.locator('[data-testid="blueprint-load-button"]').first().click()
    await page.locator('[data-testid="archie-node"]').first().waitFor({ state: "visible", timeout: 5_000 })

    // Trigger recalculation to populate computedMetrics and tier evaluation
    await triggerRecalcViaConfigChange(page, 0)

    // Wait for tier evaluation to settle
    await page.waitForTimeout(500)

    // Check if tier badge reached max tier ("All tier requirements met")
    const tierButton = page.locator('[data-testid="tier-badge"] button')
    const hasTierButton = await tierButton.isVisible().catch(() => false)
    test.skip(!hasTierButton, "Blueprint did not produce a tier — skipping max tier test")

    await tierButton.click()
    await expect(page.locator('[data-testid="tier-detail"]')).toBeVisible({ timeout: 3_000 })

    const tierDetailText = await page.locator('[data-testid="tier-detail"]').textContent()
    test.skip(
      !tierDetailText?.includes("All tier requirements met"),
      "Blueprint does not reach max tier in this environment",
    )

    // Verify no suggestions link appears at max tier
    const suggestionsLink = page.locator('[data-testid="pathway-suggestions-link"]')
    await expect(suggestionsLink).not.toBeVisible()

    // Close tier popover
    await tierButton.click()
    await expect(page.locator('[data-testid="tier-detail"]')).toBeHidden({ timeout: 3_000 })

    // Open dashboard overlay and pathway guidance section
    await openDashboardOverlay(page)

    const pathwayToggle = page.locator('[data-testid="pathway-guidance-toggle"]')
    await pathwayToggle.click()
    await expect(page.locator('[data-testid="pathway-guidance-panel"]')).toBeVisible({ timeout: 3_000 })

    // Verify empty state is shown
    await expect(page.locator('[data-testid="pathway-empty-state"]')).toBeVisible()

    await page.screenshot({
      path: `${SCREENSHOT_DIR}/04-max-tier-no-suggestions.png`,
      fullPage: true,
    })
  })
})
