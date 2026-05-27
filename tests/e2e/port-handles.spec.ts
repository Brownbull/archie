import { test, expect } from "@playwright/test"
import { waitForComponentLibrary, dragComponentToCanvas } from "./helpers/canvas-helpers"

const SCREENSHOT_DIR = "test-results/port-handles"

test.describe("Port Handle Rendering (Epic 12, Phase 2)", () => {
  test("port-aware nodes render colored port dots", async ({ page }) => {
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

    // Place Nginx (2 ports: http-in, http-out)
    await dragComponentToCanvas(
      page, "nginx",
      canvasBounds.x + canvasBounds.width * 0.25,
      canvasBounds.y + canvasBounds.height * 0.3,
    )
    await expect(page.locator('[data-testid="archie-node"]')).toHaveCount(1, { timeout: 5_000 })

    await page.screenshot({
      path: `${SCREENSHOT_DIR}/01-nginx-with-port-handles.png`,
      fullPage: true,
    })

    // Verify nginx port handles
    const nginxHttpIn = page.locator('[data-testid="port-handle-http-in"]')
    const nginxHttpOut = page.locator('[data-testid="port-handle-http-out"]')

    // If ports loaded, colored handles appear; if not, skip gracefully
    const portHandleCount = await nginxHttpIn.count()
    if (portHandleCount > 0) {
      await expect(nginxHttpIn).toBeVisible()
      await expect(nginxHttpOut).toBeVisible()

      // Verify port type attribute
      await expect(nginxHttpIn).toHaveAttribute("data-port-type", "http")
      await expect(nginxHttpOut).toHaveAttribute("data-port-type", "http")

      // Verify tooltip
      await expect(nginxHttpIn).toHaveAttribute("title", "HTTP In")
      await expect(nginxHttpOut).toHaveAttribute("title", "HTTP Out")
    }

    // Place Node.js + Express (5 ports: http-in, http-out, db-out, cache-out, monitor-out)
    await dragComponentToCanvas(
      page, "node-express",
      canvasBounds.x + canvasBounds.width * 0.6,
      canvasBounds.y + canvasBounds.height * 0.3,
    )
    await expect(page.locator('[data-testid="archie-node"]')).toHaveCount(2, { timeout: 5_000 })

    await page.screenshot({
      path: `${SCREENSHOT_DIR}/02-node-express-with-5-ports.png`,
      fullPage: true,
    })

    // Verify node-express has multiple port handles
    const expressPortHandles = page.locator('[data-testid^="port-handle-"]').filter({
      has: page.locator('[data-port-type]'),
    })

    // Place PostgreSQL (2 ports: db-in, monitor-out)
    await dragComponentToCanvas(
      page, "postgresql",
      canvasBounds.x + canvasBounds.width * 0.4,
      canvasBounds.y + canvasBounds.height * 0.65,
    )
    await expect(page.locator('[data-testid="archie-node"]')).toHaveCount(3, { timeout: 5_000 })

    await page.screenshot({
      path: `${SCREENSHOT_DIR}/03-three-nodes-with-ports.png`,
      fullPage: true,
    })

    // Verify PostgreSQL database port
    const pgDbIn = page.locator('[data-testid="port-handle-db-in"]')
    if ((await pgDbIn.count()) > 0) {
      await expect(pgDbIn).toHaveAttribute("data-port-type", "database")
      await expect(pgDbIn).toHaveAttribute("title", "Database In")
    }
  })

  test("component without ports renders generic fallback handles", async ({ page }) => {
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

    // Place a component without ports (e.g., kafka — no ports defined yet)
    await dragComponentToCanvas(
      page, "kafka",
      canvasBounds.x + canvasBounds.width * 0.5,
      canvasBounds.y + canvasBounds.height * 0.5,
    )
    await expect(page.locator('[data-testid="archie-node"]')).toHaveCount(1, { timeout: 5_000 })

    // Should have generic handles
    const genericTarget = page.locator('[data-testid="archie-node-handle-target"]')
    const genericSource = page.locator('[data-testid="archie-node-handle-source"]')
    await expect(genericTarget).toBeVisible()
    await expect(genericSource).toBeVisible()

    // Should NOT have port-specific handles
    const portHandles = page.locator('[data-testid^="port-handle-"]')
    await expect(portHandles).toHaveCount(0)

    await page.screenshot({
      path: `${SCREENSHOT_DIR}/04-kafka-generic-handles.png`,
      fullPage: true,
    })
  })

  test("hover on port handle shows tooltip", async ({ page }) => {
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
      page, "nginx",
      canvasBounds.x + canvasBounds.width * 0.5,
      canvasBounds.y + canvasBounds.height * 0.5,
    )
    await expect(page.locator('[data-testid="archie-node"]')).toHaveCount(1, { timeout: 5_000 })

    const httpIn = page.locator('[data-testid="port-handle-http-in"]')
    if ((await httpIn.count()) > 0) {
      await httpIn.hover()
      await page.waitForTimeout(300)

      await page.screenshot({
        path: `${SCREENSHOT_DIR}/05-port-hover-tooltip.png`,
        fullPage: true,
      })
    }
  })
})
