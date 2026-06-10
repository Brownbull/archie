import { test, expect, type Page } from "@playwright/test"
import { join } from "node:path"
import { waitForComponentLibrary } from "./helpers/canvas-helpers"

/**
 * Phase-4 break-it loop journey evidence (D94, P4-S3) — the full flagship loop through the real UI:
 *   1. Import the production-ai 3★ reference build → run → 3★ + the "Now break it" invitation
 *      (the traffic dials just unlocked, D20).
 *   2. Crank ONE dial (web-users peak 2k → 12k) → re-run → the build FAILS → break collected
 *      (+1 Expert, "Peak RPS") — proving the post-3★ canvas-wins launch seam actually feeds the sim.
 *   3. Reset dials (authored spec restored) → flip the same source's workload to write-heavy →
 *      re-run → second break ("Workload") — the per-attribute dedup ledger in action.
 *
 * Quest + deviation magnitudes chosen by an engine probe of the reference build through the
 * post-3★ canvas-driven path: single-node rps 12k fails (uptime 98.9 < 99), single-node write
 * workload fails hard (uptime ~74%) — while one rps step or origin/kind-spike flips hold, so the
 * loop's "find the boundary" framing is real, not scripted. production-ai has TWO sources
 * (web-users 2k + mobile-users 1.5k) → `.first()` targets the web-users node; the detector's
 * multiset diff still sees exactly ONE changed attribute.
 *
 * Runs under desktop-unlocked (the all-complete replay account); unlocked-setup zeroes
 * expertCurrency/breaksByChallenge each run, so the fresh "+1 Expert" payout is reproducible.
 */
const SCREENSHOT_DIR = "test-results/feedback-phase4"
const FIXTURE = join(process.cwd(), "tests/e2e/fixtures/challenges", "production-ai.architecture.yaml")

async function enterQuest(page: Page, id: string): Promise<void> {
  await page.getByTestId("menu-build").click()
  await page.waitForTimeout(300)
  await page.getByTestId("menu-challenges").click()
  await page.waitForTimeout(1000)
  const play = page.getByTestId(`challenge-play-${id}`)
  await play.scrollIntoViewIfNeeded()
  await expect(play).toBeEnabled({ timeout: 5000 })
  await play.click()
  await expect(page.getByTestId("start-challenge")).toBeVisible({ timeout: 10_000 })
}

async function runToResults(page: Page): Promise<void> {
  // First run (or after a sim reset) arms via Start Challenge; a re-run while the previous run's
  // sim data is still loaded goes through the SimulationBar's Rerun (the P1/T6 re-grade path —
  // same launchChallengeAttempt, so the post-3★ canvas-wins seam applies).
  const start = page.getByTestId("start-challenge")
  if (await start.isVisible({ timeout: 2000 }).catch(() => false)) {
    await start.click()
  } else {
    await page.getByTestId("playback-rerun").click()
  }
  const speed = page.getByTestId("playback-speed-10")
  if (await speed.isVisible({ timeout: 2000 }).catch(() => false)) await speed.click()
  await expect(page.getByTestId("challenge-results")).toBeVisible({ timeout: 90_000 })
}

test.describe.serial("Feedback Phase 4 — break-it loop journey", () => {
  test("3★ → invite → break via RPS (+1 Expert) → reset dials → break via workload", async ({ page }) => {
    test.setTimeout(300_000)
    await page.setViewportSize({ width: 1400, height: 1600 })
    await page.goto("/")
    test.skip(!(await waitForComponentLibrary(page)), "no seeded data")
    await page.waitForTimeout(2500) // let the seeded userProgress load so the quest is replayable

    await enterQuest(page, "production-ai")

    // --- Run 1: the clean 3★ clear (authored demand) → the invitation. ---
    await page.locator('[data-testid="import-file-input"]').setInputFiles(FIXTURE)
    await page.waitForTimeout(1500)
    await runToResults(page)
    expect(await page.getByTestId("result-stars").getAttribute("aria-label")).toBe("3 of 3 stars")
    const invite = page.getByTestId("break-invite")
    await expect(invite).toBeVisible()
    await expect(invite).toContainText(/Now break it/)
    await page.screenshot({ path: `${SCREENSHOT_DIR}/01-three-stars-break-invite.png`, fullPage: true })
    await page.getByTestId("result-close").click()

    // --- Run 2: crank the web-users RPS dial (2k → 12k, four steps) and re-run — the build falls. ---
    const rpsValue = page.getByTestId("rps-stepper-value").first()
    await expect(rpsValue).toContainText(/2k/i) // dials unlocked + authored value in place
    const increment = page.getByTestId("rps-increment").first()
    for (let i = 0; i < 4; i++) await increment.click() // 3k → 6k → 9k → 12k
    await expect(rpsValue).toContainText(/12k/i)
    await runToResults(page)
    const collected = page.getByTestId("break-collected")
    await expect(collected).toBeVisible()
    await expect(collected).toContainText(/Broke it with Peak RPS/)
    await expect(page.getByTestId("break-payout")).toContainText(/\+1 Expert/)
    await page.screenshot({ path: `${SCREENSHOT_DIR}/02-rps-break-collected.png`, fullPage: true })

    // --- Reset: the authored dials come back, ready for the next attribute. ---
    await page.getByTestId("break-reset").click()
    await expect(page.getByTestId("challenge-results")).not.toBeVisible()
    await expect(rpsValue).toContainText(/2k/i)

    // --- Run 3: flip the workload dial (read → write-heavy) — second attribute, second break. ---
    const workload = page.getByTestId("traffic-workload-select").first()
    await workload.scrollIntoViewIfNeeded()
    await workload.click()
    await page.getByRole("option", { name: "Write-heavy" }).click()
    await runToResults(page)
    await expect(page.getByTestId("break-collected")).toBeVisible()
    await expect(page.getByTestId("break-collected")).toContainText(/Broke it with Workload/)
    await page.screenshot({ path: `${SCREENSHOT_DIR}/03-workload-break-collected.png`, fullPage: true })
  })
})
