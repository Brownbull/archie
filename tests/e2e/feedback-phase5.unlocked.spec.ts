import { test, expect, type Page } from "@playwright/test"
import { waitForComponentLibrary } from "./helpers/canvas-helpers"

/**
 * Phase-5 runtime evidence (D95) — the new challenge formats through the real UI:
 *   1. BROWNFIELD START: accepting Scale Out seeds the inherited system — the lone app box already
 *      WIRED to live traffic (nodes + an edge on the canvas before the player touches anything).
 *   2. QUEST-LOG SURFACING: the detail panels state the new format facts — the chain panel on
 *      Stream the Data (stage 2 of 3, forks to two branches), the team-expertise restriction on
 *      Scale Out, and the named chaos objective on Observe to Recover.
 *   3. LINK LEGEND: the default (non-heatmap) canvas decodes the P5-S6 dimensions — protocol line
 *      styles + the throughput dot-speed cue.
 */
const SCREENSHOT_DIR = "test-results/feedback-phase5"

async function openQuestLog(page: Page): Promise<void> {
  // The Quest Mode toggle opens the quest-log TREE (fresh load: empty canvas → no clear-guard dialog).
  await page.getByTestId("mode-toggle-quest").click()
  await expect(page.getByTestId("quest-log")).toBeVisible({ timeout: 10_000 })
}

async function clickTreeNode(page: Page, id: string): Promise<void> {
  const node = page.getByTestId(`tree-node-${id}`)
  await node.scrollIntoViewIfNeeded()
  await node.click()
}

test.describe.serial("Feedback Phase 5 — new challenge formats", () => {
  test("brownfield seeding, chain/restriction/chaos surfacing, link legend", async ({ page }) => {
    test.setTimeout(180_000)
    await page.setViewportSize({ width: 1400, height: 1600 })
    await page.goto("/")
    test.skip(!(await waitForComponentLibrary(page)), "no seeded data")
    await page.waitForTimeout(2500)

    // --- Quest-log surfacing: chain panel on Stream the Data. ---
    await openQuestLog(page)
    await clickTreeNode(page, "event-stream")
    const chain = page.getByTestId("quest-chain-info")
    await expect(chain).toBeVisible()
    await expect(chain).toContainText(/stage 2 of 3/)
    await expect(page.getByTestId("quest-chain-forks")).toContainText(/Forks to:/)
    await page.screenshot({ path: `${SCREENSHOT_DIR}/01-chain-panel-event-stream.png`, fullPage: true })

    // --- Team-expertise restriction on Scale Out. ---
    await clickTreeNode(page, "scale-out")
    await expect(page.getByTestId("tree-detail-panel")).toContainText(/Team expertise: .* off the table/)

    // --- Named chaos objective on Observe to Recover. ---
    await clickTreeNode(page, "observe-to-recover")
    await expect(page.getByTestId("tree-detail-panel")).toContainText(/Survive: Zone outage on Compute at t=30s/)
    await page.screenshot({ path: `${SCREENSHOT_DIR}/02-restriction-and-chaos-objectives.png`, fullPage: true })

    // --- Brownfield start: accept Scale Out → the inherited box arrives WIRED. ---
    await clickTreeNode(page, "scale-out")
    const start = page.getByTestId("tree-start-challenge")
    await expect(start).toBeVisible()
    await start.click()
    await expect(page.getByTestId("start-challenge")).toBeVisible({ timeout: 10_000 })
    // The seed: traffic node + the lone app box + the wiring between them — before ANY player action.
    await expect(page.locator('[data-testid="archie-node"]')).toHaveCount(2, { timeout: 10_000 })
    await expect(page.locator(".react-flow__edge")).toHaveCount(1)
    await page.screenshot({ path: `${SCREENSHOT_DIR}/03-brownfield-inherited-canvas.png`, fullPage: true })

    // --- Link legend in the default view (P5-S6): quests run heatmap-on — toggle it off (H). ---
    await page.getByTestId("canvas-panel").focus() // tabIndex=-1: clicks don't focus it; the H listener hangs off the container
    await page.keyboard.press("h")
    const legend = page.getByTestId("canvas-legend")
    await expect(legend).toContainText("Link Legend")
    await expect(page.getByTestId("link-legend-styles")).toContainText("Database")
    await expect(legend).toContainText(/Dot speed scales/)
    await page.screenshot({ path: `${SCREENSHOT_DIR}/04-link-legend-default-view.png`, fullPage: true })
  })
})
