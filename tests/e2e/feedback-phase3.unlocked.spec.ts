import { test, expect } from "@playwright/test"
import { waitForComponentLibrary, placeComponentAt, useAdvancedLevel } from "./helpers/canvas-helpers"

/**
 * Phase-3 runtime journey evidence (Teaching quality, D92/D93) — the PLAN checkpoint:
 * "tier dropdown + inspector show description/link for a sampled component set; re-seeded
 * Firestore read by the deployed reader."
 *
 * RESEED-GATED: the description/docs_url fields reach the app only via the S9 Firestore reseed
 * (scripts/seed-firestore.ts — manual, owner-run). Until the TEST project is reseeded, the
 * sampled variant carries no description and this spec SKIPS (so the informational CI stays
 * quiet); the moment the reseed lands it runs for real and produces the evidence artifacts.
 */
const SCREENSHOT_DIR = "test-results/feedback-phase3"

test.describe("Feedback Phase 3 — tier descriptions runtime evidence", () => {
  test("config dropdown + inspector Tier row surface the authored description and docs link", async ({ page }) => {
    test.setTimeout(120_000)
    await useAdvancedLevel(page)
    await page.goto("/")
    test.skip(!(await waitForComponentLibrary(page)), "no seeded data")

    // PostgreSQL: multi-variant, calibrated in S2, authored in S8 batch 1 — the canonical sample.
    await placeComponentAt(page, "postgresql", 0.5, 0.45)

    // --- Dropdown: the tier picker shows each variant's meaning as a text subrow. ---
    const trigger = page.getByTestId("archie-node-config-trigger")
    await expect(trigger).toBeVisible({ timeout: 10_000 })
    await trigger.focus()
    await page.keyboard.press("Enter") // keyboard-open: minimap-proof (the D23c pattern)
    const description = page.locator('[data-testid^="variant-description-"]').first()
    const seeded = await description.isVisible({ timeout: 3000 }).catch(() => false)
    test.skip(!seeded, "tier descriptions not in Firestore yet — run the S9 reseed, then this spec activates")

    await expect(description).not.toHaveText("")
    await page.screenshot({ path: `${SCREENSHOT_DIR}/01-dropdown-tier-descriptions.png`, fullPage: true })
    await page.keyboard.press("Escape")

    // --- Inspector: the Tier row carries the description + a safe https docs link. ---
    const node = page.locator('[data-testid="archie-node"]').first()
    await node.click()
    await expect(page.getByTestId("inspector-tier-description")).toBeVisible({ timeout: 10_000 })
    const link = page.getByTestId("inspector-tier-docs-link")
    await expect(link).toBeVisible()
    expect(await link.getAttribute("href")).toMatch(/^https:\/\//)
    expect(await link.getAttribute("rel")).toContain("noopener")

    await page.screenshot({ path: `${SCREENSHOT_DIR}/02-inspector-tier-description-link.png`, fullPage: true })
  })
})
