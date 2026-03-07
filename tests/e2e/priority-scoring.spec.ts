import { test, expect, type Page } from "@playwright/test"
import {
  waitForComponentLibrary,
  addComponentToCanvas,
  triggerRecalcViaConfigChange,
} from "./helpers/canvas-helpers"
import * as path from "path"
import * as fs from "fs"
import { load, dump } from "js-yaml"
import { METRIC_CATEGORIES } from "../../src/lib/constants"

const SCREENSHOT_BASE = "test-results/priority-scoring"
// Derived from source of truth — no manual sync needed (TD-5-5c AC-2)
const ALL_CATEGORY_IDS = METRIC_CATEGORIES.map((c) => c.id)

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
 * Read the aggregate score value from the dashboard panel (footer bar).
 * Returns the numeric value displayed in the aggregate-score element.
 */
async function readAggregateScore(page: Page): Promise<number> {
  const aggregateScore = page.locator('[data-testid="aggregate-score"]')
  await expect(aggregateScore).toBeVisible()
  const ariaValue = await aggregateScore.getAttribute("aria-valuenow")
  expect(ariaValue).not.toBeNull()
  return parseFloat(ariaValue!)
}

/**
 * Adjust a weight slider by pressing ArrowLeft a specified number of times.
 * @param settle - When true (default), waits 300ms for debounce to settle.
 *   Pass false when calling in a loop, then wait once after the last call.
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
    // 300ms matches WEIGHT_DEBOUNCE_MS in src/features/priority-scoring
    await page.waitForTimeout(300)
  }
}

/**
 * Export the current architecture, apply a mutator to the YAML, then reimport.
 * Assumes a component with metrics is already on the canvas.
 * After calling, the test should assert on the import result (success or error).
 */
async function exportMutateAndReimport(
  page: Page,
  tempPath: string,
  mutator: (doc: Record<string, unknown>) => void,
): Promise<void> {
  const exportButton = page.locator('[data-testid="export-button"]')
  await expect(exportButton).toBeEnabled({ timeout: 5_000 })
  const [download] = await Promise.all([
    page.waitForEvent("download"),
    exportButton.click(),
  ])
  await download.saveAs(tempPath)

  const rawYaml = fs.readFileSync(tempPath, "utf-8")
  const parsed = load(rawYaml)
  if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("Exported YAML did not parse to an object")
  }
  const doc = parsed as Record<string, unknown>
  mutator(doc)
  fs.writeFileSync(tempPath, dump(doc))

  await page.goto("/")
  await expect(page.locator('[data-testid="dashboard-panel"]')).toBeVisible({ timeout: 15_000 })
  await waitForComponentLibrary(page)
  const fileInput = page.locator('[data-testid="import-file-input"]')
  await fileInput.setInputFiles(tempPath)
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

    // Locate the reliability slider and verify initial value
    const sliderContainer = page.locator('[data-testid="weight-slider-reliability"]')
    await expect(sliderContainer).toBeVisible()
    const sliderThumb = sliderContainer.locator('[role="slider"]')
    await expect(sliderThumb).toBeVisible()

    const initialSliderValue = await sliderThumb.getAttribute("aria-valuenow")
    expect(initialSliderValue).not.toBeNull()
    expect(parseFloat(initialSliderValue!)).toBe(1)

    // Adjust reliability slider down (step=0.1 each → 0.5)
    await adjustSlider(page, "reliability", 5)

    // Verify slider value changed
    const newSliderValue = await sliderThumb.getAttribute("aria-valuenow")
    expect(newSliderValue).not.toBeNull()
    expect(parseFloat(newSliderValue!)).toBeLessThan(1)

    // Close overlay to check dashboard footer score
    await page.keyboard.press("Escape")
    await expect(page.locator('[data-testid="dashboard-overlay"]')).toBeHidden({ timeout: 3_000 })

    const newScore = await readAggregateScore(page)

    // Score should have changed after adjusting weights
    expect(newScore).not.toBe(initialScore)

    await page.screenshot({
      path: `${SCREENSHOT_BASE}/ac1-weights-adjusted/01-weights-adjusted.png`,
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

    // Adjust 3 sliders to non-default values (step=0.1, min=0.1)
    // settle=false skips per-call 300ms wait; single settle after last call
    await adjustSlider(page, "reliability", 5, false)
    await adjustSlider(page, "scalability", 7, false)
    await adjustSlider(page, "performance", 3)

    // Click Reset Weights
    const resetButton = page.locator('[data-testid="weight-reset-button"]')
    await expect(resetButton).toBeVisible()
    await resetButton.click()

    // Wait for debounced recalculation to settle
    await page.waitForTimeout(300)

    // Verify ALL 7 category sliders are back to 1.0
    for (const catId of ALL_CATEGORY_IDS) {
      const thumb = page
        .locator(`[data-testid="weight-slider-${catId}"]`)
        .locator('[role="slider"]')
      const value = await thumb.getAttribute("aria-valuenow")
      expect(value, `${catId} slider should have aria-valuenow after reset`).not.toBeNull()
      expect(parseFloat(value!), `${catId} slider should be 1.0 after reset`).toBe(1)
    }

    // Close overlay and verify score reverted
    await page.keyboard.press("Escape")
    await expect(page.locator('[data-testid="dashboard-overlay"]')).toBeHidden({ timeout: 3_000 })

    const resetScore = await readAggregateScore(page)
    expect(resetScore).toBeCloseTo(initialScore, 1)

    await page.screenshot({
      path: `${SCREENSHOT_BASE}/ac2-weights-reset/02-weights-reset.png`,
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

    // Adjust scalability to 0.3 (7 ArrowLeft from 1.0, step=0.1, min=0.1)
    await adjustSlider(page, "scalability", 7, false)

    // Adjust reliability to 0.8 (2 ArrowLeft from 1.0)
    await adjustSlider(page, "reliability", 2)

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
    const downloadPath = path.join(SCREENSHOT_BASE, "ac3-weights-roundtrip", "exported.yaml")
    await download.saveAs(downloadPath)
    expect(fs.existsSync(downloadPath)).toBe(true)

    // Navigate fresh to clear state
    await page.goto("/")
    await expect(page.locator('[data-testid="dashboard-panel"]')).toBeVisible({ timeout: 15_000 })
    const libraryReadyForImport = await waitForComponentLibrary(page)
    test.skip(!libraryReadyForImport, "Skipped: Firestore has no seeded component data after reimport")

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
    expect(scalabilityValue).not.toBeNull()
    expect(parseFloat(scalabilityValue!)).toBeCloseTo(0.3, 1)

    // Verify reliability slider position (should be ~0.8)
    const importedReliabilityThumb = page
      .locator('[data-testid="weight-slider-reliability"]')
      .locator('[role="slider"]')
    const reliabilityValue = await importedReliabilityThumb.getAttribute("aria-valuenow")
    expect(reliabilityValue).not.toBeNull()
    expect(parseFloat(reliabilityValue!)).toBeCloseTo(0.8, 1)

    // Verify remaining 5 sliders stayed at default 1.0
    for (const catId of ALL_CATEGORY_IDS.filter(id => id !== "scalability" && id !== "reliability")) {
      const thumb = page.locator(`[data-testid="weight-slider-${catId}"]`).locator('[role="slider"]')
      const value = await thumb.getAttribute("aria-valuenow")
      expect(value, `${catId} slider should be 1.0`).not.toBeNull()
      expect(parseFloat(value!), `${catId} slider should be 1.0`).toBe(1)
    }

    await page.screenshot({
      path: `${SCREENSHOT_BASE}/ac3-weights-roundtrip/03-weights-roundtrip.png`,
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
    const tempPath = path.join(SCREENSHOT_BASE, "ac4-v1-import", "v1-test.yaml")
    await download.saveAs(tempPath)
    const rawYaml = fs.readFileSync(tempPath, "utf-8")
    const parsed = load(rawYaml)
    if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
      throw new Error("Exported YAML did not parse to an object")
    }
    const doc = parsed as Record<string, unknown>
    doc["schema_version"] = "1.0.0"
    delete doc["weight_profile"]
    const yamlContent = dump(doc)
    expect(yamlContent).not.toContain("weight_profile")
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

    await adjustSlider(page, "performance", 3)

    // Close overlay
    await page.keyboard.press("Escape")
    await expect(page.locator('[data-testid="dashboard-overlay"]')).toBeHidden({ timeout: 3_000 })

    // Import v1 YAML
    const fileInput = page.locator('[data-testid="import-file-input"]')
    await fileInput.setInputFiles(tempPath)

    // Wait for import to complete and verify no error
    await expect(page.locator('[data-testid="archie-node"]').first()).toBeVisible({ timeout: 10_000 })
    await page.waitForTimeout(500)
    await expect(page.locator('[role="alert"]')).toHaveCount(0)

    // Open overlay and sliders to check all weights are at 1.0
    await openDashboardOverlay(page)
    await openWeightSliders(page)

    // Check all 7 category sliders are at 1.0
    for (const catId of ALL_CATEGORY_IDS) {
      const thumb = page
        .locator(`[data-testid="weight-slider-${catId}"]`)
        .locator('[role="slider"]')
      const value = await thumb.getAttribute("aria-valuenow")
      expect(value, `${catId} slider should have aria-valuenow`).not.toBeNull()
      expect(parseFloat(value!), `${catId} slider should be 1.0`).toBe(1)
    }

    await page.screenshot({
      path: `${SCREENSHOT_BASE}/ac4-v1-import/04-v1-import-default-sliders.png`,
      fullPage: true,
    })
  })

  test("TD-5-5b AC-2: out-of-range weight import shows validation error", async ({ page }) => {
    await page.goto("/")

    const hasComponents = await waitForComponentLibrary(page)
    test.skip(!hasComponents, "Skipped: Firestore has no seeded component data")

    await addComponentWithMetrics(page)

    const tempPath = path.join(SCREENSHOT_BASE, "td-5-5b-ac2-out-of-range", "out-of-range.yaml")
    await exportMutateAndReimport(page, tempPath, (doc) => {
      const wp = doc["weight_profile"] as Record<string, number>
      wp["performance"] = 5.0
    })

    // Expect error toast — weight=5.0 exceeds schema max of 1
    const errorToast = page.locator('[data-sonner-toast][data-type="error"]')
    await expect(errorToast).toBeVisible({ timeout: 5_000 })
    await expect(errorToast).toContainText("Import failed")

    await page.screenshot({
      path: `${SCREENSHOT_BASE}/td-5-5b-ac2-out-of-range/05-out-of-range-error.png`,
      fullPage: true,
    })
  })

  test("TD-5-5b AC-2b: weight=0 import succeeds (valid boundary)", async ({ page }) => {
    await page.goto("/")

    const hasComponents = await waitForComponentLibrary(page)
    test.skip(!hasComponents, "Skipped: Firestore has no seeded component data")

    await addComponentWithMetrics(page)

    const tempPath = path.join(SCREENSHOT_BASE, "td-5-5b-ac2b-zero-weight", "zero-weight.yaml")
    await exportMutateAndReimport(page, tempPath, (doc) => {
      const wp = doc["weight_profile"] as Record<string, number>
      wp["security"] = 0
    })

    // Import should succeed — weight=0 is valid per schema
    await expect(page.locator('[data-testid="archie-node"]').first()).toBeVisible({ timeout: 10_000 })
    await page.waitForTimeout(500)

    // Verify no error toast
    const errorToast = page.locator('[data-sonner-toast][data-type="error"]')
    await expect(errorToast).not.toBeVisible()

    // Verify the security weight imported as 0
    await openDashboardOverlay(page)
    await openWeightSliders(page)
    const securityThumb = page
      .locator('[data-testid="weight-slider-security"]')
      .locator('[role="slider"]')
    const securityValue = await securityThumb.getAttribute("aria-valuenow")
    expect(securityValue).not.toBeNull()
    expect(parseFloat(securityValue!), "security weight should be 0").toBe(0)

    await page.screenshot({
      path: `${SCREENSHOT_BASE}/td-5-5b-ac2b-zero-weight/06-zero-weight-success.png`,
      fullPage: true,
    })
  })

  test("TD-5-5c AC-3: negative weight import shows validation error", async ({ page }) => {
    await page.goto("/")

    const hasComponents = await waitForComponentLibrary(page)
    test.skip(!hasComponents, "Skipped: Firestore has no seeded component data")

    await addComponentWithMetrics(page)

    const tempPath = path.join(SCREENSHOT_BASE, "td-5-5c-ac3-negative-weight", "negative-weight.yaml")
    await exportMutateAndReimport(page, tempPath, (doc) => {
      const wp = doc["weight_profile"] as Record<string, number>
      wp["performance"] = -0.1
    })

    // Expect error toast — weight=-0.1 is below WEIGHT_MIN (0)
    const errorToast = page.locator('[data-sonner-toast][data-type="error"]')
    await expect(errorToast).toBeVisible({ timeout: 5_000 })
    await expect(errorToast).toContainText("Import failed")

    await page.screenshot({
      path: `${SCREENSHOT_BASE}/td-5-5c-ac3-negative-weight/07-negative-weight-error.png`,
      fullPage: true,
    })
  })

  test("TD-5-5c AC-4: unknown category key shows validation error", async ({ page }) => {
    await page.goto("/")

    const hasComponents = await waitForComponentLibrary(page)
    test.skip(!hasComponents, "Skipped: Firestore has no seeded component data")

    await addComponentWithMetrics(page)

    const tempPath = path.join(SCREENSHOT_BASE, "td-5-5c-ac4-unknown-key", "unknown-key.yaml")
    await exportMutateAndReimport(page, tempPath, (doc) => {
      const wp = doc["weight_profile"] as Record<string, number>
      wp["unknown-category"] = 0.5
    })

    // WeightProfileSchema uses Zod .strict() — unknown keys cause validation error.
    // If schema changes to .passthrough(), this test becomes a false-green (TD-5-5c review #2).
    const errorToast = page.locator('[data-sonner-toast][data-type="error"]')
    await expect(errorToast).toBeVisible({ timeout: 5_000 })
    await expect(errorToast).toContainText("Import failed")

    await page.screenshot({
      path: `${SCREENSHOT_BASE}/td-5-5c-ac4-unknown-key/08-unknown-key-error.png`,
      fullPage: true,
    })
  })

  test("TD-5-5c AC-5: zero weight excludes category from aggregate score", async ({ page }) => {
    await page.goto("/")

    const hasComponents = await waitForComponentLibrary(page)
    test.skip(!hasComponents, "Skipped: Firestore has no seeded component data")

    await addComponentWithMetrics(page)

    // Read initial aggregate score (all weights = 1.0)
    const initialScore = await readAggregateScore(page)
    expect(initialScore).toBeGreaterThan(0)

    const tempPath = path.join(SCREENSHOT_BASE, "td-5-5c-ac5-zero-score-impact", "zero-security.yaml")
    await exportMutateAndReimport(page, tempPath, (doc) => {
      const wp = doc["weight_profile"] as Record<string, number>
      wp["security"] = 0
    })

    // Wait for import to complete
    await expect(page.locator('[data-testid="archie-node"]').first()).toBeVisible({ timeout: 10_000 })
    await page.waitForTimeout(500)

    // Score should decrease — zeroing a positive-weight category can only reduce or hold the aggregate
    const zeroSecurityScore = await readAggregateScore(page)
    expect(zeroSecurityScore).toBeLessThan(initialScore)

    await page.screenshot({
      path: `${SCREENSHOT_BASE}/td-5-5c-ac5-zero-score-impact/09-zero-weight-score-impact.png`,
      fullPage: true,
    })
  })
})
