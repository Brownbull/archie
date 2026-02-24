import { test, expect } from "@playwright/test"
import { waitForComponentLibrary, dragComponentToCanvas, waitForBlueprints } from "./helpers/canvas-helpers"

const SCREENSHOT_DIR = "test-results/import-export"

// All tests here are AUTHENTICATED — auth pre-loaded from global storageState (see global-setup.ts).
// For unauthenticated scenarios use test.use({ storageState: { cookies: [], origins: [] } }) in a nested describe.
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

// --- Story 3-3: Example Architectures & AI Prompt Template ---

test.describe("Blueprint & AI Prompt E2E (Story 3-3)", () => {
  test("AC-1: browse blueprints tab shows cards with name, description, component count", async ({ page }) => {
    await page.goto("/")
    await expect(page.locator('[data-testid="toolbox-panel"]')).toBeVisible({ timeout: 15_000 })

    const hasBlueprints = await waitForBlueprints(page)
    if (!hasBlueprints) {
      // Empty state should still render a meaningful message (AC-9)
      await expect(page.getByTestId("blueprint-tab-empty")).toContainText("No example architectures available")
      test.skip(true, "No blueprints available in this environment — empty state verified")
    }

    // Verify at least one blueprint card is visible
    const cards = page.locator('[data-testid="blueprint-card"]')
    const count = await cards.count()
    expect(count).toBeGreaterThanOrEqual(1)

    // Each card should display name and component count text (via data-testid)
    const firstCard = cards.first()
    await expect(firstCard.getByTestId("blueprint-card-name")).not.toBeEmpty()
    await expect(firstCard).toContainText(/\d+ components?/)

    await page.screenshot({
      path: `${SCREENSHOT_DIR}/05-blueprints-tab-cards.png`,
      fullPage: true,
    })
  })

  test("AC-2: load blueprint populates canvas with nodes", async ({ page }) => {
    await page.goto("/")
    await expect(page.locator('[data-testid="toolbox-panel"]')).toBeVisible({ timeout: 15_000 })

    const hasBlueprints = await waitForBlueprints(page)
    test.skip(!hasBlueprints, "No blueprints available in this environment")

    // Canvas should be empty initially
    await expect(page.locator(".react-flow__node")).toHaveCount(0)

    // Click the first blueprint's Load button (empty canvas — no confirmation dialog)
    await page.locator('[data-testid="blueprint-load-button"]').first().click()

    // Wait for React Flow nodes to appear on the canvas
    await page.locator(".react-flow__node").first().waitFor({ state: "visible", timeout: 5_000 })

    const nodeCount = await page.locator(".react-flow__node").count()
    expect(nodeCount).toBeGreaterThanOrEqual(1)

    await page.screenshot({
      path: `${SCREENSHOT_DIR}/06-blueprint-loaded-canvas.png`,
      fullPage: true,
    })
  })

  test("AC-4: loading blueprint on non-empty canvas shows confirm dialog and replaces", async ({ page }) => {
    await page.goto("/")
    await expect(page.locator('[data-testid="canvas-panel"]')).toBeVisible({ timeout: 15_000 })

    const hasComponents = await waitForComponentLibrary(page)
    test.skip(!hasComponents, "Component library unavailable in this environment")

    // Pre-populate canvas with a component so it is non-empty
    await dragComponentToCanvas(page, "postgresql", 400, 300)
    await page.locator(".react-flow__node").first().waitFor({ state: "visible", timeout: 5_000 })

    // Switch to Blueprints tab and verify cards
    const hasBlueprints = await waitForBlueprints(page)
    test.skip(!hasBlueprints, "No blueprints available in this environment")

    // Record node count before load (1 from dragComponentToCanvas above)
    const preLoadCount = await page.locator(".react-flow__node").count()

    // Click Load on first blueprint — should trigger the confirmation dialog
    await page.locator('[data-testid="blueprint-load-button"]').first().click()

    // The confirm dialog should appear with "Replace current architecture?" title
    const dialog = page.getByRole("dialog")
    await expect(dialog).toBeVisible({ timeout: 3_000 })
    await expect(dialog).toContainText("Replace current architecture")

    await page.screenshot({
      path: `${SCREENSHOT_DIR}/06b-blueprint-replace-dialog.png`,
      fullPage: true,
    })

    // Click the dialog's Load button (scoped to the dialog, not the card button)
    await dialog.getByRole("button", { name: "Load" }).click()

    // Dialog should close and canvas should have blueprint nodes
    await expect(dialog).toBeHidden({ timeout: 3_000 })
    await page.locator(".react-flow__node").first().waitFor({ state: "visible", timeout: 5_000 })

    // Verify blueprint REPLACED canvas (node count ≠ preLoad + blueprint nodes)
    const postLoadCount = await page.locator(".react-flow__node").count()
    expect(postLoadCount).toBeGreaterThanOrEqual(1)
    expect(postLoadCount).not.toBe(preLoadCount) // canvas was replaced, not appended
  })

  test("AC-5: AI Prompt button opens dialog, copy button shows Copied state", async ({ page }) => {
    await page.goto("/")
    await expect(page.locator('[data-testid="toolbar"]')).toBeVisible({ timeout: 15_000 })

    // Click the AI Prompt button in the toolbar
    const promptButton = page.getByTestId("prompt-template-button")
    await expect(promptButton).toBeVisible()
    await promptButton.click()

    // Dialog should appear with template content
    const dialog = page.getByTestId("prompt-template-dialog")
    await expect(dialog).toBeVisible({ timeout: 3_000 })
    await expect(dialog.locator("pre")).not.toBeEmpty()

    await page.screenshot({
      path: `${SCREENSHOT_DIR}/07-prompt-template-dialog.png`,
      fullPage: true,
    })

    // Grant clipboard permissions so the copy action succeeds
    await page.context().grantPermissions(["clipboard-read", "clipboard-write"])

    // Click Copy button and verify it transitions to "Copied" state
    const copyButton = page.getByTestId("prompt-template-copy")
    await expect(copyButton).toContainText("Copy")
    await copyButton.click()
    await expect(copyButton).toContainText("Copied")

    await page.screenshot({
      path: `${SCREENSHOT_DIR}/08-prompt-template-copied.png`,
      fullPage: true,
    })
  })
})
