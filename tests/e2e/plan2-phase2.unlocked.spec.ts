import { test, expect } from "@playwright/test"
import { waitForComponentLibrary } from "./helpers/canvas-helpers"

/**
 * Plan-2 Phase 2 runtime evidence (D97) — chain & extras legibility in the real tree:
 * chain stage badges + chain-blue member edges (incl. the startup-stack fork at first-service),
 * resilience shield markers BEFORE completion, and the widened extras detail panel.
 */
const SCREENSHOT_DIR = "test-results/plan2-phase2"

test.describe.serial("Plan-2 Phase 2 — chain & extras legibility", () => {
  test("the tree shows chains and extras at a glance", async ({ page }) => {
    test.setTimeout(120_000)
    await page.setViewportSize({ width: 1400, height: 1600 })
    await page.goto("/")
    test.skip(!(await waitForComponentLibrary(page)), "no seeded data")
    await page.waitForTimeout(2500)

    await page.getByTestId("mode-toggle-quest").click()
    await expect(page.getByTestId("quest-log")).toBeVisible({ timeout: 10_000 })

    // Chain badges at a glance — all three chains, incl. the startup-stack fork members.
    await expect(page.getByTestId("chain-badge-first-service")).toBeVisible()
    await expect(page.getByTestId("chain-badge-scale-out")).toBeVisible()
    await expect(page.getByTestId("chain-badge-event-stream")).toBeVisible()
    // The fork: two chain edges leaving first-service.
    await expect(page.getByTestId("chain-edge-first-service-add-a-database")).toBeVisible()
    await expect(page.getByTestId("chain-edge-first-service-scale-out")).toBeVisible()
    // Resilience shields, pre-completion.
    await expect(page.getByTestId("resilience-marker-edge-delivery")).toBeVisible()
    await page.screenshot({ path: `${SCREENSHOT_DIR}/01-tree-chains-and-shields.png`, fullPage: true })

    // Widened extras panel on a non-completed selection (fresh-progress framing comes from the
    // seeded account being all-complete — assert the section exists on a resilience quest).
    const node = page.getByTestId("tree-node-edge-delivery")
    await node.scrollIntoViewIfNeeded()
    await node.click()
    await expect(page.getByTestId("quest-extra-challenges")).toBeVisible()
    await expect(page.getByTestId("quest-chain-info")).toContainText(/stage 3 of 3/)
    await page.screenshot({ path: `${SCREENSHOT_DIR}/02-extras-panel-and-chain-info.png`, fullPage: true })
  })
})
