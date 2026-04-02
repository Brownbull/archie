import { test, expect, type Page } from "@playwright/test"
import {
  waitForComponentLibrary,
  waitForBlueprints,
  dragComponentToCanvas,
  triggerRecalcViaConfigChange,
  openDashboardOverlay,
} from "./helpers/canvas-helpers"

const SCREENSHOT_DIR = "test-results/expanded-content"

// SSoT: 18 components seeded for Epic 11 (src/data/components/ — 18 yaml files)
const EXPECTED_TOTAL_COMPONENTS = 18

// Heatmap severity ordering: lower number = worse (more degraded)
// SSoT: mirrors src/engine — keep values in sync if engine thresholds change
const SEVERITY: Record<string, number> = { bottleneck: 0, warning: 1, healthy: 2 }

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
  await page.locator('[data-testid="canvas-panel"]').click({ position: { x: 10, y: 10 } })
  await expect(page.locator('[data-testid="inspector-panel"]')).toBeHidden({ timeout: 3_000 })
}

/**
 * Read the shortName abbreviations from inline metric bars on a given node.
 * Extracts from aria-label format "{abbreviation}: {value}" on role="meter" elements.
 */
async function readInlineMetricLabels(page: Page, nodeIndex: number): Promise<string[]> {
  const node = page.locator('[data-testid="archie-node"]').nth(nodeIndex)
  const meters = node.locator('[data-testid="inline-metric-bar"] [role="meter"]')
  const count = await meters.count()
  const labels: string[] = []
  for (let i = 0; i < count; i++) {
    const ariaLabel = await meters.nth(i).getAttribute("aria-label")
    if (ariaLabel) {
      const abbr = ariaLabel.split(":")[0].trim()
      labels.push(abbr)
    }
  }
  return labels
}

/**
 * Select an option from a Radix UI Select dropdown by data-testid.
 * Waits for recalculation to settle after selection.
 */
async function selectFromDropdown(page: Page, selectorTestId: string, optionText: string) {
  const trigger = page.locator(`[data-testid="${selectorTestId}"]`).locator('button[role="combobox"]')
  await expect(trigger).toBeEnabled({ timeout: 5_000 })
  await trigger.click()
  await page.locator('[role="listbox"]').waitFor({ state: "visible", timeout: 3_000 })
  await page.locator('[role="option"]').filter({ hasText: optionText }).click()
  await page.waitForTimeout(800) // recalculation settling for ALL nodes
}

/**
 * Read the heatmap status from a node's aria-label.
 * Format: "{componentName} — {heatmapStatus}" when heatmap is enabled.
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
 */
async function getDashboardScore(page: Page): Promise<number | null> {
  const scoreEl = page.locator('[data-testid="aggregate-score"]')
  const visible = await scoreEl.isVisible().catch(() => false)
  if (!visible) return null
  const value = await scoreEl.getAttribute("aria-valuenow")
  return value ? parseFloat(value) : null
}

/**
 * Expand the weight sliders collapsible in the DashboardOverlay.
 */
async function openWeightSliders(page: Page) {
  const section = page.locator('[data-testid="weight-sliders-section"]')
  const alreadyVisible = await section.isVisible().catch(() => false)
  if (alreadyVisible) return

  const toggle = page.locator('[data-testid="weight-sliders-toggle"]')
  await expect(toggle).toBeVisible({ timeout: 5_000 })
  await toggle.click()
  await expect(section).toBeVisible({ timeout: 3_000 })
}

/**
 * Adjust a weight slider by pressing arrow keys.
 * @param direction "left" decreases, "right" increases (step=0.1)
 */
async function adjustSlider(
  page: Page,
  categoryId: string,
  steps: number,
  direction: "left" | "right" = "left",
  settle = true,
) {
  const thumb = page
    .locator(`[data-testid="weight-slider-${categoryId}"]`)
    .locator('[role="slider"]')
  await thumb.focus()
  const key = direction === "left" ? "ArrowLeft" : "ArrowRight"
  for (let i = 0; i < steps; i++) {
    await page.keyboard.press(key)
  }
  if (settle) {
    await page.waitForTimeout(300)
  }
}

/**
 * Load a specific blueprint by name. Handles the confirmation dialog
 * if canvas already has nodes.
 */
async function loadBlueprintByName(page: Page, name: string, canvasHasNodes: boolean) {
  const hasBlueprints = await waitForBlueprints(page)
  test.skip(!hasBlueprints, "Skipped: no blueprints available")

  const card = page.locator('[data-testid="blueprint-card"]').filter({
    has: page.locator('[data-testid="blueprint-card-name"]', { hasText: name }),
  })
  await expect(card).toBeVisible({ timeout: 5_000 })
  await card.locator('[data-testid="blueprint-load-button"]').click()

  if (canvasHasNodes) {
    // Confirmation dialog appears when canvas has existing nodes
    const dialog = page.locator('[role="dialog"]')
    await expect(dialog).toBeVisible({ timeout: 3_000 })
    await dialog.locator("button").filter({ hasText: "Load" }).click()
  }

  // Check for hydration error
  const loadError = page.locator('[data-testid="blueprint-load-error"]')
  const hasError = await loadError.isVisible().catch(() => false)
  test.skip(hasError, "Blueprint hydration failed — component_ids may not match seeded library")
}

// All tests are AUTHENTICATED — auth pre-loaded from global storageState (see global-setup.ts).
// Fixture strategy: uses Firestore-seeded library. No shared staging state.
//
// PREREQUISITE: Firestore must be seeded with Epic 11 component data.
// Run: GOOGLE_APPLICATION_CREDENTIALS=path/to/sa.json npm run seed:firestore
test.describe("Expanded Content E2E (Story 11-6)", () => {
  // --- AC-1 + AC-2: Component and Blueprint Loading ---
  test("AC-1/AC-2: 18 components load, AI Agent Orchestration blueprint renders correctly", async ({
    page,
  }) => {
    test.setTimeout(60_000)
    await page.goto("/")

    const hasComponents = await waitForComponentLibrary(page)
    test.skip(!hasComponents, "Skipped: Firestore has no seeded component data")

    // --- AC-1: All 18 components visible ---

    // Count all component cards in DOM (includes scrolled-out-of-view cards)
    const componentCards = page.locator('[data-testid^="component-card-"]')
    const totalComponents = await componentCards.count()
    expect(totalComponents, "Should have at least 18 components in the library").toBeGreaterThanOrEqual(EXPECTED_TOTAL_COMPONENTS)

    // Verify the 8 new Epic 11 components exist by data-testid
    const newComponentIds = [
      "llm-gateway",
      "vector-db",
      "serverless",
      "etl-pipeline",
      "payment-gateway",
      "graph-db",
      "data-lake",
      "siem",
    ]
    for (const compId of newComponentIds) {
      const card = page.locator(`[data-testid="component-card-${compId}"]`)
      // scrollIntoViewIfNeeded makes cards below the fold visible
      await card.scrollIntoViewIfNeeded()
      await expect(card, `New component "${compId}" should exist in toolbox`).toBeVisible({ timeout: 3_000 })
    }

    // Verify categories exist (at least 6 from the component data)
    const categories = page.locator('[data-testid^="category-"]')
    const categoryCount = await categories.count()
    expect(categoryCount, "Should have at least 6 component categories").toBeGreaterThanOrEqual(6)

    await page.screenshot({
      path: `${SCREENSHOT_DIR}/01-toolbox-18-components.png`,
      fullPage: true,
    })

    // Place one new component to verify drag-and-drop works
    const canvasPanel = page.locator('[data-testid="canvas-panel"]')
    const canvasBounds = await canvasPanel.boundingBox()
    test.skip(!canvasBounds, "Canvas panel not found")

    await addComponentWithMetrics(
      page,
      "llm-gateway",
      canvasBounds!.x + canvasBounds!.width * 0.5,
      canvasBounds!.y + canvasBounds!.height * 0.5,
      1,
    )

    await page.screenshot({
      path: `${SCREENSHOT_DIR}/02-new-component-placed.png`,
      fullPage: true,
    })

    // --- AC-2: Load AI Agent Orchestration blueprint ---
    // Canvas has 1 node → confirmation dialog will appear
    await loadBlueprintByName(page, "AI Agent Orchestration", true)

    // Blueprint defines 5 nodes and 6 edges
    await expect(page.locator('[data-testid="archie-node"]')).toHaveCount(5, { timeout: 10_000 })

    const edgeCount = await page.locator('[data-testid="archie-edge"]').count()
    expect(edgeCount, "AI Agent Orchestration should have 6 connections").toBe(6)

    // Wait for recalculation to settle
    await page.waitForTimeout(800)

    // V6: Verify inline metrics on blueprint nodes — content correctness, not just presence
    const nodes = page.locator('[data-testid="archie-node"]')
    let nodesWithValidMetrics = 0
    for (let i = 0; i < 5; i++) {
      const node = nodes.nth(i)
      const bars = node.locator('[data-testid="inline-metric-bar"]')
      const barCount = await bars.count()
      if (barCount === 2) {
        const meters = node.locator('[data-testid="inline-metric-bar"] [role="meter"]')
        for (let j = 0; j < 2; j++) {
          const meter = meters.nth(j)
          const ariaValueNow = await meter.getAttribute("aria-valuenow")
          expect(ariaValueNow, `Node ${i} bar ${j} should have aria-valuenow`).not.toBeNull()
          const numericValue = parseFloat(ariaValueNow!)
          expect(Number.isFinite(numericValue), `Node ${i} bar ${j} should be finite`).toBe(true)
          expect(numericValue).toBeGreaterThanOrEqual(0)

          // V6: verify aria-label has format "{abbreviation}: {value}"
          const ariaLabel = await meter.getAttribute("aria-label")
          expect(ariaLabel, `Node ${i} bar ${j} should have aria-label`).not.toBeNull()
          expect(ariaLabel).toMatch(/^\w+: \d+(\.\d+)?$/)
        }
        nodesWithValidMetrics++
      }
    }
    expect(
      nodesWithValidMetrics,
      "At least 3 of 5 blueprint nodes should have 2 valid inline metric bars",
    ).toBeGreaterThanOrEqual(3)

    await page.screenshot({
      path: `${SCREENSHOT_DIR}/03-ai-agent-blueprint-loaded.png`,
      fullPage: true,
    })
  })

  // --- AC-3: Cost-Efficiency Metric Visible ---
  test("AC-3: cost-efficiency metric visible with weight=1.0 (V6 semantic)", async ({ page }) => {
    test.setTimeout(60_000)
    await page.goto("/")

    const hasComponents = await waitForComponentLibrary(page)
    test.skip(!hasComponents, "Skipped: Firestore has no seeded component data")

    const canvasPanel = page.locator('[data-testid="canvas-panel"]')
    const canvasBounds = await canvasPanel.boundingBox()
    test.skip(!canvasBounds, "Canvas panel not found")

    // Place a component that has cost-efficiency metrics (llm-gateway has cost-per-inference)
    await addComponentWithMetrics(
      page,
      "llm-gateway",
      canvasBounds!.x + canvasBounds!.width * 0.5,
      canvasBounds!.y + canvasBounds!.height * 0.5,
      1,
    )
    await page.waitForTimeout(500)

    // Suppress all non-cost weights to 0.2, keep cost-efficiency at 1.0
    await openDashboardOverlay(page)
    await openWeightSliders(page)
    await adjustSlider(page, "performance", 8, "left", false)
    await adjustSlider(page, "reliability", 8, "left", false)
    await adjustSlider(page, "scalability", 8, "left", false)
    await adjustSlider(page, "security", 8, "left", false)
    await adjustSlider(page, "operational-complexity", 8, "left", false)
    await adjustSlider(page, "developer-experience", 8, "left")
    await page.waitForTimeout(300) // extra debounce settling

    // Close overlay to read node metrics
    await page.keyboard.press("Escape")
    await expect(page.locator('[data-testid="dashboard-overlay"]')).toBeHidden({ timeout: 3_000 })
    await page.waitForTimeout(500)

    // V6: verify "Cost" shortName appears in inline metric labels
    const labels = await readInlineMetricLabels(page, 0)
    test.skip(
      labels.length < 2,
      "Component has fewer than 2 inline metrics — seeded data may lack cost-efficiency category",
    )
    expect(labels, 'V6: "Cost" should appear in top 2 inline metrics when cost-efficiency weight=1.0').toContain(
      "Cost",
    )

    // V6: verify the Cost metric value is between 1 and 10
    const node = page.locator('[data-testid="archie-node"]').nth(0)
    const meters = node.locator('[data-testid="inline-metric-bar"] [role="meter"]')
    const meterCount = await meters.count()
    let costValue: number | null = null
    for (let i = 0; i < meterCount; i++) {
      const ariaLabel = await meters.nth(i).getAttribute("aria-label")
      if (ariaLabel?.startsWith("Cost:")) {
        const raw = await meters.nth(i).getAttribute("aria-valuenow")
        costValue = raw ? parseFloat(raw) : null
        break
      }
    }
    expect(costValue, "Cost metric should have a numeric value").not.toBeNull()
    expect(costValue!).toBeGreaterThanOrEqual(1)
    expect(costValue!).toBeLessThanOrEqual(10)

    // V6: verify dashboard includes cost-efficiency category bar
    await openDashboardOverlay(page)
    const costBar = page.locator('[data-testid="category-bar-cost-efficiency"]')
    await expect(costBar, "Dashboard should show cost-efficiency category bar").toBeVisible({ timeout: 3_000 })
    const costBarValue = await costBar.getAttribute("aria-valuenow")
    expect(costBarValue, "Cost-efficiency bar should have a numeric value").not.toBeNull()
    expect(parseFloat(costBarValue!)).toBeGreaterThanOrEqual(1)

    await page.screenshot({
      path: `${SCREENSHOT_DIR}/04-cost-efficiency-visible.png`,
      fullPage: true,
    })
  })

  // --- TD-11-6a: Category Browsing via Search Filter ---
  test("TD-11-6a: category filter via search shows correct components (V6 semantic)", async ({
    page,
  }) => {
    test.setTimeout(30_000)
    await page.goto("/")

    const hasComponents = await waitForComponentLibrary(page)
    test.skip(!hasComponents, "Skipped: Firestore has no seeded component data")

    // Baseline: all 18 components visible before filtering
    const componentCards = page.locator('[data-testid^="component-card-"]')
    const totalBefore = await componentCards.count()
    expect(totalBefore, "Baseline should have at least 18 components").toBeGreaterThanOrEqual(EXPECTED_TOTAL_COMPONENTS)

    const searchInput = page.locator('[data-testid="search-input"]')
    await expect(searchInput).toBeVisible({ timeout: 3_000 })

    // --- Pass 1: Filter by "monitoring" (prometheus, siem) ---
    // SSoT: count derived from seeded fixture data — 2 components with category: monitoring
    // Verified: no tag cross-contamination (searchComponents matches name+category+tags)
    await searchInput.fill("monitoring")
    await expect(componentCards).toHaveCount(2, { timeout: 3_000 })

    // V6: assert specific component IDs (content correctness, not just count)
    await expect(
      page.locator('[data-testid="component-card-prometheus"]'),
      "V6: prometheus should be visible under monitoring filter",
    ).toBeVisible({ timeout: 3_000 })
    await expect(
      page.locator('[data-testid="component-card-siem"]'),
      "V6: siem should be visible under monitoring filter",
    ).toBeVisible({ timeout: 3_000 })

    await page.screenshot({
      path: `${SCREENSHOT_DIR}/td-11-6a-01-category-filter-monitoring.png`,
      fullPage: true,
    })

    // --- Clear filter ---
    const clearButton = page.locator('[data-testid="search-clear"]')
    await expect(clearButton).toBeVisible({ timeout: 3_000 })
    await clearButton.click()
    await expect(clearButton).toBeHidden({ timeout: 3_000 })
    await expect(componentCards).toHaveCount(totalBefore, { timeout: 3_000 })

    // --- Pass 2: Filter by "data-storage" (postgresql, redis, vector-db, graph-db, data-lake) ---
    // SSoT: count derived from seeded fixture data — 5 components with category: data-storage
    // Verified: no tag cross-contamination (searchComponents matches name+category+tags)
    await searchInput.fill("data-storage")
    await expect(componentCards).toHaveCount(5, { timeout: 3_000 })

    // V6: assert specific known component IDs
    const vectorDbCard = page.locator('[data-testid="component-card-vector-db"]')
    await vectorDbCard.scrollIntoViewIfNeeded()
    await expect(
      vectorDbCard,
      "V6: vector-db should be visible under data-storage filter",
    ).toBeVisible({ timeout: 3_000 })
    const graphDbCard = page.locator('[data-testid="component-card-graph-db"]')
    await graphDbCard.scrollIntoViewIfNeeded()
    await expect(
      graphDbCard,
      "V6: graph-db should be visible under data-storage filter",
    ).toBeVisible({ timeout: 3_000 })

    const dataLakeCard = page.locator('[data-testid="component-card-data-lake"]')
    await dataLakeCard.scrollIntoViewIfNeeded()
    await expect(
      dataLakeCard,
      "V6: data-lake should be visible under data-storage filter",
    ).toBeVisible({ timeout: 3_000 })
    const postgresCard = page.locator('[data-testid="component-card-postgresql"]')
    await postgresCard.scrollIntoViewIfNeeded()
    await expect(
      postgresCard,
      "V6: postgresql should be visible under data-storage filter",
    ).toBeVisible({ timeout: 3_000 })
    const redisCard = page.locator('[data-testid="component-card-redis"]')
    await redisCard.scrollIntoViewIfNeeded()
    await expect(
      redisCard,
      "V6: redis should be visible under data-storage filter",
    ).toBeVisible({ timeout: 3_000 })

    await page.screenshot({
      path: `${SCREENSHOT_DIR}/td-11-6a-02-category-filter-data-storage.png`,
      fullPage: true,
    })

    // --- Reset: verify full count restores ---
    await expect(clearButton).toBeVisible({ timeout: 3_000 })
    await clearButton.click()
    await expect(clearButton).toBeHidden({ timeout: 3_000 })
    await expect(componentCards).toHaveCount(totalBefore, { timeout: 3_000 })

    await page.screenshot({
      path: `${SCREENSHOT_DIR}/td-11-6a-03-category-filter-cleared.png`,
      fullPage: true,
    })
  })

  // --- AC-4 + AC-5: Demand/Failure Scenario Interaction ---
  test("AC-4/AC-5: demand and failure scenarios affect new components (V6 directional)", async ({
    page,
  }) => {
    test.setTimeout(90_000)
    await page.goto("/")

    const hasComponents = await waitForComponentLibrary(page)
    test.skip(!hasComponents, "Skipped: Firestore has no seeded component data")

    // Load AI Agent Orchestration blueprint on empty canvas (no confirmation dialog)
    await loadBlueprintByName(page, "AI Agent Orchestration", false)
    await expect(page.locator('[data-testid="archie-node"]')).toHaveCount(5, { timeout: 10_000 })
    await page.waitForTimeout(800) // recalculation settling

    // Place additional data storage components for AC-5 (Graph DB, Data Lake).
    // These are deliberately unconnected — failure scenarios degrade by component CATEGORY
    // (data storage), not by connection topology. Isolated nodes still receive category-based degradation.
    const canvasPanel = page.locator('[data-testid="canvas-panel"]')
    const canvasBounds = await canvasPanel.boundingBox()
    test.skip(!canvasBounds, "Canvas panel not found")

    await addComponentWithMetrics(
      page,
      "graph-db",
      canvasBounds!.x + canvasBounds!.width * 0.15,
      canvasBounds!.y + canvasBounds!.height * 0.8,
      6,
    )
    await addComponentWithMetrics(
      page,
      "data-lake",
      canvasBounds!.x + canvasBounds!.width * 0.85,
      canvasBounds!.y + canvasBounds!.height * 0.8,
      7,
    )

    await page.waitForTimeout(500)

    // Capture baseline heatmap statuses
    const baselineLlm = await getNodeHeatmapStatus(page, "LLM Gateway")
    const baselineRedis = await getNodeHeatmapStatus(page, "Redis Cache")
    const baselineVectorDb = await getNodeHeatmapStatus(page, "Vector Database")
    const baselineGraphDb = await getNodeHeatmapStatus(page, "Graph Database")
    const baselineDataLake = await getNodeHeatmapStatus(page, "Data Lake")
    const baselineScore = await getDashboardScore(page)

    await page.screenshot({
      path: `${SCREENSHOT_DIR}/05-baseline-blueprint.png`,
      fullPage: true,
    })

    // --- AC-4: Traffic Peak — LLM Gateway degrades more than Redis Cache ---
    await selectFromDropdown(page, "scenario-selector","Traffic Peak")

    const banner = page.locator('[data-testid="scenario-banner"]')
    await expect(banner).toBeVisible({ timeout: 3_000 })
    await expect(banner).toContainText("Simulating: Traffic Peak")

    // Poll for demand scenario to take effect
    // Poll until LLM Gateway heatmap changes (not just score) — directional assertion needs heatmap data
    await expect.poll(
      async () => {
        const llm = await getNodeHeatmapStatus(page, "LLM Gateway")
        return llm !== null && llm !== baselineLlm
      },
      { timeout: 5_000, message: "Demand scenario should change LLM Gateway heatmap status" },
    ).toBe(true)

    const peakLlm = await getNodeHeatmapStatus(page, "LLM Gateway")
    const peakRedis = await getNodeHeatmapStatus(page, "Redis Cache")

    // V6 directional: LLM Gateway should degrade more than Redis Cache under traffic
    expect(peakLlm, "LLM Gateway heatmap status missing").toBeTruthy()
    expect(peakRedis, "Redis Cache heatmap status missing").toBeTruthy()
    expect(SEVERITY[peakLlm!], `Unknown heatmap status: llm=${peakLlm}`).not.toBeUndefined()
    expect(SEVERITY[peakRedis!], `Unknown heatmap status: redis=${peakRedis}`).not.toBeUndefined()
    expect(
      SEVERITY[peakLlm!],
      `V6: LLM Gateway (${peakLlm}) should degrade MORE than Redis Cache (${peakRedis}) under Traffic Peak`,
    ).toBeLessThan(SEVERITY[peakRedis!])

    await page.screenshot({
      path: `${SCREENSHOT_DIR}/06-demand-scenario-new-components.png`,
      fullPage: true,
    })

    // Deselect demand scenario before failure test
    await selectFromDropdown(page, "scenario-selector","No Scenario")
    await expect(banner).toBeHidden({ timeout: 3_000 })
    await page.waitForTimeout(500)

    // --- AC-5: Database Failure — data storage components degrade ---
    await selectFromDropdown(page, "failure-selector", "Database Failure")

    const failureBanner = page.locator('[data-testid="failure-banner"]')
    await expect(failureBanner).toBeVisible({ timeout: 3_000 })
    await expect(failureBanner).toContainText("Failure: Database Failure")

    // Poll for failure scenario to take effect
    await expect.poll(
      async () => {
        const vdb = await getNodeHeatmapStatus(page, "Vector Database")
        return vdb !== null && vdb !== baselineVectorDb
      },
      { timeout: 5_000, message: "Failure scenario should affect data storage component heatmap" },
    ).toBe(true)

    const failVectorDb = await getNodeHeatmapStatus(page, "Vector Database")
    const failGraphDb = await getNodeHeatmapStatus(page, "Graph Database")
    const failDataLake = await getNodeHeatmapStatus(page, "Data Lake")

    // V6: data storage components should show significant degradation
    expect(failVectorDb, "Vector Database heatmap missing under Database Failure").toBeTruthy()
    expect(failGraphDb, "Graph Database heatmap missing under Database Failure").toBeTruthy()
    expect(failDataLake, "Data Lake heatmap missing under Database Failure").toBeTruthy()

    // Guard: verify heatmap statuses are known values before severity comparison
    expect(SEVERITY[failVectorDb!], `Unknown heatmap status: vectorDb=${failVectorDb}`).not.toBeUndefined()
    expect(SEVERITY[failGraphDb!], `Unknown heatmap status: graphDb=${failGraphDb}`).not.toBeUndefined()
    expect(SEVERITY[failDataLake!], `Unknown heatmap status: dataLake=${failDataLake}`).not.toBeUndefined()

    // All three should be degraded (warning or bottleneck) — severity <= 1
    expect(
      SEVERITY[failVectorDb!],
      `V6: Vector Database (${failVectorDb}) should degrade under Database Failure`,
    ).toBeLessThanOrEqual(1)
    expect(
      SEVERITY[failGraphDb!],
      `V6: Graph Database (${failGraphDb}) should degrade under Database Failure`,
    ).toBeLessThanOrEqual(1)
    expect(
      SEVERITY[failDataLake!],
      `V6: Data Lake (${failDataLake}) should degrade under Database Failure`,
    ).toBeLessThanOrEqual(1)

    await page.screenshot({
      path: `${SCREENSHOT_DIR}/07-failure-scenario-new-components.png`,
      fullPage: true,
    })

    // --- Revert: deselect failure, verify baseline restores ---
    await selectFromDropdown(page, "failure-selector", "No Failure")
    await expect(failureBanner).toBeHidden({ timeout: 3_000 })

    // Poll for baseline restoration
    if (baselineScore !== null) {
      await expect.poll(
        () => getDashboardScore(page),
        { timeout: 5_000, message: "Dashboard score should revert to baseline after clearing failure" },
      ).toBe(baselineScore)
    }

    // V6: verify heatmap statuses revert to baseline
    const revertedRedis = await getNodeHeatmapStatus(page, "Redis Cache")
    const revertedGraphDb = await getNodeHeatmapStatus(page, "Graph Database")
    const revertedDataLake = await getNodeHeatmapStatus(page, "Data Lake")
    expect(revertedRedis, "Redis Cache should revert to baseline").toBe(baselineRedis)
    expect(revertedGraphDb, "Graph Database should revert to baseline").toBe(baselineGraphDb)
    expect(revertedDataLake, "Data Lake should revert to baseline").toBe(baselineDataLake)

    await page.screenshot({
      path: `${SCREENSHOT_DIR}/08-scenarios-cleared.png`,
      fullPage: true,
    })
  })
})
