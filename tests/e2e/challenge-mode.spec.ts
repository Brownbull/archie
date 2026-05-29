import { test, expect } from "@playwright/test"
import { waitForComponentLibrary, addComponentToCanvas } from "./helpers/canvas-helpers"

const SCREENSHOT_DIR = "test-results/challenge"

test.describe("Challenge Mode E2E (Epic 16)", () => {
  test("select a level, build, start, and see a scored result", async ({ page }) => {
    await page.goto("/")
    const hasComponents = await waitForComponentLibrary(page)
    test.skip(!hasComponents, "Skipped: Firestore has no seeded component data")

    // SELECT — open the Challenges dialog and pick a specific level (not order-dependent).
    await page.locator('[data-testid="open-challenges"]').click()
    await expect(page.locator('[data-testid="challenge-selector"]')).toBeVisible()
    const card = page.locator('[data-testid="challenge-card-first-service"]')
    await expect(card).toBeVisible()
    await page.screenshot({ path: `${SCREENSHOT_DIR}/01-selector.png`, fullPage: true })
    await card.click()

    // BUILD — the HUD appears with the budget bar + required checklist; Run is replaced.
    await expect(page.locator('[data-testid="challenge-hud"]')).toBeVisible()
    // The fill bar starts at width:0% (no cost yet → zero-size); assert the always-rendered label.
    await expect(page.locator('[data-testid="challenge-budget-label"]')).toBeVisible()
    await expect(page.locator('[data-testid="challenge-checklist"]')).toBeVisible()
    await expect(page.locator('[data-testid="run-simulation"]')).toHaveCount(0)
    await page.screenshot({ path: `${SCREENSHOT_DIR}/02-build-mode.png`, fullPage: true })

    // Place a component so the canvas is non-empty and the Start trigger can appear.
    await addComponentToCanvas(page, 0)

    // START — the challenge Start button appears; click it to run the real simulation.
    const startBtn = page.locator('[data-testid="start-challenge"]')
    await expect(startBtn).toBeVisible()
    await page.screenshot({ path: `${SCREENSHOT_DIR}/03-ready-to-start.png`, fullPage: true })
    await startBtn.click()

    // The simulation bar takes over; speed up so the run completes promptly.
    await expect(page.locator('[data-testid="simulation-bar"]')).toBeVisible()
    await page.locator('[data-testid="playback-speed-10"]').click()

    // SCORE — when the run finishes, the results modal opens with a star rating.
    // 50 ticks × 100ms at 10× ≈ 5s of playback; 30s gives generous CI headroom.
    await expect(page.locator('[data-testid="challenge-results"]')).toBeVisible({ timeout: 30_000 })
    const stars = page.locator('[data-testid="result-stars"]')
    await expect(stars).toBeVisible()
    await expect(stars).toHaveAttribute("aria-label", /[0-3] of 3 stars/)
    // "Try this next" card is computed from the build + renders (a suggestion or "well optimized").
    await expect(page.locator('[data-testid="suggestion-card"]')).toBeVisible()
    await page.screenshot({ path: `${SCREENSHOT_DIR}/04-results.png`, fullPage: true })

    // CLOSE — leaving the modal exits challenge mode and restores the Run trigger.
    await page.locator('[data-testid="result-close"]').click()
    await expect(page.locator('[data-testid="challenge-results"]')).toHaveCount(0)
    await expect(page.locator('[data-testid="challenge-hud"]')).toHaveCount(0)
    await expect(page.locator('[data-testid="run-simulation"]')).toBeVisible()
    await page.screenshot({ path: `${SCREENSHOT_DIR}/05-exited.png`, fullPage: true })
  })
})
