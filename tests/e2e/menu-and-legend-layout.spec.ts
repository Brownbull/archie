import { test, expect } from "@playwright/test"
import { waitForComponentLibrary } from "./helpers/canvas-helpers"

const SCREENSHOT_DIR = "test-results/menu-and-legend-layout"

test.describe("Top-menu alignment + heatmap legend placement", () => {
  test("File menu: Import / Export / Report icons share the same left edge", async ({ page }) => {
    await page.goto("/")
    test.skip(!(await waitForComponentLibrary(page)), "no seeded data")
    await page.waitForTimeout(800)

    await page.getByTestId("menu-file").click()
    await expect(page.getByTestId("menu-file-content")).toBeVisible()
    await page.screenshot({ path: `${SCREENSHOT_DIR}/01-file-menu.png` })

    const iconX = async (testid: string) => {
      const box = await page.locator(`[data-testid="${testid}"] svg`).first().boundingBox()
      expect(box, `${testid} icon`).not.toBeNull()
      return box!.x
    }
    const importX = await iconX("menu-import")
    const exportX = await iconX("export-button")
    const reportX = await iconX("export-report-button")

    // Before the fix the ghost buttons were centered (~100px off). Aligned items differ by < 6px.
    expect(Math.abs(exportX - importX)).toBeLessThan(6)
    expect(Math.abs(reportX - importX)).toBeLessThan(6)
  })

  test("heatmap legend does not overlap the canvas zoom controls", async ({ page }) => {
    await page.goto("/")
    test.skip(!(await waitForComponentLibrary(page)), "no seeded data")
    await page.waitForTimeout(800)
    const skip = page.getByRole("button", { name: "Skip" })
    if (await skip.isVisible({ timeout: 2_000 }).catch(() => false)) await skip.click()

    await page.locator('[data-testid="add-type-cache"]').click()
    await expect(page.locator('[data-testid="archie-node"]')).toHaveCount(1, { timeout: 5_000 })

    const legend = page.getByTestId("canvas-legend")
    await expect(legend).toBeVisible()
    const controls = page.locator(".react-flow__controls")
    await expect(controls).toBeVisible()

    const lb = await legend.boundingBox()
    const cb = await controls.boundingBox()
    expect(lb).not.toBeNull()
    expect(cb).not.toBeNull()
    await page.screenshot({ path: `${SCREENSHOT_DIR}/02-legend-vs-controls.png`, fullPage: true })

    // No horizontal overlap: the legend starts to the right of the controls' right edge.
    expect(lb!.x).toBeGreaterThanOrEqual(cb!.x + cb!.width - 1)
  })
})
