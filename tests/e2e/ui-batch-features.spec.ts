import { test, expect } from "@playwright/test"
import { waitForComponentLibrary } from "./helpers/canvas-helpers"

const SCREENSHOT_DIR = "test-results/ui-batch-features"

/**
 * F2 (Quest/Free mode toggle) + F3 (challenge clone vs play) end-to-end.
 * F1 (collapsible panels) and F4 (variable-width nodes) are covered by unit tests.
 */
test.describe("UI batch — mode toggle + challenge clone/play", () => {
  test("toggle switches modes; card clones to editor, play starts the challenge", async ({ page }) => {
    await page.goto("/")
    const hasComponents = await waitForComponentLibrary(page)
    test.skip(!hasComponents, "Skipped: no seeded data")
    await page.waitForTimeout(1000)

    // F2: toggle is always visible, Free Mode active by default
    await expect(page.getByTestId("mode-toggle")).toBeVisible()
    await expect(page.getByTestId("mode-toggle-free")).toHaveAttribute("aria-pressed", "true")
    await expect(page.getByTestId("mode-toggle-quest")).toHaveAttribute("aria-pressed", "false")
    await page.screenshot({ path: `${SCREENSHOT_DIR}/01-free-mode-default.png`, fullPage: true })

    // F2: clicking Quest Mode opens the challenge selector
    await page.getByTestId("mode-toggle-quest").click()
    await expect(page.getByTestId("challenge-selector")).toBeVisible({ timeout: 5_000 })
    await page.screenshot({ path: `${SCREENSHOT_DIR}/02-selector-open.png`, fullPage: true })

    // F3: clicking the CARD BODY clones the challenge into the editor (Create from Template)
    await page.getByTestId("challenge-clone-first-service").click()
    const editor = page.getByTestId("challenge-editor")
    await expect(editor).toBeVisible({ timeout: 5_000 })
    await expect(editor.getByText("Create from Template")).toBeVisible()
    await expect(page.getByTestId("editor-id")).toHaveValue("first-service-copy")
    await page.screenshot({ path: `${SCREENSHOT_DIR}/03-clone-as-template.png`, fullPage: true })

    // Cloning must NOT have started a challenge
    await expect(page.getByTestId("challenge-active-indicator")).not.toBeVisible()

    // Close the editor — the selector is still open behind it
    await page.keyboard.press("Escape")
    await expect(editor).not.toBeVisible()
    await expect(page.getByTestId("challenge-selector")).toBeVisible()

    // F3: the Play button STARTS the challenge (fresh canvas → no confirm needed)
    await page.getByTestId("challenge-play-first-service").click()
    await expect(page.getByTestId("challenge-hud")).toBeVisible({ timeout: 5_000 })
    // F2: toggle now reflects Quest Mode active
    await expect(page.getByTestId("mode-toggle-quest")).toHaveAttribute("aria-pressed", "true")
    await expect(page.getByTestId("mode-toggle-free")).toHaveAttribute("aria-pressed", "false")
    await page.screenshot({ path: `${SCREENSHOT_DIR}/04-quest-started.png`, fullPage: true })

    // F2: clicking Free Mode while in a quest asks for confirmation
    await page.getByTestId("mode-toggle-free").click()
    await expect(page.getByTestId("mode-toggle-dialog")).toBeVisible()
    await page.screenshot({ path: `${SCREENSHOT_DIR}/05-exit-confirm.png`, fullPage: true })

    // Confirming returns to Free Mode and tears down the quest HUD
    await page.getByTestId("mode-toggle-confirm").click()
    await expect(page.getByTestId("challenge-hud")).not.toBeVisible({ timeout: 5_000 })
    await expect(page.getByTestId("mode-toggle-free")).toHaveAttribute("aria-pressed", "true")
    await expect(page.getByTestId("mode-toggle-quest")).toHaveAttribute("aria-pressed", "false")
    await page.screenshot({ path: `${SCREENSHOT_DIR}/06-back-to-free.png`, fullPage: true })
  })

  test("exit confirmation can be cancelled (stays in quest)", async ({ page }) => {
    await page.goto("/")
    const hasComponents = await waitForComponentLibrary(page)
    test.skip(!hasComponents, "Skipped: no seeded data")
    await page.waitForTimeout(1000)

    // Start a quest via the toggle + play
    await page.getByTestId("mode-toggle-quest").click()
    await expect(page.getByTestId("challenge-selector")).toBeVisible({ timeout: 5_000 })
    await page.getByTestId("challenge-play-first-service").click()
    await expect(page.getByTestId("challenge-hud")).toBeVisible({ timeout: 5_000 })

    // Open the exit dialog, then Cancel — should remain in Quest Mode
    await page.getByTestId("mode-toggle-free").click()
    const dialog = page.getByTestId("mode-toggle-dialog")
    await expect(dialog).toBeVisible()
    await dialog.getByRole("button", { name: "Cancel" }).click()
    await expect(dialog).not.toBeVisible()
    await expect(page.getByTestId("challenge-hud")).toBeVisible()
    await expect(page.getByTestId("mode-toggle-quest")).toHaveAttribute("aria-pressed", "true")
  })
})
