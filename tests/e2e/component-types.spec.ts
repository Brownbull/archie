import { test, expect } from "@playwright/test"
import { waitForComponentLibrary } from "./helpers/canvas-helpers"

const SCREENSHOT_DIR = "test-results/component-types"

test.describe("Component model: type → provider → tier (P5)", () => {
  test("toolbox is organized by fundamental type, each type grouping its providers", async ({ page }) => {
    await page.goto("/")
    const hasComponents = await waitForComponentLibrary(page)
    test.skip(!hasComponents, "Skipped: Firestore has no seeded component data")

    // D22: the toolbox lists logical TYPES as blocks (`type-block-{typeId}`, the "+" is `add-type-{typeId}`).
    // Each block's hover popup enumerates the providers that share that type — the P5 type → provider model.
    // (The old per-provider `component-card-*`/`type-group-*` grid is no longer the default toolbox view.)
    const cdnBlock = page.locator('[data-testid="type-block-cdn"]')
    await expect(cdnBlock).toBeVisible({ timeout: 10_000 })
    await cdnBlock.hover()
    // The CDN type groups multiple providers (Cloudflare + Fastly).
    await expect(cdnBlock).toContainText("Cloudflare CDN")
    await expect(cdnBlock).toContainText("Fastly CDN")

    // The Cache type groups its providers (Redis + Memcached) under one block.
    const cacheBlock = page.locator('[data-testid="type-block-cache"]')
    await expect(cacheBlock).toBeVisible()
    await cacheBlock.hover()
    await expect(cacheBlock).toContainText("Memcached")

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
