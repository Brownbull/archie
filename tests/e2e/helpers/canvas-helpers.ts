import type { Page } from "@playwright/test"

/**
 * Wait for the component library to finish loading.
 * Returns true if components were loaded, false if empty state.
 */
export async function waitForComponentLibrary(page: Page): Promise<boolean> {
  await Promise.race([
    page.locator('[data-testid="component-tab"]').waitFor({ state: "visible", timeout: 15_000 }).catch(() => {}),
    page.locator('[data-testid="component-tab-empty"]').waitFor({ state: "visible", timeout: 15_000 }).catch(() => {}),
  ])
  return page.locator('[data-testid="component-tab"]').isVisible()
}

/**
 * Switch to Blueprints tab and wait for it to finish loading.
 * Returns true if blueprint cards appeared, false if empty state.
 */
export async function waitForBlueprints(page: Page): Promise<boolean> {
  await page.getByRole("tab", { name: "Blueprints" }).click()
  await Promise.race([
    page.locator('[data-testid="blueprint-tab"]').waitFor({ state: "visible", timeout: 15_000 }).catch(() => {}),
    page.locator('[data-testid="blueprint-tab-empty"]').waitFor({ state: "visible", timeout: 15_000 }).catch(() => {}),
  ])
  return page.locator('[data-testid="blueprint-card"]').first().isVisible()
}

/**
 * Simulate HTML5 drag-and-drop from toolbox to canvas.
 * Playwright doesn't natively support dataTransfer in drag events,
 * so we dispatch synthetic DragEvents via page.evaluate.
 */
export async function dragComponentToCanvas(
  page: Page,
  componentId: string,
  targetX: number,
  targetY: number,
): Promise<void> {
  await page.evaluate(
    ({ compId, x, y }) => {
      const canvasPanel = document.querySelector('[data-testid="canvas-panel"]')
      if (!canvasPanel) throw new Error("canvas-panel not found")

      const dragOverEvent = new DragEvent("dragover", {
        bubbles: true,
        cancelable: true,
      })
      Object.defineProperty(dragOverEvent, "dataTransfer", {
        value: { dropEffect: "", types: ["application/archie-component"] },
      })
      canvasPanel.dispatchEvent(dragOverEvent)

      const dropEvent = new DragEvent("drop", {
        bubbles: true,
        cancelable: true,
        clientX: x,
        clientY: y,
      })
      Object.defineProperty(dropEvent, "dataTransfer", {
        value: {
          getData: (type: string) =>
            type === "application/archie-component" ? compId : "",
          types: ["application/archie-component"],
        },
      })
      canvasPanel.dispatchEvent(dropEvent)
    },
    { compId: componentId, x: targetX, y: targetY },
  )
}
