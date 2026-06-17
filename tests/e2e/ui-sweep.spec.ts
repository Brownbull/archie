import { test, expect } from "@playwright/test"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import {
  waitForComponentLibrary,
  addComponentToCanvas,
  selectNodeOnCanvas,
  connectNodes,
} from "./helpers/canvas-helpers"

const SCREENSHOT_DIR = "test-results/ui-sweep"

// A visual sweep of the main interactive states — captures full-page screenshots for review and
// asserts the big surfaces stay visible/usable. Auth baseline marks the tour seen (global-setup).

test.describe("UI visual sweep", () => {
  test("inspector open (node) — sidebar + canvas overlays + bottom action coexist", async ({ page }) => {
    await page.goto("/")
    test.skip(!(await waitForComponentLibrary(page)), "no seeded data")
    await addComponentToCanvas(page, 0)
    await addComponentToCanvas(page, 1)
    await selectNodeOnCanvas(page, 0)
    await expect(page.locator('[data-testid="inspector-panel"]')).toBeVisible()
    await page.screenshot({ path: `${SCREENSHOT_DIR}/01-inspector-open.png`, fullPage: true })
  })

  test("inspector maximized — full-screen overlay", async ({ page }) => {
    await page.goto("/")
    test.skip(!(await waitForComponentLibrary(page)), "no seeded data")
    await addComponentToCanvas(page, 0)
    await selectNodeOnCanvas(page, 0)
    const maximize = page.locator('[data-testid="inspector-maximize-btn"]')
    if (await maximize.isVisible().catch(() => false)) {
      await maximize.click()
      await page.waitForTimeout(300)
    }
    await page.screenshot({ path: `${SCREENSHOT_DIR}/02-inspector-maximized.png`, fullPage: true })
  })

  test("overlay mode active (heatmap/cost view)", async ({ page }) => {
    await page.goto("/")
    test.skip(!(await waitForComponentLibrary(page)), "no seeded data")
    await addComponentToCanvas(page, 0)
    await addComponentToCanvas(page, 1)
    const cost = page.locator('[data-testid="overlay-mode-cost"]')
    if (await cost.isVisible().catch(() => false)) await cost.click()
    await page.waitForTimeout(300)
    await page.screenshot({ path: `${SCREENSHOT_DIR}/03-overlay-cost-active.png`, fullPage: true })
  })

  test("edge selected — connection inspector + edge toolbar", async ({ page }) => {
    await page.goto("/")
    test.skip(!(await waitForComponentLibrary(page)), "no seeded data")
    await addComponentToCanvas(page, 0)
    await addComponentToCanvas(page, 1)
    await connectNodes(page, 0, 1).catch(() => {})
    const edge = page.locator(".react-flow__edge").first()
    if (await edge.isVisible().catch(() => false)) {
      await edge.click({ force: true })
      await page.waitForTimeout(300)
    }
    await page.screenshot({ path: `${SCREENSHOT_DIR}/04-edge-selected.png`, fullPage: true })
  })

  test("simulation running — SimulationBar + node telemetry", async ({ page }) => {
    await page.goto("/")
    test.skip(!(await waitForComponentLibrary(page)), "no seeded data")
    await addComponentToCanvas(page, 0)
    await addComponentToCanvas(page, 1)
    await connectNodes(page, 0, 1).catch(() => {})
    const runBtn = page.locator('[data-testid="run-simulation"]')
    if (await runBtn.isVisible().catch(() => false)) {
      await runBtn.click()
      await page.waitForTimeout(800) // let a few sim ticks render
    }
    await page.screenshot({ path: `${SCREENSHOT_DIR}/05-simulation-running.png`, fullPage: true })
  })

  test("toolbox tabs — Stacks / Blueprints / History", async ({ page }) => {
    await page.goto("/")
    test.skip(!(await waitForComponentLibrary(page)), "no seeded data")
    for (const [tab, file] of [["Stacks", "06-tab-stacks"], ["Blueprints", "07-tab-blueprints"], ["History", "08-tab-history"]] as const) {
      await page.getByRole("tab", { name: tab }).click()
      await page.waitForTimeout(500)
      await page.screenshot({ path: `${SCREENSHOT_DIR}/${file}.png`, fullPage: true })
    }
  })

  test("dense canvas — many nodes + connections + overlay coexist", async ({ page }) => {
    await page.goto("/")
    test.skip(!(await waitForComponentLibrary(page)), "no seeded data")
    // Crowd the canvas: import a connected 5-node architecture (importing is reliable; dropping +
    // dragging handle-to-handle to connect is flaky because placed nodes overlap, and the old
    // add-type-.nth(i) loop hit the traffic one-per-type gate).
    const buf = readFileSync(join(process.cwd(), "tests", "e2e", "fixtures", "scoring", "dense-canvas.architecture.yaml"))
    await page.getByTestId("import-file-input").setInputFiles({ name: "dense-canvas.architecture.yaml", mimeType: "text/yaml", buffer: buf })
    await expect(page.locator('[data-testid="archie-node"]')).toHaveCount(5, { timeout: 10_000 })
    await expect(page.locator(".react-flow__edge")).toHaveCount(4, { timeout: 5_000 })
    const cost = page.locator('[data-testid="overlay-mode-cost"]')
    if (await cost.isVisible().catch(() => false)) await cost.click()
    await page.waitForTimeout(300)
    // The top-bar controls must all stay reachable on a busy canvas.
    await expect(page.locator('[data-testid="overlay-selector"]')).toBeVisible()
    await expect(page.locator('[data-testid="build-health-panel"]')).toBeVisible()
    await page.screenshot({ path: `${SCREENSHOT_DIR}/09-dense-canvas.png`, fullPage: true })
  })

  test("AI prompt dialog renders without clipping", async ({ page }) => {
    await page.goto("/")
    test.skip(!(await waitForComponentLibrary(page)), "no seeded data")
    await addComponentToCanvas(page, 0)
    const promptBtn = page.locator('[data-testid="prompt-template-button"]')
    if (await promptBtn.isVisible().catch(() => false)) {
      await promptBtn.click()
      const dialog = page.locator('[data-testid="prompt-template-dialog"]')
      await expect(dialog).toBeVisible({ timeout: 5_000 })
      // Radix dialog opens with a 200ms fade/zoom; settle before capturing so the
      // backdrop is fully opaque (otherwise the canvas shows through mid-animation).
      await page.waitForTimeout(350)
    }
    await page.screenshot({ path: `${SCREENSHOT_DIR}/10-ai-prompt-dialog.png`, fullPage: true })
  })
})
