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

    // Pause, then verify the tick label holds.
    await page.locator('[data-testid="playback-toggle"]').click()
    const tickLabel = page.locator('[data-testid="playback-tick"]')
    const frozen = await tickLabel.textContent()
    await page.waitForTimeout(600)
    await expect(tickLabel).toHaveText(frozen!)
    await page.screenshot({ path: `${SCREENSHOT_DIR}/03-paused.png`, fullPage: true })

    // Speed change + replay are wired.
    await page.locator('[data-testid="playback-speed-5"]').click()
    await expect(page.locator('[data-testid="playback-speed-5"]')).toHaveAttribute("aria-pressed", "true")
    await page.locator('[data-testid="playback-replay"]').click()

    // Close the simulation — bar disappears, the Run button returns.
    await page.locator('[data-testid="sim-close"]').click()
    await expect(page.locator('[data-testid="simulation-bar"]')).toHaveCount(0)
    await expect(runBtn).toBeVisible()
    await page.screenshot({ path: `${SCREENSHOT_DIR}/04-closed.png`, fullPage: true })
  })
})
