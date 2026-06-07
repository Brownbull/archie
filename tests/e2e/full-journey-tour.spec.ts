import { test, expect } from "@playwright/test"

const SCREENSHOT_DIR = "test-results/full-journey-tour"

// Fluidity P3: the bespoke cross-region "Take the full tour" (Settings) launches a curated spotlight
// journey, filtered to on-screen anchors. On an empty canvas it walks the always-present regions
// (toolbox → canvas → test conditions → dashboard → tier); locked on-block tuning + the unselected
// inspector are skipped automatically.
test.describe("Full journey tour (P3)", () => {
  test("Settings → Take the full tour launches the spotlight journey", async ({ page }) => {
    await page.goto("/")

    await page.getByTestId("settings-menu-trigger").click()
    await page.getByTestId("full-tour").click()

    // The spotlight card appears, opening with the centered intro.
    const card = page.getByTestId("guided-tour")
    await expect(card).toBeVisible({ timeout: 5_000 })
    await expect(page.getByTestId("tour-title")).toHaveText("The full tour")
    await page.screenshot({ path: `${SCREENSHOT_DIR}/01-full-tour-intro.png`, fullPage: true })

    // Next → the first anchored region (the toolbox).
    await page.getByTestId("tour-next").click()
    await expect(page.getByTestId("tour-title")).toContainText("Pick your blocks")

    // The journey is finite + dismissable.
    await page.getByTestId("tour-skip").click()
    await expect(card).toBeHidden({ timeout: 3_000 })
  })
})
