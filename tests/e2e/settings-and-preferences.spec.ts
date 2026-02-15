import { test, expect, type Page } from "@playwright/test"
import { waitForComponentLibrary } from "./helpers/canvas-helpers"

const SCREENSHOT_DIR = "test-results/settings-and-preferences"

// Font preset maps (mirror src/lib/constants.ts)
const FONT_SIZE_PRESETS: Record<string, string> = {
  small: "14px",
  medium: "16px",
  large: "18px",
}

const FONT_FAMILY_PRESETS: Record<string, string> = {
  inter: '"Inter", system-ui, sans-serif',
  outfit: '"Outfit", system-ui, sans-serif',
  "space-grotesk": '"Space Grotesk", system-ui, sans-serif',
  "fira-sans": '"Fira Sans", system-ui, sans-serif',
  "dm-sans": '"DM Sans", system-ui, sans-serif',
  "source-sans-3": '"Source Sans 3", system-ui, sans-serif',
  "jetbrains-mono": '"JetBrains Mono", monospace',
  system: "system-ui, -apple-system, sans-serif",
}

/** Open the settings dropdown and wait for it to be visible */
async function openSettings(page: Page) {
  await page.locator('[data-testid="settings-menu-trigger"]').click()
  await page.locator('[data-testid="settings-menu-content"]').waitFor({ state: "visible" })
}

/** Click a dropdown option and wait for React to settle (Radix auto-closes on click) */
async function selectOption(page: Page, testId: string) {
  await page.locator(`[data-testid="${testId}"]`).click()
  await page.waitForTimeout(300)
}

/** Get a CSS custom property value from the html element */
async function getCSSProp(page: Page, prop: string): Promise<string> {
  return page.evaluate((p) => document.documentElement.style.getPropertyValue(p), prop)
}

/** Get the root (html) font-size — set directly on the element, not via CSS variable */
async function getRootFontSize(page: Page): Promise<string> {
  return page.evaluate(() => document.documentElement.style.fontSize)
}

/** Reload page and wait for toolbar to be visible */
async function reloadAndWait(page: Page) {
  await page.reload()
  await page.locator('[data-testid="toolbar"]').waitFor({ state: "visible", timeout: 15_000 })
}

/** Measure computed font-size (px) on representative elements across all panels */
async function measureFontSizes(page: Page) {
  return page.evaluate(() => {
    const measure = (sel: string): number | null => {
      const el = document.querySelector(sel)
      return el ? parseFloat(getComputedStyle(el).fontSize) : null
    }
    return {
      body: parseFloat(getComputedStyle(document.body).fontSize),
      toolbar: measure('[data-testid="toolbar"] span'),
      toolboxCard: measure('[data-testid^="component-card-"] h4'),
      canvasNode: measure('[data-testid="archie-node"] span'),
      inspector: measure('[data-testid="inspector-panel"] span'),
    }
  })
}

test.describe("Settings & Preferences E2E (Story 2-5)", () => {
  test.afterEach(async ({ page }) => {
    await page.evaluate(() => localStorage.removeItem("archie-preferences"))
  })

  // --- AC-1: Gear icon visible in toolbar ---

  test("AC-1: gear icon is visible in the toolbar", async ({ page }) => {
    await page.goto("/")
    const toolbar = page.locator('[data-testid="toolbar"]')
    await expect(toolbar).toBeVisible({ timeout: 15_000 })
    await expect(toolbar.locator('[data-testid="settings-menu-trigger"]')).toBeVisible()

    await page.screenshot({ path: `${SCREENSHOT_DIR}/01-gear-icon-in-toolbar.png`, fullPage: true })
  })

  // --- AC-2: Dropdown opens on click, closes on outside click ---

  test("AC-2: dropdown opens on gear click and closes on outside click", async ({ page }) => {
    await page.goto("/")
    await expect(page.locator('[data-testid="settings-menu-trigger"]')).toBeVisible({ timeout: 15_000 })

    const dropdown = page.locator('[data-testid="settings-menu-content"]')
    await expect(dropdown).toHaveCount(0)

    await openSettings(page)
    await expect(dropdown).toBeVisible({ timeout: 3_000 })
    await page.screenshot({ path: `${SCREENSHOT_DIR}/02-dropdown-open.png`, fullPage: true })

    // Radix dismiss layer intercepts clicks — use absolute coordinates
    await page.mouse.click(10, 10)
    await expect(dropdown).toBeHidden({ timeout: 3_000 })
    await page.screenshot({ path: `${SCREENSHOT_DIR}/03-dropdown-closed-outside-click.png`, fullPage: true })
  })

  test("AC-2: dropdown contains all settings sections", async ({ page }) => {
    await page.goto("/")
    await expect(page.locator('[data-testid="settings-menu-trigger"]')).toBeVisible({ timeout: 15_000 })
    await openSettings(page)

    // Theme options
    await expect(page.locator('[data-testid="theme-option-dark"]')).toBeVisible()
    await expect(page.locator('[data-testid="theme-option-light"]')).toBeVisible()
    // Font size options
    await expect(page.locator('[data-testid="font-size-small"]')).toBeVisible()
    await expect(page.locator('[data-testid="font-size-medium"]')).toBeVisible()
    await expect(page.locator('[data-testid="font-size-large"]')).toBeVisible()
    // Font family options
    await expect(page.locator('[data-testid="font-family-inter"]')).toBeVisible()
    await expect(page.locator('[data-testid="font-family-jetbrains-mono"]')).toBeVisible()
    await expect(page.locator('[data-testid="font-family-system"]')).toBeVisible()

    await page.screenshot({ path: `${SCREENSHOT_DIR}/04-dropdown-all-sections.png`, fullPage: true })
  })

  // --- AC-3: Theme toggle applies immediately and persists on reload ---

  test("AC-3: switching to light theme removes dark class", async ({ page }) => {
    await page.goto("/")
    await expect(page.locator('[data-testid="settings-menu-trigger"]')).toBeVisible({ timeout: 15_000 })
    await expect(page.locator("html")).toHaveClass(/dark/)
    await page.screenshot({ path: `${SCREENSHOT_DIR}/05-default-dark-theme.png`, fullPage: true })

    await openSettings(page)
    await selectOption(page, "theme-option-light")
    await expect(page.locator("html")).not.toHaveClass(/dark/)
    await page.screenshot({ path: `${SCREENSHOT_DIR}/06-light-theme-applied.png`, fullPage: true })
  })

  test("AC-3: switching back to dark theme restores dark class", async ({ page }) => {
    await page.goto("/")
    await expect(page.locator('[data-testid="settings-menu-trigger"]')).toBeVisible({ timeout: 15_000 })

    // Switch to light
    await openSettings(page)
    await selectOption(page, "theme-option-light")
    await expect(page.locator("html")).not.toHaveClass(/dark/)

    // Switch back to dark
    await openSettings(page)
    await selectOption(page, "theme-option-dark")
    await expect(page.locator("html")).toHaveClass(/dark/)
    await page.screenshot({ path: `${SCREENSHOT_DIR}/07-dark-theme-restored.png`, fullPage: true })
  })

  test("AC-3: theme preference persists across page reload", async ({ page }) => {
    await page.goto("/")
    await expect(page.locator('[data-testid="settings-menu-trigger"]')).toBeVisible({ timeout: 15_000 })

    await openSettings(page)
    await selectOption(page, "theme-option-light")
    await expect(page.locator("html")).not.toHaveClass(/dark/)

    await reloadAndWait(page)
    await expect(page.locator("html")).not.toHaveClass(/dark/)
    await page.screenshot({ path: `${SCREENSHOT_DIR}/08-light-theme-persisted-after-reload.png`, fullPage: true })
  })

  // --- AC-4: Font size applies immediately and persists on reload ---

  test("AC-4: changing font size to Large updates CSS property", async ({ page }) => {
    await page.goto("/")
    await expect(page.locator('[data-testid="settings-menu-trigger"]')).toBeVisible({ timeout: 15_000 })
    expect(await getRootFontSize(page)).toBe(FONT_SIZE_PRESETS.medium)

    await openSettings(page)
    await selectOption(page, "font-size-large")
    expect(await getRootFontSize(page)).toBe(FONT_SIZE_PRESETS.large)
    await page.screenshot({ path: `${SCREENSHOT_DIR}/09-font-size-large-applied.png`, fullPage: true })
  })

  test("AC-4: changing font size to Small updates CSS property", async ({ page }) => {
    await page.goto("/")
    await expect(page.locator('[data-testid="settings-menu-trigger"]')).toBeVisible({ timeout: 15_000 })

    await openSettings(page)
    await selectOption(page, "font-size-small")
    expect(await getRootFontSize(page)).toBe(FONT_SIZE_PRESETS.small)
    await page.screenshot({ path: `${SCREENSHOT_DIR}/10-font-size-small-applied.png`, fullPage: true })
  })

  test("AC-4: font size preference persists across page reload", async ({ page }) => {
    await page.goto("/")
    await expect(page.locator('[data-testid="settings-menu-trigger"]')).toBeVisible({ timeout: 15_000 })

    await openSettings(page)
    await selectOption(page, "font-size-large")
    expect(await getRootFontSize(page)).toBe(FONT_SIZE_PRESETS.large)

    await reloadAndWait(page)
    expect(await getRootFontSize(page)).toBe(FONT_SIZE_PRESETS.large)
    await page.screenshot({ path: `${SCREENSHOT_DIR}/11-font-size-large-persisted-after-reload.png`, fullPage: true })
  })

  // --- AC-5: Font family applies immediately and persists on reload ---

  test("AC-5: changing font to JetBrains Mono updates CSS property", async ({ page }) => {
    await page.goto("/")
    await expect(page.locator('[data-testid="settings-menu-trigger"]')).toBeVisible({ timeout: 15_000 })
    expect(await getCSSProp(page, "--archie-font-family")).toBe(FONT_FAMILY_PRESETS.inter)

    await openSettings(page)
    await selectOption(page, "font-family-jetbrains-mono")
    expect(await getCSSProp(page, "--archie-font-family")).toBe(FONT_FAMILY_PRESETS["jetbrains-mono"])
    await page.screenshot({ path: `${SCREENSHOT_DIR}/12-font-family-jetbrains-mono-applied.png`, fullPage: true })
  })

  test("AC-5: changing font to System updates CSS property", async ({ page }) => {
    await page.goto("/")
    await expect(page.locator('[data-testid="settings-menu-trigger"]')).toBeVisible({ timeout: 15_000 })

    await openSettings(page)
    await selectOption(page, "font-family-system")
    expect(await getCSSProp(page, "--archie-font-family")).toBe(FONT_FAMILY_PRESETS.system)
    await page.screenshot({ path: `${SCREENSHOT_DIR}/13-font-family-system-applied.png`, fullPage: true })
  })

  test("AC-5: font family preference persists across page reload", async ({ page }) => {
    await page.goto("/")
    await expect(page.locator('[data-testid="settings-menu-trigger"]')).toBeVisible({ timeout: 15_000 })

    await openSettings(page)
    await selectOption(page, "font-family-jetbrains-mono")
    expect(await getCSSProp(page, "--archie-font-family")).toBe(FONT_FAMILY_PRESETS["jetbrains-mono"])

    await reloadAndWait(page)
    expect(await getCSSProp(page, "--archie-font-family")).toBe(FONT_FAMILY_PRESETS["jetbrains-mono"])
    await page.screenshot({ path: `${SCREENSHOT_DIR}/14-font-family-jetbrains-persisted-after-reload.png`, fullPage: true })
  })

  // --- Combined: multiple preferences persist together ---

  test("all three preferences persist together across reload", async ({ page }) => {
    await page.goto("/")
    await expect(page.locator('[data-testid="settings-menu-trigger"]')).toBeVisible({ timeout: 15_000 })

    // Set theme to light
    await openSettings(page)
    await selectOption(page, "theme-option-light")
    // Set font size to large
    await openSettings(page)
    await selectOption(page, "font-size-large")
    // Set font family to system
    await openSettings(page)
    await selectOption(page, "font-family-system")

    // Verify all applied
    await expect(page.locator("html")).not.toHaveClass(/dark/)
    expect(await getRootFontSize(page)).toBe(FONT_SIZE_PRESETS.large)
    expect(await getCSSProp(page, "--archie-font-family")).toBe(FONT_FAMILY_PRESETS.system)
    await page.screenshot({ path: `${SCREENSHOT_DIR}/15-all-preferences-applied.png`, fullPage: true })

    // Reload and verify persistence
    await reloadAndWait(page)
    await expect(page.locator("html")).not.toHaveClass(/dark/)
    expect(await getRootFontSize(page)).toBe(FONT_SIZE_PRESETS.large)
    expect(await getCSSProp(page, "--archie-font-family")).toBe(FONT_FAMILY_PRESETS.system)
    await page.screenshot({ path: `${SCREENSHOT_DIR}/16-all-preferences-persisted-after-reload.png`, fullPage: true })
  })

  // --- Edge: defaults on clean state ---

  test("defaults: dark theme, medium font size, Inter font family on clean state", async ({ page }) => {
    await page.goto("/")
    await page.evaluate(() => localStorage.removeItem("archie-preferences"))
    await reloadAndWait(page)

    await expect(page.locator("html")).toHaveClass(/dark/)
    expect(await getRootFontSize(page)).toBe(FONT_SIZE_PRESETS.medium)
    expect(await getCSSProp(page, "--archie-font-family")).toBe(FONT_FAMILY_PRESETS.inter)
    await page.screenshot({ path: `${SCREENSHOT_DIR}/17-clean-state-defaults.png`, fullPage: true })
  })

  // --- Visual verification: font size affects all panels with full canvas setup ---

  test("font size visual: all panels scale with small/medium/large (Inter)", async ({ page }) => {
    await page.goto("/")
    await expect(page.locator('[data-testid="toolbar"]')).toBeVisible({ timeout: 15_000 })

    // Explicitly set Inter font family
    await openSettings(page)
    await selectOption(page, "font-family-inter")

    // Wait for component library
    const hasComponents = await waitForComponentLibrary(page)
    test.skip(!hasComponents, "Skipped: Firestore has no seeded component data")

    // Place 2 components via Add to Canvas buttons
    const addBtns = page.locator('[data-testid^="add-to-canvas-"]')
    await expect(addBtns.first()).toBeVisible({ timeout: 5_000 })
    const btnCount = await addBtns.count()
    test.skip(btnCount < 2, "Skipped: Need at least 2 components")

    await addBtns.nth(0).click()
    await expect(page.locator('[data-testid="archie-node"]')).toHaveCount(1, { timeout: 5_000 })
    await addBtns.nth(1).click()
    await expect(page.locator('[data-testid="archie-node"]')).toHaveCount(2, { timeout: 5_000 })

    // Connect node 0 → node 1 via mouse drag on handles
    const srcHandle = page.locator('[data-testid="archie-node-handle-source"]').nth(0)
    const tgtHandle = page.locator('[data-testid="archie-node-handle-target"]').nth(1)
    const srcBox = await srcHandle.boundingBox()
    const tgtBox = await tgtHandle.boundingBox()
    if (srcBox && tgtBox) {
      const sx = srcBox.x + srcBox.width / 2
      const sy = srcBox.y + srcBox.height / 2
      const tx = tgtBox.x + tgtBox.width / 2
      const ty = tgtBox.y + tgtBox.height / 2
      await page.mouse.move(sx, sy)
      await page.mouse.down()
      await page.mouse.move((sx + tx) / 2, (sy + ty) / 2, { steps: 5 })
      await page.mouse.move(tx, ty, { steps: 5 })
      await page.mouse.up()
    }
    await page.waitForTimeout(300)

    // Click first node to open inspector panel
    await page.locator('[data-testid="archie-node"]').first().click()
    await expect(page.locator('[data-testid="inspector-panel"]')).toBeVisible({ timeout: 5_000 })

    // Confirm all panels are visible
    await expect(page.locator('[data-testid="toolbox"]')).toBeVisible()
    await expect(page.locator('[data-testid="dashboard"]')).toBeVisible()
    await expect(page.locator('[data-testid="inspector"]')).toBeVisible()

    await page.screenshot({ path: `${SCREENSHOT_DIR}/20-setup-all-panels-open.png`, fullPage: true })

    // Cycle through font sizes and collect measurements
    type FontMeasurement = Awaited<ReturnType<typeof measureFontSizes>>
    const measurements: Record<string, FontMeasurement> = {}

    for (const size of ["small", "medium", "large"] as const) {
      await openSettings(page)
      await selectOption(page, `font-size-${size}`)

      // Verify root font-size
      expect(await getRootFontSize(page)).toBe(FONT_SIZE_PRESETS[size])

      // Measure computed font-sizes on elements across all panels
      measurements[size] = await measureFontSizes(page)

      // Canvas node width must remain 140px (AC-ARCH-NO-3)
      await expect(page.locator('[data-testid="archie-node"]').first()).toHaveCSS("width", "140px")

      const num = size === "small" ? "21" : size === "medium" ? "22" : "23"
      await page.screenshot({
        path: `${SCREENSHOT_DIR}/${num}-font-size-${size}-all-panels.png`,
        fullPage: true,
      })
    }

    // Assert: for every measured element, small < medium < large
    for (const key of Object.keys(measurements.small) as (keyof FontMeasurement)[]) {
      const s = measurements.small[key]
      const m = measurements.medium[key]
      const l = measurements.large[key]
      if (s != null && m != null && l != null) {
        expect(s, `${key}: small (${s}px) < medium (${m}px)`).toBeLessThan(m)
        expect(m, `${key}: medium (${m}px) < large (${l}px)`).toBeLessThan(l)
      }
    }
  })
})
