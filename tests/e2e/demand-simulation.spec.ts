import { test, expect, type Page } from "@playwright/test"
import {
  waitForComponentLibrary,
  dragComponentToCanvas,
  triggerRecalcViaConfigChange,
  openDashboardOverlay,
} from "./helpers/canvas-helpers"
import path from "path"
import fs from "fs"

const SCREENSHOT_DIR = "test-results/demand-simulation"

// Heatmap severity ordering: lower number = worse (more degraded)
// SSoT: mirrors src/engine — keep values in sync if engine thresholds change
const SEVERITY: Record<string, number> = { bottleneck: 0, warning: 1, healthy: 2 }

/**
 * Select a scenario from the ScenarioSelector dropdown (Radix UI Select).
 * Waits for recalculation to settle after selection.
 */
async function selectScenario(page: Page, optionText: string) {
  const selector = page.locator('[data-testid="scenario-selector"]')
  const trigger = selector.locator('button[role="combobox"]')
  await expect(trigger).toBeEnabled({ timeout: 5_000 })
  await trigger.click()
  await page.locator('[role="listbox"]').waitFor({ state: "visible", timeout: 3_000 })
  await page.locator('[role="option"]').filter({ hasText: optionText }).click()
  await page.waitForTimeout(800) // recalculation settling for ALL nodes
}

/**
 * Select a failure scenario from the FailureSelector dropdown (Radix UI Select).
 * Waits for recalculation to settle after selection.
 */
async function selectFailureScenario(page: Page, optionText: string) {
  const selector = page.locator('[data-testid="failure-selector"]')
  const trigger = selector.locator('button[role="combobox"]')
  await expect(trigger).toBeEnabled({ timeout: 5_000 })
  await trigger.click()
  await page.locator('[role="listbox"]').waitFor({ state: "visible", timeout: 3_000 })
  await page.locator('[role="option"]').filter({ hasText: optionText }).click()
  await page.waitForTimeout(800) // recalculation settling for ALL nodes
}

/**
 * Read the heatmap status from a node's aria-label.
 * Format: "{componentName} \u2014 {heatmapStatus}" when heatmap is enabled.
 * Returns null if heatmap status is not present.
 */
async function getNodeHeatmapStatus(page: Page, componentName: string): Promise<string | null> {
  const node = page.locator('[data-testid="archie-node"]').filter({
    has: page.locator(`text="${componentName}"`),
  })
  await expect(node).toBeVisible({ timeout: 5_000 })
  const ariaLabel = await node.getAttribute("aria-label")
  // em-dash separator: \u2014
  const match = ariaLabel?.match(/\u2014\s*(\w+)$/)
  return match ? match[1] : null
}

/**
 * Read the dashboard aggregate score from the meter's aria-valuenow attribute.
 * Works in both single-score and dual-score (weighted|balanced) modes.
 * Returns null if the score element is not visible.
 */
async function getDashboardScore(page: Page): Promise<number | null> {
  const scoreEl = page.locator('[data-testid="aggregate-score"]')
  const visible = await scoreEl.isVisible().catch(() => false)
  if (!visible) return null
  const value = await scoreEl.getAttribute("aria-valuenow")
  return value ? parseFloat(value) : null
}

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
  // Trigger recalc on the newly placed node (last one = expectedCount - 1)
  await triggerRecalcViaConfigChange(page, expectedCount - 1)
  // Deselect: click canvas background to prevent React Flow selected-node overlay from
  // intercepting clicks on subsequent nodes
  await page.locator('[data-testid="canvas-panel"]').click({ position: { x: 10, y: 10 } })
  await expect(page.locator('[data-testid="inspector-panel"]')).toBeHidden({ timeout: 3_000 })
}

// All tests are AUTHENTICATED — auth pre-loaded from global storageState (see global-setup.ts).
// Fixture strategy: drag specific components from Firestore-seeded library.
//
// PREREQUISITE: Firestore must be seeded with component data that includes demand_responses.
// Run: GOOGLE_APPLICATION_CREDENTIALS=path/to/sa.json npm run seed:firestore
test.describe("Demand Simulation E2E (Story 9-5)", () => {
  test("AC-1/AC-2/AC-3/AC-4: scenario selection, semantic verification, pathway response, baseline restore", async ({
    page,
  }) => {
    test.setTimeout(60_000) // 3 components + scenario interactions need more time
    await page.goto("/")

    const hasComponents = await waitForComponentLibrary(page)
    test.skip(!hasComponents, "Skipped: Firestore has no seeded component data")

    // --- Setup: place PostgreSQL, Nginx, Redis (3 components, 2+ categories) ---
    const canvasPanel = page.locator('[data-testid="canvas-panel"]')
    const canvasBounds = await canvasPanel.boundingBox()
    test.skip(!canvasBounds, "Canvas panel not found")

    await addComponentWithMetrics(
      page, "postgresql",
      canvasBounds!.x + canvasBounds!.width * 0.2,
      canvasBounds!.y + canvasBounds!.height * 0.5,
      1,
    )
    await addComponentWithMetrics(
      page, "nginx",
      canvasBounds!.x + canvasBounds!.width * 0.5,
      canvasBounds!.y + canvasBounds!.height * 0.5,
      2,
    )
    await addComponentWithMetrics(
      page, "redis",
      canvasBounds!.x + canvasBounds!.width * 0.8,
      canvasBounds!.y + canvasBounds!.height * 0.5,
      3,
    )

    // Wait for tier evaluation and heatmap to settle
    await page.waitForTimeout(500)

    // --- AC-1: Capture baseline, select scenario, verify change ---
    const baselineScore = await getDashboardScore(page)
    // baselineScore may be null if dashboard hidden — heatmap-only path is valid for AC-1

    const baselinePostgres = await getNodeHeatmapStatus(page, "PostgreSQL")
    const baselineNginx = await getNodeHeatmapStatus(page, "Nginx")
    const baselineRedis = await getNodeHeatmapStatus(page, "Redis")

    await page.screenshot({
      path: `${SCREENSHOT_DIR}/01-baseline-architecture.png`,
      fullPage: true,
    })

    // Select "Traffic Peak" scenario
    await selectScenario(page, "Traffic Peak")

    // Verify scenario banner is visible with correct text (proves selection works)
    const banner = page.locator('[data-testid="scenario-banner"]')
    await expect(banner).toBeVisible({ timeout: 3_000 })
    await expect(banner).toContainText("Simulating: Traffic Peak")

    // Poll for demand scenario to take effect (deterministic, not fixed timeout)
    await expect.poll(
      async () => {
        const score = await getDashboardScore(page)
        const pg = await getNodeHeatmapStatus(page, "PostgreSQL")
        return (baselineScore !== null && score !== null && score !== baselineScore) ||
               (pg !== null && pg !== baselinePostgres)
      },
      { timeout: 5_000, message: "Demand scenario should affect dashboard score or heatmap" },
    ).toBe(true)

    // Read post-scenario values
    const peakScore = await getDashboardScore(page)
    const peakPostgres = await getNodeHeatmapStatus(page, "PostgreSQL")
    const peakNginx = await getNodeHeatmapStatus(page, "Nginx")
    const peakRedis = await getNodeHeatmapStatus(page, "Redis")

    // AC-1: At least one metric dimension must change.
    // Check both aggregate score AND per-node heatmap status.
    const scoreChanged = baselineScore !== null && peakScore !== null && peakScore !== baselineScore
    const heatmapChanged =
      peakPostgres !== baselinePostgres ||
      peakNginx !== baselineNginx ||
      peakRedis !== baselineRedis

    // If neither changed, demand_responses may not be seeded in Firestore.
    test.skip(
      !scoreChanged && !heatmapChanged,
      "Demand data not affecting metrics — re-seed Firestore: GOOGLE_APPLICATION_CREDENTIALS=... npm run seed:firestore",
    )

    // V6: score should decrease under demand pressure (not just change)
    if (scoreChanged) {
      expect(peakScore!).toBeLessThan(baselineScore!)
    }

    await page.screenshot({
      path: `${SCREENSHOT_DIR}/02-traffic-peak-active.png`,
      fullPage: true,
    })

    // --- AC-2: Semantic verification — PostgreSQL degrades more than Nginx ---
    // V6 compliance: hard assertions verify MEANING, not just PRESENCE
    expect(peakPostgres, "PostgreSQL heatmap status missing — verify demand_responses seeded").toBeTruthy()
    expect(peakNginx, "Nginx heatmap status missing — verify demand_responses seeded").toBeTruthy()
    expect(SEVERITY[peakPostgres!], `Unknown heatmap status: postgres=${peakPostgres}`).not.toBeUndefined()
    expect(SEVERITY[peakNginx!], `Unknown heatmap status: nginx=${peakNginx}`).not.toBeUndefined()
    // PostgreSQL should degrade strictly more than Nginx under traffic pressure
    // (database is a bottleneck under extreme traffic; web server/LB handles it better)
    expect(SEVERITY[peakPostgres!]).toBeLessThan(SEVERITY[peakNginx!])

    // --- AC-3: Pathway suggestions respond to demand ---
    await openDashboardOverlay(page)

    const pathwayToggle = page.locator('[data-testid="pathway-guidance-toggle"]')
    const pathwayPanel = page.locator('[data-testid="pathway-guidance-panel"]')

    const hasToggle = await pathwayToggle.isVisible().catch(() => false)
    if (hasToggle) {
      const panelVisible = await pathwayPanel.isVisible().catch(() => false)
      if (!panelVisible) {
        await pathwayToggle.click()
        await expect(pathwayPanel).toBeVisible({ timeout: 3_000 })
      }

      const suggestionCards = page.locator('[data-testid^="pathway-suggestion-"]')
      const cardCount = await suggestionCards.count()

      if (cardCount > 0) {
        // V6: verify at least one suggestion is demand-relevant
        const allText = (await suggestionCards.allTextContents()).join(" ").toLowerCase()
        const hasDemandRelevantSuggestion =
          allText.includes("cache") ||
          allText.includes("redis") ||
          allText.includes("cdn") ||
          allText.includes("load balancer") ||
          allText.includes("scaling") ||
          allText.includes("replica")
        // Soft assertion — pathway engine may not account for demand context yet
        expect(
          hasDemandRelevantSuggestion,
          "AC-3: No demand-relevant pathway suggestion (cache/redis/cdn/load balancer/scaling/replica) under Traffic Peak",
        ).toBe(true)
      }
    }

    await page.screenshot({
      path: `${SCREENSHOT_DIR}/05-pathway-suggestions-demand.png`,
      fullPage: true,
    })

    // Close overlay
    await page.keyboard.press("Escape")
    await expect(page.locator('[data-testid="dashboard-overlay"]')).toBeHidden({ timeout: 3_000 })

    // --- AC-4: Scenario deselection restores baseline ---
    await selectScenario(page, "No Scenario")

    // Banner should disappear
    await expect(banner).toBeHidden({ timeout: 3_000 })

    // Dashboard score should revert to baseline (poll for settling)
    if (scoreChanged) {
      await expect.poll(
        () => getDashboardScore(page),
        { timeout: 5_000, message: "Dashboard score should revert to baseline after deselection" },
      ).toBe(baselineScore)
    }

    // Heatmap should also revert
    if (heatmapChanged) {
      const restoredPostgres = await getNodeHeatmapStatus(page, "PostgreSQL")
      const restoredNginx = await getNodeHeatmapStatus(page, "Nginx")
      const restoredRedis = await getNodeHeatmapStatus(page, "Redis")

      expect(restoredPostgres).toBe(baselinePostgres)
      expect(restoredNginx).toBe(baselineNginx)
      expect(restoredRedis).toBe(baselineRedis)
    }

    await page.screenshot({
      path: `${SCREENSHOT_DIR}/03-no-scenario-restored.png`,
      fullPage: true,
    })
  })

  test("AC-5: YAML round-trip preserves scenario", async ({ page }) => {
    await page.goto("/")

    const hasComponents = await waitForComponentLibrary(page)
    test.skip(!hasComponents, "Skipped: Firestore has no seeded component data")

    // Place at least one component
    const canvasPanel = page.locator('[data-testid="canvas-panel"]')
    const canvasBounds = await canvasPanel.boundingBox()
    test.skip(!canvasBounds, "Canvas panel not found")

    await dragComponentToCanvas(
      page, "postgresql",
      canvasBounds!.x + canvasBounds!.width * 0.5,
      canvasBounds!.y + canvasBounds!.height * 0.5,
    )
    await expect(page.locator('[data-testid="archie-node"]')).toHaveCount(1, { timeout: 5_000 })
    await triggerRecalcViaConfigChange(page, 0)

    // Select "Traffic Peak" scenario
    await selectScenario(page, "Traffic Peak")
    await expect(page.locator('[data-testid="scenario-banner"]')).toBeVisible({ timeout: 3_000 })

    // Export architecture with scenario active
    const exportButton = page.locator('[data-testid="export-button"]')
    await expect(exportButton).toBeEnabled({ timeout: 5_000 })

    const tempDir = path.join(SCREENSHOT_DIR, "ac5-roundtrip")
    fs.mkdirSync(tempDir, { recursive: true })
    const tempPath = path.join(tempDir, "exported.yaml")

    const [download] = await Promise.all([
      page.waitForEvent("download"),
      exportButton.click(),
    ])
    await download.saveAs(tempPath)

    // Navigate fresh (clears store state)
    await page.goto("/")
    await expect(page.locator('[data-testid="toolbox-panel"]')).toBeVisible({ timeout: 15_000 })
    await waitForComponentLibrary(page)

    // Import the exported YAML
    const fileInput = page.locator('[data-testid="import-file-input"]')
    await fileInput.setInputFiles(tempPath)

    // Wait for nodes to appear from import
    await expect(page.locator('[data-testid="archie-node"]')).toHaveCount(1, { timeout: 10_000 })

    // Wait for recalculation + scenario restoration to settle
    await page.waitForTimeout(800)

    // Verify scenario is restored — check dropdown shows "Traffic Peak"
    const trigger = page
      .locator('[data-testid="scenario-selector"]')
      .locator('button[role="combobox"]')
    await expect(trigger).toContainText("Traffic Peak", { timeout: 5_000 })

    // Verify banner is visible
    await expect(page.locator('[data-testid="scenario-banner"]')).toBeVisible({ timeout: 3_000 })
    await expect(page.locator('[data-testid="scenario-banner"]')).toContainText(
      "Simulating: Traffic Peak",
    )

    await page.screenshot({
      path: `${SCREENSHOT_DIR}/04-yaml-round-trip.png`,
      fullPage: true,
    })

    // Cleanup exported YAML to avoid orphan accumulation
    try { fs.unlinkSync(tempPath) } catch { /* ignore cleanup errors */ }
  })
})

// --- Failure Scenario E2E (Story 9-7) ---

test.describe("Failure Scenario E2E (Story 9-7)", () => {
  test("AC-2/AC-4: failure selector, banner, stacking with demand, deselection restore", async ({
    page,
  }) => {
    test.setTimeout(60_000)
    await page.goto("/")

    const hasComponents = await waitForComponentLibrary(page)
    test.skip(!hasComponents, "Skipped: Firestore has no seeded component data")

    const canvasPanel = page.locator('[data-testid="canvas-panel"]')
    const canvasBounds = await canvasPanel.boundingBox()
    test.skip(!canvasBounds, "Canvas panel not found")

    // Place PostgreSQL + Redis (data-storage components most affected by failure modifiers)
    await addComponentWithMetrics(
      page, "postgresql",
      canvasBounds!.x + canvasBounds!.width * 0.3,
      canvasBounds!.y + canvasBounds!.height * 0.5,
      1,
    )
    await addComponentWithMetrics(
      page, "redis",
      canvasBounds!.x + canvasBounds!.width * 0.7,
      canvasBounds!.y + canvasBounds!.height * 0.5,
      2,
    )
    await page.waitForTimeout(500)

    // --- AC-2: Failure dropdown visible, shows 6 presets + "No Failure" ---
    const failureSelector = page.locator('[data-testid="failure-selector"]')
    await expect(failureSelector).toBeVisible({ timeout: 5_000 })

    // Capture baseline
    const baselineScore = await getDashboardScore(page)
    const baselinePostgres = await getNodeHeatmapStatus(page, "PostgreSQL")

    await page.screenshot({
      path: `${SCREENSHOT_DIR}/06-failure-baseline.png`,
      fullPage: true,
    })

    // Select "Database Failure" — targets data-durability, read-latency, write-throughput
    await selectFailureScenario(page, "Database Failure")

    // Failure banner should appear (red-themed, distinct from demand yellow)
    const failureBanner = page.locator('[data-testid="failure-banner"]')
    await expect(failureBanner).toBeVisible({ timeout: 3_000 })
    await expect(failureBanner).toContainText("Failure: Database Failure")

    // Poll for failure scenario to affect metrics
    await expect.poll(
      async () => {
        const score = await getDashboardScore(page)
        const pg = await getNodeHeatmapStatus(page, "PostgreSQL")
        return (baselineScore !== null && score !== null && score !== baselineScore) ||
               (pg !== null && pg !== baselinePostgres)
      },
      { timeout: 5_000, message: "Failure scenario should affect dashboard score or heatmap" },
    ).toBe(true)

    await page.screenshot({
      path: `${SCREENSHOT_DIR}/07-database-failure-active.png`,
      fullPage: true,
    })

    // --- AC-4: Stack demand + failure simultaneously ---
    // Capture failure-only score BEFORE adding demand (review fix #6: was reading stacked state twice)
    const failureOnlyScore = await getDashboardScore(page)

    await selectScenario(page, "Traffic Peak")

    // Both banners should be visible
    const demandBanner = page.locator('[data-testid="scenario-banner"]')
    await expect(demandBanner).toBeVisible({ timeout: 3_000 })
    await expect(failureBanner).toBeVisible({ timeout: 3_000 })

    // Both selectors visible simultaneously
    await expect(page.locator('[data-testid="scenario-selector"]')).toBeVisible()
    await expect(failureSelector).toBeVisible()

    // Wait for stacked recalculation to settle
    await page.waitForTimeout(500)
    const stackedScore = await getDashboardScore(page)

    // Stacked score should be <= failure-only score (demand adds more pressure)
    if (failureOnlyScore !== null && stackedScore !== null) {
      expect(stackedScore).toBeLessThanOrEqual(failureOnlyScore)
    }

    await page.screenshot({
      path: `${SCREENSHOT_DIR}/08-demand-plus-failure-stacked.png`,
      fullPage: true,
    })

    // --- Deselection: remove failure, demand remains ---
    await selectFailureScenario(page, "No Failure")
    await expect(failureBanner).toBeHidden({ timeout: 3_000 })
    // Demand banner should still be visible
    await expect(demandBanner).toBeVisible()

    // Remove demand too — full restore
    await selectScenario(page, "No Scenario")
    await expect(demandBanner).toBeHidden({ timeout: 3_000 })

    // Baseline should be restored
    if (baselineScore !== null) {
      await expect.poll(
        () => getDashboardScore(page),
        { timeout: 5_000, message: "Dashboard score should revert to baseline after clearing both" },
      ).toBe(baselineScore)
    }

    await page.screenshot({
      path: `${SCREENSHOT_DIR}/09-both-cleared-restored.png`,
      fullPage: true,
    })
  })

  test("AC-6: YAML round-trip preserves failure scenario", async ({ page }) => {
    await page.goto("/")

    const hasComponents = await waitForComponentLibrary(page)
    test.skip(!hasComponents, "Skipped: Firestore has no seeded component data")

    const canvasPanel = page.locator('[data-testid="canvas-panel"]')
    const canvasBounds = await canvasPanel.boundingBox()
    test.skip(!canvasBounds, "Canvas panel not found")

    // Place one component
    await dragComponentToCanvas(
      page, "postgresql",
      canvasBounds!.x + canvasBounds!.width * 0.5,
      canvasBounds!.y + canvasBounds!.height * 0.5,
    )
    await expect(page.locator('[data-testid="archie-node"]')).toHaveCount(1, { timeout: 5_000 })
    await triggerRecalcViaConfigChange(page, 0)

    // Select both demand and failure scenarios
    await selectScenario(page, "Traffic Peak")
    await selectFailureScenario(page, "Single Node Failure")

    await expect(page.locator('[data-testid="scenario-banner"]')).toBeVisible({ timeout: 3_000 })
    await expect(page.locator('[data-testid="failure-banner"]')).toBeVisible({ timeout: 3_000 })

    // Export
    const exportButton = page.locator('[data-testid="export-button"]')
    await expect(exportButton).toBeEnabled({ timeout: 5_000 })

    const tempDir = path.join(SCREENSHOT_DIR, "ac6-failure-roundtrip")
    fs.mkdirSync(tempDir, { recursive: true })
    const tempPath = path.join(tempDir, "exported-failure.yaml")

    const [download] = await Promise.all([
      page.waitForEvent("download"),
      exportButton.click(),
    ])
    await download.saveAs(tempPath)

    // Verify YAML contains both scenario IDs
    const yamlContent = fs.readFileSync(tempPath, "utf-8")
    expect(yamlContent).toContain("active_scenario_id: traffic-peak")
    expect(yamlContent).toContain("active_failure_scenario_id: failure-single-node")

    // Fresh page — import
    await page.goto("/")
    await expect(page.locator('[data-testid="toolbox-panel"]')).toBeVisible({ timeout: 15_000 })
    await waitForComponentLibrary(page)

    const fileInput = page.locator('[data-testid="import-file-input"]')
    await fileInput.setInputFiles(tempPath)

    await expect(page.locator('[data-testid="archie-node"]')).toHaveCount(1, { timeout: 10_000 })
    await page.waitForTimeout(800)

    // Verify demand scenario restored
    const scenarioTrigger = page
      .locator('[data-testid="scenario-selector"]')
      .locator('button[role="combobox"]')
    await expect(scenarioTrigger).toContainText("Traffic Peak", { timeout: 5_000 })

    // Verify failure scenario restored
    const failureTrigger = page
      .locator('[data-testid="failure-selector"]')
      .locator('button[role="combobox"]')
    await expect(failureTrigger).toContainText("Single Node Failure", { timeout: 5_000 })

    // Both banners visible
    await expect(page.locator('[data-testid="scenario-banner"]')).toBeVisible({ timeout: 3_000 })
    await expect(page.locator('[data-testid="failure-banner"]')).toBeVisible({ timeout: 3_000 })

    await page.screenshot({
      path: `${SCREENSHOT_DIR}/10-failure-yaml-round-trip.png`,
      fullPage: true,
    })

    // Cleanup
    try { fs.unlinkSync(tempPath) } catch { /* ignore cleanup errors */ }
  })
})
