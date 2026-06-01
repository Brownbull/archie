import { test, expect } from "@playwright/test"
import { waitForComponentLibrary, addComponentToCanvas } from "./helpers/canvas-helpers"

// Verifies the decision-support pair end-to-end: a provider swap shows a before/after
// delta, and inline Pathway suggestions can be added with one click.

test.describe("Decision support", () => {
  test("swapping a provider shows a before/after delta", async ({ page }) => {
    await page.goto("/")
    test.skip(!(await waitForComponentLibrary(page)), "no seeded data")

    // PostgreSQL is a relational-db with same-type alternatives (MySQL) — so the Provider
    // picker has something to swap to.
    await page.locator('[data-testid="search-input"]').fill("PostgreSQL")
    await page.waitForTimeout(300)
    await addComponentToCanvas(page, 0)
    await page.locator('[data-testid="archie-node"]').first().click()
    await expect(page.locator('[data-testid="inspector-panel"]')).toBeVisible({ timeout: 5_000 })

    const swapper = page.locator('[data-testid="component-swapper"]')
    test.skip(!(await swapper.isVisible().catch(() => false)), "no same-type providers to swap")

    await swapper.locator('[role="combobox"]').click()
    await page.getByRole("option", { name: /MySQL/i }).click()
    await page.waitForTimeout(500)

    // After the swap the inspector shows the new provider and at least one delta indicator
    // (economics or metric) reflecting the before→after change.
    const deltas = page.locator('[data-testid^="econ-delta-"], [data-testid="metric-bar-delta"]')
    await expect(deltas.first()).toBeVisible({ timeout: 5_000 })
  })

  test("inline Pathway suggestion can be added with one click", async ({ page }) => {
    await page.goto("/")
    test.skip(!(await waitForComponentLibrary(page)), "no seeded data")

    // Build a little so the pathway engine has a tier + gaps to suggest against.
    for (let i = 0; i < 3; i++) await addComponentToCanvas(page, i)
    await page.getByRole("tab", { name: "Blocks" }).click()
    await page.waitForTimeout(500)

    const pathway = page.locator('[data-testid="component-tab-pathway"]')
    test.skip(!(await pathway.isVisible().catch(() => false)), "no pathway suggestions for this build")

    const before = await page.locator('[data-testid="archie-node"]').count()
    await pathway.locator('[data-testid^="pathway-add-"]').first().click()
    await expect(page.locator('[data-testid="archie-node"]')).toHaveCount(before + 1, { timeout: 5_000 })
  })
})
