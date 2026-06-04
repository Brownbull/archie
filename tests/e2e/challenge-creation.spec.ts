import { test, expect, type Page } from "@playwright/test"
import { waitForComponentLibrary } from "./helpers/canvas-helpers"

const SCREENSHOT_DIR = "test-results/challenge-creation"

async function openChallenges(page: Page) {
  await page.getByTestId("menu-build").click()
  await page.waitForTimeout(300)
  await page.getByTestId("menu-challenges").click()
  await expect(page.getByTestId("challenge-selector")).toBeVisible({ timeout: 5000 })
}

async function fillEditor(page: Page, v: { id: string; title: string; brief: string; hint: string }) {
  await page.getByTestId("forge-create").click()
  await expect(page.getByTestId("challenge-editor")).toBeVisible({ timeout: 5000 })
  await page.getByTestId("editor-id").fill(v.id)
  await page.getByTestId("editor-title").fill(v.title)
  await page.getByTestId("editor-brief").fill(v.brief)
  await page.getByTestId("editor-hint-0").fill(v.hint) // draft starts with one empty hint — must be non-empty to validate
}

/**
 * Challenge creation E2E (Forge): authors a user challenge, verifies it saves, and round-trips it
 * through the YAML exporter → file importer. Also asserts the XP field is gone (user challenges grant
 * no progression).
 */
test.describe("Challenge creation + export/import", () => {
  test("authors and saves a user challenge (no XP field)", async ({ page }) => {
    test.setTimeout(90_000)
    await page.goto("/")
    const ok = await waitForComponentLibrary(page)
    test.skip(!ok, "Skipped: no seeded data")
    await page.waitForTimeout(2000)
    await openChallenges(page)

    await fillEditor(page, {
      id: "e2e-create",
      title: "E2E Created Quest",
      brief: "A quest authored by the creation E2E test — one compute node under steady load.",
      hint: "Place a single compute node sized for the peak; cheapest variant that keeps up.",
    })

    // Item #1: the XP / experience-reward field is removed from the creator.
    await expect(page.getByTestId("editor-xp")).toHaveCount(0)

    await page.getByTestId("editor-save").click()
    await expect(page.getByTestId("challenge-editor")).toBeHidden({ timeout: 5000 })

    // The saved user challenge shows up in the selector's Forge list.
    await expect(page.getByText("E2E Created Quest").first()).toBeVisible({ timeout: 5000 })
    await page.screenshot({ path: `${SCREENSHOT_DIR}/01-created.png`, fullPage: true })
  })

  test("exports a challenge to YAML and imports it back (round-trip)", async ({ page }) => {
    test.setTimeout(90_000)
    await page.goto("/")
    const ok = await waitForComponentLibrary(page)
    test.skip(!ok, "Skipped: no seeded data")
    await page.waitForTimeout(2000)
    await openChallenges(page)

    await fillEditor(page, {
      id: "e2e-roundtrip",
      title: "E2E Round Trip",
      brief: "Exported to YAML then re-imported by the E2E test to prove the round-trip.",
      hint: "Front a cache so reads survive the burst without hammering the database.",
    })

    // Export YAML — capture the actual download. Do NOT save first, so the import can't collide.
    const downloadPromise = page.waitForEvent("download")
    await page.getByTestId("editor-export").click()
    const download = await downloadPromise
    expect(download.suggestedFilename()).toContain("e2e-roundtrip")
    // Save with a .yaml name — download.path() is an extensionless temp file the importer rejects.
    const savePath = test.info().outputPath("e2e-roundtrip.yaml")
    await download.saveAs(savePath)

    // Close the editor (unsaved), then import the exported file via the Forge's hidden file input.
    await page.keyboard.press("Escape")
    await expect(page.getByTestId("challenge-editor")).toBeHidden({ timeout: 5000 })
    // Scope to the Forge's import input — the architecture importer also has a .yaml file input.
    await page.locator('[data-testid="challenge-selector"] input[type="file"]').setInputFiles(savePath)

    // Round-trip succeeds: the imported challenge appears in the Forge list.
    await expect(page.getByText("E2E Round Trip").first()).toBeVisible({ timeout: 5000 })
    await page.screenshot({ path: `${SCREENSHOT_DIR}/02-imported.png`, fullPage: true })
  })
})
