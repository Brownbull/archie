import { test, expect } from "@playwright/test"
import {
  waitForComponentLibrary,
  addComponentToCanvas,
  selectNodeOnCanvas,
} from "./helpers/canvas-helpers"

const SCREENSHOT_DIR = "test-results/inspector-ux-polish"

/**
 * Shared setup: navigate, wait for library, place one component, select it.
 * Returns true if components were available; caller skips the test if false.
 */
async function setupInspector(page: import("@playwright/test").Page): Promise<boolean> {
  await page.goto("/")
  const hasComponents = await waitForComponentLibrary(page)
  if (!hasComponents) return false
  await addComponentToCanvas(page, 0)
  await selectNodeOnCanvas(page, 0)
  return true
}

test.describe("Inspector UX Polish E2E (Story 4-6)", () => {
  // -------------------------------------------------------------------------
  // AC-1: Expand toggle — 300px <-> 500px
  // -------------------------------------------------------------------------
  test("AC-1: expand toggle widens inspector to 500px then returns to 300px", async ({ page }) => {
    const hasComponents = await setupInspector(page)
    test.skip(!hasComponents, "Skipped: Firestore has no seeded component data")

    const inspector = page.locator('[data-testid="inspector"]')
    const toggle = page.locator('[data-testid="inspector-expand-toggle"]')

    // Baseline: 300px default
    await expect(inspector).toHaveCSS("width", "300px")

    // Expand to 500px
    await toggle.click()
    await expect(inspector).toHaveCSS("width", "500px")

    await page.screenshot({ path: `${SCREENSHOT_DIR}/01-inspector-expanded-500.png`, fullPage: true })

    // Toggle back to 300px
    await toggle.click()
    await expect(inspector).toHaveCSS("width", "300px")

    await page.screenshot({ path: `${SCREENSHOT_DIR}/02-inspector-back-to-300.png`, fullPage: true })
  })

  // -------------------------------------------------------------------------
  // AC-2: Drag handle visible with correct cursor (actual drag resize
  // tested in unit tests — pointer capture doesn't work reliably in
  // Playwright automation)
  // -------------------------------------------------------------------------
  test("AC-2: drag resize handle visible with correct cursor", async ({ page }) => {
    const hasComponents = await setupInspector(page)
    test.skip(!hasComponents, "Skipped: Firestore has no seeded component data")

    const handle = page.locator('[data-testid="inspector-resize-handle"]')
    await expect(handle).toBeVisible()

    // Verify resize cursor CSS class
    await expect(handle).toHaveCSS("cursor", "col-resize")

    await page.screenshot({ path: `${SCREENSHOT_DIR}/03-resize-handle-visible.png`, fullPage: true })
  })

  // -------------------------------------------------------------------------
  // AC-4: Maximize button opens full-screen overlay
  // -------------------------------------------------------------------------
  test("AC-4: maximize button opens inspector overlay covering canvas", async ({ page }) => {
    const hasComponents = await setupInspector(page)
    test.skip(!hasComponents, "Skipped: Firestore has no seeded component data")

    const inspector = page.locator('[data-testid="inspector"]')
    const maximizeBtn = page.locator('[data-testid="inspector-maximize-btn"]')
    await expect(maximizeBtn).toBeVisible()

    await maximizeBtn.click()

    // Overlay should appear
    const overlay = page.locator('[data-testid="inspector-overlay"]')
    await overlay.waitFor({ state: "visible", timeout: 3_000 })

    // Overlay close button must be visible
    await expect(page.locator('[data-testid="inspector-overlay-close"]')).toBeVisible()

    // When overlay is active the inline aside collapses to 0px width
    // (computed width is 1px due to border-l taking minimum 1px)
    await expect(inspector).toHaveCSS("width", "1px")

    await page.screenshot({ path: `${SCREENSHOT_DIR}/04-overlay-open.png`, fullPage: true })
  })

  // -------------------------------------------------------------------------
  // AC-5a: Overlay close button dismisses overlay
  // -------------------------------------------------------------------------
  test("AC-5a: overlay close button dismisses overlay and restores inspector", async ({ page }) => {
    const hasComponents = await setupInspector(page)
    test.skip(!hasComponents, "Skipped: Firestore has no seeded component data")

    const inspector = page.locator('[data-testid="inspector"]')

    // Open overlay
    await page.locator('[data-testid="inspector-maximize-btn"]').click()
    await page.locator('[data-testid="inspector-overlay"]').waitFor({ state: "visible", timeout: 3_000 })

    // Close via close button
    await page.locator('[data-testid="inspector-overlay-close"]').click()
    await page.locator('[data-testid="inspector-overlay"]').waitFor({ state: "hidden", timeout: 3_000 })

    // Inspector aside must restore to default width
    await expect(inspector).toHaveCSS("width", "300px")
    await expect(page.locator('[data-testid="inspector-panel"]')).toBeVisible()

    await page.screenshot({ path: `${SCREENSHOT_DIR}/05-overlay-closed-via-button.png`, fullPage: true })
  })

  // -------------------------------------------------------------------------
  // AC-5b: Escape key dismisses overlay
  // -------------------------------------------------------------------------
  test("AC-5b: Escape key dismisses inspector overlay", async ({ page }) => {
    const hasComponents = await setupInspector(page)
    test.skip(!hasComponents, "Skipped: Firestore has no seeded component data")

    const inspector = page.locator('[data-testid="inspector"]')

    // Open overlay
    await page.locator('[data-testid="inspector-maximize-btn"]').click()
    await page.locator('[data-testid="inspector-overlay"]').waitFor({ state: "visible", timeout: 3_000 })

    // Dismiss with Escape
    await page.keyboard.press("Escape")
    await page.locator('[data-testid="inspector-overlay"]').waitFor({ state: "hidden", timeout: 3_000 })

    // Inspector restores
    await expect(inspector).toHaveCSS("width", "300px")

    await page.screenshot({ path: `${SCREENSHOT_DIR}/06-overlay-closed-via-escape.png`, fullPage: true })
  })

  // -------------------------------------------------------------------------
  // AC-6: Section nav (Code / Details / Metrics) visible for node selection
  // -------------------------------------------------------------------------
  test("AC-6: section nav buttons visible in inspector header for node selection", async ({ page }) => {
    const hasComponents = await setupInspector(page)
    test.skip(!hasComponents, "Skipped: Firestore has no seeded component data")

    const sectionNav = page.locator('[data-testid="inspector-section-nav"]')
    await expect(sectionNav).toBeVisible()

    // All three section anchor buttons must be present
    await expect(sectionNav.getByText("Code")).toBeVisible()
    await expect(sectionNav.getByText("Details")).toBeVisible()
    await expect(sectionNav.getByText("Metrics")).toBeVisible()

    await page.screenshot({ path: `${SCREENSHOT_DIR}/07-section-nav-visible.png`, fullPage: true })
  })

  // -------------------------------------------------------------------------
  // AC-7: Width persists when switching selected node
  // -------------------------------------------------------------------------
  test("AC-7: inspector width persists across node selection changes", async ({ page }) => {
    const hasComponents = await setupInspector(page)
    test.skip(!hasComponents, "Skipped: Firestore has no seeded component data")

    const inspector = page.locator('[data-testid="inspector"]')

    // Add a second component so we can switch selection
    await addComponentToCanvas(page, 1)

    // Widen inspector with toggle
    await page.locator('[data-testid="inspector-expand-toggle"]').click()
    await expect(inspector).toHaveCSS("width", "500px")

    // Switch selection to second node
    await selectNodeOnCanvas(page, 1)

    // Width should persist at 500px (not reset to 300px)
    await expect(inspector).toHaveCSS("width", "500px")

    await page.screenshot({ path: `${SCREENSHOT_DIR}/08-width-persists-after-node-switch.png`, fullPage: true })
  })

  // -------------------------------------------------------------------------
  // AC-8: Collapse from any width then expand restores previous width
  // -------------------------------------------------------------------------
  test("AC-8: collapse to 40px then expand restores previous width", async ({ page }) => {
    const hasComponents = await setupInspector(page)
    test.skip(!hasComponents, "Skipped: Firestore has no seeded component data")

    const inspector = page.locator('[data-testid="inspector"]')

    // Widen to 500px first
    await page.locator('[data-testid="inspector-expand-toggle"]').click()
    await expect(inspector).toHaveCSS("width", "500px")

    // Collapse to 40px
    const collapseBtn = page.locator('[data-testid="inspector-collapse-btn"]').first()
    await collapseBtn.click()
    await expect(inspector).toHaveCSS("width", "40px")

    await page.screenshot({ path: `${SCREENSHOT_DIR}/09-inspector-collapsed-40.png`, fullPage: true })

    // Expand — should restore to 500px (the store width is preserved)
    await collapseBtn.click()
    await expect(inspector).toHaveCSS("width", "500px")

    await page.screenshot({ path: `${SCREENSHOT_DIR}/10-inspector-restored-after-expand.png`, fullPage: true })
  })
})
