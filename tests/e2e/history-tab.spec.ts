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

    // P4: the query no longer uses a composite-index orderBy, so it resolves cleanly — NOT the
    // "Could not load your attempt history" error. A fresh owner sees the empty state.
    await expect(page.locator('[data-testid="history-error"]')).toHaveCount(0)
    await expect(page.locator('[data-testid="history-empty"]')).toBeVisible()
    await page.screenshot({ path: `${SCREENSHOT_DIR}/01-history-tab.png`, fullPage: true })
  })
})
