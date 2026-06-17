import { test, expect } from "@playwright/test"
import { readFileSync } from "node:fs"
import { join } from "node:path"

const SCREENSHOT_DIR = "test-results/component-swapping"
const TRANSITION_WAIT = 300

/**
 * Import a small CONNECTED 2-node fixture (node-express → postgresql, with an edge). node 0 is the
 * swappable compute node; the edge lets the "swap preserves connections" tests assert against a real
 * connection. Import is reliable; placing 2 nodes via add-type + dragging handle-to-handle fails
 * because the placed nodes stack at the same spot, so the connect-drag never lands (edges:0).
 */
async function importSwapPair(page: import("@playwright/test").Page): Promise<void> {
  const name = "swap-pair.architecture.yaml"
  const buf = readFileSync(join(process.cwd(), "tests", "e2e", "fixtures", "scoring", name))
  await page.getByTestId("import-file-input").setInputFiles({ name, mimeType: "text/yaml", buffer: buf })
  await expect(page.locator('[data-testid="archie-node"]')).toHaveCount(2, { timeout: 10_000 })
  await expect(page.locator(".react-flow__edge")).toHaveCount(1, { timeout: 5_000 })
}

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
  // D23: the default toolbox renders type-block cards whose "add to canvas" button is add-type-*.
  const addBtn = page.locator('[data-testid^="add-type-"]').nth(buttonIndex)
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
  // Click the node HEADER (top-left), not the center — the center carries the on-node vendor/config
  // dropdowns, and clicking one opens a Radix listbox whose overlay then blocks the inspector.
  await node.click({ position: { x: 12, y: 6 } })
  await expect(page.locator('[data-testid="inspector-panel"]')).toBeVisible({ timeout: 5_000 })
}

/**
 * Find the index of an Add to Canvas button whose component belongs to a
 * multi-member category. Returns -1 if none found. Leaves canvas clean.
 *
 * Fluidity P1: the provider swap moved onto the canvas block — a multi-provider
 * type renders the `archie-node-provider` dropdown ON the node (single-provider
 * types render only the static `archie-node-variant` label). Detect swappability
 * by the presence of that on-node trigger; no inspector selection required.
 */
async function findSwappableComponentIndex(
  page: import("@playwright/test").Page,
): Promise<number> {
  // D23: the default toolbox renders type-block cards whose "add to canvas" button is add-type-*.
  const addBtns = page.locator('[data-testid^="add-type-"]')
  const btnCount = await addBtns.count()

  for (let i = 0; i < btnCount; i++) {
    await addBtns.nth(i).click()
    await expect(page.locator('[data-testid="archie-node"]')).toHaveCount(1, { timeout: 5_000 })

    let isSwappable = false
    try {
      const node = page.locator('[data-testid="archie-node"]').first()
      await expect(node).toBeVisible()
      isSwappable = await node.locator('[data-testid="archie-node-provider"]').isVisible()
    } finally {
      // Ensure cleanup even on assertion failure
      const remaining = await page.locator('[data-testid="archie-node"]').count()
      if (remaining > 0) {
        // Click the node HEADER (top-left), not the center — the center carries the on-node
        // vendor/config dropdowns; clicking there opens a Radix listbox instead of selecting the
        // node, so the native React-Flow Delete never fires and the node lingers (count stays 1).
        await page.locator('[data-testid="archie-node"]').first().click({ position: { x: 12, y: 6 } })
        await page.keyboard.press("Delete")
        await expect(page.locator('[data-testid="archie-node"]')).toHaveCount(0, { timeout: 5_000 })
      }
    }

    if (isSwappable) return i
  }
  return -1
}

/**
 * Perform a provider swap via the on-node provider dropdown (Fluidity P1 — the
 * vendor picker lives on the canvas block now, not the inspector).
 * Opens the node's `archie-node-provider` trigger, selects the first option that
 * doesn't match currentName, closes. Returns the name of the provider selected.
 */
async function performSwap(
  page: import("@playwright/test").Page,
  currentName: string,
): Promise<string> {
  const node = page.locator('[data-testid="archie-node"]').first()
  const provider = node.locator('[data-testid="archie-node-provider"]')
  await expect(provider).toBeVisible()
  await provider.click()

  const listbox = page.locator("[role=listbox]")
  await expect(listbox).toBeVisible({ timeout: 3_000 })

  const options = listbox.locator("[role=option]")
  const count = await options.count()
  let selectedName = ""

  // Pick the first non-current, non-restricted alternative. Read the clean provider name from the
  // option's first text span (the whole option textContent also includes price/stat metadata).
  // Tier ownership is granted by the caller (grantNodeTierOwnership) so the swap applies rather than
  // opening a purchase dialog for the 0-star E2E user.
  for (let i = 0; i < count; i++) {
    const opt = options.nth(i)
    if (await opt.getAttribute("data-restricted")) continue
    const name = (await opt.locator("span span").first().textContent())?.trim() ?? ""
    if (name && name !== currentName.trim()) {
      selectedName = name
      await opt.click()
      break
    }
  }

  await expect(listbox).not.toBeVisible({ timeout: 3_000 })
  return selectedName
}

/** Seed ownership of every config tier of the first node's component so a swap/config change APPLIES
 *  instead of opening the purchase dialog (the 0-star E2E user can't buy paid tiers). Uses the dev
 *  server's /src module bridge — works in CI (Vite dev server). */
async function grantNodeTierOwnership(page: import("@playwright/test").Page): Promise<void> {
  await page.evaluate(async () => {
    /* eslint-disable @typescript-eslint/no-explicit-any -- ad-hoc store bridge in browser context */
    const [archMod, progMod, libMod] = await Promise.all([
      import("/src/stores/architectureStore.ts"),
      import("/src/stores/userProgressStore.ts"),
      import("/src/services/componentLibrary.ts"),
    ])
    for (const node of (archMod as any).useArchitectureStore.getState().nodes) {
      const id: string = node.data.archieComponentId
      const comp = (libMod as any).componentLibrary.getComponent(id)
      const variants: Array<{ id: string }> = comp?.configVariants ?? []
      // also own every PROVIDER's variants in this type so swaps land
      const owned: Record<string, true> = { ...(progMod as any).useUserProgressStore.getState().unlockedTiers }
      for (const v of variants) owned[`${id}/${v.id}`] = true
      ;(progMod as any).useUserProgressStore.setState({ unlockedTiers: owned })
    }
    /* eslint-enable @typescript-eslint/no-explicit-any */
  })
}

test.describe("Component Swapping E2E (Story 1-6)", () => {
  test("AC-1: swapper dropdown shows alternatives in same category", async ({ page }) => {
    await page.goto("/")
    const hasComponents = await waitForComponentLibrary(page)
    test.skip(!hasComponents, "Skipped: no seeded component data")

    const idx = await findSwappableComponentIndex(page)
    test.skip(idx === -1, "Skipped: no swappable components found")

    await addComponentToCanvas(page, idx)

    // Fluidity P1: provider swap lives on the canvas block now. The on-node `archie-node-provider`
    // trigger renders for multi-provider types (no "Provider" label any more — dropped that assertion).
    const node = page.locator('[data-testid="archie-node"]').first()
    const trigger = node.locator('[data-testid="archie-node-provider"]')
    await expect(trigger).toBeVisible()

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

    // D23: the default toolbox renders type-block cards whose "add to canvas" button is add-type-*.
    const addBtns = page.locator('[data-testid^="add-type-"]')
    const btnCount = await addBtns.count()
    let found = false

    for (let i = 0; i < btnCount; i++) {
      await addBtns.nth(i).click()
      await expect(page.locator('[data-testid="archie-node"]')).toHaveCount(1, { timeout: 5_000 })

      // Fluidity P1: a single-provider type renders NO on-node provider dropdown (just the static
      // `archie-node-variant` label) — absence of `archie-node-provider` marks a single-member type.
      const node = page.locator('[data-testid="archie-node"]').first()
      await expect(node).toBeVisible()
      if (!(await node.locator('[data-testid="archie-node-provider"]').isVisible())) {
        found = true
        await page.screenshot({ path: `${SCREENSHOT_DIR}/02-swapper-hidden-single-member.png`, fullPage: true })
        break
      }

      // Header click (not center) so the node selects for the native Delete, rather than opening
      // the on-node dropdown.
      await page.locator('[data-testid="archie-node"]').first().click({ position: { x: 12, y: 6 } })
      await page.keyboard.press("Delete")
      await expect(page.locator('[data-testid="archie-node"]')).toHaveCount(0, { timeout: 5_000 })
    }

    test.skip(!found, "Skipped: all components in multi-member categories")
  })

  test("AC-2: swap updates node and inspector while preserving connections", async ({ page }) => {
    await page.goto("/")
    const hasComponents = await waitForComponentLibrary(page)
    test.skip(!hasComponents, "Skipped: no seeded component data")

    // Import a connected pair (node 0 = swappable compute, node 1 = db, with an edge) — placing +
    // handle-dragging to connect is unreliable (stacked nodes), so import the connection directly.
    await importSwapPair(page)
    await grantNodeTierOwnership(page) // so the swap APPLIES (0-star user can't buy paid providers)
    const edges = page.locator(".react-flow__edge")
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
    await grantNodeTierOwnership(page) // config-tier changes APPLY for the 0-star user
    // Open the read-only inspector so the metric bars render (the bars still live there).
    await selectNodeOnCanvas(page, 0)

    // Fluidity P1: config tier is tuned on the canvas block now. The on-node `archie-node-config-trigger`
    // renders only for multi-variant providers — a swappable (multi-provider) type isn't guaranteed
    // multi-variant, so skip if there's no on-node config picker to inspect.
    const node = page.locator('[data-testid="archie-node"]').first()
    const configTrigger = node.locator('[data-testid="archie-node-config-trigger"]')
    test.skip(
      !(await configTrigger.isVisible().catch(() => false)),
      "Skipped: swappable component is single-variant — no on-node config picker",
    )

    // Capture original config variant list
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

    // Perform swap via the on-node provider dropdown.
    const swapperValue = (await node.locator('[data-testid="archie-node-provider"]').textContent())!.trim()
    await performSwap(page, swapperValue)

    // After a swap the (possibly new) provider may be single-variant — re-resolve the on-node
    // config trigger and only assert variant-list divergence when one is still present.
    const configTriggerAfter = node.locator('[data-testid="archie-node-config-trigger"]')
    if (await configTriggerAfter.isVisible().catch(() => false)) {
      // Config variant should have non-empty value
      const newVariant = await configTriggerAfter.textContent()
      expect(newVariant!.trim().length).toBeGreaterThan(0)

      // Config variants list should differ after swap
      await configTriggerAfter.click()
      const newConfigListbox = page.locator("[role=listbox]")
      await expect(newConfigListbox).toBeVisible({ timeout: 3_000 })
      const newConfigNames: string[] = []
      const newOptions = newConfigListbox.locator("[role=option]")
      for (let i = 0; i < await newOptions.count(); i++) {
        newConfigNames.push((await newOptions.nth(i).textContent())?.trim() ?? "")
      }
      expect(newConfigNames).not.toEqual(origConfigNames)
      await page.keyboard.press("Escape")
    }

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

    const rfNode = page.locator(".react-flow__node").first()
    const transformBefore = await rfNode.evaluate((el) => getComputedStyle(el).transform)

    // Fluidity P1: read the current provider off the on-node dropdown, then swap on the block.
    const node = page.locator('[data-testid="archie-node"]').first()
    const currentValue = (await node.locator('[data-testid="archie-node-provider"]').textContent())!.trim()
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
    await grantNodeTierOwnership(page) // both swaps APPLY for the 0-star user
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
