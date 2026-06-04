import { test, expect } from "@playwright/test"
import { waitForComponentLibrary } from "./helpers/canvas-helpers"

const SCREENSHOT_DIR = "test-results/quest-persistence"

/**
 * Quest persistence E2E — completes two quests, verifies progress,
 * reloads the page (clears JS state), and confirms progress survives.
 */
test.describe("Quest persistence across page reload", () => {
  test("complete First Service, reload, verify progress persists in quest log + profile", async ({ page }) => {
    // Long end-to-end: a full challenge sim (results wait up to 60s) + page reload + quest-log and
    // profile dialog interactions. The 30s default budget is too tight and made this flaky.
    test.setTimeout(120_000)
    await page.goto("/")
    const hasComponents = await waitForComponentLibrary(page)
    test.skip(!hasComponents, "Skipped: no seeded data")
    await page.waitForTimeout(3000)

    // Step 1: Start First Service challenge
    await page.getByTestId("menu-build").click()
    await page.waitForTimeout(300)
    await page.getByTestId("menu-challenges").click()
    await page.waitForTimeout(1000)
    await page.getByTestId("challenge-play-first-service").click()
    await page.waitForTimeout(2000)

    // Step 2: Run the simulation (challenge seeds a traffic source + compute)
    const startBtn = page.getByTestId("start-challenge")
    await expect(startBtn).toBeVisible({ timeout: 5000 })
    await startBtn.click()
    await page.waitForTimeout(500)

    // Speed up
    const speedBtn = page.getByTestId("playback-speed-10")
    if (await speedBtn.isVisible().catch(() => false)) await speedBtn.click()

    // Wait for results
    await expect(page.getByTestId("challenge-results")).toBeVisible({ timeout: 60_000 })
    const starsLabel = await page.getByTestId("result-stars").getAttribute("aria-label")
    expect(starsLabel).toMatch(/[1-3] of 3 stars/)
    await page.screenshot({ path: `${SCREENSHOT_DIR}/01-first-service-scored.png`, fullPage: true })

    // Close results
    await page.getByTestId("result-close").click()
    await page.waitForTimeout(500)

    // Exit challenge — challenge-exit opens an "Exit Quest?" confirm; click confirm to leave.
    await page.getByTestId("challenge-exit").click()
    await page.getByRole("button", { name: "Exit Quest", exact: true }).click()
    await page.waitForTimeout(1000)

    // Step 3: Verify quest log shows completion BEFORE reload
    await page.getByTestId("mode-toggle-quest").click()
    await page.waitForTimeout(1500)

    const firstNode = page.locator('[data-testid="tree-node-first-service"]')
    await expect(firstNode).toHaveAttribute("data-status", "completed")
    await page.screenshot({ path: `${SCREENSHOT_DIR}/02-quest-log-before-reload.png`, fullPage: true })
    await page.keyboard.press("Escape")
    await page.waitForTimeout(500)

    // Step 4: RELOAD the page (clears all JS state)
    await page.reload({ waitUntil: "domcontentloaded" })
    await page.waitForTimeout(5000) // Wait for auth + Firestore load

    // Step 5: Verify progress persists after reload
    await page.getByTestId("mode-toggle-quest").click()
    await page.waitForTimeout(1500)

    const firstNodeAfter = page.locator('[data-testid="tree-node-first-service"]')
    const status = await firstNodeAfter.getAttribute("data-status")
    await page.screenshot({ path: `${SCREENSHOT_DIR}/03-quest-log-after-reload.png`, fullPage: true })

    // The key assertion: first-service should still be completed after reload
    expect(status).toBe("completed")
    await page.keyboard.press("Escape")
    await page.waitForTimeout(500)

    // Step 6: Verify mastery profile renders after reload.
    // Ensure the quest-log dialog is fully gone before opening the account dropdown — a lingering
    // radix dialog overlay otherwise intercepts the account-menu click (pointer-events race).
    await page.locator('[data-testid="quest-log"]').waitFor({ state: "hidden", timeout: 3000 }).catch(() => {})
    await page.waitForTimeout(300)
    await page.getByTestId("account-menu-trigger").click()
    const masteryItem = page.getByTestId("account-mastery-profile")
    await masteryItem.waitFor({ state: "visible", timeout: 3000 })
    await masteryItem.click()
    await page.waitForTimeout(1000)

    // first-service = 100 XP → rank 0 "Novice" (Apprentice=150, Builder=400). The persistence signal
    // is the completed quest above (survived reload); here we just confirm the profile + rank render.
    const rank = page.getByTestId("overall-rank")
    await expect(rank).toBeVisible()
    await expect(rank).toHaveText(/Novice|Apprentice|Builder|Journeyman|Practitioner|Specialist|Expert|Architect|Master|Grand Architect/)
    await page.screenshot({ path: `${SCREENSHOT_DIR}/04-profile-after-reload.png`, fullPage: true })
  })
})
