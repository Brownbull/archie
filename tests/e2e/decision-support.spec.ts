import { test, expect } from "@playwright/test"
import { waitForComponentLibrary, addComponentToCanvas } from "./helpers/canvas-helpers"

// Verifies the decision-support pair end-to-end: a provider swap shows a before/after
// delta, and inline Pathway suggestions can be added with one click.

/** Own every PROVIDER (and its tiers) for the component types currently on the canvas, so a vendor
 *  swap APPLIES rather than opening the "Unlock MySQL" capability-purchase dialog (the 0-star E2E
 *  user can't afford ★/🔧 vendor unlocks). Uses the dev-server /src module bridge — works on CI's
 *  Vite dev server; the static local-build harness lacks the bridge, so this test is CI-validated. */
async function grantCanvasVendorOwnership(page: import("@playwright/test").Page): Promise<void> {
  await page.evaluate(async () => {
    /* eslint-disable @typescript-eslint/no-explicit-any -- ad-hoc store bridge in browser context */
    const [archMod, progMod, libMod, typesMod] = await Promise.all([
      import("/src/stores/architectureStore.ts"),
      import("/src/stores/userProgressStore.ts"),
      import("/src/services/componentLibrary.ts"),
      import("/src/lib/componentTypes.ts"),
    ])
    const all = (libMod as any).componentLibrary.getAllComponents()
    const vendors: Record<string, true> = { ...(progMod as any).useUserProgressStore.getState().unlockedVendors }
    const tiers: Record<string, true> = { ...(progMod as any).useUserProgressStore.getState().unlockedTiers }
    for (const node of (archMod as any).useArchitectureStore.getState().nodes) {
      const id: string = node.data.archieComponentId
      const comp = (libMod as any).componentLibrary.getComponent(id)
      if (!comp) continue
      for (const provider of (typesMod as any).providersForComponent(comp, all)) {
        vendors[provider.id] = true
        for (const v of provider.configVariants ?? []) tiers[`${provider.id}/${v.id}`] = true
      }
    }
    ;(progMod as any).useUserProgressStore.setState({ unlockedVendors: vendors, unlockedTiers: tiers })
    /* eslint-enable @typescript-eslint/no-explicit-any */
  })
}

test.describe("Decision support", () => {
  test("swapping a provider shows a before/after delta", async ({ page }) => {
    await page.goto("/")
    test.skip(!(await waitForComponentLibrary(page)), "no seeded data")

    // PostgreSQL is a relational-db with same-type alternatives (MySQL) — so the Provider
    // picker has something to swap to.
    await page.locator('[data-testid="search-input"]').fill("PostgreSQL")
    await page.waitForTimeout(300)
    await addComponentToCanvas(page, 0)
    // Own MySQL (and the rest of the relational-db providers) so the swap lands instead of opening
    // the capability-purchase dialog the 0-star E2E user can't clear.
    await grantCanvasVendorOwnership(page)
    // Open the read-only inspector — the before/after delta indicators still render there.
    await page.locator('[data-testid="archie-node"]').first().click()
    await expect(page.locator('[data-testid="inspector-panel"]')).toBeVisible({ timeout: 5_000 })

    // Fluidity P1: the provider swap is driven on the canvas block now (`archie-node-provider`).
    const node = page.locator('[data-testid="archie-node"]').first()
    const provider = node.locator('[data-testid="archie-node-provider"]')
    test.skip(!(await provider.isVisible().catch(() => false)), "no same-type providers to swap")

    await provider.click()
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
