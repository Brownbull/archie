import { test, expect } from "@playwright/test"
import { waitForComponentLibrary, dragComponentToCanvas } from "./helpers/canvas-helpers"

const SCREENSHOT_DIR = "test-results/import-export"

test.describe("Import/Export E2E (Story 3-2)", () => {
  test("AC-1: export button is visible in toolbar", async ({ page }) => {
    await page.goto("/")
    await expect(page.locator('[data-testid="toolbar"]')).toBeVisible({ timeout: 15_000 })

    const exportButton = page.getByTestId("export-button")
    await expect(exportButton).toBeVisible()

    await page.screenshot({
      path: `${SCREENSHOT_DIR}/01-export-button-visible.png`,
      fullPage: true,
    })
  })

  test("AC-6: export button is disabled on empty canvas", async ({ page }) => {
    await page.goto("/")
    await expect(page.locator('[data-testid="toolbar"]')).toBeVisible({ timeout: 15_000 })

    // Empty canvas → export button must be disabled
    const exportButton = page.getByTestId("export-button")
    await expect(exportButton).toBeDisabled()

    await page.screenshot({
      path: `${SCREENSHOT_DIR}/02-export-button-disabled-empty.png`,
      fullPage: true,
    })
  })

  test("AC-1/AC-2: export button enabled after adding component, triggers YAML download", async ({ page }) => {
    await page.goto("/")

    // Wait for canvas and component library
    await expect(page.locator('[data-testid="canvas-panel"]')).toBeVisible({ timeout: 15_000 })
    const hasComponents = await waitForComponentLibrary(page)
    test.skip(!hasComponents, "Component library unavailable in this environment")

    // Add a component via drag-and-drop
    await dragComponentToCanvas(page, "postgresql", 400, 300)

    // Wait for the canvas node to appear
    await page.locator(".react-flow__node").first().waitFor({ state: "visible", timeout: 5_000 })

    // Export button should now be enabled
    const exportButton = page.getByTestId("export-button")
    await expect(exportButton).toBeEnabled()

    await page.screenshot({
      path: `${SCREENSHOT_DIR}/03-export-button-enabled.png`,
      fullPage: true,
    })

    // Click export and capture the download event
    const [download] = await Promise.all([
      page.waitForEvent("download"),
      exportButton.click(),
    ])

    // Verify the downloaded file has the correct naming pattern
    expect(download.suggestedFilename()).toMatch(/^archie-architecture-.*\.yaml$/)

    await page.screenshot({
      path: `${SCREENSHOT_DIR}/04-export-download-triggered.png`,
      fullPage: true,
    })
  })
})
