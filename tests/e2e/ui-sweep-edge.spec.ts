import { test, expect, type Locator } from "@playwright/test"
import { waitForComponentLibrary, addComponentToCanvas } from "./helpers/canvas-helpers"

const SCREENSHOT_DIR = "test-results/ui-sweep-edge"

async function width(loc: Locator): Promise<number> {
  const b = await loc.boundingBox()
  if (!b) throw new Error("no bounding box")
  return b.width
}

// Round 2 of the visual sweep — edge cases most likely to harbor layout/contrast bugs:
// empty + filtered states, long-name overflow, the settings dropdown, LIGHT theme
// (the app is dark-first), and the import dialog. Captures screenshots for review and
// asserts the cheap invariants (no horizontal page overflow, panels stay in-viewport).

test.describe("UI sweep — edge cases & polish", () => {
  test("empty canvas — pristine first-load state", async ({ page }) => {
    await page.goto("/")
    test.skip(!(await waitForComponentLibrary(page)), "no seeded data")
    // No nodes yet — the canvas should show its empty prompt, toolbox populated.
    await expect(page.locator('[data-testid="archie-node"]')).toHaveCount(0)
    await page.screenshot({ path: `${SCREENSHOT_DIR}/01-empty-canvas.png`, fullPage: true })
  })

  test("toolbox search — filtered then no-result empty state", async ({ page }) => {
    await page.goto("/")
    test.skip(!(await waitForComponentLibrary(page)), "no seeded data")
    const search = page.locator('[data-testid="search-input"]')
    await search.fill("redis")
    await page.waitForTimeout(250)
    await page.screenshot({ path: `${SCREENSHOT_DIR}/02-search-filtered.png`, fullPage: true })

    await search.fill("zzqqnomatch")
    await page.waitForTimeout(250)
    // Toolbox must still render its frame (search box) — no layout collapse on empty result.
    await expect(page.locator('[data-testid="search-filter"]')).toBeVisible()
    await page.screenshot({ path: `${SCREENSHOT_DIR}/03-search-no-result.png`, fullPage: true })
  })

  test("long component name — no overflow in node + inspector", async ({ page }) => {
    await page.goto("/")
    test.skip(!(await waitForComponentLibrary(page)), "no seeded data")
    // Narrow to the longest-named component, then add it.
    await page.locator('[data-testid="search-input"]').fill("Serverless Compute")
    await page.waitForTimeout(250)
    await addComponentToCanvas(page, 0)
    await page.locator('[data-testid="archie-node"]').first().click()
    const inspector = page.locator('[data-testid="inspector-panel"]')
    await expect(inspector).toBeVisible({ timeout: 5_000 })

    await page.screenshot({ path: `${SCREENSHOT_DIR}/04-long-name.png`, fullPage: true })

    // The long name must not blow out the inspector width nor cause horizontal page scroll.
    const inspectorW = await width(inspector)
    expect(inspectorW, "inspector width should stay bounded despite long name").toBeLessThan(500)
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    )
    expect(overflow, "no horizontal page overflow from long component name").toBeLessThanOrEqual(1)

    // The code snippet must wrap inside the narrow inspector, not clip/overflow horizontally.
    // Code is behind a collapse-by-default "Code example" disclosure — open it first.
    await page.locator('[data-testid="disclosure-code"]').click().catch(() => {})
    const codeSection = page.locator('[data-testid="code-snippet-section"]')
    if (await codeSection.isVisible().catch(() => false)) {
      const codeOverflow = await codeSection.evaluate((el) => el.scrollWidth - el.clientWidth)
      expect(codeOverflow, "code snippet must wrap, not overflow the inspector").toBeLessThanOrEqual(1)
    }
  })

  test("settings dropdown — opens within viewport", async ({ page }) => {
    await page.goto("/")
    test.skip(!(await waitForComponentLibrary(page)), "no seeded data")
    await page.locator('[data-testid="settings-menu-trigger"]').click()
    const menu = page.locator('[data-testid="settings-menu-content"]')
    await expect(menu).toBeVisible()
    await page.waitForTimeout(200)
    await page.screenshot({ path: `${SCREENSHOT_DIR}/05-settings-menu.png`, fullPage: true })

    const box = await menu.boundingBox()
    const vp = page.viewportSize()
    if (box && vp) {
      expect(box.x + box.width, "settings menu must not clip off the right edge").toBeLessThanOrEqual(vp.width + 1)
      expect(box.x, "settings menu must not clip off the left edge").toBeGreaterThanOrEqual(-1)
    }
  })

  test("light theme — canvas + scores legible", async ({ page }) => {
    await page.goto("/")
    test.skip(!(await waitForComponentLibrary(page)), "no seeded data")
    await page.locator('[data-testid="settings-menu-trigger"]').click()
    await page.locator('[data-testid="theme-option-light"]').click()
    await page.keyboard.press("Escape") // close the menu
    await page.waitForTimeout(300)
    await addComponentToCanvas(page, 0)
    await addComponentToCanvas(page, 1)
    await page.waitForTimeout(300)
    await page.screenshot({ path: `${SCREENSHOT_DIR}/06-light-theme.png`, fullPage: true })
  })

  test("inspector Metrics + Data sections — no overflow", async ({ page }) => {
    await page.goto("/")
    test.skip(!(await waitForComponentLibrary(page)), "no seeded data")
    await addComponentToCanvas(page, 0)
    await page.locator('[data-testid="archie-node"]').first().click()
    await expect(page.locator('[data-testid="inspector-panel"]')).toBeVisible({ timeout: 5_000 })

    // P3: section-nav removed — scroll each section into view directly (best-effort; sections are level
    // gated). The real assertion below is that the inspector never overflows horizontally.
    for (const [testid, file] of [["disclosure-metrics", "08-inspector-metrics"], ["data-context-section-trigger", "09-inspector-data"]] as const) {
      await page.locator(`[data-testid="${testid}"]`).scrollIntoViewIfNeeded().catch(() => {})
      await page.waitForTimeout(400) // smooth scroll settle
      await page.screenshot({ path: `${SCREENSHOT_DIR}/${file}.png`, fullPage: true })
    }
    // Inspector content must not overflow the page horizontally.
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    )
    expect(overflow, "inspector sections must not cause horizontal page overflow").toBeLessThanOrEqual(1)
  })

  test("import dialog — renders without clipping", async ({ page }) => {
    await page.goto("/")
    test.skip(!(await waitForComponentLibrary(page)), "no seeded data")
    await page.locator('[data-testid="import-button"]').click()
    // The import surface (dialog or file picker host) should appear.
    const fileInput = page.locator('[data-testid="import-file-input"]')
    await fileInput.waitFor({ state: "attached", timeout: 5_000 }).catch(() => {})
    await page.waitForTimeout(300)
    await page.screenshot({ path: `${SCREENSHOT_DIR}/07-import-dialog.png`, fullPage: true })
  })
})
