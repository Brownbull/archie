import { test, expect } from "@playwright/test"
import { waitForComponentLibrary } from "./helpers/canvas-helpers"

const SCREENSHOT_DIR = "test-results/save-canvas"

async function bootWithOneBlock(page: import("@playwright/test").Page) {
  await page.goto("/")
  const hasComponents = await waitForComponentLibrary(page)
  test.skip(!hasComponents, "Skipped: no seeded data")
  await page.waitForTimeout(1000)
  const skip = page.getByRole("button", { name: "Skip" })
  if (await skip.isVisible({ timeout: 2_000 }).catch(() => false)) {
    await skip.click()
    await page.waitForTimeout(300)
  }
  await page.locator('[data-testid="add-type-cache"]').click()
  await expect(page.locator('[data-testid="archie-node"]')).toHaveCount(1, { timeout: 5_000 })
}

test.describe("Save canvas — 2 slots + mode-switch guard", () => {
  test("save the canvas to a slot, then see it in Saved Canvases", async ({ page }) => {
    await bootWithOneBlock(page)

    await page.getByTestId("menu-file").click()
    await page.getByTestId("menu-save-canvas").click()
    const dialog = page.getByTestId("save-canvas-dialog")
    await expect(dialog).toBeVisible({ timeout: 5_000 })

    await page.getByTestId("save-canvas-slot-0").click()
    await page.getByTestId("save-canvas-name").fill("e2e canvas")
    await page.screenshot({ path: `${SCREENSHOT_DIR}/01-save-dialog.png`, fullPage: true })
    await page.getByTestId("save-canvas-confirm").click()
    await expect(dialog).not.toBeVisible()

    // It now appears in the Saved Canvases manager.
    await page.getByTestId("menu-file").click()
    await page.getByTestId("menu-saved-canvases").click()
    const saved = page.getByTestId("saved-canvases-dialog")
    await expect(saved).toBeVisible({ timeout: 5_000 })
    await expect(page.getByTestId("saved-canvas-slot-0")).toContainText("e2e canvas")
    await expect(page.getByTestId("saved-canvas-load-0")).toBeVisible()
    await page.screenshot({ path: `${SCREENSHOT_DIR}/02-saved-list.png`, fullPage: true })
  })

  test("switching modes with canvas content prompts to save", async ({ page }) => {
    await bootWithOneBlock(page)

    // Free → Quest with content → the save guard appears.
    await page.getByTestId("mode-toggle-quest").click()
    const guard = page.getByTestId("mode-toggle-dialog")
    await expect(guard).toBeVisible({ timeout: 5_000 })
    await page.screenshot({ path: `${SCREENSHOT_DIR}/03-mode-switch-guard.png`, fullPage: true })

    // "Save & continue" routes into the save dialog.
    await page.getByTestId("mode-toggle-save").click()
    await expect(page.getByTestId("save-canvas-dialog")).toBeVisible({ timeout: 5_000 })
    await page.keyboard.press("Escape")
    await expect(page.getByTestId("save-canvas-dialog")).not.toBeVisible()

    // Re-open the guard and choose "Don't save" → proceeds to the Quest Log, still Free until a quest is accepted.
    await page.getByTestId("mode-toggle-quest").click()
    await expect(guard).toBeVisible({ timeout: 5_000 })
    await page.getByTestId("mode-toggle-confirm").click()
    await expect(page.getByTestId("quest-log")).toBeVisible({ timeout: 5_000 })
    await expect(page.getByTestId("mode-toggle-free")).toHaveAttribute("aria-pressed", "true")
  })
})
