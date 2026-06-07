import { test, expect } from "@playwright/test"
import { waitForComponentLibrary } from "./helpers/canvas-helpers"

const SCREENSHOT_DIR = "test-results/component-types"

test.describe("Component model: type → provider → tier (P5)", () => {
  test("toolbox is organized by fundamental type, with multiple providers per type", async ({ page }) => {
    await page.goto("/")
    const hasComponents = await waitForComponentLibrary(page)
    test.skip(!hasComponents, "Skipped: Firestore has no seeded component data")

    // The CDN type groups its providers (Cloudflare + Fastly) under one section.
    const cdnGroup = page.locator('[data-testid="type-group-cdn"]')
    await expect(cdnGroup).toBeVisible({ timeout: 10_000 })
    await expect(cdnGroup.getByText("CDN", { exact: true })).toBeVisible()
    await expect(page.locator('[data-testid="component-card-cloudflare-cdn"]')).toBeVisible()
    await expect(page.locator('[data-testid="component-card-fastly-cdn"]')).toBeVisible()

    // The Cache type collapses the old redis/redis-cache duplication + Memcached under one type.
    const cacheGroup = page.locator('[data-testid="type-group-cache"]')
    await expect(cacheGroup).toBeVisible()
    await expect(page.locator('[data-testid="component-card-memcached"]')).toBeVisible()

    await page.screenshot({ path: `${SCREENSHOT_DIR}/01-toolbox-by-type.png`, fullPage: true })
  })

  test("in-node Provider picker swaps between same-type providers", async ({ page }) => {
    await page.goto("/")
    const hasComponents = await waitForComponentLibrary(page)
    test.skip(!hasComponents, "Skipped: Firestore has no seeded component data")

    // Place a CDN node via its type block (CDN has multiple providers → the on-node provider picker renders).
    await page.locator('[data-testid="add-type-cdn"]').click()
    await expect(page.locator('[data-testid="archie-node"]')).toHaveCount(1, { timeout: 5_000 })

    // Fluidity P1: the provider picker lives ON the canvas block now (`archie-node-provider`), and
    // renders only when the type has ≥2 providers (CDN has Cloudflare + Fastly). There is no
    // "Provider" label any more, so that assertion is dropped.
    const node = page.locator('[data-testid="archie-node"]').first()
    const provider = node.locator('[data-testid="archie-node-provider"]')
    await expect(provider).toBeVisible()

    await page.screenshot({ path: `${SCREENSHOT_DIR}/02-provider-picker.png`, fullPage: true })
  })
})
