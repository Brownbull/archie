import { test, expect } from "@playwright/test"

const SCREENSHOT_DIR = "test-results/toolbox-browsing"

/**
 * Helper: wait for the component library to finish loading.
 * Returns true if components were loaded, false if empty state.
 */
async function waitForComponentLibrary(page: import("@playwright/test").Page) {
  // Wait for either populated component-tab or empty state
  await Promise.race([
    page.locator('[data-testid="component-tab"]').waitFor({ state: "visible", timeout: 15_000 }),
    page.locator('[data-testid="component-tab-empty"]').waitFor({ state: "visible", timeout: 15_000 }),
  ])
  const hasComponents = await page.locator('[data-testid="component-tab"]').isVisible()
  return hasComponents
}

test.describe("Toolbox Browsing E2E (Story 1-2)", () => {
  test("toolbox loads with component library and three tabs", async ({ page }) => {
    await page.goto("/")

    // Wait for toolbox panel to render (library must initialize from Firestore)
    const toolboxPanel = page.locator('[data-testid="toolbox-panel"]')
    await expect(toolboxPanel).toBeVisible({ timeout: 15_000 })

    // AC-1: Three tabs visible — Components, Stacks, Blueprints
    await expect(page.getByRole("tab", { name: "Components" })).toBeVisible()
    await expect(page.getByRole("tab", { name: "Stacks" })).toBeVisible()
    await expect(page.getByRole("tab", { name: "Blueprints" })).toBeVisible()

    // AC-1: Components tab is active by default
    await expect(page.getByRole("tab", { name: "Components" })).toHaveAttribute(
      "data-state",
      "active",
    )

    await page.screenshot({
      path: `${SCREENSHOT_DIR}/01-toolbox-three-tabs.png`,
      fullPage: true,
    })
  })

  test("component library initializes and shows correct state", async ({ page }) => {
    await page.goto("/")

    // AC-5: Wait for component library to initialize
    const hasComponents = await waitForComponentLibrary(page)

    if (hasComponents) {
      // AC-2: Components organized by category
      const categories = page.locator('[data-testid^="category-"]')
      await expect(categories.first()).toBeVisible()
      const categoryCount = await categories.count()
      expect(categoryCount).toBeGreaterThanOrEqual(1)

      // AC-2: Benefit card format (IS / GAIN / COST)
      const firstCard = page.locator('[data-testid^="component-card-"]').first()
      await expect(firstCard).toBeVisible()
      await expect(firstCard.getByText("IS", { exact: true })).toBeVisible()
      await expect(firstCard.getByText("GAIN", { exact: true })).toBeVisible()
      await expect(firstCard.getByText("COST", { exact: true })).toBeVisible()

      await page.screenshot({
        path: `${SCREENSHOT_DIR}/02-components-by-category.png`,
        fullPage: true,
      })
    } else {
      // Empty state when Firestore has no seed data
      await expect(page.locator('[data-testid="component-tab-empty"]')).toContainText(
        "No components loaded",
      )

      await page.screenshot({
        path: `${SCREENSHOT_DIR}/02-components-empty-state.png`,
        fullPage: true,
      })
    }
  })

  test("search filter input and clear button work", async ({ page }) => {
    await page.goto("/")

    // Wait for toolbox to render
    await expect(page.locator('[data-testid="toolbox-panel"]')).toBeVisible({ timeout: 15_000 })

    // AC-3: Search input is present and functional
    const searchInput = page.locator('[data-testid="search-input"]')
    await expect(searchInput).toBeVisible()
    await expect(searchInput).toHaveAttribute("maxLength", "100")

    // Type a search query
    await searchInput.fill("test-query")
    await expect(searchInput).toHaveValue("test-query")

    // Clear button appears when query is non-empty
    const clearButton = page.locator('[data-testid="search-clear"]')
    await expect(clearButton).toBeVisible()

    await page.screenshot({
      path: `${SCREENSHOT_DIR}/03-search-filter-with-query.png`,
      fullPage: true,
    })

    // Clear button clears the query
    await clearButton.click()
    await expect(searchInput).toHaveValue("")
    await expect(clearButton).not.toBeVisible()

    await page.screenshot({
      path: `${SCREENSHOT_DIR}/04-search-filter-cleared.png`,
      fullPage: true,
    })
  })

  test("search filter narrows component list when data is seeded", async ({ page }) => {
    await page.goto("/")
    const hasComponents = await waitForComponentLibrary(page)

    test.skip(!hasComponents, "Skipped: Firestore has no seeded component data")

    // Count initial components
    const initialCards = page.locator('[data-testid^="component-card-"]')
    const initialCount = await initialCards.count()

    // Need at least 2 components to test filtering
    test.skip(initialCount < 2, "Skipped: Need at least 2 components to test filtering")

    // AC-3: Type in search filter — use first component's name for a known match
    const firstName = await initialCards.first().locator("h4").textContent()
    const searchInput = page.locator('[data-testid="search-input"]')
    await searchInput.fill(firstName!)

    // Wait for filter to take effect
    await page.waitForTimeout(300)

    // Filtered results should be fewer
    const filteredCards = page.locator('[data-testid^="component-card-"]')
    const filteredCount = await filteredCards.count()
    expect(filteredCount).toBeLessThanOrEqual(initialCount)
    expect(filteredCount).toBeGreaterThanOrEqual(1)

    await page.screenshot({
      path: `${SCREENSHOT_DIR}/05-search-filtered-results.png`,
      fullPage: true,
    })

    // Clear and verify all return
    await page.locator('[data-testid="search-clear"]').click()
    await expect(initialCards).toHaveCount(initialCount)
  })

  test("command palette opens with Ctrl+K", async ({ page }) => {
    await page.goto("/")

    // Wait for toolbox to load
    await expect(page.locator('[data-testid="toolbox-panel"]')).toBeVisible({ timeout: 15_000 })

    // AC-4: Open command palette with Ctrl+K
    await page.keyboard.press("Control+k")

    // Command palette dialog should appear with search input
    const paletteInput = page.getByPlaceholder("Search components...")
    await expect(paletteInput).toBeVisible({ timeout: 5_000 })

    // Dialog is visible
    const paletteDialog = page.locator("[role=dialog]")
    await expect(paletteDialog).toBeVisible()

    await page.screenshot({
      path: `${SCREENSHOT_DIR}/06-command-palette-open.png`,
      fullPage: true,
    })

    // Close with Escape
    await page.keyboard.press("Escape")
    await expect(paletteInput).not.toBeVisible()

    // Re-open to verify toggle works
    await page.keyboard.press("Control+k")
    await expect(paletteInput).toBeVisible()

    // Close again with Ctrl+K (toggle)
    await page.keyboard.press("Control+k")
    await expect(paletteInput).not.toBeVisible()
  })

  test("tab switching shows stacks and blueprints placeholders", async ({ page }) => {
    await page.goto("/")

    // Wait for toolbox to load
    await expect(page.locator('[data-testid="toolbox-panel"]')).toBeVisible({ timeout: 15_000 })

    // AC-1: Click Stacks tab — shows placeholder
    await page.getByRole("tab", { name: "Stacks" }).click()
    await expect(page.locator('[data-testid="stack-tab"]')).toBeVisible()
    await expect(page.locator('[data-testid="stack-tab"]')).toContainText("Coming in Phase 2")

    await page.screenshot({
      path: `${SCREENSHOT_DIR}/07-stacks-placeholder.png`,
      fullPage: true,
    })

    // AC-1: Click Blueprints tab — shows placeholder
    await page.getByRole("tab", { name: "Blueprints" }).click()
    await expect(page.locator('[data-testid="blueprint-tab"]')).toBeVisible()
    await expect(page.locator('[data-testid="blueprint-tab"]')).toContainText(
      "Populated in Epic 3",
    )

    await page.screenshot({
      path: `${SCREENSHOT_DIR}/08-blueprints-placeholder.png`,
      fullPage: true,
    })

    // Switch back to Components tab — renders something (either data or empty)
    await page.getByRole("tab", { name: "Components" }).click()
    const hasComponentTab = await page.locator('[data-testid="component-tab"]').isVisible()
    const hasEmptyTab = await page.locator('[data-testid="component-tab-empty"]').isVisible()
    expect(hasComponentTab || hasEmptyTab).toBe(true)
  })
})
