import { test, expect, type Page, type Locator } from "@playwright/test"
import {
  waitForComponentLibrary,
  addComponentToCanvas,
  selectNodeOnCanvas,
} from "./helpers/canvas-helpers"

const SCREENSHOT_DIR = "test-results/inspector-responsiveness"

/**
 * Shared setup: navigate, wait for library, place one component, select it.
 */
async function setupInspector(page: Page): Promise<boolean> {
  await page.goto("/")
  const hasComponents = await waitForComponentLibrary(page)
  if (!hasComponents) return false
  await addComponentToCanvas(page, 0)
  await selectNodeOnCanvas(page, 0)
  return true
}

/**
 * Assert that `child` right edge does not exceed `container` right edge.
 * Only checks horizontal overflow — vertical is managed by scrolling.
 */
async function isHorizontallyContained(container: Locator, child: Locator): Promise<boolean> {
  const cBox = await container.boundingBox()
  const chBox = await child.boundingBox()
  if (!cBox || !chBox) return false
  // 2px tolerance for sub-pixel rendering
  return (
    chBox.x >= cBox.x - 2 &&
    chBox.x + chBox.width <= cBox.x + cBox.width + 2
  )
}

/**
 * Assert all metric bar tracks within a card have the same width (within 1px tolerance).
 */
async function assertConsistentBarWidths(page: Page) {
  const metricCards = page.locator('[data-testid^="metric-card-"]')
  const cardCount = await metricCards.count()

  for (let c = 0; c < cardCount; c++) {
    const card = metricCards.nth(c)
    await card.scrollIntoViewIfNeeded()
    const barTracks = card.locator('[data-testid="metric-bar"] .rounded-full.bg-muted')
    const trackCount = await barTracks.count()
    if (trackCount < 2) continue

    const widths: number[] = []
    for (let t = 0; t < trackCount; t++) {
      await barTracks.nth(t).scrollIntoViewIfNeeded()
      const box = await barTracks.nth(t).boundingBox()
      if (box) widths.push(Math.round(box.width))
    }

    // All track widths within the same card should be equal (1px tolerance)
    const first = widths[0]
    for (let i = 1; i < widths.length; i++) {
      expect(
        Math.abs(widths[i] - first),
        `Bar track widths in card ${c} differ: ${widths.join(", ")}`,
      ).toBeLessThanOrEqual(1)
    }
  }
}

test.describe("Inspector Responsiveness E2E", () => {
  // -------------------------------------------------------------------------
  // Default sidebar view (300px)
  // -------------------------------------------------------------------------
  test("default 300px sidebar: select dropdowns fit within panel", async ({ page }) => {
    const hasComponents = await setupInspector(page)
    test.skip(!hasComponents, "Skipped: Firestore has no seeded component data")

    const inspector = page.locator('[data-testid="inspector"]')
    await expect(inspector).toHaveCSS("width", "300px")

    // Component Type selector should be horizontally contained
    const componentSwapper = page.locator('[data-testid="component-swapper"]')
    if (await componentSwapper.isVisible()) {
      await componentSwapper.scrollIntoViewIfNeeded()
      const trigger = componentSwapper.locator("button").first()
      await expect(trigger).toBeVisible()
      expect(
        await isHorizontallyContained(inspector, trigger),
        "Component Type dropdown should fit within 300px inspector",
      ).toBe(true)
    }

    // Configuration selector should be horizontally contained
    const configSelector = page.locator('[data-testid="config-selector"]')
    if (await configSelector.isVisible()) {
      await configSelector.scrollIntoViewIfNeeded()
      const trigger = configSelector.locator("button").first()
      await expect(trigger).toBeVisible()
      expect(
        await isHorizontallyContained(inspector, trigger),
        "Configuration dropdown should fit within 300px inspector",
      ).toBe(true)
    }

    await page.screenshot({ path: `${SCREENSHOT_DIR}/01-default-selects-fit.png`, fullPage: true })
  })

  test("default 300px sidebar: metric value labels visible and contained", async ({ page }) => {
    const hasComponents = await setupInspector(page)
    test.skip(!hasComponents, "Skipped: Firestore has no seeded component data")

    const inspector = page.locator('[data-testid="inspector"]')

    // Scroll to metrics section
    const metricsHeading = page.locator('[data-testid="inspector-panel"] h3', { hasText: "Metrics" })
    await expect(metricsHeading).toBeVisible({ timeout: 5_000 })
    await metricsHeading.scrollIntoViewIfNeeded()

    // Check metric bars: each should have visible value text and fit horizontally
    const metricBars = page.locator('[data-testid="metric-bar"]')
    const barCount = await metricBars.count()
    expect(barCount).toBeGreaterThan(0)

    for (let i = 0; i < Math.min(barCount, 5); i++) {
      const bar = metricBars.nth(i)
      await bar.scrollIntoViewIfNeeded()

      // Get the value text from the metric bar
      const valueText = await bar.evaluate((el) => {
        // The flex row is the first div child
        const flexRow = el.querySelector("div")
        if (!flexRow) return ""
        // Spans in flex row: [name, value, optional-delta, chevron-slot]
        // Value is always the second span (after name)
        const spans = flexRow.querySelectorAll(":scope > span")
        return spans[1]?.textContent?.trim() ?? ""
      })
      expect(valueText.length, `Metric bar ${i} should have visible value text`).toBeGreaterThan(0)

      // The entire metric bar row should fit horizontally within the inspector
      expect(
        await isHorizontallyContained(inspector, bar),
        `Metric bar ${i} (value="${valueText}") should fit within inspector width`,
      ).toBe(true)
    }

    await page.screenshot({ path: `${SCREENSHOT_DIR}/02-default-metric-values-visible.png`, fullPage: true })
  })

  test("default 300px sidebar: metric bar tracks have consistent widths", async ({ page }) => {
    const hasComponents = await setupInspector(page)
    test.skip(!hasComponents, "Skipped: Firestore has no seeded component data")

    // Scroll to metrics
    const metricsHeading = page.locator('[data-testid="inspector-panel"] h3', { hasText: "Metrics" })
    await expect(metricsHeading).toBeVisible({ timeout: 5_000 })
    await metricsHeading.scrollIntoViewIfNeeded()

    await assertConsistentBarWidths(page)

    await page.screenshot({ path: `${SCREENSHOT_DIR}/03-default-bar-widths-consistent.png`, fullPage: true })
  })

  test("default 300px sidebar: gains and costs text wraps within panel", async ({ page }) => {
    const hasComponents = await setupInspector(page)
    test.skip(!hasComponents, "Skipped: Firestore has no seeded component data")

    const inspector = page.locator('[data-testid="inspector"]')
    const inspectorPanel = page.locator('[data-testid="inspector-panel"]')

    // Check Gains section
    const gainsHeading = inspectorPanel.locator("h3", { hasText: "Gains" })
    if (await gainsHeading.isVisible()) {
      await gainsHeading.scrollIntoViewIfNeeded()
      const gainItems = gainsHeading.locator("..").locator("li")
      const gainCount = await gainItems.count()
      for (let i = 0; i < Math.min(gainCount, 3); i++) {
        await gainItems.nth(i).scrollIntoViewIfNeeded()
        expect(
          await isHorizontallyContained(inspector, gainItems.nth(i)),
          `Gain item ${i} should wrap within inspector width`,
        ).toBe(true)
      }
    }

    // Check Costs section
    const costsHeading = inspectorPanel.locator("h3", { hasText: "Costs" })
    if (await costsHeading.isVisible()) {
      await costsHeading.scrollIntoViewIfNeeded()
      const costItems = costsHeading.locator("..").locator("li")
      const costCount = await costItems.count()
      for (let i = 0; i < Math.min(costCount, 3); i++) {
        await costItems.nth(i).scrollIntoViewIfNeeded()
        expect(
          await isHorizontallyContained(inspector, costItems.nth(i)),
          `Cost item ${i} should wrap within inspector width`,
        ).toBe(true)
      }
    }

    await page.screenshot({ path: `${SCREENSHOT_DIR}/04-gains-costs-wrap.png`, fullPage: true })
  })

  // -------------------------------------------------------------------------
  // Expanded sidebar view (500px)
  // -------------------------------------------------------------------------
  test("expanded 500px sidebar: all content fits and bars consistent", async ({ page }) => {
    const hasComponents = await setupInspector(page)
    test.skip(!hasComponents, "Skipped: Firestore has no seeded component data")

    // Expand to 500px
    await page.locator('[data-testid="inspector-expand-toggle"]').click()
    const inspector = page.locator('[data-testid="inspector"]')
    await expect(inspector).toHaveCSS("width", "500px")

    // Check selects fit
    const configSelector = page.locator('[data-testid="config-selector"]')
    if (await configSelector.isVisible()) {
      await configSelector.scrollIntoViewIfNeeded()
      const trigger = configSelector.locator("button").first()
      expect(
        await isHorizontallyContained(inspector, trigger),
        "Config dropdown should fit within 500px inspector",
      ).toBe(true)
    }

    // Scroll to metrics and check bar widths
    const metricsHeading = page.locator('[data-testid="inspector-panel"] h3', { hasText: "Metrics" })
    await expect(metricsHeading).toBeVisible({ timeout: 5_000 })
    await metricsHeading.scrollIntoViewIfNeeded()

    await assertConsistentBarWidths(page)

    await page.screenshot({ path: `${SCREENSHOT_DIR}/05-expanded-500px-all-fits.png`, fullPage: true })
  })

  // -------------------------------------------------------------------------
  // Overlay view (full-screen)
  // -------------------------------------------------------------------------
  test("overlay view: content fits and bars consistent", async ({ page }) => {
    const hasComponents = await setupInspector(page)
    test.skip(!hasComponents, "Skipped: Firestore has no seeded component data")

    // Open overlay
    await page.locator('[data-testid="inspector-maximize-btn"]').click()
    const overlay = page.locator('[data-testid="inspector-overlay"]')
    await overlay.waitFor({ state: "visible", timeout: 3_000 })

    // Check selects within overlay
    const configSelector = overlay.locator('[data-testid="config-selector"]')
    if (await configSelector.isVisible()) {
      await configSelector.scrollIntoViewIfNeeded()
      const trigger = configSelector.locator("button").first()
      expect(
        await isHorizontallyContained(overlay, trigger),
        "Config dropdown should fit within overlay",
      ).toBe(true)
    }

    // Scroll to metrics and check bar consistency
    const metricsHeading = overlay.locator("h3", { hasText: "Metrics" })
    if (await metricsHeading.isVisible()) {
      await metricsHeading.scrollIntoViewIfNeeded()
      await assertConsistentBarWidths(page)
    }

    await page.screenshot({ path: `${SCREENSHOT_DIR}/06-overlay-content-fits.png`, fullPage: true })
  })

  // -------------------------------------------------------------------------
  // Overlay collapse bug regression
  // -------------------------------------------------------------------------
  test("overlay collapse: clicking collapse closes overlay", async ({ page }) => {
    const hasComponents = await setupInspector(page)
    test.skip(!hasComponents, "Skipped: Firestore has no seeded component data")

    // Open overlay
    await page.locator('[data-testid="inspector-maximize-btn"]').click()
    const overlay = page.locator('[data-testid="inspector-overlay"]')
    await overlay.waitFor({ state: "visible", timeout: 3_000 })

    // Click collapse in overlay — should dismiss overlay
    const collapseBtn = overlay.locator('[data-testid="inspector-collapse-btn"]')
    await expect(collapseBtn).toBeVisible()
    await collapseBtn.click()

    await overlay.waitFor({ state: "hidden", timeout: 3_000 })

    await page.screenshot({ path: `${SCREENSHOT_DIR}/07-overlay-collapse-closes.png`, fullPage: true })
  })
})
