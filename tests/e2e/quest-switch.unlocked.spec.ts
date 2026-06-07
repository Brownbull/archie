import { test, expect } from "@playwright/test"
import { waitForComponentLibrary } from "./helpers/canvas-helpers"

/**
 * Quest-switching affordance (navigation gap fix). Previously, once inside a quest there was NO way to
 * reach the quest menu without first exiting to Free Mode — the Build→Challenges menu is hidden mid-quest
 * and the Quest Mode toggle is a no-op while a quest is active. The active-quest TITLE in the toolbar is
 * now a button that opens the quest menu (the same tree the Quest Mode toggle opens), so you can jump to
 * another quest mid-flight. This proves the affordance exists and opens the menu in the live app; the
 * actual quest-to-quest switch reuses the already-proven challenge-entry flow (confirm-clear + seed).
 *
 * Runs under desktop-unlocked (every quest replayable).
 */
const SCREENSHOT_DIR = "test-results/quest-switch"

test.describe.serial("Switch quests mid-flight (navigation)", () => {
  test("the active-quest title opens the quest menu while inside a quest", async ({ page }) => {
    test.setTimeout(90_000)
    await page.setViewportSize({ width: 1400, height: 1600 })
    await page.goto("/")
    const hasComponents = await waitForComponentLibrary(page)
    test.skip(!hasComponents, "Skipped: no seeded data")
    await page.waitForTimeout(2500) // let seeded progress load so quests are replayable

    // Enter a quest.
    await page.getByTestId("menu-build").click()
    await page.waitForTimeout(300)
    await page.getByTestId("menu-challenges").click()
    await page.waitForTimeout(1000)
    const play = page.getByTestId("challenge-play-edge-delivery")
    await play.scrollIntoViewIfNeeded()
    await expect(play).toBeEnabled({ timeout: 5000 })
    await play.click()
    await expect(page.getByTestId("start-challenge")).toBeVisible({ timeout: 10_000 })

    // The active-quest title is now a switch affordance (the gap fix).
    const switchBtn = page.getByTestId("switch-quest")
    await expect(switchBtn).toBeVisible()
    await expect(switchBtn).toContainText("Edge Delivery")

    // Clicking it opens the quest menu mid-quest — previously impossible without exiting first.
    await switchBtn.click()
    await expect(page.getByTestId("quest-log"), "quest menu must open from inside a quest").toBeVisible({ timeout: 5000 })
    await page.screenshot({ path: `${SCREENSHOT_DIR}/01-quest-menu-from-title.png`, fullPage: true })
  })
})
