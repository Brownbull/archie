import { test, expect } from "@playwright/test"
import { waitForComponentLibrary, dragComponentToCanvas } from "./helpers/canvas-helpers"

const SCREENSHOT_DIR = "test-results/simulation"

test.describe("Simulation Engine E2E (Epic 15)", () => {
  test("run a simulation, watch telemetry + timeline, then control playback", async ({ page }) => {
    await page.goto("/")

    const hasComponents = await waitForComponentLibrary(page)
    test.skip(!hasComponents, "Skipped: Firestore has no seeded component data")

    // Place a component so the canvas is non-empty.
    const firstCard = page.locator('[data-testid^="component-card-"]').first()
    await expect(firstCard).toBeVisible()
    const componentId = (await firstCard.getAttribute("data-testid"))!.replace("component-card-", "")
    const canvas = page.locator('[data-testid="canvas-panel"]')
    const bounds = await canvas.boundingBox()
    await dragComponentToCanvas(page, componentId, bounds!.x + bounds!.width / 2, bounds!.y + bounds!.height / 2)
    await expect(page.locator('[data-testid="archie-node"]').first()).toBeVisible({ timeout: 5_000 })

    // Run Simulation button appears when idle with nodes present.
    const runBtn = page.locator('[data-testid="run-simulation"]')
    await expect(runBtn).toBeVisible()
    await page.screenshot({ path: `${SCREENSHOT_DIR}/01-ready-to-run.png`, fullPage: true })

    await runBtn.click()

    // The simulation bar (stats + timeline + controls) appears, the trigger hides.
    await expect(page.locator('[data-testid="simulation-bar"]')).toBeVisible()
    await expect(page.locator('[data-testid="sim-timeline"]')).toBeVisible()
    await expect(page.locator('[data-testid="playback-controls"]')).toBeVisible()
    await expect(page.locator('[data-testid="sim-stats"]')).toBeVisible()
    await expect(runBtn).toHaveCount(0)
    // The placed node shows a live telemetry strip during the run.
    await expect(page.locator('[data-testid="sim-telemetry"]').first()).toBeVisible()
    await page.screenshot({ path: `${SCREENSHOT_DIR}/02-running.png`, fullPage: true })

    const tickLabel = page.locator('[data-testid="playback-tick"]')
    const tickNum = async () => Number((await tickLabel.textContent())!.split("/")[0])

    // Speed up to 10× (≈100ms/tick) and confirm playback is actually advancing.
    await page.locator('[data-testid="playback-speed-10"]').click()
    await expect(page.locator('[data-testid="playback-speed-10"]')).toHaveAttribute("aria-pressed", "true")
    const beforeWait = await tickNum()
    await expect.poll(tickNum, { timeout: 2_000 }).toBeGreaterThan(beforeWait) // timer is live

    // Pause and confirm the tick freezes across MORE than one 10× tick interval.
    await page.locator('[data-testid="playback-toggle"]').click()
    const frozen = await tickNum()
    await page.waitForTimeout(450) // ~4 ticks at 10× — would advance if not paused
    expect(await tickNum()).toBe(frozen)
    await page.screenshot({ path: `${SCREENSHOT_DIR}/03-paused.png`, fullPage: true })

    // Replay resets to the start (tick drops below the paused position).
    await page.locator('[data-testid="playback-replay"]').click()
    await page.locator('[data-testid="playback-toggle"]').click() // pause again to freeze the reset position
    expect(await tickNum()).toBeLessThan(frozen)

    // Close the simulation — bar disappears, the Run button returns.
    await page.locator('[data-testid="sim-close"]').click()
    await expect(page.locator('[data-testid="simulation-bar"]')).toHaveCount(0)
    await expect(runBtn).toBeVisible()
    await page.screenshot({ path: `${SCREENSHOT_DIR}/04-closed.png`, fullPage: true })
  })
})
