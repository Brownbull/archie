import { test, expect } from "@playwright/test"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import { grantVendorOwnership, useAdvancedLevel, expandInspectorSection } from "./helpers/canvas-helpers"

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
 * Perform a provider swap via the on-node provider dropdown (Fluidity P1 — the vendor picker lives on
 * the canvas block now, not the inspector). Opens the node's `archie-node-provider` trigger, clicks
 * the first non-restricted option whose vendor id differs from the current node's vendor, and waits
 * for the swap to land. Returns the AUTHORITATIVE post-swap vendor name read from the inspector's
 * `inspector-summary-provider` row (clean `component.name`, no price/stat decoration).
 *
 * Why read the inspector and not the option text: the option's inner DOM concatenates the name with a
 * price tag + "$/mo · rps · ms" stats span, so scraping the option label leaks decoration. And the
 * inspector heading (h2) is the logical TYPE ("Compute") since the type-first redesign — NOT the
 * vendor — so callers must compare on `inspector-summary-provider`, the vendor row. The node must be
 * selected (inspector open) before calling. Vendor ownership is granted by the caller so the swap
 * applies rather than opening the purchase dialog for the 0-star E2E user.
 */
async function performSwap(
  page: import("@playwright/test").Page,
  _currentVendorName: string,
  targetName?: string,
): Promise<string> {
  const node = page.locator('[data-testid="archie-node"]').first()
  const provider = node.locator('[data-testid="archie-node-provider"]')
  await expect(provider).toBeVisible()

  // Resolve the target provider's exact name via the /src store bridge. The option DOM concatenates
  // the name with a "$/mo · rps · ms" stats span and the name is a bare text node (no isolating
  // element), so scraping the option label is unreliable — get the ground-truth name from the
  // component library and match the option by name prefix. When `targetName` is supplied (round-trip
  // back-swap), target that exact provider; otherwise pick the first DIFFERENT same-type provider.
  const target = await page.evaluate(async (wanted) => {
    /* eslint-disable @typescript-eslint/no-explicit-any -- ad-hoc store bridge in browser context */
    const [archMod, libMod, typesMod] = await Promise.all([
      import("/src/stores/architectureStore.ts"),
      import("/src/services/componentLibrary.ts"),
      import("/src/lib/componentTypes.ts"),
    ])
    const cur = (archMod as any).useArchitectureStore.getState().nodes[0]?.data?.archieComponentId
    const all = (libMod as any).componentLibrary.getAllComponents()
    const comp = (libMod as any).componentLibrary.getComponent(cur)
    const providers = (typesMod as any).providersForComponent(comp, all)
    const pick = wanted
      ? providers.find((p: any) => p.name === wanted)
      : providers.find((p: any) => p.id !== cur)
    return pick ? { id: pick.id as string, name: pick.name as string } : null
    /* eslint-enable @typescript-eslint/no-explicit-any */
  }, targetName ?? null)
  if (!target) return ""

  await provider.click()
  const listbox = page.locator("[role=listbox]")
  await expect(listbox).toBeVisible({ timeout: 3_000 })
  // Match the option whose visible text starts with the target vendor's clean name (text is
  // "<name>$/mo · rps · ms"). Escape regex-special chars in the name (e.g. "C# + ASP.NET Core").
  const escaped = target.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
  await listbox.locator("[role=option]").filter({ hasText: new RegExp(`^${escaped}`) }).first().click()
  await expect(listbox).not.toBeVisible({ timeout: 3_000 })

  // Authoritative result: the inspector's vendor row reflects the applied swap (clean component.name,
  // no decoration). The inspector h2 is the logical TYPE, so callers must compare on this row. This
  // read is best-effort — callers that don't open the inspector (e.g. the position-preservation test)
  // still get the swap performed; they just receive "" and assert on other state.
  const summaryProvider = page.locator('[data-testid="inspector-summary-provider"]')
  if (await summaryProvider.isVisible().catch(() => false)) {
    return (await summaryProvider.textContent())?.trim() ?? ""
  }
  // Fall back to the ground-truth target name we resolved from the library.
  return target.name
}

// Vendor+tier ownership grant (so cross-vendor swaps APPLY for the 0-star E2E user instead of opening
// the capability-purchase dialog) is the shared canvas-helpers grantVendorOwnership — single source of
// truth, kept there to prevent the drift that previously left this spec tier-only while the swap gate
// checks unlockedVendors. Aliased to the historical name to keep the call sites stable.
const grantNodeTierOwnership = grantVendorOwnership

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

    // Select node 0 and capture original state. The inspector h2 is the logical TYPE ("Compute") after
    // the type-first redesign; the chosen VENDOR lives in the inspector-summary-provider row — that's
    // what a swap changes, so assert on it (not h2).
    await selectNodeOnCanvas(page, 0)
    const inspector = page.locator('[data-testid="inspector-panel"]')
    const summaryProvider = inspector.locator('[data-testid="inspector-summary-provider"]')
    const originalVendor = (await summaryProvider.textContent())!.trim()
    const originalNodeText = await page.locator('[data-testid="archie-node"]').nth(0).textContent()

    // Perform swap (returns the authoritative post-swap vendor name from the inspector)
    const swapTargetName = await performSwap(page, originalVendor)
    expect(swapTargetName.length).toBeGreaterThan(0)
    expect(swapTargetName).not.toBe(originalVendor)

    // Inspector vendor row shows the new vendor
    expect((await summaryProvider.textContent())?.trim()).toBe(swapTargetName)

    // Canvas node label updated to the new vendor
    const updatedNodeText = await page.locator('[data-testid="archie-node"]').nth(0).textContent()
    expect(updatedNodeText).toContain(swapTargetName)
    expect(updatedNodeText).not.toBe(originalNodeText)

    // Connection preserved
    await expect(edges).toHaveCount(1, { timeout: 3_000 })
    await page.screenshot({ path: `${SCREENSHOT_DIR}/04-after-swap-connection-preserved.png`, fullPage: true })
  })

  test("AC-2+3: swap resets config variant and metrics update", async ({ page }) => {
    // This is the heaviest swap test — import + grant + select + expand disclosure + read config
    // list + read fills + swap + re-read, several going through the /src bridge (dynamic imports).
    // Under 4-worker CI load it brushed the default 30s cap (flaky once); give it room.
    test.setTimeout(60_000)
    // Metric bars render only at "advanced" experience level — at the default beginner level the
    // inspector shows "metrics appear at higher levels" instead. Seed advanced BEFORE goto.
    await useAdvancedLevel(page)
    await page.goto("/")
    const hasComponents = await waitForComponentLibrary(page)
    test.skip(!hasComponents, "Skipped: no seeded component data")

    // Import the CONNECTED swap-pair (node 0 = node-express compute, swappable + multi-variant) so the
    // node carries SCORED metrics — a lone unconnected node produces no metric bars (computedMetrics
    // stays empty), which made the before/after fill comparison compare [] to [] and fail.
    await importSwapPair(page)
    await grantNodeTierOwnership(page) // config-tier changes APPLY for the 0-star user
    // Open the read-only inspector so the metric bars render (the bars still live there).
    await selectNodeOnCanvas(page, 0)
    // Metrics is a collapse-by-default disclosure — expand it so metric-bar-fill elements exist.
    await expandInspectorSection(page, "disclosure-metrics")

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

    // Compare on the VENDOR row, not the h2 (which is the logical type and is unchanged by a same-type
    // vendor swap). performSwap returns the authoritative post-swap vendor name from this same row.
    const inspector = page.locator('[data-testid="inspector-panel"]')
    const summaryProvider = inspector.locator('[data-testid="inspector-summary-provider"]')
    const originalVendor = (await summaryProvider.textContent())!.trim()

    // Swap away (first different provider)
    const swappedVendor = await performSwap(page, originalVendor)
    expect(swappedVendor).not.toBe(originalVendor)

    // Swap back to the ORIGINAL explicitly (the type may have >2 providers, so "first different" from
    // the swapped vendor wouldn't necessarily land on the original — target it by name).
    const reSwapped = await performSwap(page, swappedVendor, originalVendor)
    expect(reSwapped).toBe(originalVendor)

    await page.screenshot({ path: `${SCREENSHOT_DIR}/08-round-trip-restores-original.png`, fullPage: true })
  })
})
