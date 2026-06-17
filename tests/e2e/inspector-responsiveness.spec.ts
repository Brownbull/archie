import { test, expect, type Page, type Locator } from "@playwright/test"
import {
  waitForComponentLibrary,
  addComponentToCanvas,
  selectNodeOnCanvas,
  useAdvancedLevel,
  expandInspectorSection,
} from "./helpers/canvas-helpers"

const SCREENSHOT_DIR = "test-results/inspector-responsiveness"

/**
 * Shared setup: navigate, wait for library, place one component, select it.
 *
 * Runs at the "advanced" experience level (seeded via useAdvancedLevel in beforeEach, before goto):
 * the inspector's progressive-disclosure sections (gains/costs/metrics/code) only render at advanced —
 * the default "beginner" level hides them entirely (ComponentDetail showTradeoffs/showTechnical gates).
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
  // The inspector's gains/costs/metrics/code sections are gated behind the "advanced" experience
  // level (default is "beginner", which hides them). Seed advanced BEFORE goto on every test.
  test.beforeEach(async ({ page }) => {
    await useAdvancedLevel(page)
  })

  // -------------------------------------------------------------------------
  // Default sidebar view (300px)
  // -------------------------------------------------------------------------
  test("default 300px sidebar: select dropdowns fit within panel", async ({ page }) => {
    const hasComponents = await setupInspector(page)
    test.skip(!hasComponents, "Skipped: Firestore has no seeded component data")

    const inspector = page.locator('[data-testid="inspector"]')
    await expect(inspector).toHaveCSS("width", "300px")

    // Fluidity P1: the provider/config dropdowns moved OFF the inspector onto the canvas block, so
    // there is no longer a swapper/config control inside the 300px aside to bound. The remaining
    // inspector-width regression coverage (metric bars, gains/costs wrapping) lives in the other
    // tests in this file. The dropdown-fit assertions are dropped here.

    await page.screenshot({ path: `${SCREENSHOT_DIR}/01-default-selects-fit.png`, fullPage: true })
  })

  test("default 300px sidebar: metric value labels visible and contained", async ({ page }) => {
    const hasComponents = await setupInspector(page)
    test.skip(!hasComponents, "Skipped: Firestore has no seeded component data")

    const inspector = page.locator('[data-testid="inspector"]')

    // Metrics is a collapse-by-default disclosure (P3) — the "Metrics" heading is the disclosure
    // trigger, not an h3. Expand it so the metric bars below are visible/measurable.
    const metricsDisclosure = page.locator('[data-testid="disclosure-metrics"]')
    await expect(metricsDisclosure).toBeVisible({ timeout: 5_000 })
    await metricsDisclosure.scrollIntoViewIfNeeded()
    await expandInspectorSection(page, "disclosure-metrics")

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

    // Metrics is a collapse-by-default disclosure (P3) — expand it before measuring bar tracks.
    const metricsDisclosure = page.locator('[data-testid="disclosure-metrics"]')
    await expect(metricsDisclosure).toBeVisible({ timeout: 5_000 })
    await metricsDisclosure.scrollIntoViewIfNeeded()
    await expandInspectorSection(page, "disclosure-metrics")

    await assertConsistentBarWidths(page)

    await page.screenshot({ path: `${SCREENSHOT_DIR}/03-default-bar-widths-consistent.png`, fullPage: true })
  })

  test("default 300px sidebar: gains and costs text wraps within panel", async ({ page }) => {
    const hasComponents = await setupInspector(page)
    test.skip(!hasComponents, "Skipped: Firestore has no seeded component data")

    const inspector = page.locator('[data-testid="inspector"]')

    // Gains/Costs are collapse-by-default disclosures (P3): the headings are disclosure triggers
    // (disclosure-gains / disclosure-costs) and the list items live in the *-content collapsible.
    // Expand each, then assert each <li> wraps within the inspector width.
    const gainsTrigger = page.locator('[data-testid="disclosure-gains"]')
    if (await gainsTrigger.isVisible()) {
      await gainsTrigger.scrollIntoViewIfNeeded()
      await expandInspectorSection(page, "disclosure-gains")
      const gainItems = page.locator('[data-testid="disclosure-gains-content"] li')
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
    const costsTrigger = page.locator('[data-testid="disclosure-costs"]')
    if (await costsTrigger.isVisible()) {
      await costsTrigger.scrollIntoViewIfNeeded()
      await expandInspectorSection(page, "disclosure-costs")
      const costItems = page.locator('[data-testid="disclosure-costs-content"] li')
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

    // Fluidity P1: the config dropdown is on the canvas block now, not inside the inspector aside,
    // so the in-panel config-fit check is dropped. Metric-bar consistency below still applies.

    // Metrics is a collapse-by-default disclosure (P3) — expand it before measuring bar tracks.
    const metricsDisclosure = page.locator('[data-testid="disclosure-metrics"]')
    await expect(metricsDisclosure).toBeVisible({ timeout: 5_000 })
    await metricsDisclosure.scrollIntoViewIfNeeded()
    await expandInspectorSection(page, "disclosure-metrics")

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

    // Fluidity P1: the config dropdown is on the canvas BLOCK now, not inside the inspector overlay,
    // so an overlay-scoped config-fit check no longer makes sense (the control isn't in the overlay).
    // The overlay-content regression coverage now rests on the metric-bar consistency check below.

    // Metrics is a collapse-by-default disclosure (P3): the "Metrics" heading is the disclosure
    // trigger, not an h3. Scope to the overlay (the aside InspectorPanel is also mounted, so the
    // trigger exists twice) and expand it before measuring bar tracks.
    const metricsTrigger = overlay.locator('[data-testid="disclosure-metrics"]')
    if (await metricsTrigger.isVisible()) {
      await metricsTrigger.scrollIntoViewIfNeeded()
      if ((await metricsTrigger.getAttribute("aria-expanded")) === "false") {
        await metricsTrigger.click()
      }
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
