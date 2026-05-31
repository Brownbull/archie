import { test, expect } from "@playwright/test"
import { waitForComponentLibrary, addComponentToCanvas } from "./helpers/canvas-helpers"

const SCREENSHOT_DIR = "test-results/density"

test.describe("Information density (P3)", () => {
  test("palette: compact cards with price + collapsible categories", async ({ page }) => {
    await page.goto("/")
    const hasComponents = await waitForComponentLibrary(page)
    test.skip(!hasComponents, "Skipped: Firestore has no seeded component data")

    const cards = page.locator('[data-testid^="component-card-"]')
    const before = await cards.count()
    expect(before).toBeGreaterThan(0)
    // Compact row surfaces a price range inline (detail is hover-revealed).
    await expect(page.locator('[data-testid^="cost-range-"]').first()).toBeVisible()
    await page.screenshot({ path: `${SCREENSHOT_DIR}/01-compact-palette.png`, fullPage: true })

    // Collapse the first category → its cards disappear, fewer cards overall.
    const firstToggle = page.locator('[data-testid^="category-toggle-"]').first()
    await expect(firstToggle).toHaveAttribute("aria-expanded", "true")
    await firstToggle.click()
    await expect(firstToggle).toHaveAttribute("aria-expanded", "false")
    await expect(cards).not.toHaveCount(before)
    await page.screenshot({ path: `${SCREENSHOT_DIR}/02-category-collapsed.png`, fullPage: true })
  })

  test("inspector: compact header + Remove + collapse-by-default disclosures", async ({ page }) => {
    await page.goto("/")
    const hasComponents = await waitForComponentLibrary(page)
    test.skip(!hasComponents, "Skipped: Firestore has no seeded component data")

    await addComponentToCanvas(page, 0)
    await page.locator('[data-testid="archie-node"]').first().click()
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
