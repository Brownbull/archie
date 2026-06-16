import { test, expect } from "@playwright/test"

const SCREENSHOT_DIR = "test-results/history"

test.describe("History Tab E2E (Epic 17)", () => {
  test("the History toolbox tab is reachable and renders the submissions panel", async ({ page }) => {
    await page.goto("/")
    await expect(page.locator('[data-testid="toolbox-panel"]')).toBeVisible()

    // Switch to the History tab (4th toolbox tab).
    await page.getByRole("tab", { name: "History" }).click()

    // The history panel renders with its sort controls. The data area resolves to a list, an
    // empty state, or an error (attempts rules not yet deployed) — all valid; we assert the
    // panel + controls are present, proving the tab is wired into the live app shell.
    await expect(page.locator('[data-testid="history-tab"]')).toBeVisible()
    await expect(page.locator('[data-testid="history-sort-date"]')).toBeVisible()
    await expect(page.locator('[data-testid="history-sort-stars"]')).toBeVisible()

    // The load cycle must resolve (not hang): the loading state clears.
    await expect(page.locator('[data-testid="history-loading"]')).toHaveCount(0, { timeout: 10_000 })

    // P4: the query no longer uses a composite-index orderBy (attemptsStore.loadAttempts is an
    // equality-only `where(userId)` query), so it resolves cleanly — NEVER the "Could not load
    // your attempt history" error. This invariant holds regardless of the account's data.
    await expect(page.locator('[data-testid="history-error"]')).toHaveCount(0)

    // The load resolved to a definite, non-error terminal state: either the empty state (a fresh
    // owner) OR the attempts list. The shared E2E account accumulates real attempt records across
    // scoring-flow specs (useAttemptPersistence writes one per scored run), so it is NOT
    // guaranteed empty — assert the data area landed in one of the two valid non-error states.
    const emptyState = page.locator('[data-testid="history-empty"]')
    const attemptRow = page.locator('[data-testid^="attempt-row-"]')
    await expect
      .poll(async () => (await emptyState.count()) > 0 || (await attemptRow.count()) > 0, {
        timeout: 10_000,
      })
      .toBe(true)
    await page.screenshot({ path: `${SCREENSHOT_DIR}/01-history-tab.png`, fullPage: true })
  })
})
