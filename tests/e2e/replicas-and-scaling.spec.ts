import { test, expect } from "@playwright/test"
import { readFileSync } from "node:fs"
import { waitForComponentLibrary, dragComponentToCanvas } from "./helpers/canvas-helpers"

const SCREENSHOT_DIR = "test-results/replicas-and-scaling"

test.describe("Replicas & Horizontal Scaling E2E (Epic 14)", () => {
  test("replica stepper raises count and scales the cost badge", async ({ page }) => {
    await page.goto("/")

    const hasComponents = await waitForComponentLibrary(page)
    test.skip(!hasComponents, "Skipped: Firestore has no seeded component data")

    // Place a known scalable component on the canvas.
    // D23: toolbox renders type-block cards (type-block-<typeId>), not the old component-card-* grid;
    // drag a known base component by id instead of reading one off a card.
    const block = page.locator('[data-testid^="type-block-"]').first()
    await expect(block).toBeVisible()
    const componentId = "node-express"

    const canvasPanel = page.locator('[data-testid="canvas-panel"]')
    const bounds = await canvasPanel.boundingBox()
    expect(bounds).not.toBeNull()
    await dragComponentToCanvas(page, componentId, bounds!.x + bounds!.width / 2, bounds!.y + bounds!.height / 2)

    const node = page.locator('[data-testid="archie-node"]').first()
    await expect(node).toBeVisible({ timeout: 5_000 })
    await page.screenshot({ path: `${SCREENSHOT_DIR}/01-node-placed.png`, fullPage: true })

    const scaling = node.locator('[data-testid="archie-node-scaling"]')
    const isScalable = await scaling.locator('[data-testid="replica-increment"]').count()
    test.skip(isScalable === 0, "Skipped: placed component category is not scalable")

    // Capture starting replica count + cost.
    const replicaCount = node.locator('[data-testid="replica-count"]')
    await expect(replicaCount).toHaveText("1×")

    const costBadge = node.locator('[data-testid="archie-node-cost"]')
    const hasCost = (await costBadge.count()) > 0
    const startCostText = hasCost ? await costBadge.textContent() : null

    // Raise replicas: 1 -> 3.
    await node.locator('[data-testid="replica-increment"]').click()
    await node.locator('[data-testid="replica-increment"]').click()
    await expect(replicaCount).toHaveText("3×")
    await page.screenshot({ path: `${SCREENSHOT_DIR}/02-replicas-3x.png`, fullPage: true })

    // Cost badge should scale up (×3) when economics data is present.
    if (hasCost && startCostText && /\$(\d+)\/mo/.test(startCostText)) {
      const start = Number(startCostText.match(/\$(\d+)\/mo/)![1])
      const scaledText = await costBadge.textContent()
      const scaled = Number(scaledText!.match(/\$(\d+)\/mo/)![1])
      expect(scaled).toBe(start * 3)
    }

    // Decrement back down and confirm the control responds.
    await node.locator('[data-testid="replica-decrement"]').click()
    await expect(replicaCount).toHaveText("2×")
    await page.screenshot({ path: `${SCREENSHOT_DIR}/03-replicas-2x.png`, fullPage: true })
  })

  test("export serializes the replica count to YAML", async ({ page }) => {
    await page.goto("/")

    const hasComponents = await waitForComponentLibrary(page)
    test.skip(!hasComponents, "Skipped: Firestore has no seeded component data")

    // D23: toolbox renders type-block cards (type-block-<typeId>), not the old component-card-* grid;
    // drag a known base component by id instead of reading one off a card.
    const block = page.locator('[data-testid^="type-block-"]').first()
    await expect(block).toBeVisible()
    const componentId = "node-express"
    const canvasPanel = page.locator('[data-testid="canvas-panel"]')
    const bounds = await canvasPanel.boundingBox()
    await dragComponentToCanvas(page, componentId, bounds!.x + bounds!.width / 2, bounds!.y + bounds!.height / 2)

    const node = page.locator('[data-testid="archie-node"]').first()
    await expect(node).toBeVisible({ timeout: 5_000 })

    const inc = node.locator('[data-testid="replica-increment"]')
    test.skip((await inc.count()) === 0, "Skipped: placed component category is not scalable")
    await inc.click()
    await inc.click()
    await expect(node.locator('[data-testid="replica-count"]')).toHaveText("3×")

    // Export and confirm the replica count is serialized into the YAML.
    const [download] = await Promise.all([
      page.waitForEvent("download"),
      page.getByTestId("export-button").click(),
    ])
    const filePath = await download.path()
    expect(filePath).not.toBeNull()
    const yaml = readFileSync(filePath!, "utf-8")
    expect(yaml).toContain("replicas: 3")
    await page.screenshot({ path: `${SCREENSHOT_DIR}/04-export-with-replicas.png`, fullPage: true })
  })
})
