import { test, expect, type Page } from "@playwright/test"
import {
  waitForComponentLibrary,
  addComponentToCanvas,
  triggerRecalcViaConfigChange,
} from "./helpers/canvas-helpers"
import * as path from "path"
import * as fs from "fs"
import { load, dump } from "js-yaml"

const SCREENSHOT_DIR = "test-results/constraint-guardrails"

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
  await expect(page.locator('[data-testid="dashboard-overlay"]')).toBeVisible({
    timeout: 5_000,
  })
}

/**
 * Expand the Constraint Guardrails collapsible inside the dashboard overlay.
 */
async function openConstraintPanel(page: Page) {
  const toggle = page.locator('[data-testid="constraint-guardrails-toggle"]')
  await expect(toggle).toBeVisible()
  await toggle.click()
  await expect(page.locator('[data-testid="constraint-panel"]')).toBeVisible({
    timeout: 3_000,
  })
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
  // Click "Add Constraint" to show the form
  await page.locator('[data-testid="constraint-add-button"]').click()
  await expect(page.locator('[data-testid="constraint-form"]')).toBeVisible({
    timeout: 3_000,
  })

  // Fill form fields — native <select> elements use selectOption
  await page
    .locator('[data-testid="constraint-category-select"]')
    .selectOption(categoryId)
  await page
    .locator('[data-testid="constraint-operator-select"]')
    .selectOption(operator)

  // Threshold input defaults to "5" — clear then fill
  const thresholdInput = page.locator('[data-testid="constraint-threshold-input"]')
  await thresholdInput.clear()
  await thresholdInput.fill(threshold)

  // Save
  await page.locator('[data-testid="constraint-save-button"]').click()

  // Wait for constraint evaluation to settle
  await page.waitForTimeout(500)
}

test.describe("Constraint Guardrails E2E (Story 6-5)", () => {
  test("AC-1/AC-2/AC-3: add constraint, click violation navigates, remove clears badges", async ({
    page,
  }) => {
    await page.goto("/")

    const hasComponents = await waitForComponentLibrary(page)
    test.skip(!hasComponents, "Skipped: Firestore has no seeded component data")

    // Place a component with computed metrics (needed for constraint evaluation)
    await addComponentWithMetrics(page, 0)

    // Open overlay → constraint panel
    await openDashboardOverlay(page)
    await openConstraintPanel(page)

    // --- AC-1: Add constraint and see violation badge ---
    // Use "performance gte 10" — guaranteed to violate (no component averages exactly 10.0)
    await addConstraint(page, "performance", "gte", "10")

    // Verify violation badge appears on canvas node(s)
    // Close overlay first to see the canvas
    await page.keyboard.press("Escape")
    await expect(page.locator('[data-testid="dashboard-overlay"]')).toBeHidden({
      timeout: 3_000,
    })

    const violationBadges = page.locator(
      '[data-testid="constraint-violation-badge"]',
    )
    await expect(violationBadges.first()).toBeVisible({ timeout: 5_000 })

    await page.screenshot({
      path: `${SCREENSHOT_DIR}/01-constraint-violation.png`,
      fullPage: true,
    })

    // --- AC-2: Click violation entry → canvas navigates to component ---
    await openDashboardOverlay(page)
    await openConstraintPanel(page)

    // Verify violation list is visible
    const violationList = page.locator(
      '[data-testid="constraint-violation-list"]',
    )
    await expect(violationList).toBeVisible()

    // Click the first violation entry (button inside the violation list)
    const firstViolation = violationList.locator("button").first()
    await expect(firstViolation).toBeVisible()
    await firstViolation.click()

    // After clicking: overlay closes (handleViolationClick calls onCloseOverlay)
    await expect(page.locator('[data-testid="dashboard-overlay"]')).toBeHidden({
      timeout: 3_000,
    })

    // Node gets selected via pendingNavNodeId → inspector panel opens
    await expect(page.locator('[data-testid="inspector-panel"]')).toBeVisible({
      timeout: 5_000,
    })

    // --- AC-3: Remove constraint → violation badges disappear ---
    await openDashboardOverlay(page)
    await openConstraintPanel(page)

    // Delete the constraint (only one exists, use prefix selector)
    const deleteButton = page.locator('[data-testid^="constraint-delete-"]').first()
    await expect(deleteButton).toBeVisible()
    await deleteButton.click()

    // Wait for constraint evaluation to settle
    await page.waitForTimeout(500)

    // Close overlay to check canvas
    await page.keyboard.press("Escape")
    await expect(page.locator('[data-testid="dashboard-overlay"]')).toBeHidden({
      timeout: 3_000,
    })

    // Violation badges should be gone
    await expect(violationBadges).toHaveCount(0, { timeout: 5_000 })

    await page.screenshot({
      path: `${SCREENSHOT_DIR}/02-constraint-removed.png`,
      fullPage: true,
    })
  })

  test("AC-4: export/import round-trip preserves constraints", async ({
    page,
  }) => {
    await page.goto("/")

    const hasComponents = await waitForComponentLibrary(page)
    test.skip(!hasComponents, "Skipped: Firestore has no seeded component data")

    // Place a component with computed metrics
    await addComponentWithMetrics(page, 0)

    // Open overlay → constraint panel → add two constraints
    await openDashboardOverlay(page)
    await openConstraintPanel(page)

    await addConstraint(page, "cost-efficiency", "lte", "4")
    await addConstraint(page, "performance", "gte", "7")

    // Verify two constraints exist before export
    const constraintItems = page.locator('[data-testid^="constraint-item-"]')
    await expect(constraintItems).toHaveCount(2, { timeout: 3_000 })

    // Close overlay for export
    await page.keyboard.press("Escape")
    await expect(page.locator('[data-testid="dashboard-overlay"]')).toBeHidden({
      timeout: 3_000,
    })

    // Export architecture
    const exportButton = page.locator('[data-testid="export-button"]')
    await expect(exportButton).toBeEnabled({ timeout: 5_000 })
    const tempDir = path.join(SCREENSHOT_DIR, "ac4-roundtrip")
    fs.mkdirSync(tempDir, { recursive: true })
    const tempPath = path.join(tempDir, "exported.yaml")

    const [download] = await Promise.all([
      page.waitForEvent("download"),
      exportButton.click(),
    ])
    await download.saveAs(tempPath)

    // Verify YAML contains constraints
    const rawYaml = fs.readFileSync(tempPath, "utf-8")
    const parsed = load(rawYaml) as Record<string, unknown>
    expect(parsed).toHaveProperty("constraints")
    const constraints = parsed.constraints as unknown[]
    expect(constraints).toHaveLength(2)

    // Navigate fresh and reimport
    await page.goto("/")
    await expect(page.locator('[data-testid="dashboard-panel"]')).toBeVisible({
      timeout: 15_000,
    })
    await waitForComponentLibrary(page)

    const fileInput = page.locator('[data-testid="import-file-input"]')
    await fileInput.setInputFiles(tempPath)

    // Wait for nodes to appear from import
    await expect(page.locator('[data-testid="archie-node"]')).toHaveCount(1, {
      timeout: 10_000,
    })

    // Wait for recalculation to settle
    await page.waitForTimeout(500)

    // Verify constraints restored
    await openDashboardOverlay(page)
    await openConstraintPanel(page)

    // Two constraint items should be present (IDs regenerated, but count matches)
    await expect(
      page.locator('[data-testid^="constraint-item-"]'),
    ).toHaveCount(2, { timeout: 5_000 })

    // Verify constraint content includes category names
    const panelText = await page
      .locator('[data-testid="constraint-panel"]')
      .textContent()
    expect(panelText).toContain("Cost Efficiency")
    expect(panelText).toContain("Performance")

    // Close overlay and check for violation badges on canvas
    await page.keyboard.press("Escape")
    await expect(page.locator('[data-testid="dashboard-overlay"]')).toBeHidden({
      timeout: 3_000,
    })

    // At least some violation badges should be visible (gte 7 is restrictive)
    const badges = page.locator('[data-testid="constraint-violation-badge"]')
    await expect(badges.first()).toBeVisible({ timeout: 5_000 })

    await page.screenshot({
      path: `${SCREENSHOT_DIR}/03-constraints-roundtrip.png`,
      fullPage: true,
    })
  })
})
