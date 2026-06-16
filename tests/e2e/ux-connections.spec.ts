import { test, expect } from "@playwright/test"
import { waitForComponentLibrary } from "./helpers/canvas-helpers"

const SCREENSHOT_DIR = "test-results/ux-connections"

// Guards the cross-surface connectivity added in the UX sprint: the empty-canvas
// Get-started card routes to each surface, Challenges opens from multiple places,
// and an active challenge guides the component palette.

test.describe("Cross-surface UX connections", () => {
  test("Get-started card: every option is enabled and routes to its surface", async ({ page }) => {
    await page.goto("/")
    test.skip(!(await waitForComponentLibrary(page)), "no seeded data")

    await expect(page.locator('[data-testid="canvas-empty-state"]')).toBeVisible()
    for (const id of [
      "suggestion-blueprints",
      "suggestion-stacks",
      "suggestion-components",
      "suggestion-challenge",
      "suggestion-import",
    ]) {
      await expect(page.locator(`[data-testid="${id}"]`)).toBeEnabled()
    }

    await page.locator('[data-testid="suggestion-stacks"]').click()
    await expect(page.locator('[data-testid="stacks-tab"]')).toBeVisible({ timeout: 5_000 })
    await page.screenshot({ path: `${SCREENSHOT_DIR}/01-stacks-from-getstarted.png`, fullPage: true })
  })

  test("Get-started 'Take a Challenge' opens the challenge picker", async ({ page }) => {
    await page.goto("/")
    test.skip(!(await waitForComponentLibrary(page)), "no seeded data")
    await page.locator('[data-testid="suggestion-challenge"]').click()
    await expect(page.locator('[data-testid="challenge-selector"]')).toBeVisible({ timeout: 5_000 })
  })

  test("Stacks tab lists the full catalog (12+)", async ({ page }) => {
    await page.goto("/")
    test.skip(!(await waitForComponentLibrary(page)), "no seeded data")
    await page.locator('[data-testid="suggestion-stacks"]').click()
    await expect(page.locator('[data-testid="stacks-tab"]')).toBeVisible()
    await page.waitForTimeout(600)
    // P92/Phase D progressive disclosure: above-level stacks live in a collapsed
    // "More advanced stacks" drawer (plain conditional render, not in the DOM while
    // collapsed). The default `beginner` level keeps most of the catalog hidden, so
    // expand the drawer before counting to see the full catalog.
    const advancedToggle = page.locator('[data-testid="advanced-stacks-toggle"]')
    if (await advancedToggle.isVisible().catch(() => false)) {
      if ((await advancedToggle.getAttribute("aria-expanded")) !== "true") {
        await advancedToggle.click()
      }
    }
    const count = await page.locator('[data-testid^="stack-card-"]').count()
    expect(count).toBeGreaterThanOrEqual(12)
  })

  test("active challenge surfaces palette guidance in the Blocks tab", async ({ page }) => {
    await page.goto("/")
    test.skip(!(await waitForComponentLibrary(page)), "no seeded data")
    await page.getByTestId("menu-build").click()
    await page.getByTestId("menu-challenges").click()
    await page.locator('[data-testid="challenge-play-first-service"]').click()
    await expect(page.locator('[data-testid="challenge-hud"]')).toBeVisible({ timeout: 5_000 })

    await page.getByRole("tab", { name: "Blocks" }).click()
    // 2026-06-11 playtest (ComponentTab.tsx): the `challenge-component-guidance` banner now
    // renders ONLY for user-cloned quests that set `allowed_categories` — no built-in challenge
    // (incl. first-service) sets it, so the banner is intentionally absent here. The surviving
    // challenge→palette guidance for a brief with `required_components` is the Required-blocks
    // filter, which renders as `required-filter-unlock` (fresh user, not yet purchased) or
    // `required-filter-toggle` (already owned). first-service has required_components:[compute],
    // so hasRequiredTargets is true and one of the two must be visible.
    const requiredFilter = page.locator(
      '[data-testid="required-filter-unlock"], [data-testid="required-filter-toggle"]',
    )
    await expect(requiredFilter).toBeVisible({ timeout: 5_000 })
    await page.screenshot({ path: `${SCREENSHOT_DIR}/02-challenge-guidance.png`, fullPage: true })
  })

  test("History empty state offers a Start-a-challenge button", async ({ page }) => {
    await page.goto("/")
    test.skip(!(await waitForComponentLibrary(page)), "no seeded data")
    await page.getByRole("tab", { name: "History" }).click()
    const startBtn = page.locator('[data-testid="history-start-challenge"]')
    // The button only appears when the user has no prior attempts; skip otherwise.
    test.skip(!(await startBtn.isVisible().catch(() => false)), "user already has attempt history")
    await startBtn.click()
    await expect(page.locator('[data-testid="challenge-selector"]')).toBeVisible({ timeout: 5_000 })
  })
})
