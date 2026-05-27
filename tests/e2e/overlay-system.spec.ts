import { test, expect } from "@playwright/test"
import {
  waitForComponentLibrary,
  dragComponentToCanvas,
  triggerRecalcViaConfigChange,
} from "./helpers/canvas-helpers"

const SCREENSHOT_DIR = "test-results/overlay-system"

test.describe("Overlay System E2E", () => {
  test("overlay selector renders and toggles modes", async ({ page }) => {
    await page.goto("/")
    await waitForComponentLibrary(page)

    const selector = page.locator('[data-testid="overlay-selector"]')
    await expect(selector).toBeVisible({ timeout: 5_000 })

    await page.screenshot({
      path: `${SCREENSHOT_DIR}/01-overlay-selector-default.png`,
      fullPage: true,
    })

    await page.locator('[data-testid="overlay-mode-performance"]').click()
    await expect(
      page.locator('[data-testid="overlay-mode-performance"]'),
    ).toHaveAttribute("aria-pressed", "true")

    await page.screenshot({
      path: `${SCREENSHOT_DIR}/02-overlay-performance-active.png`,
      fullPage: true,
    })

    await page.locator('[data-testid="overlay-mode-performance"]').click()
    await expect(
      page.locator('[data-testid="overlay-mode-performance"]'),
    ).toHaveAttribute("aria-pressed", "false")
  })

  test("overlay badge appears on node when mode is active", async ({ page }) => {
    await page.goto("/")
    await waitForComponentLibrary(page)

    await dragComponentToCanvas(page, "redis", 400, 300)
    await expect(page.locator('[data-testid="archie-node"]')).toHaveCount(1, {
      timeout: 5_000,
    })
    await triggerRecalcViaConfigChange(page, 0)

    await page.locator('[data-testid="canvas-panel"]').click({
      position: { x: 10, y: 10 },
    })

    await page.locator('[data-testid="overlay-mode-compatibility"]').click()

    await page.screenshot({
      path: `${SCREENSHOT_DIR}/03-overlay-badge-compatibility.png`,
      fullPage: true,
    })

    const badge = page.locator('[data-testid="overlay-badge"]')
    await expect(badge).toBeVisible({ timeout: 3_000 })
  })

  test("keyboard shortcut Alt+2 activates performance overlay", async ({ page }) => {
    await page.goto("/")
    await waitForComponentLibrary(page)

    const panel = page.locator('[data-testid="canvas-panel"]')
    await panel.focus()
    await page.keyboard.press("Alt+2")

    await expect(
      page.locator('[data-testid="overlay-mode-performance"]'),
    ).toHaveAttribute("aria-pressed", "true")

    await page.screenshot({
      path: `${SCREENSHOT_DIR}/04-overlay-alt-shortcut.png`,
      fullPage: true,
    })

    await page.keyboard.press("Alt+0")
    await expect(
      page.locator('[data-testid="overlay-mode-performance"]'),
    ).toHaveAttribute("aria-pressed", "false")
  })

  test("overlay cycles through all modes", async ({ page }) => {
    await page.goto("/")
    await waitForComponentLibrary(page)

    const modes = ["none", "compatibility", "performance", "cost", "tier", "flow"]
    for (let i = 0; i < modes.length; i++) {
      const btn = page.locator(`[data-testid="overlay-mode-${modes[i]}"]`)
      await btn.click()
      await expect(btn).toHaveAttribute("aria-pressed", "true")
    }

    await page.screenshot({
      path: `${SCREENSHOT_DIR}/05-overlay-flow-active.png`,
      fullPage: true,
    })

    await page.locator('[data-testid="overlay-mode-flow"]').click()
    await expect(
      page.locator('[data-testid="overlay-mode-flow"]'),
    ).toHaveAttribute("aria-pressed", "false")
    await expect(
      page.locator('[data-testid="overlay-mode-none"]'),
    ).toHaveAttribute("aria-pressed", "true")
  })

  test("overlay badge disappears when mode set to none", async ({ page }) => {
    await page.goto("/")
    await waitForComponentLibrary(page)

    await dragComponentToCanvas(page, "redis", 400, 300)
    await expect(page.locator('[data-testid="archie-node"]')).toHaveCount(1, {
      timeout: 5_000,
    })

    await page.locator('[data-testid="canvas-panel"]').click({
      position: { x: 10, y: 10 },
    })

    await page.locator('[data-testid="overlay-mode-compatibility"]').click()
    await expect(page.locator('[data-testid="overlay-badge"]')).toBeVisible({
      timeout: 3_000,
    })

    await page.locator('[data-testid="overlay-mode-none"]').click()
    await expect(page.locator('[data-testid="overlay-badge"]')).toBeHidden({
      timeout: 3_000,
    })

    await page.screenshot({
      path: `${SCREENSHOT_DIR}/06-overlay-badge-removed.png`,
      fullPage: true,
    })
  })
})
