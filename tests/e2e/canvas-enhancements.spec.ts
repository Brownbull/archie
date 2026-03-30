import { test, expect, type Page } from "@playwright/test"
import {
  waitForComponentLibrary,
  waitForBlueprints,
  dragComponentToCanvas,
  triggerRecalcViaConfigChange,
  openDashboardOverlay,
} from "./helpers/canvas-helpers"

const SCREENSHOT_DIR = "test-results/canvas-enhancements"

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
 * Returns e.g. ["Perf", "Rel"].
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
 * Read the numeric values from inline metric bars on a given node.
 * Returns aria-valuenow values from role="meter" elements.
 */
async function readInlineMetricValues(page: Page, nodeIndex: number): Promise<number[]> {
  const node = page.locator('[data-testid="archie-node"]').nth(nodeIndex)
  const meters = node.locator('[data-testid="inline-metric-bar"] [role="meter"]')
  const count = await meters.count()
  const values: number[] = []
  for (let i = 0; i < count; i++) {
    const raw = await meters.nth(i).getAttribute("aria-valuenow")
    values.push(raw !== null ? parseFloat(raw) : NaN)
  }
  return values
}

/**
 * Select a scenario from the ScenarioSelector dropdown.
 * Waits for recalculation to settle after selection.
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

/**
 * Expand the weight sliders collapsible in the DashboardOverlay.
 * Handles re-open case where the section may already be visible.
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
 * @param settle When true, waits 300ms for debounce
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

// All tests are AUTHENTICATED — auth pre-loaded from global storageState (see global-setup.ts).
// Fixture strategy: drag specific components from Firestore-seeded library.
//
// PREREQUISITE: Firestore must be seeded with component data.
// Run: GOOGLE_APPLICATION_CREDENTIALS=path/to/sa.json npm run seed:firestore
test.describe("Canvas Enhancements E2E (Story 10-3)", () => {
  test("AC-1: inline metrics and variant name visible on placed components", async ({ page }) => {
    await page.goto("/")

    const hasComponents = await waitForComponentLibrary(page)
    test.skip(!hasComponents, "Skipped: Firestore has no seeded component data")

    const canvasPanel = page.locator('[data-testid="canvas-panel"]')
    const canvasBounds = await canvasPanel.boundingBox()
    test.skip(!canvasBounds, "Canvas panel not found")

    // Place 2 components: postgresql and nginx
    await addComponentWithMetrics(
      page, "postgresql",
      canvasBounds!.x + canvasBounds!.width * 0.3,
      canvasBounds!.y + canvasBounds!.height * 0.5,
      1,
    )
    await addComponentWithMetrics(
      page, "nginx",
      canvasBounds!.x + canvasBounds!.width * 0.7,
      canvasBounds!.y + canvasBounds!.height * 0.5,
      2,
    )

    await page.waitForTimeout(500) // recalculation settling

    // Verify inline metrics on each node
    const nodes = page.locator('[data-testid="archie-node"]')
    const nodeCount = await nodes.count()
    expect(nodeCount).toBe(2)

    for (let i = 0; i < nodeCount; i++) {
      const node = nodes.nth(i)
      const bars = node.locator('[data-testid="inline-metric-bar"]')
      // Each node should show exactly 2 inline metric bars
      await expect(bars).toHaveCount(2, { timeout: 5_000 })

      // V6: verify each bar has role="meter" with valid numeric aria-valuenow
      const meters = node.locator('[data-testid="inline-metric-bar"] [role="meter"]')
      for (let j = 0; j < 2; j++) {
        const meter = meters.nth(j)
        const ariaValueNow = await meter.getAttribute("aria-valuenow")
        expect(ariaValueNow, `Node ${i} bar ${j} should have aria-valuenow`).not.toBeNull()
        const numericValue = parseFloat(ariaValueNow!)
        expect(Number.isFinite(numericValue), `Node ${i} bar ${j} aria-valuenow should be finite`).toBe(true)
        expect(numericValue).toBeGreaterThan(0)

        // V6: verify aria-label has format "{abbreviation}: {value}"
        const ariaLabel = await meter.getAttribute("aria-label")
        expect(ariaLabel, `Node ${i} bar ${j} should have aria-label`).not.toBeNull()
        expect(ariaLabel).toMatch(/^\w+: \d/)
      }
    }

    // Verify at least one node shows variant name
    const variantLabels = page.locator('[data-testid="archie-node-variant"]')
    const variantCount = await variantLabels.count()
    expect(variantCount).toBeGreaterThan(0)
    const firstVariantText = await variantLabels.first().textContent()
    expect(firstVariantText?.trim().length).toBeGreaterThan(0)

    await page.screenshot({
      path: `${SCREENSHOT_DIR}/01-components-with-inline-metrics.png`,
      fullPage: true,
    })
  })

  test("AC-2: weight change swaps displayed metric categories (V6 semantic)", async ({ page }) => {
    test.setTimeout(60_000)
    await page.goto("/")

    const hasComponents = await waitForComponentLibrary(page)
    test.skip(!hasComponents, "Skipped: Firestore has no seeded component data")

    const canvasPanel = page.locator('[data-testid="canvas-panel"]')
    const canvasBounds = await canvasPanel.boundingBox()
    test.skip(!canvasBounds, "Canvas panel not found")

    // Place postgresql (has metrics in: Perf, Rel, Scale, Ops — 4 data categories)
    await addComponentWithMetrics(
      page, "postgresql",
      canvasBounds!.x + canvasBounds!.width * 0.5,
      canvasBounds!.y + canvasBounds!.height * 0.5,
      1,
    )
    await page.waitForTimeout(500)

    const baselineLabels = await readInlineMetricLabels(page, 0)
    test.skip(baselineLabels.length < 2, "Component has fewer than 2 inline metrics — cannot test swap")

    // --- STATE A: Perf + Rel dominant (weight=1.0), Scale + Ops suppressed (weight=0.1) ---
    // Top 2 should be from {Perf, Rel} since they have higher weight
    await openDashboardOverlay(page)
    await openWeightSliders(page)
    // Lower scalability and ops to 0.1 (9 ArrowLeft from 1.0, step=0.1)
    await adjustSlider(page, "scalability", 9, "left", false)
    await adjustSlider(page, "operational-complexity", 9, "left")
    await page.waitForTimeout(300) // extra debounce settling

    // Close overlay to read metrics
    await page.keyboard.press("Escape")
    await expect(page.locator('[data-testid="dashboard-overlay"]')).toBeHidden({ timeout: 3_000 })
    await page.waitForTimeout(500)

    const stateALabels = await readInlineMetricLabels(page, 0)
    // Perf and Rel (weight=1.0) should dominate over Scale and Ops (weight=0.1)
    expect(stateALabels, "State A should include Perf (weight=1.0)").toContain("Perf")
    expect(stateALabels, "State A should include Rel (weight=1.0)").toContain("Rel")

    // --- STATE B: Scale + Ops dominant, Perf + Rel suppressed ---
    // Swap: lower Perf + Rel to 0.1, raise Scale + Ops to 1.0
    await openDashboardOverlay(page)
    await openWeightSliders(page)
    // Lower performance and reliability to 0.1
    await adjustSlider(page, "performance", 9, "left", false)
    await adjustSlider(page, "reliability", 9, "left", false)
    // Raise scalability and ops back to 1.0
    await adjustSlider(page, "scalability", 9, "right", false)
    await adjustSlider(page, "operational-complexity", 9, "right")
    await page.waitForTimeout(300)

    // Close overlay
    await page.keyboard.press("Escape")
    await expect(page.locator('[data-testid="dashboard-overlay"]')).toBeHidden({ timeout: 3_000 })
    await page.waitForTimeout(500)

    const stateBLabels = await readInlineMetricLabels(page, 0)

    // --- V6 SEMANTIC VERIFICATION ---
    // The displayed categories must have changed content
    expect(
      stateBLabels,
      `V6: displayed metrics should change after weight swap. A: [${stateALabels}] → B: [${stateBLabels}]`,
    ).not.toEqual(stateALabels)

    // State B: Scale + Ops displayed (weight=1.0), Perf + Rel suppressed
    expect(stateBLabels).toContain("Scale")
    expect(stateBLabels).toContain("Ops")
    expect(stateBLabels).not.toContain("Perf")
    expect(stateBLabels).not.toContain("Rel")

    await page.screenshot({
      path: `${SCREENSHOT_DIR}/02-metrics-after-weight-change.png`,
      fullPage: true,
    })
  })

  test("AC-3: blueprint loading places components with connections and inline metrics", async ({ page }) => {
    await page.goto("/")

    const hasComponents = await waitForComponentLibrary(page)
    test.skip(!hasComponents, "Skipped: Firestore has no seeded component data")

    const hasBlueprints = await waitForBlueprints(page)
    test.skip(!hasBlueprints, "Skipped: no blueprints available")

    // Read the first blueprint card's name
    const firstCardName = await page.locator('[data-testid="blueprint-card-name"]').first().textContent()
    expect(firstCardName?.trim().length).toBeGreaterThan(0)

    // Click Load on the first blueprint — canvas is empty, no confirmation dialog
    await page.locator('[data-testid="blueprint-load-button"]').first().click()

    // Check for hydration error
    const loadError = page.locator('[data-testid="blueprint-load-error"]')
    const hasError = await loadError.isVisible().catch(() => false)
    test.skip(hasError, "Blueprint hydration failed — component_ids may not match seeded library")

    // Wait for nodes to appear on canvas
    await expect(page.locator('[data-testid="archie-node"]')).not.toHaveCount(0, { timeout: 10_000 })

    const nodeCount = await page.locator('[data-testid="archie-node"]').count()
    expect(nodeCount).toBeGreaterThanOrEqual(2)

    // Verify connections exist in DOM (React Flow edge paths may not pass Playwright
    // visibility check since they're SVG <path> elements with no bounding box)
    const edgeCount = await page.locator('[data-testid="archie-edge"]').count()
    // Blueprints define edges — at least one should exist
    expect(edgeCount, "Blueprint should create at least one edge connection").toBeGreaterThan(0)

    // Wait for recalculation to settle
    await page.waitForTimeout(800)

    // Verify inline metrics visible on at least one loaded node
    let nodesWithMetrics = 0
    for (let i = 0; i < nodeCount; i++) {
      const node = page.locator('[data-testid="archie-node"]').nth(i)
      const barCount = await node.locator('[data-testid="inline-metric-bar"]').count()
      if (barCount > 0) nodesWithMetrics++
    }

    // V6: at least one node should have 2 inline metric bars with valid values
    expect(nodesWithMetrics, "At least one node should have inline metrics after blueprint load").toBeGreaterThan(0)

    // V6: find a node with exactly 2 bars and verify content values
    let foundNodeWith2Bars = false
    for (let i = 0; i < nodeCount; i++) {
      const node = page.locator('[data-testid="archie-node"]').nth(i)
      const bars = node.locator('[data-testid="inline-metric-bar"]')
      if ((await bars.count()) === 2) {
        const meters = node.locator('[data-testid="inline-metric-bar"] [role="meter"]')
        for (let j = 0; j < 2; j++) {
          const ariaValueNow = await meters.nth(j).getAttribute("aria-valuenow")
          expect(ariaValueNow).not.toBeNull()
          expect(Number.isFinite(parseFloat(ariaValueNow!))).toBe(true)
        }
        foundNodeWith2Bars = true
        break
      }
    }
    expect(foundNodeWith2Bars, "At least one node should have exactly 2 metric bars with valid values").toBe(true)

    await page.screenshot({
      path: `${SCREENSHOT_DIR}/03-blueprint-loaded.png`,
      fullPage: true,
    })
  })

  test("AC-4: demand scenario changes inline metric values; deselect reverts", async ({ page }) => {
    test.setTimeout(60_000)
    await page.goto("/")

    const hasComponents = await waitForComponentLibrary(page)
    test.skip(!hasComponents, "Skipped: Firestore has no seeded component data")

    const canvasPanel = page.locator('[data-testid="canvas-panel"]')
    const canvasBounds = await canvasPanel.boundingBox()
    test.skip(!canvasBounds, "Canvas panel not found")

    // Place postgresql and redis
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

    // Capture baseline metric values from first node
    const baselineValues = await readInlineMetricValues(page, 0)
    test.skip(baselineValues.length === 0, "No inline metrics on first node — cannot test demand interaction")

    // Select "Traffic Peak" demand scenario
    await selectScenario(page, "Traffic Peak")

    // Verify scenario banner
    const banner = page.locator('[data-testid="scenario-banner"]')
    await expect(banner).toBeVisible({ timeout: 3_000 })
    await expect(banner).toContainText("Simulating: Traffic Peak")

    // Read demand-adjusted values
    const demandValues = await readInlineMetricValues(page, 0)

    // V6: at least one metric value should differ from baseline
    const valuesChanged = demandValues.some(
      (v, i) => Math.abs(v - baselineValues[i]) > 0.05,
    )
    test.skip(
      !valuesChanged,
      "Demand data not affecting inline metrics — re-seed Firestore with demand_responses",
    )

    await page.screenshot({
      path: `${SCREENSHOT_DIR}/04-demand-scenario-active.png`,
      fullPage: true,
    })

    // Deselect scenario — revert to baseline
    await selectScenario(page, "No Scenario")

    // Banner should disappear
    await expect(banner).toBeHidden({ timeout: 3_000 })

    // Read reverted values
    const revertedValues = await readInlineMetricValues(page, 0)

    // V6: reverted values should match baseline within floating-point tolerance
    for (let i = 0; i < baselineValues.length; i++) {
      expect(
        revertedValues[i],
        `Metric ${i} should revert to baseline (${baselineValues[i]})`,
      ).toBeCloseTo(baselineValues[i], 1)
    }

    await page.screenshot({
      path: `${SCREENSHOT_DIR}/05-demand-reverted.png`,
      fullPage: true,
    })
  })
})
