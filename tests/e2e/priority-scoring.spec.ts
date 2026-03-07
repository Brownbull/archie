import { test, expect } from "@playwright/test"
import {
  waitForComponentLibrary,
  addComponentToCanvas,
  triggerRecalcViaConfigChange,
} from "./helpers/canvas-helpers"
import * as path from "path"
import * as fs from "fs"

const SCREENSHOT_DIR = "test-results/priority-scoring"

/**
 * Place a component and trigger recalculation to populate computedMetrics.
 */
async function addComponentWithMetrics(page: import("@playwright/test").Page, buttonIndex = 0) {
  await addComponentToCanvas(page, buttonIndex)
  await triggerRecalcViaConfigChange(page, buttonIndex)
}

/**
 * Open the DashboardOverlay dialog by clicking the expand button.
 */
async function openDashboardOverlay(page: import("@playwright/test").Page) {
  const expandButton = page.locator('[data-testid="dashboard-expand-button"]')
  await expect(expandButton).toBeVisible({ timeout: 5_000 })
  await expandButton.click()
  await expect(page.locator('[data-testid="dashboard-overlay"]')).toBeVisible({ timeout: 5_000 })
}

/**
 * Expand the weight sliders collapsible in the DashboardOverlay.
 */
async function openWeightSliders(page: import("@playwright/test").Page) {
  const toggle = page.locator('[data-testid="weight-sliders-toggle"]')
  await expect(toggle).toBeVisible()
  await toggle.click()
  await expect(page.locator('[data-testid="weight-sliders-section"]')).toBeVisible({ timeout: 3_000 })
}

/**
 * Read the aggregate score value from the dashboard panel (footer bar).
 * Returns the numeric value displayed in the aggregate-score element.
 */
async function readAggregateScore(page: import("@playwright/test").Page): Promise<number> {
  const aggregateScore = page.locator('[data-testid="aggregate-score"]')
  await expect(aggregateScore).toBeVisible()
  const ariaValue = await aggregateScore.getAttribute("aria-valuenow")
  return parseFloat(ariaValue!)
}

test.describe("Priority Scoring E2E (Story 5-5)", () => {
  test("AC-1: adjusting a weight slider changes the aggregate score", async ({ page }) => {
    await page.goto("/")

    const hasComponents = await waitForComponentLibrary(page)
    test.skip(!hasComponents, "Skipped: Firestore has no seeded component data")

    // Place a component and trigger recalculation
    await addComponentWithMetrics(page)

    // Read initial aggregate score from dashboard footer
    const initialScore = await readAggregateScore(page)
    expect(initialScore).toBeGreaterThan(0)

    // Open DashboardOverlay and weight sliders
    await openDashboardOverlay(page)
    await openWeightSliders(page)

    // Locate the reliability slider (Radix <span role="slider"> inside data-testid container)
    const sliderContainer = page.locator('[data-testid="weight-slider-reliability"]')
    await expect(sliderContainer).toBeVisible()
    const sliderThumb = sliderContainer.locator('[role="slider"]')
    await expect(sliderThumb).toBeVisible()

    // Read initial slider value
    const initialSliderValue = await sliderThumb.getAttribute("aria-valuenow")
    expect(parseFloat(initialSliderValue!)).toBe(1)

    // Adjust reliability slider down: focus and press ArrowLeft 5 times (step=0.1 each → 0.5)
    await sliderThumb.focus()
    for (let i = 0; i < 5; i++) {
      await page.keyboard.press("ArrowLeft")
    }

    // Verify slider value changed
    const newSliderValue = await sliderThumb.getAttribute("aria-valuenow")
    expect(parseFloat(newSliderValue!)).toBeLessThan(1)

    // Wait for debounced recalculation (100ms debounce + render)
    await page.waitForTimeout(300)

    // Close overlay to check dashboard footer score
    await page.keyboard.press("Escape")
    await expect(page.locator('[data-testid="dashboard-overlay"]')).toBeHidden({ timeout: 3_000 })

    // "Custom" weight indicator should appear
    const weightIndicator = page.locator('[data-testid="weight-indicator"]')
    // The indicator is inside the overlay toggle which may not be visible in footer;
    // instead check the weighted score display
    const aggregateScore = page.locator('[data-testid="aggregate-score"]')
    await expect(aggregateScore).toBeVisible()
    const newScore = await readAggregateScore(page)

    // Score should have changed after adjusting weights
    expect(newScore).not.toBe(initialScore)

    await page.screenshot({
      path: `${SCREENSHOT_DIR}/01-weights-adjusted.png`,
      fullPage: true,
    })
  })

  test("AC-2: reset restores original scores", async ({ page }) => {
    await page.goto("/")

    const hasComponents = await waitForComponentLibrary(page)
    test.skip(!hasComponents, "Skipped: Firestore has no seeded component data")

    // Place a component and trigger recalculation
    await addComponentWithMetrics(page)

    // Read initial (unweighted) score
    const initialScore = await readAggregateScore(page)

    // Open overlay and sliders
    await openDashboardOverlay(page)
    await openWeightSliders(page)

    // Adjust a slider down
    const sliderThumb = page
      .locator('[data-testid="weight-slider-reliability"]')
      .locator('[role="slider"]')
    await sliderThumb.focus()
    for (let i = 0; i < 5; i++) {
      await page.keyboard.press("ArrowLeft")
    }
    await page.waitForTimeout(300)

    // Click Reset Weights
    const resetButton = page.locator('[data-testid="weight-reset-button"]')
    await expect(resetButton).toBeVisible()
    await resetButton.click()

    // Wait for recalculation
    await page.waitForTimeout(300)

    // Verify slider is back to 1.0
    const resetValue = await sliderThumb.getAttribute("aria-valuenow")
    expect(parseFloat(resetValue!)).toBe(1)

    // Close overlay and verify score reverted
    await page.keyboard.press("Escape")
    await expect(page.locator('[data-testid="dashboard-overlay"]')).toBeHidden({ timeout: 3_000 })

    const resetScore = await readAggregateScore(page)
    expect(resetScore).toBeCloseTo(initialScore, 1)

    await page.screenshot({
      path: `${SCREENSHOT_DIR}/02-weights-reset.png`,
      fullPage: true,
    })
  })

  test("AC-3: export/import round-trip preserves weights", async ({ page }) => {
    await page.goto("/")

    const hasComponents = await waitForComponentLibrary(page)
    test.skip(!hasComponents, "Skipped: Firestore has no seeded component data")

    // Place a component and trigger recalculation
    await addComponentWithMetrics(page)

    // Open overlay and sliders
    await openDashboardOverlay(page)
    await openWeightSliders(page)

    // Adjust scalability to 0.3 (7 ArrowLeft from 1.0, step=0.1, min=0.1 → 0.3 needs 7 presses)
    const scalabilityThumb = page
      .locator('[data-testid="weight-slider-scalability"]')
      .locator('[role="slider"]')
    await scalabilityThumb.focus()
    for (let i = 0; i < 7; i++) {
      await page.keyboard.press("ArrowLeft")
    }

    // Adjust reliability to 0.8 (2 ArrowLeft from 1.0)
    const reliabilityThumb = page
      .locator('[data-testid="weight-slider-reliability"]')
      .locator('[role="slider"]')
    await reliabilityThumb.focus()
    for (let i = 0; i < 2; i++) {
      await page.keyboard.press("ArrowLeft")
    }

    await page.waitForTimeout(300)

    // Close overlay
    await page.keyboard.press("Escape")
    await expect(page.locator('[data-testid="dashboard-overlay"]')).toBeHidden({ timeout: 3_000 })

    // Export architecture — capture download
    const exportButton = page.locator('[data-testid="export-button"]')
    await expect(exportButton).toBeEnabled({ timeout: 5_000 })

    const [download] = await Promise.all([
      page.waitForEvent("download"),
      exportButton.click(),
    ])

    // Save download to temp path
    const downloadPath = path.join("test-results", "priority-scoring", "exported.yaml")
    await download.saveAs(downloadPath)
    expect(fs.existsSync(downloadPath)).toBe(true)

    // Navigate fresh to clear state
    await page.goto("/")
    await expect(page.locator('[data-testid="dashboard-panel"]')).toBeVisible({ timeout: 15_000 })

    // Import the exported YAML
    const importButton = page.locator('[data-testid="import-button"]')
    await expect(importButton).toBeVisible()

    const fileInput = page.locator('[data-testid="import-file-input"]')
    await fileInput.setInputFiles(downloadPath)

    // Wait for import to complete — nodes should appear on canvas
    await expect(page.locator('[data-testid="archie-node"]').first()).toBeVisible({ timeout: 10_000 })

    // Wait for recalculation to settle
    await page.waitForTimeout(500)

    // Open overlay and sliders to check weights
    await openDashboardOverlay(page)
    await openWeightSliders(page)

    // Verify scalability slider position (should be ~0.3)
    const importedScalabilityThumb = page
      .locator('[data-testid="weight-slider-scalability"]')
      .locator('[role="slider"]')
    const scalabilityValue = await importedScalabilityThumb.getAttribute("aria-valuenow")
    expect(parseFloat(scalabilityValue!)).toBeCloseTo(0.3, 1)

    // Verify reliability slider position (should be ~0.8)
    const importedReliabilityThumb = page
      .locator('[data-testid="weight-slider-reliability"]')
      .locator('[role="slider"]')
    const reliabilityValue = await importedReliabilityThumb.getAttribute("aria-valuenow")
    expect(parseFloat(reliabilityValue!)).toBeCloseTo(0.8, 1)

    await page.screenshot({
      path: `${SCREENSHOT_DIR}/03-weights-roundtrip.png`,
      fullPage: true,
    })
  })

  test("AC-4: v1 import defaults all sliders to 1.0", async ({ page }) => {
    await page.goto("/")

    const hasComponents = await waitForComponentLibrary(page)
    test.skip(!hasComponents, "Skipped: Firestore has no seeded component data")

    // First: place and export with default weights to get a valid v1-like YAML
    await addComponentWithMetrics(page)

    const exportButton = page.locator('[data-testid="export-button"]')
    await expect(exportButton).toBeEnabled({ timeout: 5_000 })

    const [download] = await Promise.all([
      page.waitForEvent("download"),
      exportButton.click(),
    ])

    // Save and modify to v1 format (remove weight_profile, set schema_version to 1.0.0)
    const tempPath = path.join("test-results", "priority-scoring", "v1-test.yaml")
    await download.saveAs(tempPath)
    let yamlContent = fs.readFileSync(tempPath, "utf-8")
    yamlContent = yamlContent.replace(/schema_version: ['"]?2\.0\.0['"]?/, 'schema_version: "1.0.0"')
    // Remove any weight_profile block if present
    yamlContent = yamlContent.replace(/weight_profile:[\s\S]*?(?=\n\w|\n$|$)/, "")
    fs.writeFileSync(tempPath, yamlContent)

    // Navigate fresh
    await page.goto("/")
    await expect(page.locator('[data-testid="dashboard-panel"]')).toBeVisible({ timeout: 15_000 })

    // First adjust weights to non-default so we can verify reset on import
    // Place a component, open overlay, change a weight
    await waitForComponentLibrary(page)
    await addComponentWithMetrics(page)
    await openDashboardOverlay(page)
    await openWeightSliders(page)

    const sliderThumb = page
      .locator('[data-testid="weight-slider-performance"]')
      .locator('[role="slider"]')
    await sliderThumb.focus()
    for (let i = 0; i < 3; i++) {
      await page.keyboard.press("ArrowLeft")
    }
    await page.waitForTimeout(300)

    // Close overlay
    await page.keyboard.press("Escape")
    await expect(page.locator('[data-testid="dashboard-overlay"]')).toBeHidden({ timeout: 3_000 })

    // Import v1 YAML
    const fileInput = page.locator('[data-testid="import-file-input"]')
    await fileInput.setInputFiles(tempPath)

    // Wait for import to complete
    await expect(page.locator('[data-testid="archie-node"]').first()).toBeVisible({ timeout: 10_000 })
    await page.waitForTimeout(500)

    // Open overlay and sliders to check all weights are at 1.0
    await openDashboardOverlay(page)
    await openWeightSliders(page)

    // Check all 7 category sliders are at 1.0
    const categoryIds = [
      "performance",
      "reliability",
      "scalability",
      "security",
      "operational-complexity",
      "cost-efficiency",
      "developer-experience",
    ]

    for (const catId of categoryIds) {
      const thumb = page
        .locator(`[data-testid="weight-slider-${catId}"]`)
        .locator('[role="slider"]')
      const value = await thumb.getAttribute("aria-valuenow")
      expect(parseFloat(value!), `${catId} slider should be 1.0`).toBe(1)
    }

    await page.screenshot({
      path: `${SCREENSHOT_DIR}/04-v1-import-default-sliders.png`,
      fullPage: true,
    })
  })
})
