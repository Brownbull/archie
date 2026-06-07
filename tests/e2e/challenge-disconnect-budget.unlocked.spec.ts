import { test, expect, type Page } from "@playwright/test"
import { join } from "node:path"
import { waitForComponentLibrary } from "./helpers/canvas-helpers"

/**
 * Sim-correctness regression guard (D74, WS1+WS2) — runs on real tier-3 AND tier-4 challenges through
 * the production UI under the `desktop-unlocked` replay account (every quest replayable).
 *
 * The user's worry: "we put components, connect them, then disconnect — and the simulation still
 * considers them in the results." This proves it no longer does. For each challenge:
 *   1. Import the 3★ reference build and run it. Baseline: 3★, Well-formed met, a budget figure B1, and
 *      every metric rendered as a colored measured-vs-target chip (the contrast + coloring the user asked
 *      for — previously plain).
 *   2. Disconnect one paid leaf tier (delete a single edge) WITHOUT removing the node — it's now orphaned.
 *   3. Re-run. Assert:
 *      - WS1: the orphaned tier drops OUT of the bill — budget B2 < B1 (it no longer "counts").
 *      - Topology: "Well-formed" fails (the disconnected node is detected), so the run is < 3★.
 *      - WS3a: the canvas node itself is flagged "disconnected" (intuitive, not buried in the modal).
 *
 * Cases: tier-3 edge-delivery (orphan the compute tier) and tier-4 production-ai — the user's own LLM
 * scenario, orphaning the LLM gateway. Fixtures are (re)generated + asserted-3★ by
 * tests/integration/challenges/e2e-fixtures.test.ts, so a future engine/challenge change that breaks the
 * 3★ premise fails there first, not as a flaky E2E. Each deletes a fixed edge id (the importer preserves
 * them) to orphan exactly one paid leaf.
 */
const SCREENSHOT_DIR = "test-results/challenge-disconnect-budget"
const FIXTURE_DIR = "tests/e2e/fixtures/challenges"

interface DisconnectCase {
  id: string
  tier: string
  fixture: string
  edgeCount: number // edges in the reference build — gate "fully rendered" before running
  deleteEdgeId: string // the edge to delete; orphans exactly one paid leaf node
  orphanedTier: string // human label for the leaf we disconnect
}

const CASES: DisconnectCase[] = [
  { id: "edge-delivery", tier: "tier 3", fixture: "edge-delivery.architecture.yaml", edgeCount: 3, deleteEdgeId: "e2", orphanedTier: "compute" },
  // production-ai (the user's LLM challenge) lays its 7 nodes in a straight row, so its long edges pass
  // UNDER intervening nodes — only edges between ADJACENT nodes are reliably click-selectable. e5
  // (compute→observability) is adjacent and orphans the monitoring tier ($20 of the $155 build), proving
  // WS1 on the LLM challenge without the brittle bbox-over-a-node click that e3 (compute→llm-gateway) hits.
  { id: "production-ai", tier: "tier 4 (LLM)", fixture: "production-ai.architecture.yaml", edgeCount: 6, deleteEdgeId: "e5", orphanedTier: "observability/monitoring" },
]

/** Parse the dollar figure out of the "Under budget" criterion ("$120 of $350/mo" → 120). */
async function readBudget(page: Page): Promise<number> {
  const txt = await page.locator('[data-metric-type="budget"]').innerText()
  const m = txt.match(/\$([\d.]+)/)
  expect(m, `budget chip should show a $ figure, got: ${txt}`).not.toBeNull()
  return Number.parseFloat(m![1])
}

async function runSimulation(page: Page): Promise<void> {
  const start = page.getByTestId("start-challenge")
  await expect(start).toBeVisible({ timeout: 15_000 })
  await start.scrollIntoViewIfNeeded()
  await start.click()
  const speed = page.getByTestId("playback-speed-10")
  if (await speed.isVisible({ timeout: 2000 }).catch(() => false)) await speed.click()
  await expect(page.getByTestId("challenge-results")).toBeVisible({ timeout: 90_000 })
}

test.describe.serial("Disconnected nodes don't count (D74)", () => {
  for (const c of CASES) {
    test(`${c.tier} — orphaning the ${c.orphanedTier} tier drops it from the bill + flags Well-formed`, async ({ page }) => {
      test.setTimeout(150_000)
      await page.setViewportSize({ width: 1400, height: 1600 }) // fit dialogs/panels without nested-scroll clipping
      await page.goto("/")
      const hasComponents = await waitForComponentLibrary(page)
      test.skip(!hasComponents, "Skipped: no seeded data")
      await page.waitForTimeout(2500) // let the seeded userProgress load so the challenge is replayable

      // Enter the challenge (the unlocked replay account has every quest playable).
      await page.getByTestId("menu-build").click()
      await page.waitForTimeout(300)
      await page.getByTestId("menu-challenges").click()
      await page.waitForTimeout(1000)
      const play = page.getByTestId(`challenge-play-${c.id}`)
      await play.scrollIntoViewIfNeeded()
      await expect(play).toBeEnabled({ timeout: 5000 })
      await play.click()
      await expect(page.getByTestId("start-challenge")).toBeVisible({ timeout: 10_000 })

      // Import the winning reference build through the real Import UI (replaces the seeded canvas).
      await page.locator('[data-testid="import-file-input"]').setInputFiles(join(process.cwd(), FIXTURE_DIR, c.fixture))
      // Wait for the FULL build to render before running — gating on the edge COUNT proves loadArchitecture
      // fully applied + React Flow measured every node's handles. A fixed settle is racy under load (the
      // build can paint in stages); gating on the edge count makes the baseline stable.
      await expect(page.locator(".react-flow__edge"), "imported build should render all edges").toHaveCount(c.edgeCount, { timeout: 15_000 })
      await page.waitForTimeout(500) // brief settle for the auto-fit transition

      // --- Baseline: a 3★ clear, Well-formed met, record the budget figure. ---
      await runSimulation(page)
      expect(
        await page.getByTestId("result-stars").getAttribute("aria-label"),
        `${c.id} reference build should clear 3★`,
      ).toBe("3 of 3 stars")
      await expect(page.getByTestId("result-well-formed"), "baseline build is fully wired").toHaveAttribute("data-met", "true")
      await expect(page.getByTestId("result-under-budget"), "baseline build is under budget").toHaveAttribute("data-met", "true")
      const baselineBudget = await readBudget(page)

      // WS2: every target renders as a colored measured-vs-target chip (not a bare label) — uptime + p99
      // are always present. The figure carries a tone class (green pass / amber near / red fail).
      const uptimeValue = page.locator('[data-metric-type="uptime"] .font-semibold')
      await expect(uptimeValue).toBeVisible()
      expect(
        await uptimeValue.getAttribute("class"),
        "metric figure must be colored by tone (WS2)",
      ).toMatch(/text-(emerald|amber|red)-400/)

      await page.screenshot({ path: `${SCREENSHOT_DIR}/${c.id}-01-baseline-3star.png`, fullPage: true })
      // "Adjust & retry" (not Close): it resets the sim to idle AND keeps the build — so the canvas is
      // editable and the Start button returns. Close leaves the sim in "done", which hides Start.
      await page.getByTestId("result-retry").click()
      await expect(page.getByTestId("challenge-results"), "modal must close before editing the canvas").toBeHidden({ timeout: 5000 })

      // --- Disconnect the paid leaf tier: delete one edge, leaving the node in place → it's now an orphan. ---
      const edge = page.getByTestId(`rf__edge-${c.deleteEdgeId}`)
      await expect(edge, `${c.deleteEdgeId} should be on the canvas`).toBeVisible({ timeout: 5000 })
      await edge.click({ force: true }) // animated SVG edge — bypass the stability wait (see connection-wiring.spec)
      await page.keyboard.press("Delete")
      await expect(page.getByTestId(`rf__edge-${c.deleteEdgeId}`), "edge should be gone after Delete").toHaveCount(0, { timeout: 5000 })

      // The disconnected node is flagged ON the canvas (WS3a) — intuitive, not just buried in the modal.
      const orphanFlag = page.getByTestId("node-topology-status").first()
      await expect(orphanFlag).toBeVisible({ timeout: 5000 })
      await expect(orphanFlag).toHaveAttribute("data-status", "orphan")
      await page.screenshot({ path: `${SCREENSHOT_DIR}/${c.id}-02-disconnected.png`, fullPage: true })

      // --- Re-run with the leaf tier orphaned. ---
      await runSimulation(page)

      // Topology now fails — the disconnected node is detected, so this is no longer a clean 3★.
      await expect(page.getByTestId("result-well-formed"), "an orphaned node must fail Well-formed").not.toHaveAttribute("data-met", "true")
      expect(
        await page.getByTestId("result-stars").getAttribute("aria-label"),
        "a disconnected build can't be 3★",
      ).not.toBe("3 of 3 stars")

      // WS1 — the heart of it: the orphaned tier no longer bills, so the budget figure DROPS. Before the
      // fix it would have been unchanged (the node "still counted"). It must still be under budget (lower).
      const orphanedBudget = await readBudget(page)
      expect(
        orphanedBudget,
        `disconnected ${c.orphanedTier} must drop from the bill: baseline $${baselineBudget} → orphaned $${orphanedBudget}`,
      ).toBeLessThan(baselineBudget)
      await expect(page.getByTestId("result-under-budget")).toHaveAttribute("data-met", "true")

      await page.screenshot({ path: `${SCREENSHOT_DIR}/${c.id}-03-orphaned-result.png`, fullPage: true })
      await page.getByTestId("result-close").click()
    })
  }
})
