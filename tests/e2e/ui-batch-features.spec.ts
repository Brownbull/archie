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

    // Select first-service in the tree, then start the quest → quest mode. The button reads "Accept
    // Quest" for a fresh node and "Replay Quest" once completed (the seeded test account may already
    // have first-service done); both call onStart and enter quest mode. Force the click — the tree
    // re-layouts on node selection, so the button can still be settling when Playwright reaches it.
    await page.getByTestId("tree-node-first-service").click()
    const startBtn = page.getByTestId("tree-start-challenge")
    await expect(startBtn).toBeVisible()
    // The button sits at the bottom of the node detail, below the quest-log fold — scroll it into the
    // scroll container's view before clicking (a bare/force click on an off-screen element fails).
    await startBtn.scrollIntoViewIfNeeded()
    await startBtn.click()

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

  test("Build → Challenges: creator authors hints + typed traffic sources (ISAPivot)", async ({ page }) => {
    await page.goto("/")
    const hasComponents = await waitForComponentLibrary(page)
    test.skip(!hasComponents, "Skipped: no seeded data")
    await page.waitForTimeout(1000)

    await page.getByTestId("menu-build").click()
    await page.getByTestId("menu-challenges").click()
    await expect(page.getByTestId("challenge-selector")).toBeVisible({ timeout: 5_000 })

    await page.getByTestId("forge-create").click()
    const editor = page.getByTestId("challenge-editor")
    await expect(editor).toBeVisible({ timeout: 5_000 })

    await page.getByTestId("editor-id").fill("my-ramp")
    await page.getByTestId("editor-title").fill("My Ramp")
    await page.getByTestId("editor-brief").fill("Handle a bursty multi-source load.")

    // NEW (D65): hints authoring — one field by default; fill it + add the "Answer" hint.
    await page.getByTestId("editor-hint-0").fill("Put a cache in front of the DB.")
    await page.getByTestId("editor-hint-add").click()
    await page.getByTestId("editor-hint-1").fill("Cache + read replicas + a CDN clears it.")

    // NEW (D63/D64): typed traffic source authoring — add one source + set its kind to Search.
    await page.getByTestId("editor-source-add").click()
    await expect(page.getByTestId("editor-source-0")).toBeVisible()
    await page.getByTestId("editor-source-kind-0").click()
    await page.getByRole("option", { name: /Search/ }).click()

    // Save is enabled (required fields + 1–5 non-empty hints) and persists the new challenge.
    const save = page.getByTestId("editor-save")
    await expect(save).toBeEnabled()
    await save.click()
    await expect(editor).not.toBeVisible({ timeout: 5_000 })
  })
})
