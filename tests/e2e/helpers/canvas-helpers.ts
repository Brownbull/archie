import { type Page, expect } from "@playwright/test"

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
 * Place a component on the canvas via the Add to Canvas button.
 *
 * NOTE: Assumes sequential usage — asserts node count equals buttonIndex + 1.
 * Calling with buttonIndex=0 when nodes already exist will fail. Use in order: 0, 1, 2, ...
 *
 * @param page Playwright page fixture
 * @param buttonIndex 0-based index of the add-to-canvas button to click
 */
export async function addComponentToCanvas(
  page: Page,
  buttonIndex = 0,
): Promise<void> {
  const addBtn = page.locator('[data-testid^="add-to-canvas-"]').nth(buttonIndex)
  await expect(addBtn).toBeVisible()
  await addBtn.click()
  const expectedCount = buttonIndex + 1
  await expect(page.locator('[data-testid="archie-node"]')).toHaveCount(expectedCount, {
    timeout: 5_000,
  })
}

/**
 * Click a canvas node to select it and open the inspector.
 * @param page Playwright page fixture
 * @param nodeIndex 0-based index of the node to select (default 0)
 */
export async function selectNodeOnCanvas(
  page: Page,
  nodeIndex = 0,
): Promise<void> {
  const node = page.locator('[data-testid="archie-node"]').nth(nodeIndex)
  await expect(node).toBeVisible()
  await node.click()
  await expect(page.locator('[data-testid="inspector-panel"]')).toBeVisible({ timeout: 5_000 })
}

/**
 * Simulate HTML5 drag-and-drop from toolbox to canvas via synthetic DragEvents.
 * Playwright does not natively support dataTransfer, so events are dispatched
 * via page.evaluate.
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
