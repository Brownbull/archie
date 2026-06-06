import { test, expect } from "@playwright/test"
import { join } from "node:path"
import { waitForComponentLibrary } from "./helpers/canvas-helpers"
import { seedUnlockedProgress, restoreEmptyProgress, seedProjectId } from "./helpers/seed-progress"

/**
 * Tier-6 absurd capstone completion — REAL-UI replay (D72).
 *
 * Proves each capstone is genuinely 3★-completable in the running app, not just in the harness:
 * seed a dedicated unblocked user (all quests complete ⇒ replayable), then for each capstone open the
 * Quest Log, Replay it, IMPORT its winning reference architecture through the real Import UI, run the
 * simulation, and assert a 3★ result — screenshotting the modal as durable proof.
 *
 * The fixtures (`tests/e2e/fixtures/capstones/*.architecture.yaml`) are the same builds the solvability
 * harness + capstone-completion proof score; this spec confirms they clear 3★ through the production
 * sim + scorer + UI, end to end.
 */
const SCREENSHOT_DIR = "test-results/capstone-completion"
const FIXTURE_DIR = "tests/e2e/fixtures/capstones"
const AUTH_FILE = "tests/e2e/.auth/user.json"
const CAPSTONES = ["planet-scale", "thundering-herd", "heat-death", "zero-budget-hero", "the-singularity", "maxwells-demon"] as const

const projectId = seedProjectId()

test.describe.serial("Tier-6 capstone completion (real-UI replay)", () => {
  test.skip(!projectId, "No VITE_FIREBASE_PROJECT_ID (.env.local) — unblocked-user seeding unavailable")

  test.beforeAll(async ({ browser }) => {
    const ctx = await browser.newContext({ storageState: AUTH_FILE })
    const page = await ctx.newPage()
    await page.goto("/")
    await waitForComponentLibrary(page)
    await seedUnlockedProgress(page, projectId as string)
    await ctx.close()
  })

  test.afterAll(async ({ browser }) => {
    const ctx = await browser.newContext({ storageState: AUTH_FILE })
    const page = await ctx.newPage()
    await page.goto("/")
    await restoreEmptyProgress(page, projectId as string).catch(() => {})
    await ctx.close()
  })

  for (const id of CAPSTONES) {
    test(`completes "${id}" at 3★ via import + replay`, async ({ page }) => {
      test.setTimeout(120_000)
      await page.setViewportSize({ width: 1400, height: 1600 }) // fit dialogs/panels without nested-scroll clipping
      await page.goto("/")
      const hasComponents = await waitForComponentLibrary(page)
      test.skip(!hasComponents, "Skipped: no seeded data")
      await page.waitForTimeout(2500) // let the seeded userProgress load so the capstone unlocks

      // Open the challenge selector (the seeded user has every quest unlocked → play enabled).
      await page.getByTestId("menu-build").click()
      await page.waitForTimeout(300)
      await page.getByTestId("menu-challenges").click()
      await page.waitForTimeout(1000)

      // Pick the (now-unlocked) capstone → enters challenge build mode (seeds the challenge traffic).
      const play = page.getByTestId(`challenge-play-${id}`)
      await play.scrollIntoViewIfNeeded()
      await expect(play).toBeEnabled({ timeout: 5000 })
      await play.click()

      // In challenge build mode: the Start Challenge button is present once the canvas has nodes.
      await expect(page.getByTestId("start-challenge")).toBeVisible({ timeout: 10_000 })

      // Import the winning reference architecture through the real Import UI (replaces the canvas).
      await page.locator('[data-testid="import-file-input"]').setInputFiles(join(FIXTURE_DIR, `${id}.architecture.yaml`))
      await page.waitForTimeout(1500) // import parses + loadArchitecture re-renders the canvas

      // Run the simulation at max speed.
      const start = page.getByTestId("start-challenge")
      await expect(start).toBeVisible({ timeout: 5000 })
      await start.click()
      const speed = page.getByTestId("playback-speed-10")
      if (await speed.isVisible({ timeout: 2000 }).catch(() => false)) await speed.click()

      // Assert a 3★ result and screenshot it as proof.
      await expect(page.getByTestId("challenge-results")).toBeVisible({ timeout: 90_000 })
      const stars = await page.getByTestId("result-stars").getAttribute("aria-label")
      expect(stars, `${id} should clear 3★`).toBe("3 of 3 stars")
      await page.screenshot({ path: `${SCREENSHOT_DIR}/${id}-3star.png`, fullPage: true })

      await page.getByTestId("result-close").click()
    })
  }
})
