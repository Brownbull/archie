import { test, expect, type Locator } from "@playwright/test"
import { waitForComponentLibrary, addComponentToCanvas } from "./helpers/canvas-helpers"

const SCREENSHOT_DIR = "test-results/ui-layout"

interface Box { x: number; y: number; width: number; height: number }

function overlaps(a: Box, b: Box): boolean {
  return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y
}

async function box(loc: Locator): Promise<Box> {
  const b = await loc.boundingBox()
  if (!b) throw new Error("locator has no bounding box")
  return b
}

test.describe("UI layout — controls are well-distributed & non-overlapping", () => {
  test("top-bar canvas controls do not overlap (Run Simulation vs overlay modes vs build-health)", async ({ page }) => {
    await page.goto("/")
    const hasComponents = await waitForComponentLibrary(page)
    test.skip(!hasComponents, "Skipped: Firestore has no seeded component data")

    // Place 2 components so Run Simulation, the overlay-mode toolbar, and the build-health
    // panel are all on screen at once (free-build mode, no challenge).
    await addComponentToCanvas(page, 0)
    await addComponentToCanvas(page, 1)

    const overlaySelector = page.locator('[data-testid="overlay-selector"] >> div').first()
    const runSim = page.locator('[data-testid="run-simulation"]')
    const buildHealth = page.locator('[data-testid="build-health-panel"]')

    await expect(runSim).toBeVisible()
    await expect(page.locator('[data-testid="overlay-selector"]')).toBeVisible()
    await expect(buildHealth).toBeVisible()

    await page.screenshot({ path: `${SCREENSHOT_DIR}/01-canvas-controls.png`, fullPage: true })

    const overlayBox = await box(overlaySelector)
    const runSimBox = await box(runSim)
    const buildHealthBox = await box(buildHealth)

    // The reported bug: Run Simulation sat on top of the overlay-mode toolbar (Cost/Tier/Flow
    // unclickable). These must not overlap.
    expect(overlaps(runSimBox, overlayBox), "Run Simulation overlaps the overlay-mode toolbar").toBe(false)
    expect(overlaps(runSimBox, buildHealthBox), "Run Simulation overlaps the build-health panel").toBe(false)
    expect(overlaps(overlayBox, buildHealthBox), "Overlay toolbar overlaps the build-health panel").toBe(false)

    // Every overlay-mode button must be individually clickable (not occluded → no actionability timeout).
    const modeButtons = page.locator('[data-testid^="overlay-mode-"]')
    const count = await modeButtons.count()
    expect(count).toBeGreaterThan(0)
    for (let i = 0; i < count; i++) {
      await modeButtons.nth(i).click({ trial: true, timeout: 3_000 })
    }
  })

  test("with the inspector open (narrowest canvas), the overlay toolbar stays clear of the scenario/failure selectors", async ({ page }) => {
    await page.goto("/")
    const hasComponents = await waitForComponentLibrary(page)
    test.skip(!hasComponents, "Skipped: Firestore has no seeded component data")

    // Open the inspector — this shrinks the canvas to its narrowest, crowding the top row.
    await addComponentToCanvas(page, 0)
    await page.locator('[data-testid="archie-node"]').first().click()
    await expect(page.locator('[data-testid="inspector-panel"]')).toBeVisible({ timeout: 5_000 })

    await page.screenshot({ path: `${SCREENSHOT_DIR}/03-inspector-open-top-row.png`, fullPage: true })

    const overlayBox = await box(page.locator('[data-testid="overlay-selector"] >> div').first())
    const scenarioBox = await box(page.locator('[data-testid="scenario-selector"]'))
    const failureBox = await box(page.locator('[data-testid="failure-selector"]'))

    expect(overlaps(overlayBox, scenarioBox), "Overlay toolbar overlaps the scenario selector").toBe(false)
    expect(overlaps(overlayBox, failureBox), "Overlay toolbar overlaps the failure selector").toBe(false)
  })

  test("challenge-mode controls (HUD, Start button) do not overlap the overlay toolbar", async ({ page }) => {
    await page.goto("/")
    const hasComponents = await waitForComponentLibrary(page)
    test.skip(!hasComponents, "Skipped: Firestore has no seeded component data")

    // Enter a challenge → the HUD appears (top-left), the overlay toolbar stays (top-center).
    await page.getByTestId("menu-build").click()
    await page.getByTestId("menu-challenges").click()
    await page.locator('[data-testid="challenge-play-first-service"]').click()
    await expect(page.locator('[data-testid="challenge-hud"]')).toBeVisible()

    // Place a component so the Start trigger appears (now bottom-center, off the overlay toolbar).
    // The challenge seeds a traffic-source node, so add one MORE block and assert a relative bump
    // (the addComponentToCanvas helper assumes an empty canvas, which a started challenge isn't).
    const before = await page.locator('[data-testid="archie-node"]').count()
    await page.locator('[data-testid^="add-type-"]').first().click()
    await expect(page.locator('[data-testid="archie-node"]')).toHaveCount(before + 1, { timeout: 5_000 })
    const startBtn = page.locator('[data-testid="start-challenge"]')
    await expect(startBtn).toBeVisible()

    await page.screenshot({ path: `${SCREENSHOT_DIR}/02-challenge-controls.png`, fullPage: true })

    const overlayBox = await box(page.locator('[data-testid="overlay-selector"] >> div').first())
    const hudBox = await box(page.locator('[data-testid="challenge-hud"]'))
    const startBox = await box(startBtn)

    expect(overlaps(startBox, overlayBox), "Start challenge overlaps the overlay-mode toolbar").toBe(false)
    expect(overlaps(hudBox, overlayBox), "Challenge HUD overlaps the overlay-mode toolbar").toBe(false)

    // Overlay-mode buttons remain clickable during challenge mode.
    const modeButtons = page.locator('[data-testid^="overlay-mode-"]')
    const count = await modeButtons.count()
    for (let i = 0; i < count; i++) {
      await modeButtons.nth(i).click({ trial: true, timeout: 3_000 })
    }
  })
})
