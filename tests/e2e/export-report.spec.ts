import { test, expect, type Page } from "@playwright/test"
import { readFile } from "fs/promises"
import {
  waitForComponentLibrary,
  waitForBlueprints,
  dragComponentToCanvas,
  triggerRecalcViaConfigChange,
} from "./helpers/canvas-helpers"

const SCREENSHOT_DIR = "test-results/export-report"

/**
 * Place a component and trigger recalculation to populate computedMetrics.
 * Deselects the node afterward to prevent React Flow overlay interference.
 */
async function addComponentWithMetrics(
  page: Page,
  componentId: string,
  x: number,
  y: number,
  expectedCount: number,
) {
  await dragComponentToCanvas(page, componentId, x, y)
  await expect(page.locator('[data-testid="archie-node"]')).toHaveCount(expectedCount, {
    timeout: 5_000,
  })
  await triggerRecalcViaConfigChange(page, expectedCount - 1)
  // Deselect: click empty canvas area to close inspector
  await page.locator('[data-testid="canvas-panel"]').click({ position: { x: 10, y: 10 } })
  await expect(page.locator('[data-testid="inspector-panel"]')).toBeHidden({ timeout: 3_000 })
}

/**
 * Select a demand scenario from the ScenarioSelector dropdown.
 */
async function selectScenario(page: Page, optionText: string) {
  const selector = page.locator('[data-testid="scenario-selector"]')
  const trigger = selector.locator('button[role="combobox"]')
  await expect(trigger).toBeEnabled({ timeout: 5_000 })
  await trigger.click()
  await page.locator('[role="listbox"]').waitFor({ state: "visible", timeout: 3_000 })
  await page.locator('[role="option"]').filter({ hasText: optionText }).click()
  await page.waitForTimeout(800)
}

// All tests are AUTHENTICATED — auth pre-loaded from global storageState (see global-setup.ts).
// PREREQUISITE: Firestore must be seeded with component data.
test.describe("Export Report E2E (Story 10-4)", () => {
  test("AC-1: export report button disabled on empty canvas, enabled with 3+ components", async ({ page }) => {
    test.setTimeout(90_000)
    await page.goto("/")
    await expect(page.locator('[data-testid="toolbar"]')).toBeVisible({ timeout: 15_000 })

    // Empty canvas → report button must be disabled
    const reportButton = page.getByTestId("export-report-button")
    await expect(reportButton).toBeVisible()
    await expect(reportButton).toBeDisabled()

    await page.screenshot({
      path: `${SCREENSHOT_DIR}/01-report-button-disabled-empty.png`,
      fullPage: true,
    })

    // Add 3 components to enable the button
    const hasComponents = await waitForComponentLibrary(page)
    test.skip(!hasComponents, "Skipped: Firestore has no seeded component data")

    const canvasPanel = page.locator('[data-testid="canvas-panel"]')
    const canvasBounds = await canvasPanel.boundingBox()
    test.skip(!canvasBounds, "Canvas panel not found")

    await addComponentWithMetrics(page, "postgresql", canvasBounds!.x + canvasBounds!.width * 0.2, canvasBounds!.y + canvasBounds!.height * 0.5, 1)
    await addComponentWithMetrics(page, "redis", canvasBounds!.x + canvasBounds!.width * 0.5, canvasBounds!.y + canvasBounds!.height * 0.5, 2)
    await addComponentWithMetrics(page, "nginx", canvasBounds!.x + canvasBounds!.width * 0.8, canvasBounds!.y + canvasBounds!.height * 0.5, 3)

    // Report button should now be enabled
    await expect(reportButton).toBeEnabled({ timeout: 5_000 })

    await page.screenshot({
      path: `${SCREENSHOT_DIR}/02-report-button-enabled.png`,
      fullPage: true,
    })
  })

  test("AC-1/AC-7/AC-8/V2/V5: export triggers download with provenance footer", async ({ page }) => {
    test.setTimeout(60_000)
    await page.goto("/")

    const hasComponents = await waitForComponentLibrary(page)
    test.skip(!hasComponents, "Skipped: Firestore has no seeded component data")

    const canvasPanel = page.locator('[data-testid="canvas-panel"]')
    const canvasBounds = await canvasPanel.boundingBox()
    test.skip(!canvasBounds, "Canvas panel not found")

    // Place 3 components with metrics
    await addComponentWithMetrics(page, "postgresql", canvasBounds!.x + canvasBounds!.width * 0.2, canvasBounds!.y + canvasBounds!.height * 0.5, 1)
    await addComponentWithMetrics(page, "redis", canvasBounds!.x + canvasBounds!.width * 0.5, canvasBounds!.y + canvasBounds!.height * 0.5, 2)
    await addComponentWithMetrics(page, "nginx", canvasBounds!.x + canvasBounds!.width * 0.8, canvasBounds!.y + canvasBounds!.height * 0.5, 3)

    await page.waitForTimeout(500) // recalculation settling

    const reportButton = page.getByTestId("export-report-button")
    await expect(reportButton).toBeEnabled({ timeout: 5_000 })

    // Click export and capture the download event
    const [download] = await Promise.all([
      page.waitForEvent("download"),
      reportButton.click(),
    ])

    // AC-7: verify filename is sanitized and ends with -report.md
    const filename = download.suggestedFilename()
    expect(filename).toMatch(/-report\.md$/)
    // No path separators or special characters in filename
    expect(filename).not.toMatch(/[/\\]/)

    // V5: Read the downloaded file content
    const downloadPath = await download.path()
    expect(downloadPath).not.toBeNull()
    const content = await readFile(downloadPath!, "utf-8")

    // V2 CRITICAL: provenance footer must be present — stakeholders have no in-app context
    expect(content, "V2: report must contain AI-generated disclaimer").toContain("AI-generated")
    expect(content, "V2: report must mention directional estimates").toContain("directional")
    expect(content, "V2: report must warn against treating as benchmarks").toMatch(/not.*precise|not.*benchmark/i)

    // AC-8: disclaimer section header present
    expect(content).toContain("## Disclaimer")

    await page.screenshot({
      path: `${SCREENSHOT_DIR}/03-report-download-triggered.png`,
      fullPage: true,
    })
  })

  test("AC-2/AC-3/V1/V6: report content has executive summary and per-component details", async ({ page }) => {
    test.setTimeout(60_000)
    await page.goto("/")

    const hasComponents = await waitForComponentLibrary(page)
    test.skip(!hasComponents, "Skipped: Firestore has no seeded component data")

    const canvasPanel = page.locator('[data-testid="canvas-panel"]')
    const canvasBounds = await canvasPanel.boundingBox()
    test.skip(!canvasBounds, "Canvas panel not found")

    // Place 3 specific components
    await addComponentWithMetrics(page, "postgresql", canvasBounds!.x + canvasBounds!.width * 0.2, canvasBounds!.y + canvasBounds!.height * 0.5, 1)
    await addComponentWithMetrics(page, "redis", canvasBounds!.x + canvasBounds!.width * 0.5, canvasBounds!.y + canvasBounds!.height * 0.5, 2)
    await addComponentWithMetrics(page, "nginx", canvasBounds!.x + canvasBounds!.width * 0.8, canvasBounds!.y + canvasBounds!.height * 0.5, 3)

    await page.waitForTimeout(500)

    const reportButton = page.getByTestId("export-report-button")
    await expect(reportButton).toBeEnabled({ timeout: 5_000 })

    const [download] = await Promise.all([
      page.waitForEvent("download"),
      reportButton.click(),
    ])

    const downloadPath = await download.path()
    expect(downloadPath).not.toBeNull()
    const content = await readFile(downloadPath!, "utf-8")

    // AC-2: Executive Summary section with structured data
    expect(content, "AC-2: report must have Executive Summary").toContain("## Executive Summary")
    expect(content, "AC-2: summary must show component count").toContain("| Components |")
    expect(content, "AC-2: summary must show connection count").toContain("| Connections |")
    expect(content, "AC-2: summary must show architecture tier").toContain("| Architecture Tier |")
    expect(content, "AC-2: summary must show overall score").toContain("| Overall Score |")

    // V6 SEMANTIC: component count in report should match placed count (3)
    // Extract the "| Components | N |" value
    const componentCountMatch = content.match(/\| Components \| (\d+) \|/)
    expect(componentCountMatch, "V6: component count row must be present").not.toBeNull()
    expect(parseInt(componentCountMatch![1]), "V6: component count must equal 3 (placed)").toBe(3)

    // AC-3: Component Details section with actual component names
    expect(content, "AC-3: report must have Component Details").toContain("## Component Details")

    // V6 SEMANTIC: verify placed component names appear in the report
    // Component names are displayed as "### ComponentName (Category)"
    // The exact display names depend on the component library, but the report
    // should contain at least the section headers
    const componentSections = content.match(/^### .+$/gm) ?? []
    expect(
      componentSections.length,
      "V6: report should have 3 component detail sections (one per placed component)",
    ).toBe(3)

    // V1: Each component section should have score information
    expect(content, "V1: report must show Overall Score per component").toMatch(/\*\*Overall Score:\*\* \d/)
    expect(content, "V1: report must show Health Status per component").toMatch(/\*\*Health Status:\*\*/)
    expect(content, "V1: report must show Top Metrics per component").toContain("**Top Metrics:**")

    // V6: Verify scores are actual numbers, not placeholders
    const scoreMatches = content.match(/\*\*Overall Score:\*\* ([\d.]+)\/10/g) ?? []
    expect(scoreMatches.length, "V6: each component should have a numeric score").toBe(3)

    await page.screenshot({
      path: `${SCREENSHOT_DIR}/04-report-content-verified.png`,
      fullPage: true,
    })
  })

  test("AC-5/V3: scenario impact section appears in report when scenario active", async ({ page }) => {
    test.setTimeout(90_000)
    await page.goto("/")

    const hasComponents = await waitForComponentLibrary(page)
    test.skip(!hasComponents, "Skipped: Firestore has no seeded component data")

    const canvasPanel = page.locator('[data-testid="canvas-panel"]')
    const canvasBounds = await canvasPanel.boundingBox()
    test.skip(!canvasBounds, "Canvas panel not found")

    // Place 3 components with metrics
    await addComponentWithMetrics(page, "postgresql", canvasBounds!.x + canvasBounds!.width * 0.2, canvasBounds!.y + canvasBounds!.height * 0.5, 1)
    await addComponentWithMetrics(page, "redis", canvasBounds!.x + canvasBounds!.width * 0.5, canvasBounds!.y + canvasBounds!.height * 0.5, 2)
    await addComponentWithMetrics(page, "nginx", canvasBounds!.x + canvasBounds!.width * 0.8, canvasBounds!.y + canvasBounds!.height * 0.5, 3)

    await page.waitForTimeout(500)

    // --- First: export WITHOUT scenario → verify "no scenario" text ---
    const reportButton = page.getByTestId("export-report-button")
    await expect(reportButton).toBeEnabled({ timeout: 5_000 })

    const [baselineDownload] = await Promise.all([
      page.waitForEvent("download"),
      reportButton.click(),
    ])

    const baselinePath = await baselineDownload.path()
    const baselineContent = await readFile(baselinePath!, "utf-8")

    expect(
      baselineContent,
      "Without scenario: report should say no scenario active",
    ).toMatch(/[Nn]o demand or failure scenario/)
    expect(baselineContent).toContain("| Active Demand Scenario | None |")

    await page.screenshot({
      path: `${SCREENSHOT_DIR}/05-report-no-scenario.png`,
      fullPage: true,
    })

    // --- Second: activate demand scenario, export again ---
    // Check if the scenario selector exists (Epic 9 feature)
    const scenarioSelector = page.locator('[data-testid="scenario-selector"]')
    const hasScenariosUI = await scenarioSelector.isVisible().catch(() => false)
    test.skip(!hasScenariosUI, "Scenario selector not visible — Epic 9 may not be deployed")

    await selectScenario(page, "Traffic Peak")

    // Verify scenario banner appeared
    const banner = page.locator('[data-testid="scenario-banner"]')
    await expect(banner).toBeVisible({ timeout: 3_000 })

    // Export again with scenario active
    const [scenarioDownload] = await Promise.all([
      page.waitForEvent("download"),
      reportButton.click(),
    ])

    const scenarioPath = await scenarioDownload.path()
    const scenarioContent = await readFile(scenarioPath!, "utf-8")

    // V3: Scenario Impact section should now appear
    expect(scenarioContent, "V3: report must have Scenario Impact section").toContain("## Scenario Impact")
    expect(
      scenarioContent,
      "V3: scenario name should appear in report",
    ).toContain("Traffic Peak")

    // V6 SEMANTIC: if scenario comparison data exists, verify the table structure
    if (scenarioContent.includes("Most Affected Components")) {
      expect(scenarioContent).toContain("| Component | Overall Score | Health Status |")
      // Should have at least one component row in the table
      const tableRows = scenarioContent.match(/\| .+ \| [\d.]+\/10 \| \w+ \|/g) ?? []
      expect(
        tableRows.length,
        "V6: scenario impact table should list affected components with scores",
      ).toBeGreaterThan(0)
    }

    // V2: provenance footer still present even with scenario
    expect(scenarioContent, "V2: provenance footer must survive scenario addition").toContain("AI-generated")

    await page.screenshot({
      path: `${SCREENSHOT_DIR}/06-report-with-scenario.png`,
      fullPage: true,
    })
  })
})
