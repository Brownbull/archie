import { test, expect } from "@playwright/test"
import { waitForComponentLibrary, placeComponentAt, triggerRecalcViaConfigChange, useAdvancedLevel } from "./helpers/canvas-helpers"

const SCREENSHOT_DIR = "test-results/feedback-phase1"
const ASYNC_FIXTURE = "tests/e2e/fixtures/connection/async-canonical.architecture.yaml"

/**
 * Phase-1 runtime journey evidence (Quest Integrity & Break-It Loop, P1/T9).
 * Exercises the three user paths the phase changed, per PLAN.md's Runtime Evidence Checkpoints:
 *   1. the canonical async build renders ZERO port-mismatch warnings (T2 port audit)
 *   2. Rerun re-simulates AND re-grades from the live canvas in a quest (T6)
 *   3. the footer's weakest-category bar deep-links into the overlay breakdown (T4)
 */
test.describe("Feedback Phase 1 — runtime journeys", () => {
  test("canonical async pipeline renders zero connection warnings", async ({ page }) => {
    await page.goto("/")
    test.skip(!(await waitForComponentLibrary(page)), "no seeded data")

    await page.locator('[data-testid="import-file-input"]').setInputFiles(ASYNC_FIXTURE)
    await expect(page.locator(".react-flow__edge")).toHaveCount(4, { timeout: 15_000 })

    // The whole point of the T2 port audit: traffic→compute→queue→worker→db draws clean.
    await expect(page.locator('[data-testid="connection-warning"]')).toHaveCount(0)

    await page.screenshot({ path: `${SCREENSHOT_DIR}/01-async-canonical-warning-free.png`, fullPage: true })
  })

  test("Rerun re-simulates and re-grades a quest attempt from the live canvas", async ({ page }) => {
    test.setTimeout(180_000)
    await page.goto("/")
    test.skip(!(await waitForComponentLibrary(page)), "no seeded data")

    // Enter the first-service quest (seeds its traffic source automatically).
    await page.getByTestId("menu-build").click()
    await page.getByTestId("menu-challenges").click()
    await page.locator('[data-testid="challenge-play-first-service"]').click()
    await expect(page.locator('[data-testid="challenge-hud"]')).toBeVisible()

    // Place the required compute block, start the attempt.
    const before = await page.locator('[data-testid="archie-node"]').count()
    await page.locator('[data-testid^="add-type-"]').first().click()
    await expect(page.locator('[data-testid="archie-node"]')).toHaveCount(before + 1, { timeout: 5_000 })
    await page.locator('[data-testid="start-challenge"]').click()

    // Fast-forward playback; the results modal appears when the run is graded.
    await page.locator('[data-testid="playback-speed-10"]').click()
    await expect(page.locator('[data-testid="challenge-results"]')).toBeVisible({ timeout: 90_000 })
    await page.screenshot({ path: `${SCREENSHOT_DIR}/02-first-grade.png`, fullPage: true })
    await page.locator('[data-testid="result-close"]').click()
    await expect(page.locator('[data-testid="challenge-results"]')).not.toBeVisible()

    // THE new affordance: Rerun (sim bar) re-simulates + re-grades — previously the player had to
    // Exit and click Start Challenge again.
    await page.locator('[data-testid="playback-rerun"]').click()
    await page.locator('[data-testid="playback-speed-10"]').click()
    await expect(page.locator('[data-testid="challenge-results"]')).toBeVisible({ timeout: 90_000 })

    await page.screenshot({ path: `${SCREENSHOT_DIR}/03-rerun-regraded.png`, fullPage: true })
  })

  test("footer weakest-category bar deep-links into the overlay breakdown", async ({ page }) => {
    await useAdvancedLevel(page)
    await page.goto("/")
    test.skip(!(await waitForComponentLibrary(page)), "no seeded data")

    // A metric-rich node so the footer has scores.
    await placeComponentAt(page, "postgresql", 0.5, 0.45)
    await triggerRecalcViaConfigChange(page, 0)

    // Footer: the weakest bar is clickable now (T4 — the onClick used to be silently dropped).
    const weakestBar = page.locator('[data-testid="dashboard-weakest"] [data-testid^="category-bar-"]').first()
    await expect(weakestBar).toBeVisible({ timeout: 5_000 })
    const barTestId = await weakestBar.getAttribute("data-testid")
    const categoryId = barTestId!.replace("category-bar-", "")

    await weakestBar.click()
    await expect(page.locator('[data-testid="dashboard-overlay"]')).toBeVisible({ timeout: 5_000 })
    // Deep-link: the clicked category's card (with its per-component Best/Worst breakdown) is shown.
    // The popup-open contract is unit-covered (DashboardOverlay.test initialCategory) — whether the
    // popover wrapper engages here depends on the seeded metric-category data, not the deep-link.
    const card = page.locator(`[data-testid="overlay-category-${categoryId}"]`)
    await expect(card).toBeVisible()

    await page.screenshot({ path: `${SCREENSHOT_DIR}/04-footer-deeplink-overlay.png`, fullPage: true })
  })
})
