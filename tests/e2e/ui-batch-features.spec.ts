import { test, expect } from "@playwright/test"
import { waitForComponentLibrary } from "./helpers/canvas-helpers"

const SCREENSHOT_DIR = "test-results/ui-batch-features"

/**
 * Quest/Free mode toggle + challenge clone/play.
 * - The toggle's Quest Mode opens the Quest Log (journey tree); accepting a quest there starts it
 *   (enters quest mode), and closing the log without accepting stays in Free Mode.
 * - The "build challenges" surface (clone-to-editor + play) lives under Build → Challenges.
 * Collapsible panels (F1) and variable-width nodes (F4) are covered by unit tests.
 */
test.describe("UI — mode toggle (quest log) + challenge clone/play", () => {
  test("Quest Mode opens the quest log; accepting a quest enters quest mode; Free exits", async ({ page }) => {
    await page.goto("/")
    const hasComponents = await waitForComponentLibrary(page)
    test.skip(!hasComponents, "Skipped: no seeded data")
    await page.waitForTimeout(1000)

    // Toggle is always visible, Free Mode active by default.
    await expect(page.getByTestId("mode-toggle")).toBeVisible()
    await expect(page.getByTestId("mode-toggle-free")).toHaveAttribute("aria-pressed", "true")
    await expect(page.getByTestId("mode-toggle-quest")).toHaveAttribute("aria-pressed", "false")
    await page.screenshot({ path: `${SCREENSHOT_DIR}/01-free-mode-default.png`, fullPage: true })

    // Clicking Quest Mode opens the Quest Log (journey tree) — NOT the build/challenges grid.
    await page.getByTestId("mode-toggle-quest").click()
    await expect(page.getByTestId("quest-log")).toBeVisible({ timeout: 5_000 })
    await page.screenshot({ path: `${SCREENSHOT_DIR}/02-quest-log-open.png`, fullPage: true })

    // Select first-service in the tree, then Accept the quest → quest mode.
    await page.getByTestId("tree-node-first-service").click()
    await expect(page.getByTestId("tree-start-challenge")).toBeVisible()
    await page.getByTestId("tree-start-challenge").click()

    await expect(page.getByTestId("challenge-hud")).toBeVisible({ timeout: 5_000 })
    await expect(page.getByTestId("mode-toggle-quest")).toHaveAttribute("aria-pressed", "true")
    await expect(page.getByTestId("mode-toggle-free")).toHaveAttribute("aria-pressed", "false")
    await page.screenshot({ path: `${SCREENSHOT_DIR}/03-quest-started.png`, fullPage: true })

    // Free Mode while in a quest asks to confirm, then exits.
    await page.getByTestId("mode-toggle-free").click()
    await expect(page.getByTestId("mode-toggle-dialog")).toBeVisible()
    await page.getByTestId("mode-toggle-confirm").click()
    await expect(page.getByTestId("challenge-hud")).not.toBeVisible({ timeout: 5_000 })
    await expect(page.getByTestId("mode-toggle-free")).toHaveAttribute("aria-pressed", "true")
    await expect(page.getByTestId("mode-toggle-quest")).toHaveAttribute("aria-pressed", "false")
    await page.screenshot({ path: `${SCREENSHOT_DIR}/04-back-to-free.png`, fullPage: true })
  })

  test("cancelling quest selection keeps Free Mode (toggle does not activate)", async ({ page }) => {
    await page.goto("/")
    const hasComponents = await waitForComponentLibrary(page)
    test.skip(!hasComponents, "Skipped: no seeded data")
    await page.waitForTimeout(1000)

    await page.getByTestId("mode-toggle-quest").click()
    const questLog = page.getByTestId("quest-log")
    await expect(questLog).toBeVisible({ timeout: 5_000 })

    // Close the quest log without accepting anything → still Free Mode.
    await page.keyboard.press("Escape")
    await expect(questLog).not.toBeVisible()
    await expect(page.getByTestId("mode-toggle-free")).toHaveAttribute("aria-pressed", "true")
    await expect(page.getByTestId("mode-toggle-quest")).toHaveAttribute("aria-pressed", "false")
  })

  test("Build → Challenges clones a challenge to the editor; Play starts it", async ({ page }) => {
    await page.goto("/")
    const hasComponents = await waitForComponentLibrary(page)
    test.skip(!hasComponents, "Skipped: no seeded data")
    await page.waitForTimeout(1000)

    // The build/manage-challenges grid lives under Build → Challenges.
    await page.getByTestId("menu-build").click()
    await page.getByTestId("menu-challenges").click()
    await expect(page.getByTestId("challenge-selector")).toBeVisible({ timeout: 5_000 })

    // Card body clones the challenge into the editor (Create from Template).
    await page.getByTestId("challenge-clone-first-service").click()
    const editor = page.getByTestId("challenge-editor")
    await expect(editor).toBeVisible({ timeout: 5_000 })
    await expect(editor.getByText("Create from Template")).toBeVisible()
    await expect(page.getByTestId("editor-id")).toHaveValue("first-service-copy")
    await expect(page.getByTestId("challenge-active-indicator")).not.toBeVisible()

    // Close the editor — the selector is still open behind it.
    await page.keyboard.press("Escape")
    await expect(editor).not.toBeVisible()
    await expect(page.getByTestId("challenge-selector")).toBeVisible()

    // The Play button starts the challenge → quest mode.
    await page.getByTestId("challenge-play-first-service").click()
    await expect(page.getByTestId("challenge-hud")).toBeVisible({ timeout: 5_000 })
    await expect(page.getByTestId("mode-toggle-quest")).toHaveAttribute("aria-pressed", "true")
  })
})
