import { test, expect } from "@playwright/test"
import { join } from "node:path"
import { waitForComponentLibrary } from "./helpers/canvas-helpers"

/**
 * Phase-2 runtime journey evidence (Quest Integrity & Break-It Loop, D89) — the PLAN's Runtime
 * Evidence Checkpoints for Phase 2, driven through the production UI on the unlocked replay account:
 *   1. D87 port gate: a quest attempt with ONE port-mismatched edge loses exactly the well-formed
 *      star (3★ reference → 2★) and the results modal SAYS WHY ("Ports compatible" row) while
 *      "Well-formed" stays green — the misleading-green-check failure mode S1 closed.
 *   2. S7+S8 observe loop: observe-to-recover's az_outage fires on the live build and the timeline
 *      draws the marker band — red while undetected, amber once monitoring detects and contains it.
 *
 * Fixtures are generated + 3★-asserted by tests/integration/challenges/e2e-fixtures.test.ts (the
 * mismatched variant is the same build with explicit http-out → auth-in handles on e2 — the sim
 * routes by node ids only, so the ONLY scoring delta is the port gate).
 */
const SCREENSHOT_DIR = "test-results/feedback-phase2"
const FIXTURE_DIR = "tests/e2e/fixtures/challenges"

async function enterQuest(page: import("@playwright/test").Page, id: string): Promise<void> {
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

test.describe.serial("Feedback Phase 2 — runtime journeys", () => {
  test("a port-mismatched edge costs exactly the well-formed star, and the modal says why (D87)", async ({ page }) => {
    test.setTimeout(150_000)
    await page.setViewportSize({ width: 1400, height: 1600 })
    await page.goto("/")
    test.skip(!(await waitForComponentLibrary(page)), "no seeded data")
    await page.waitForTimeout(2500) // let seeded progress load so the quest is replayable

    await enterQuest(page, "edge-delivery")

    // Import the 3★ reference build whose e2 carries mismatched handles (http-out → auth-in).
    await page.locator('[data-testid="import-file-input"]').setInputFiles(join(process.cwd(), FIXTURE_DIR, "edge-delivery-mismatched-port.architecture.yaml"))
    await expect(page.locator(".react-flow__edge")).toHaveCount(3, { timeout: 15_000 })
    // The canvas flags the bad link BEFORE the run (the WARN affordance the gate is built on).
    await expect(page.locator('[data-port-mismatch="true"]')).toHaveCount(1, { timeout: 5000 })
    await page.waitForTimeout(500)
    await page.screenshot({ path: `${SCREENSHOT_DIR}/01-mismatched-edge-on-canvas.png`, fullPage: true })

    // Run + grade.
    await page.getByTestId("start-challenge").click()
    const speed = page.getByTestId("playback-speed-10")
    if (await speed.isVisible({ timeout: 2000 }).catch(() => false)) await speed.click()
    await expect(page.getByTestId("challenge-results")).toBeVisible({ timeout: 90_000 })

    // EXACTLY the well-formed star is lost: same build scores 3★ handle-less (e2e-fixtures.test
    // asserts it) — with the mismatch it's 2★, topology still green, and the ports row explains it.
    expect(await page.getByTestId("result-stars").getAttribute("aria-label")).toBe("2 of 3 stars")
    await expect(page.getByTestId("result-well-formed"), "no orphans — topology itself is clean").toHaveAttribute("data-met", "true")
    const portsRow = page.getByTestId("result-ports-compatible")
    await expect(portsRow, "the lost star must be EXPLAINED (P1 anti-pattern: unexplained green checks)").toBeVisible()
    await expect(portsRow).not.toHaveAttribute("data-met", "true")
    await expect(portsRow).toContainText("mismatched port types")

    await page.screenshot({ path: `${SCREENSHOT_DIR}/02-port-gate-2stars-explained.png`, fullPage: true })
  })

  test("observe-to-recover: the timeline marks the outage red, then amber at detection (S7+S8)", async ({ page }) => {
    test.setTimeout(120_000)
    await page.setViewportSize({ width: 1400, height: 1600 })
    await page.goto("/")
    test.skip(!(await waitForComponentLibrary(page)), "no seeded data")
    await page.waitForTimeout(2500)

    await enterQuest(page, "observe-to-recover")

    // Import the 3★ reference build (compute + prometheus monitoring + traffic).
    await page.locator('[data-testid="import-file-input"]').setInputFiles(join(process.cwd(), FIXTURE_DIR, "observe-to-recover.architecture.yaml"))
    await expect(page.locator(".react-flow__edge")).toHaveCount(2, { timeout: 15_000 })
    await page.waitForTimeout(500)

    // Start — frames are precomputed, so the markers exist as soon as the timeline renders.
    await page.getByTestId("start-challenge").click()
    await expect(page.getByTestId("sim-timeline")).toBeVisible({ timeout: 15_000 })

    // The az_outage window (t=30..60 of 90s) carries marker bands; monitoring means the band starts
    // red (undetected) and flips amber once the detection delay elapses — the observe loop, visible.
    const markers = page.locator('[data-testid^="sim-event-marker-"]')
    expect(await markers.count(), "the outage window must be marked on the timeline").toBeGreaterThan(0)
    const detected = page.locator('[data-testid^="sim-event-marker-"][data-detected="true"]')
    expect(await detected.count(), "monitoring must flip the marker to detected (amber)").toBeGreaterThan(0)
    expect(
      (await markers.count()) - (await detected.count()),
      "the pre-detection ticks stay red (full blast) before monitoring catches it",
    ).toBeGreaterThan(0)

    await page.screenshot({ path: `${SCREENSHOT_DIR}/03-observe-markers-red-then-amber.png`, fullPage: true })
  })
})
