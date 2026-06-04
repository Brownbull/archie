import { test, expect } from "@playwright/test"
import { waitForComponentLibrary } from "./helpers/canvas-helpers"

const SCREENSHOT_DIR = "test-results/save-block-default"

test.describe("Save block default button", () => {
  test("placed block shows the save-default button; press → confirm → save", async ({ page }) => {
    await page.goto("/")
    const hasComponents = await waitForComponentLibrary(page)
    test.skip(!hasComponents, "Skipped: no seeded data")
    await page.waitForTimeout(1000)

    const skipBtn = page.getByRole("button", { name: "Skip" })
    if (await skipBtn.isVisible({ timeout: 2_000 }).catch(() => false)) {
      await skipBtn.click()
      await page.waitForTimeout(300)
    }

    // Add a beginner-level block (Cache) to the canvas.
    await page.locator('[data-testid="add-type-cache"]').click()
    await expect(page.locator('[data-testid="archie-node"]')).toHaveCount(1, { timeout: 5_000 })

    // The save-as-default button renders on the node (revealed on hover when clean).
    const node = page.locator('[data-testid="archie-node"]').first()
    await node.hover()
    const saveBtn = page.getByTestId("save-block-default")
    await expect(saveBtn).toBeVisible()
    await page.screenshot({ path: `${SCREENSHOT_DIR}/01-button-on-node.png`, fullPage: true })

    // Press → a confirm dialog appears showing the current provider · tier.
    await saveBtn.click()
    const dialog = page.getByTestId("save-block-default-dialog")
    await expect(dialog).toBeVisible({ timeout: 3_000 })
    await page.screenshot({ path: `${SCREENSHOT_DIR}/02-confirm-dialog.png`, fullPage: true })

    // No → dialog closes, nothing saved.
    await dialog.getByRole("button", { name: "No" }).click()
    await expect(dialog).not.toBeVisible()

    // Press again → Yes, save → dialog closes (config persisted as the user's default).
    await node.hover()
    await saveBtn.click()
    await expect(dialog).toBeVisible({ timeout: 3_000 })
    await page.getByTestId("save-block-default-confirm").click()
    await expect(dialog).not.toBeVisible()
    await page.screenshot({ path: `${SCREENSHOT_DIR}/03-saved.png`, fullPage: true })
  })
})
