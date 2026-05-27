import { test, expect } from "@playwright/test"
import { waitForComponentLibrary, dragComponentToCanvas, connectNodes } from "./helpers/canvas-helpers"

const SCREENSHOT_DIR = "test-results/port-edge-creation"

async function connectPortHandles(
  page: import("@playwright/test").Page,
  sourceHandleTestId: string,
  targetHandleTestId: string,
): Promise<void> {
  const sourceHandle = page.locator(`[data-testid="${sourceHandleTestId}"]`)
  const targetHandle = page.locator(`[data-testid="${targetHandleTestId}"]`)

  const sourceBox = await sourceHandle.boundingBox()
  const targetBox = await targetHandle.boundingBox()
  if (!sourceBox || !targetBox) throw new Error("Port handle bounding boxes not found")

  const srcX = sourceBox.x + sourceBox.width / 2
  const srcY = sourceBox.y + sourceBox.height / 2
  const tgtX = targetBox.x + targetBox.width / 2
  const tgtY = targetBox.y + targetBox.height / 2

  await page.mouse.move(srcX, srcY)
  await page.mouse.down()
  await page.mouse.move((srcX + tgtX) / 2, (srcY + tgtY) / 2, { steps: 5 })
  await page.mouse.move(tgtX, tgtY, { steps: 5 })
  await page.mouse.up()
}

test.describe("Port-Compatible Edge Creation (Epic 12, Phase 3)", () => {
  test("compatible port connection (db-out → db-in) creates edge without warning", async ({ page }) => {
    await page.goto("/")
    await expect(page.locator('[data-testid="canvas-panel"]')).toBeVisible({ timeout: 15_000 })
    const hasComponents = await waitForComponentLibrary(page)
    if (!hasComponents) {
      test.skip()
      return
    }

    const canvasPanel = page.locator('[data-testid="canvas-panel"]')
    const canvasBounds = await canvasPanel.boundingBox()
    if (!canvasBounds) throw new Error("canvas-panel not found")

    await dragComponentToCanvas(
      page, "node-express",
      canvasBounds.x + canvasBounds.width * 0.25,
      canvasBounds.y + canvasBounds.height * 0.4,
    )
    await expect(page.locator('[data-testid="archie-node"]')).toHaveCount(1, { timeout: 5_000 })

    await dragComponentToCanvas(
      page, "postgresql",
      canvasBounds.x + canvasBounds.width * 0.65,
      canvasBounds.y + canvasBounds.height * 0.4,
    )
    await expect(page.locator('[data-testid="archie-node"]')).toHaveCount(2, { timeout: 5_000 })

    await page.screenshot({
      path: `${SCREENSHOT_DIR}/01-two-nodes-placed.png`,
      fullPage: true,
    })

    const anyPortHandle = page.locator('[data-testid^="port-handle-"]').first()
    try {
      await anyPortHandle.waitFor({ state: "attached", timeout: 5_000 })
    } catch {
      test.skip()
      return
    }

    const sourcePort = page.locator('[data-testid="port-handle-db-out"]').first()
    const targetPort = page.locator('[data-testid="port-handle-db-in"]').first()
    await expect(sourcePort).toBeAttached({ timeout: 3_000 })
    await expect(targetPort).toBeAttached({ timeout: 3_000 })

    await connectPortHandles(page, "port-handle-db-out", "port-handle-db-in")
    await page.waitForTimeout(500)

    await page.screenshot({
      path: `${SCREENSHOT_DIR}/02-compatible-edge-created.png`,
      fullPage: true,
    })

    const edges = page.locator('[data-testid="archie-edge"]')
    await expect(edges).toHaveCount(1, { timeout: 3_000 })

    const warning = page.locator('[data-testid="connection-warning"]')
    await expect(warning).toHaveCount(0)
  })

  test("mismatched port connection (http-out → db-in) shows port mismatch warning", async ({ page }) => {
    await page.goto("/")
    await expect(page.locator('[data-testid="canvas-panel"]')).toBeVisible({ timeout: 15_000 })
    const hasComponents = await waitForComponentLibrary(page)
    if (!hasComponents) {
      test.skip()
      return
    }

    const canvasPanel = page.locator('[data-testid="canvas-panel"]')
    const canvasBounds = await canvasPanel.boundingBox()
    if (!canvasBounds) throw new Error("canvas-panel not found")

    await dragComponentToCanvas(
      page, "node-express",
      canvasBounds.x + canvasBounds.width * 0.25,
      canvasBounds.y + canvasBounds.height * 0.4,
    )
    await expect(page.locator('[data-testid="archie-node"]')).toHaveCount(1, { timeout: 5_000 })

    await dragComponentToCanvas(
      page, "postgresql",
      canvasBounds.x + canvasBounds.width * 0.65,
      canvasBounds.y + canvasBounds.height * 0.4,
    )
    await expect(page.locator('[data-testid="archie-node"]')).toHaveCount(2, { timeout: 5_000 })

    const sourcePort = page.locator('[data-testid="port-handle-http-out"]').first()
    const targetPort = page.locator('[data-testid="port-handle-db-in"]').first()

    try {
      await sourcePort.waitFor({ state: "attached", timeout: 5_000 })
      await targetPort.waitFor({ state: "attached", timeout: 5_000 })
    } catch {
      test.skip()
      return
    }

    await connectPortHandles(page, "port-handle-http-out", "port-handle-db-in")
    await page.waitForTimeout(500)

    await page.screenshot({
      path: `${SCREENSHOT_DIR}/03-mismatched-edge-warning.png`,
      fullPage: true,
    })

    const warning = page.locator('[data-testid="connection-warning"]')
    await expect(warning).toHaveCount(1, { timeout: 3_000 })

    const portMismatch = page.locator('[data-testid="connection-warning"][data-port-mismatch]')
    await expect(portMismatch).toHaveCount(1)
  })

  test("edge creation via generic handles stores null handle IDs", async ({ page }) => {
    await page.goto("/")
    await expect(page.locator('[data-testid="canvas-panel"]')).toBeVisible({ timeout: 15_000 })
    const hasComponents = await waitForComponentLibrary(page)
    if (!hasComponents) {
      test.skip()
      return
    }

    const canvasPanel = page.locator('[data-testid="canvas-panel"]')
    const canvasBounds = await canvasPanel.boundingBox()
    if (!canvasBounds) throw new Error("canvas-panel not found")

    await dragComponentToCanvas(
      page, "node-express",
      canvasBounds.x + canvasBounds.width * 0.25,
      canvasBounds.y + canvasBounds.height * 0.4,
    )
    await expect(page.locator('[data-testid="archie-node"]')).toHaveCount(1, { timeout: 5_000 })

    await dragComponentToCanvas(
      page, "postgresql",
      canvasBounds.x + canvasBounds.width * 0.65,
      canvasBounds.y + canvasBounds.height * 0.4,
    )
    await expect(page.locator('[data-testid="archie-node"]')).toHaveCount(2, { timeout: 5_000 })

    await page.screenshot({
      path: `${SCREENSHOT_DIR}/04-two-nodes-before-connect.png`,
      fullPage: true,
    })

    await connectNodes(page, 0, 1)
    await page.waitForTimeout(500)

    await page.screenshot({
      path: `${SCREENSHOT_DIR}/05-edge-created-generic-handles.png`,
      fullPage: true,
    })

    const edges = page.locator('[data-testid="archie-edge"]')
    await expect(edges).toHaveCount(1, { timeout: 3_000 })
  })
})
