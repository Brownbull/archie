import { test, expect } from "@playwright/test"

const SCREENSHOT_DIR = "test-results/component-swapping"
const TRANSITION_WAIT = 300

async function waitForComponentLibrary(page: import("@playwright/test").Page) {
  await Promise.race([
    page.locator('[data-testid="component-tab"]').waitFor({ state: "visible", timeout: 15_000 }),
    page.locator('[data-testid="component-tab-empty"]').waitFor({ state: "visible", timeout: 15_000 }),
  ])
  return page.locator('[data-testid="component-tab"]').isVisible()
}

async function addComponentToCanvas(
  page: import("@playwright/test").Page,
  buttonIndex = 0,
) {
  const nodesBefore = await page.locator('[data-testid="archie-node"]').count()
  const addBtn = page.locator('[data-testid^="add-to-canvas-"]').nth(buttonIndex)
  await expect(addBtn).toBeVisible()
  await addBtn.click()
  await expect(page.locator('[data-testid="archie-node"]')).toHaveCount(nodesBefore + 1, {
    timeout: 5_000,
  })
}

async function selectNodeOnCanvas(
  page: import("@playwright/test").Page,
  nodeIndex = 0,
) {
  const node = page.locator('[data-testid="archie-node"]').nth(nodeIndex)
  await expect(node).toBeVisible()
  await node.click()
  await expect(page.locator('[data-testid="inspector-panel"]')).toBeVisible({ timeout: 5_000 })
}

/**
 * Find the index of an Add to Canvas button whose component belongs to a
 * multi-member category. Returns -1 if none found. Leaves canvas clean.
 */
async function findSwappableComponentIndex(
  page: import("@playwright/test").Page,
): Promise<number> {
  const addBtns = page.locator('[data-testid^="add-to-canvas-"]')
  const btnCount = await addBtns.count()

  for (let i = 0; i < btnCount; i++) {
    await addBtns.nth(i).click()
    await expect(page.locator('[data-testid="archie-node"]')).toHaveCount(1, { timeout: 5_000 })

    let isSwappable = false
    try {
      await selectNodeOnCanvas(page, 0)
      isSwappable = await page.locator('[data-testid="component-swapper"]').isVisible()
    } finally {
      // Ensure cleanup even on assertion failure
      const remaining = await page.locator('[data-testid="archie-node"]').count()
      if (remaining > 0) {
        await page.locator('[data-testid="archie-node"]').first().click()
        await page.keyboard.press("Delete")
        await expect(page.locator('[data-testid="archie-node"]')).toHaveCount(0, { timeout: 5_000 })
      }
    }

    if (isSwappable) return i
  }
  return -1
}

/**
 * Perform a component swap via the ComponentSwapper dropdown.
 * Opens dropdown, selects the first option that doesn't match currentName, closes.
 * Returns the name of the component that was selected.
 */
async function performSwap(
  page: import("@playwright/test").Page,
  currentName: string,
): Promise<string> {
  const swapper = page.locator('[data-testid="component-swapper"]')
  await expect(swapper).toBeVisible()
  await swapper.locator("button").first().click()

  const listbox = page.locator("[role=listbox]")
  await expect(listbox).toBeVisible({ timeout: 3_000 })

  const options = listbox.locator("[role=option]")
  const count = await options.count()
  let selectedName = ""

  for (let i = 0; i < count; i++) {
    const text = await options.nth(i).textContent()
    if (text?.trim() !== currentName.trim()) {
      selectedName = text?.trim() ?? ""
      await options.nth(i).click()
      break
    }
  }

  await expect(listbox).not.toBeVisible({ timeout: 3_000 })
  return selectedName
}

async function connectNodes(
  page: import("@playwright/test").Page,
  sourceNodeIndex: number,
  targetNodeIndex: number,
) {
  const sourceHandle = page.locator('[data-testid="archie-node-handle-source"]').nth(sourceNodeIndex)
  const targetHandle = page.locator('[data-testid="archie-node-handle-target"]').nth(targetNodeIndex)

  await page.locator('[data-testid="archie-node"]').nth(sourceNodeIndex).hover()

  const sourceBox = await sourceHandle.boundingBox()
  const targetBox = await targetHandle.boundingBox()
  if (!sourceBox) throw new Error(`Source handle ${sourceNodeIndex} bounding box not found`)
  if (!targetBox) throw new Error(`Target handle ${targetNodeIndex} bounding box not found`)

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

test.describe("Component Swapping E2E (Story 1-6)", () => {
  test("AC-1: swapper dropdown shows alternatives in same category", async ({ page }) => {
    await page.goto("/")
    const hasComponents = await waitForComponentLibrary(page)
    test.skip(!hasComponents, "Skipped: no seeded component data")

    const idx = await findSwappableComponentIndex(page)
    test.skip(idx === -1, "Skipped: no swappable components found")

    await addComponentToCanvas(page, idx)
    await selectNodeOnCanvas(page, 0)

    const swapper = page.locator('[data-testid="component-swapper"]')
    await expect(swapper).toBeVisible()
    await expect(swapper.locator("label")).toContainText("Component Type")

    const trigger = swapper.locator("button").first()
    const triggerText = await trigger.textContent()
    expect(triggerText!.trim().length).toBeGreaterThan(0)

    await trigger.click()
    const listbox = page.locator("[role=listbox]")
    await expect(listbox).toBeVisible({ timeout: 3_000 })
    expect(await listbox.locator("[role=option]").count()).toBeGreaterThanOrEqual(2)

    await page.screenshot({ path: `${SCREENSHOT_DIR}/01-swapper-dropdown-open.png`, fullPage: true })
    await page.keyboard.press("Escape")
  })

  test("AC-1: single-member category hides swapper", async ({ page }) => {
    await page.goto("/")
    const hasComponents = await waitForComponentLibrary(page)
    test.skip(!hasComponents, "Skipped: no seeded component data")

    const addBtns = page.locator('[data-testid^="add-to-canvas-"]')
    const btnCount = await addBtns.count()
    let found = false

    for (let i = 0; i < btnCount; i++) {
      await addBtns.nth(i).click()
      await expect(page.locator('[data-testid="archie-node"]')).toHaveCount(1, { timeout: 5_000 })
      await selectNodeOnCanvas(page, 0)

      if (!(await page.locator('[data-testid="component-swapper"]').isVisible())) {
        found = true
        await page.screenshot({ path: `${SCREENSHOT_DIR}/02-swapper-hidden-single-member.png`, fullPage: true })
        break
      }

      await page.locator('[data-testid="archie-node"]').first().click()
      await page.keyboard.press("Delete")
      await expect(page.locator('[data-testid="archie-node"]')).toHaveCount(0, { timeout: 5_000 })
    }

    test.skip(!found, "Skipped: all components in multi-member categories")
  })

  test("AC-2: swap updates node and inspector while preserving connections", async ({ page }) => {
    await page.goto("/")
    const hasComponents = await waitForComponentLibrary(page)
    test.skip(!hasComponents, "Skipped: no seeded component data")

    const idx = await findSwappableComponentIndex(page)
    test.skip(idx === -1, "Skipped: no swappable components found")

    // Place swappable component (node 0) and a second component (node 1)
    await addComponentToCanvas(page, idx)
    const secondIdx = idx === 0 ? 1 : 0
    const addBtns = page.locator('[data-testid^="add-to-canvas-"]')
    test.skip((await addBtns.count()) < 2, "Skipped: need 2+ components")
    await addBtns.nth(secondIdx).click()
    await expect(page.locator('[data-testid="archie-node"]')).toHaveCount(2, { timeout: 5_000 })

    // Wire a connection
    await connectNodes(page, 0, 1)
    const edges = page.locator(".react-flow__edge")
    await expect(edges).toHaveCount(1, { timeout: 5_000 })
    await page.screenshot({ path: `${SCREENSHOT_DIR}/03-before-swap-with-connection.png`, fullPage: true })

    // Select node 0 and capture original state
    await selectNodeOnCanvas(page, 0)
    const inspector = page.locator('[data-testid="inspector-panel"]')
    const originalName = (await inspector.locator("h2").textContent())!.trim()
    const originalNodeText = await page.locator('[data-testid="archie-node"]').nth(0).textContent()

    // Perform swap
    const swapTargetName = await performSwap(page, originalName)
    expect(swapTargetName.length).toBeGreaterThan(0)

    // Inspector shows new name
    expect((await inspector.locator("h2").textContent())?.trim()).toBe(swapTargetName)

    // Canvas node label updated
    const updatedNodeText = await page.locator('[data-testid="archie-node"]').nth(0).textContent()
    expect(updatedNodeText).toContain(swapTargetName)
    expect(updatedNodeText).not.toBe(originalNodeText)

    // Connection preserved
    await expect(edges).toHaveCount(1, { timeout: 3_000 })
    await page.screenshot({ path: `${SCREENSHOT_DIR}/04-after-swap-connection-preserved.png`, fullPage: true })
  })

  test("AC-2+3: swap resets config variant and metrics update", async ({ page }) => {
    await page.goto("/")
    const hasComponents = await waitForComponentLibrary(page)
    test.skip(!hasComponents, "Skipped: no seeded component data")

    const idx = await findSwappableComponentIndex(page)
    test.skip(idx === -1, "Skipped: no swappable components found")

    await addComponentToCanvas(page, idx)
    await selectNodeOnCanvas(page, 0)

    // Capture original config variant list
    const configTrigger = page.locator('[data-testid="config-selector"] button').first()
    await expect(configTrigger).toBeVisible()
    await configTrigger.click()
    const configListbox = page.locator("[role=listbox]")
    await expect(configListbox).toBeVisible({ timeout: 3_000 })
    const origConfigNames: string[] = []
    const origOptions = configListbox.locator("[role=option]")
    for (let i = 0; i < await origOptions.count(); i++) {
      origConfigNames.push((await origOptions.nth(i).textContent())?.trim() ?? "")
    }
    await page.keyboard.press("Escape")

    // Capture original metric fills
    const fillLocator = page.locator('[data-testid="metric-bar-fill"]')
    const originalFills: string[] = []
    for (let i = 0; i < await fillLocator.count(); i++) {
      originalFills.push((await fillLocator.nth(i).getAttribute("style")) ?? "")
    }

    await page.screenshot({ path: `${SCREENSHOT_DIR}/05-before-swap-config-metrics.png`, fullPage: true })

    // Perform swap
    const swapperValue = (await page.locator('[data-testid="component-swapper"] button').first().textContent())!.trim()
    await performSwap(page, swapperValue)

    // Config variant should have non-empty value
    const newVariant = await configTrigger.textContent()
    expect(newVariant!.trim().length).toBeGreaterThan(0)

    // Config variants list should differ after swap
    await configTrigger.click()
    const newConfigListbox = page.locator("[role=listbox]")
    await expect(newConfigListbox).toBeVisible({ timeout: 3_000 })
    const newConfigNames: string[] = []
    const newOptions = newConfigListbox.locator("[role=option]")
    for (let i = 0; i < await newOptions.count(); i++) {
      newConfigNames.push((await newOptions.nth(i).textContent())?.trim() ?? "")
    }
    expect(newConfigNames).not.toEqual(origConfigNames)
    await page.keyboard.press("Escape")

    // Metrics should have changed
    const newFills: string[] = []
    for (let i = 0; i < await fillLocator.count(); i++) {
      newFills.push((await fillLocator.nth(i).getAttribute("style")) ?? "")
    }
    expect(newFills).not.toEqual(originalFills)

    await page.screenshot({ path: `${SCREENSHOT_DIR}/06-after-swap-config-metrics.png`, fullPage: true })
  })

  test("AC-4: node position preserved after swap", async ({ page }) => {
    await page.goto("/")
    const hasComponents = await waitForComponentLibrary(page)
    test.skip(!hasComponents, "Skipped: no seeded component data")

    const idx = await findSwappableComponentIndex(page)
    test.skip(idx === -1, "Skipped: no swappable components found")

    await addComponentToCanvas(page, idx)
    await selectNodeOnCanvas(page, 0)

    const rfNode = page.locator(".react-flow__node").first()
    const transformBefore = await rfNode.evaluate((el) => getComputedStyle(el).transform)

    const currentValue = (await page.locator('[data-testid="component-swapper"] button').first().textContent())!.trim()
    await performSwap(page, currentValue)
    await page.waitForTimeout(TRANSITION_WAIT)

    const transformAfter = await rfNode.evaluate((el) => getComputedStyle(el).transform)
    expect(transformAfter).toBe(transformBefore)

    await page.screenshot({ path: `${SCREENSHOT_DIR}/07-position-preserved-after-swap.png`, fullPage: true })
  })

  test("round-trip swap restores original component", async ({ page }) => {
    await page.goto("/")
    const hasComponents = await waitForComponentLibrary(page)
    test.skip(!hasComponents, "Skipped: no seeded component data")

    const idx = await findSwappableComponentIndex(page)
    test.skip(idx === -1, "Skipped: no swappable components found")

    await addComponentToCanvas(page, idx)
    await selectNodeOnCanvas(page, 0)

    const inspector = page.locator('[data-testid="inspector-panel"]')
    const originalName = (await inspector.locator("h2").textContent())!.trim()

    // Swap away
    await performSwap(page, originalName)
    const swappedName = (await inspector.locator("h2").textContent())!.trim()
    expect(swappedName).not.toBe(originalName)

    // Swap back
    await performSwap(page, swappedName)
    expect((await inspector.locator("h2").textContent())?.trim()).toBe(originalName)

    await page.screenshot({ path: `${SCREENSHOT_DIR}/08-round-trip-restores-original.png`, fullPage: true })
  })
})
