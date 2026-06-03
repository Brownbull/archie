import { test, expect } from "@playwright/test"
import { waitForComponentLibrary } from "./helpers/canvas-helpers"

const SCREENSHOT_DIR = "test-results/quest-profile-rank-picker"

test.describe("Quest Profile — rank avatar picker", () => {
  test("open quest profile from menu, click rank avatar, verify picker displays correctly", async ({ page }) => {
    await page.goto("/")
    const hasComponents = await waitForComponentLibrary(page)
    test.skip(!hasComponents, "Skipped: no seeded data")
    await page.waitForTimeout(3000)

    // Step 1: Open any quest to enter quest mode
    await page.getByTestId("menu-build").click()
    await page.waitForTimeout(300)
    await page.getByTestId("menu-challenges").click()
    await page.waitForTimeout(1000)
    await page.getByTestId("challenge-play-first-service").click()
    await page.waitForTimeout(2000)
    await page.screenshot({ path: `${SCREENSHOT_DIR}/01-quest-mode-entered.png`, fullPage: true })

    // Step 2: Exit challenge mode to get back to the main UI
    await page.getByTestId("challenge-exit").click()
    await page.waitForTimeout(500)
    // Confirm exit via the button in the dialog
    const exitBtn = page.getByRole("button", { name: "Exit Quest" })
    await expect(exitBtn).toBeVisible({ timeout: 3000 })
    await exitBtn.click()
    await page.waitForTimeout(1000)

    // Step 3: Open Quest Profile via account menu
    await page.getByTestId("account-menu-trigger").click()
    await page.waitForTimeout(300)
    await page.getByTestId("account-mastery-profile").click()
    await page.waitForTimeout(1000)

    // Verify "Quest Profile" title is visible
    const profileDialog = page.getByTestId("mastery-profile")
    await expect(profileDialog).toBeVisible({ timeout: 5000 })
    await expect(profileDialog.getByText("Quest Profile")).toBeVisible()
    await page.screenshot({ path: `${SCREENSHOT_DIR}/02-quest-profile-open.png`, fullPage: true })

    // Step 4: Click the rank avatar trigger to open the picker
    const rankTrigger = page.getByTestId("rank-avatar-trigger")
    await expect(rankTrigger).toBeVisible()
    // Verify the trigger has an image inside (the current rank avatar)
    const triggerImg = rankTrigger.locator("img")
    await expect(triggerImg).toBeVisible()
    const triggerSize = await triggerImg.boundingBox()
    expect(triggerSize).not.toBeNull()
    expect(triggerSize!.width).toBeGreaterThanOrEqual(30)
    expect(triggerSize!.height).toBeGreaterThanOrEqual(30)

    await rankTrigger.click()
    await page.waitForTimeout(500)

    // Step 5: Verify the rank avatar picker row appears with properly sized avatars
    const picker = page.getByTestId("rank-avatar-picker")
    await expect(picker).toBeVisible({ timeout: 3000 })
    await page.screenshot({ path: `${SCREENSHOT_DIR}/03-rank-picker-open.png`, fullPage: true })

    // The picker should have 6 avatar buttons (ranks 0, 2, 4, 6, 8, 10)
    const avatarButtons = picker.locator("button")
    const count = await avatarButtons.count()
    expect(count).toBe(6)

    // Each avatar image should be properly sized (h-7 w-7 = 28px), not tiny/compressed
    for (let i = 0; i < count; i++) {
      const img = avatarButtons.nth(i).locator("img")
      if (await img.isVisible().catch(() => false)) {
        const box = await img.boundingBox()
        expect(box).not.toBeNull()
        expect(box!.width).toBeGreaterThanOrEqual(20)
        expect(box!.height).toBeGreaterThanOrEqual(20)
      }
    }

    // At least the first avatar (rank 0 - Novice) should be unlocked
    const firstAvatar = page.getByTestId("rank-avatar-0")
    await expect(firstAvatar).toHaveAttribute("data-unlocked", "true")

    // The picker row should be wide enough to display all avatars side by side
    const pickerBox = await picker.boundingBox()
    expect(pickerBox).not.toBeNull()
    expect(pickerBox!.width).toBeGreaterThan(150)

    // Step 6: Click an unlocked avatar to equip it
    await firstAvatar.click()
    await page.waitForTimeout(500)

    // Picker should close after selection
    await expect(picker).not.toBeVisible()
    await page.screenshot({ path: `${SCREENSHOT_DIR}/04-rank-avatar-equipped.png`, fullPage: true })
  })
})
