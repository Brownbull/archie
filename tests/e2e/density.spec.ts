import { test, expect } from "@playwright/test"
import { waitForComponentLibrary, dragComponentToCanvas, useAdvancedLevel } from "./helpers/canvas-helpers"

const SCREENSHOT_DIR = "test-results/density"

test.describe("Information density (P3)", () => {
  // D24: the inspector's verbose disclosures are level-gated → seed advanced.
  test.beforeEach(async ({ page }) => {
    await useAdvancedLevel(page)
  })

  test("palette: compact type blocks + collapsible categories", async ({ page }) => {
    await page.goto("/")
    const hasComponents = await waitForComponentLibrary(page)
    test.skip(!hasComponents, "Skipped: Firestore has no seeded component data")

    // The toolbox lists compact TYPE blocks grouped by category (the per-component card grid +
    // inline cost-range were replaced by the type-block redesign — D23/expanded-content).
    const typeBlocks = page.locator('[data-testid^="add-type-"]')
    const before = await typeBlocks.count()
    expect(before).toBeGreaterThan(0)
    await page.screenshot({ path: `${SCREENSHOT_DIR}/01-compact-palette.png`, fullPage: true })

    // Collapse the first category → its type blocks disappear, fewer blocks overall.
    const firstToggle = page.locator('[data-testid^="category-toggle-"]').first()
    await expect(firstToggle).toHaveAttribute("aria-expanded", "true")
    await firstToggle.click()
    await expect(firstToggle).toHaveAttribute("aria-expanded", "false")
    await expect(typeBlocks).not.toHaveCount(before)
    await page.screenshot({ path: `${SCREENSHOT_DIR}/02-category-collapsed.png`, fullPage: true })
  })

  test("inspector: compact header + Remove + collapse-by-default disclosures", async ({ page }) => {
    await page.goto("/")
    const hasComponents = await waitForComponentLibrary(page)
    test.skip(!hasComponents, "Skipped: Firestore has no seeded component data")

    // Place a metric-rich component so the gains/costs disclosure renders, then select via the
    // top-left header (the center carries the on-node dropdowns).
    const cb = await page.locator('[data-testid="canvas-panel"]').boundingBox()
    if (!cb) throw new Error("canvas-panel not found")
    await dragComponentToCanvas(page, "postgresql", cb.x + cb.width * 0.5, cb.y + cb.height * 0.45)
    await expect(page.locator('[data-testid="archie-node"]')).toHaveCount(1, { timeout: 5_000 })
    await page.locator('[data-testid="archie-node"]').first().click({ position: { x: 12, y: 6 } })
    await expect(page.locator('[data-testid="inspector-panel"]')).toBeVisible({ timeout: 5_000 })

    // Inspector header now offers a Remove action (consistency with the on-object toolbar).
    await expect(page.locator('[data-testid="inspector-remove-node"]')).toBeVisible()

    // Verbose sections start collapsed — content is genuinely hidden (not just aria state).
    const gains = page.locator('[data-testid="disclosure-gains"]')
    const gainsContent = page.locator('[data-testid="disclosure-gains-content"]')
    await expect(gains).toHaveAttribute("aria-expanded", "false")
    await expect(gainsContent).toBeHidden()
    await page.screenshot({ path: `${SCREENSHOT_DIR}/03-inspector-collapsed.png`, fullPage: true })

    // Expanding a disclosure reveals its content.
    await gains.click()
    await expect(gains).toHaveAttribute("aria-expanded", "true")
    await expect(gainsContent).toBeVisible()
    await page.screenshot({ path: `${SCREENSHOT_DIR}/04-inspector-expanded.png`, fullPage: true })
  })
})
