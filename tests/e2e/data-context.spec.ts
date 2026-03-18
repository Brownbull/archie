import { test, expect, type Page } from "@playwright/test"
import {
  waitForBlueprints,
  waitForComponentLibrary,
  selectNodeOnCanvas,
  placeTwoComponents,
  triggerRecalcViaConfigChange,
} from "./helpers/canvas-helpers"
import * as path from "path"
import * as fs from "fs"
import { load } from "js-yaml"

const SCREENSHOT_DIR = "test-results/data-context"

/**
 * Navigate to the Data section in the inspector and ensure the
 * Data Context collapsible is expanded.
 */
async function navigateToDataSection(page: Page): Promise<void> {
  const sectionNav = page.locator('[data-testid="inspector-section-nav"]')
  await expect(sectionNav).toBeVisible({ timeout: 3_000 })
  await sectionNav.locator("button").filter({ hasText: "Data" }).click()
  // Collapsible defaults to open, but click trigger if panel isn't visible
  const panel = page.locator('[data-testid="data-context-panel"]')
  const isVisible = await panel.isVisible()
  if (!isVisible) {
    await page.locator('[data-testid="data-context-section-trigger"]').click()
    await expect(panel).toBeVisible({ timeout: 3_000 })
  }
}

/**
 * Add a data context item via the inspector form.
 * Native <select> elements use selectOption (not combobox click).
 */
async function addDataContextItem(
  page: Page,
  name: string,
  access: string,
  size: string,
  structure: string,
): Promise<void> {
  await page.locator('[data-testid="data-context-add-button"]').click()
  const form = page.locator('[data-testid="data-context-form"]')
  await expect(form).toBeVisible({ timeout: 3_000 })

  await form.locator('input[type="text"]').fill(name)
  await page.locator('[data-testid="data-context-select-access"]').selectOption(access)
  await page.locator('[data-testid="data-context-select-size"]').selectOption(size)
  await page.locator('[data-testid="data-context-select-structure"]').selectOption(structure)

  await page.locator('[data-testid="data-context-form-submit"]').click()
  await expect(form).toBeHidden({ timeout: 3_000 })
}

// All tests are AUTHENTICATED — auth pre-loaded from global storageState (see global-setup.ts).
test.describe("Data Context E2E (Story 7-4)", () => {
  test("AC-1/AC-3: add data item, see fit indicator, expand explanation", async ({ page }) => {
    await page.goto("/")
    await expect(page.locator('[data-testid="toolbox-panel"]')).toBeVisible({ timeout: 15_000 })

    const hasBlueprints = await waitForBlueprints(page)
    test.skip(!hasBlueprints, "No blueprints available in this environment")

    // Load first blueprint to get components with dataFitProfile
    await page.locator('[data-testid="blueprint-load-button"]').first().click()
    await page.locator('[data-testid="archie-node"]').first().waitFor({ state: "visible", timeout: 5_000 })

    // Select first node to open inspector
    await selectNodeOnCanvas(page, 0)
    await navigateToDataSection(page)

    // Add data context item
    await addDataContextItem(page, "User Profiles", "read-heavy", "medium", "nested-json")

    // Assert fit indicator appears (dynamic IDs — use prefix selector)
    const fitIndicator = page.locator('[data-testid^="fit-indicator-"]').first()
    await expect(fitIndicator).toBeVisible({ timeout: 3_000 })

    // Assert fit badge shows a valid level
    const fitBadge = page.locator('[data-testid^="fit-badge-"]').first()
    await expect(fitBadge).toBeVisible()
    const badgeText = await fitBadge.textContent()
    expect(["Great Fit", "Good Fit", "Trade-off", "Poor Fit", "Risky"]).toContain(badgeText?.trim())

    // Click fit indicator to expand explanation (AC-3)
    await fitIndicator.click()
    const fitExplanation = page.locator('[data-testid^="fit-explanation-"]').first()
    await expect(fitExplanation).toBeVisible({ timeout: 3_000 })

    await page.screenshot({
      path: `${SCREENSHOT_DIR}/01-data-context-fit.png`,
      fullPage: true,
    })
  })

  test("AC-2: variant switch updates fit indicator", async ({ page }) => {
    await page.goto("/")
    await expect(page.locator('[data-testid="toolbox-panel"]')).toBeVisible({ timeout: 15_000 })

    const hasBlueprints = await waitForBlueprints(page)
    test.skip(!hasBlueprints, "No blueprints available in this environment")

    // Load blueprint and select first node
    await page.locator('[data-testid="blueprint-load-button"]').first().click()
    await page.locator('[data-testid="archie-node"]').first().waitFor({ state: "visible", timeout: 5_000 })

    await selectNodeOnCanvas(page, 0)
    await navigateToDataSection(page)
    await addDataContextItem(page, "User Profiles", "read-heavy", "medium", "nested-json")

    // Verify fit badge is visible before variant switch
    await expect(page.locator('[data-testid^="fit-badge-"]').first()).toBeVisible({ timeout: 3_000 })

    // Switch variant — this clicks the node and opens inspector config selector
    await triggerRecalcViaConfigChange(page, 0)

    // Re-navigate to data section — triggerRecalcViaConfigChange re-clicks the node
    // which re-renders the inspector, so we must switch back to the Data tab
    await navigateToDataSection(page)

    // Assert fit badge is still visible with a valid level
    const fitBadge = page.locator('[data-testid^="fit-badge-"]').first()
    await expect(fitBadge).toBeVisible({ timeout: 3_000 })
    const levelText = await fitBadge.textContent()
    expect(["Great Fit", "Good Fit", "Trade-off", "Poor Fit", "Risky"]).toContain(levelText?.trim())

    await page.screenshot({
      path: `${SCREENSHOT_DIR}/02-variant-switched-fit.png`,
      fullPage: true,
    })
  })

  test("AC-4: export/import round-trip preserves data context items", async ({ page }) => {
    await page.goto("/")
    await expect(page.locator('[data-testid="canvas-panel"]')).toBeVisible({ timeout: 15_000 })

    // Ensure Components tab is active before waiting for library
    await page.getByRole("tab", { name: "Components" }).click()
    const hasComponents = await waitForComponentLibrary(page)
    test.skip(!hasComponents, "Component library unavailable in this environment")

    // Place two components on canvas
    const placed = await placeTwoComponents(page)
    test.skip(placed < 2, "Need at least 2 component cards")

    // Add data context item to first component
    await selectNodeOnCanvas(page, 0)
    await navigateToDataSection(page)
    await addDataContextItem(page, "User Profiles", "read-heavy", "medium", "nested-json")

    // Deselect first node by clicking canvas blank area
    await page.locator('[data-testid="canvas-panel"]').click({ position: { x: 10, y: 10 } })
    await expect(page.locator('[data-testid="inspector-panel"]')).toBeHidden({ timeout: 3_000 })

    // Add data context item to second component
    await selectNodeOnCanvas(page, 1)
    await navigateToDataSection(page)
    await addDataContextItem(page, "Session Tokens", "write-heavy", "small", "simple-kv")

    // Deselect second node
    await page.locator('[data-testid="canvas-panel"]').click({ position: { x: 10, y: 10 } })
    await expect(page.locator('[data-testid="inspector-panel"]')).toBeHidden({ timeout: 3_000 })

    // Export architecture
    const exportButton = page.locator('[data-testid="export-button"]')
    await expect(exportButton).toBeEnabled({ timeout: 5_000 })

    const tempDir = path.join(SCREENSHOT_DIR, "ac4-roundtrip")
    fs.mkdirSync(tempDir, { recursive: true })
    const tempPath = path.join(tempDir, "exported.yaml")

    try {
      const [download] = await Promise.all([
        page.waitForEvent("download"),
        exportButton.click(),
      ])
      await download.saveAs(tempPath)

      // Verify YAML contains data_context on both nodes
      const rawYaml = fs.readFileSync(tempPath, "utf-8")
      const parsed = load(rawYaml) as Record<string, unknown>
      const nodes = parsed.nodes as Array<Record<string, unknown>>
      expect(nodes).toBeDefined()

      const nodesWithDataContext = nodes.filter(
        (n) => Array.isArray(n.data_context) && n.data_context.length > 0,
      )
      expect(nodesWithDataContext.length).toBeGreaterThanOrEqual(2)

      // Navigate fresh and reimport
      await page.goto("/")
      await expect(page.locator('[data-testid="toolbox-panel"]')).toBeVisible({ timeout: 15_000 })
      await waitForComponentLibrary(page)

      const fileInput = page.locator('[data-testid="import-file-input"]')
      await fileInput.setInputFiles(tempPath)

      // Wait for nodes to appear from import
      await expect(page.locator('[data-testid="archie-node"]')).toHaveCount(2, { timeout: 10_000 })

      // Let recalculation settle after import
      await page.waitForTimeout(500)

      // Select first node and verify data context items restored
      await selectNodeOnCanvas(page, 0)
      await navigateToDataSection(page)

      // At least one data context item should be present
      await expect(
        page.locator('[data-testid^="data-context-item-"]').first(),
      ).toBeVisible({ timeout: 3_000 })

      // Fit indicator should be visible (re-derived, not stale)
      await expect(
        page.locator('[data-testid^="fit-indicator-"]').first(),
      ).toBeVisible({ timeout: 3_000 })

      // Verify second node's data context items also restored
      await page.locator('[data-testid="canvas-panel"]').click({ position: { x: 10, y: 10 } })
      await expect(page.locator('[data-testid="inspector-panel"]')).toBeHidden({ timeout: 3_000 })
      await selectNodeOnCanvas(page, 1)
      await navigateToDataSection(page)

      await expect(
        page.locator('[data-testid^="data-context-item-"]').first(),
      ).toBeVisible({ timeout: 3_000 })

      await page.screenshot({
        path: `${SCREENSHOT_DIR}/03-data-context-roundtrip.png`,
        fullPage: true,
      })
    } finally {
      // Clean up temp export file to prevent stale data on retries
      try { fs.unlinkSync(tempPath) } catch { /* ignore */ }
    }
  })
})
