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
/**
 * Place two components on the canvas using drag-and-drop.
 * Drops the first card at 30% canvas width and the second at 70%.
 * Returns the number of nodes placed (0 if fewer than 2 component cards available).
 */
export async function placeTwoComponents(page: Page): Promise<number> {
  const canvasPanel = page.locator('[data-testid="canvas-panel"]')
  const canvasBounds = await canvasPanel.boundingBox()
  if (!canvasBounds) throw new Error("canvas-panel not found")

  const cards = page.locator('[data-testid^="component-card-"]')
  if ((await cards.count()) < 2) return 0

  const firstTestId = await cards.nth(0).getAttribute("data-testid")
  await dragComponentToCanvas(
    page,
    firstTestId!.replace("component-card-", ""),
    canvasBounds.x + canvasBounds.width * 0.3,
    canvasBounds.y + canvasBounds.height / 2,
  )
  await expect(page.locator('[data-testid="archie-node"]')).toHaveCount(1, { timeout: 5_000 })

  const secondTestId = await cards.nth(1).getAttribute("data-testid")
  await dragComponentToCanvas(
    page,
    secondTestId!.replace("component-card-", ""),
    canvasBounds.x + canvasBounds.width * 0.7,
    canvasBounds.y + canvasBounds.height / 2,
  )
  await expect(page.locator('[data-testid="archie-node"]')).toHaveCount(2, { timeout: 5_000 })
  return 2
}

/**
 * Connect two nodes by dragging from source handle to target handle.
 * React Flow uses mouse events (not HTML5 drag) for port connections.
 * Hovers the source node first to ensure handles are interactable.
 */
export async function connectNodes(
  page: Page,
  sourceIndex: number,
  targetIndex: number,
): Promise<void> {
  await page.locator('[data-testid="archie-node"]').nth(sourceIndex).hover()

  const sourceHandle = page.locator('[data-testid="archie-node-handle-source"]').nth(sourceIndex)
  const targetHandle = page.locator('[data-testid="archie-node-handle-target"]').nth(targetIndex)

  const sourceBox = await sourceHandle.boundingBox()
  const targetBox = await targetHandle.boundingBox()
  if (!sourceBox || !targetBox) throw new Error("Handle bounding boxes not found")

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

/**
 * Trigger recalculation by changing a node's config variant in the inspector.
 * This populates computedMetrics and edgeHeatmapStatus on connections.
 */
export async function triggerRecalcViaConfigChange(
  page: Page,
  nodeIndex = 0,
): Promise<void> {
  await page.locator('[data-testid="archie-node"]').nth(nodeIndex).click()
  await expect(page.locator('[data-testid="inspector-panel"]')).toBeVisible({ timeout: 5_000 })

  const configTrigger = page.locator('[data-testid="config-selector"] button[role="combobox"]')
  await expect(configTrigger).toBeVisible({ timeout: 3_000 })
  await configTrigger.click()

  await page.locator('[role="listbox"]').waitFor({ state: "visible", timeout: 3_000 })

  const unchecked = page.locator('[role="option"][data-state="unchecked"]')
  if ((await unchecked.count()) > 0) {
    await unchecked.first().click()
  } else {
    await page.keyboard.press("Escape")
  }
  await page.waitForTimeout(500)
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
