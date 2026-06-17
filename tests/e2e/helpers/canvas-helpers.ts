import { type Page, expect } from "@playwright/test"

/**
 * Seed the persisted experience level to "advanced" BEFORE the app loads (D22). The default is
 * "beginner", which hides the inspector's progressive-disclosure sections (gains/costs/metrics/code)
 * and gates the toolbox — so specs that assert those sections must run at advanced. Merges into the
 * existing `archie-preferences` localStorage (preserving tourSeen) on every navigation, mirroring the
 * tourSeen seed in unlocked-setup. Call in beforeEach BEFORE page.goto().
 */
export async function useAdvancedLevel(page: Page): Promise<void> {
  await page.addInitScript(() => {
    // Fresh test state: clear any autosaved canvas so each test starts empty (the desktop project reuses
    // one storageState, so a prior test's placed-then-autosaved nodes would otherwise leak in).
    try {
      localStorage.removeItem("archie-canvas-autosave")
    } catch {
      /* ignore */
    }
    const KEY = "archie-preferences"
    let parsed: { state?: Record<string, unknown>; version?: number } = {}
    try {
      const raw = localStorage.getItem(KEY)
      if (raw) parsed = JSON.parse(raw)
    } catch {
      parsed = {}
    }
    const state = { ...(parsed.state ?? {}), experienceLevel: "advanced", tourSeen: true }
    localStorage.setItem(KEY, JSON.stringify({ state, version: parsed.version ?? 0 }))
  })
}

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
 * Switch to Stacks tab and wait for it to finish loading.
 * Returns true if stack cards appeared, false if empty/error state.
 */
export async function waitForStacksTab(page: Page): Promise<boolean> {
  await page.getByRole("tab", { name: "Stacks" }).click()
  await Promise.race([
    page.locator('[data-testid="stacks-tab"]').waitFor({ state: "visible", timeout: 15_000 }).catch(() => {}),
    page.locator('[data-testid="stacks-tab-empty"]').waitFor({ state: "visible", timeout: 15_000 }).catch(() => {}),
    page.locator('[data-testid="stacks-tab-error"]').waitFor({ state: "visible", timeout: 15_000 }).catch(() => {}),
    page.locator('[data-testid="stacks-tab-loading"]').waitFor({ state: "hidden", timeout: 15_000 }).catch(() => {}),
  ])
  return page.locator('[data-testid="stacks-tab"]').isVisible()
}

/**
 * Simulate HTML5 drag-and-drop of a stack from toolbox to canvas.
 * Uses "application/archie-stack" data transfer type.
 */
export async function dragStackToCanvas(
  page: Page,
  stackId: string,
  targetX: number,
  targetY: number,
): Promise<void> {
  await page.evaluate(
    ({ sId, x, y }) => {
      const canvasPanel = document.querySelector('[data-testid="canvas-panel"]')
      if (!canvasPanel) throw new Error("canvas-panel not found")

      const dragOverEvent = new DragEvent("dragover", {
        bubbles: true,
        cancelable: true,
      })
      Object.defineProperty(dragOverEvent, "dataTransfer", {
        value: { dropEffect: "", types: ["application/archie-stack"] },
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
            type === "application/archie-stack" ? sId : "",
          types: ["application/archie-stack"],
          files: [],
        },
      })
      canvasPanel.dispatchEvent(dropEvent)
    },
    { sId: stackId, x: targetX, y: targetY },
  )
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
  // The toolbox lists logical-block TYPES; each block's "+" adds its default vendor (refined
  // later in the inspector). The nth block adds the (n+1)th node when called in sequence.
  const addBtn = page.locator('[data-testid^="add-type-"]').nth(buttonIndex)
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
  // Click the node's top-left header (stripe/icon area), NOT the center — the center now carries the
  // on-node vendor/config dropdowns (Fluidity P1). Clicking one opens a Radix listbox whose overlay
  // then blocks every subsequent inspector/canvas click.
  await node.click({ position: { x: 12, y: 6 } })
  await expect(page.locator('[data-testid="inspector-panel"]')).toBeVisible({ timeout: 5_000 })
}

/**
 * Expand a collapse-by-default inspector disclosure (P3) — e.g. "disclosure-metrics",
 * "disclosure-gains" — so its content is visible/interactable. No-op if already open.
 */
export async function expandInspectorSection(page: Page, testId: string): Promise<void> {
  const trigger = page.locator(`[data-testid="${testId}"]`)
  await trigger.waitFor({ state: "visible", timeout: 5_000 })
  if ((await trigger.getAttribute("aria-expanded")) === "false") {
    await trigger.click()
  }
}

/**
 * Place two components on the canvas at distinct positions (30% / 65% width), ready to connect.
 * D23: drops two known base components via the drop event directly (dragComponentToCanvas takes a
 * componentId and a position) — the toolbox redesign removed the `component-card-*` grid from the
 * default view, so reading card ids from the DOM no longer works. Returns the number of nodes placed.
 */
export async function placeTwoComponents(page: Page): Promise<number> {
  const canvasPanel = page.locator('[data-testid="canvas-panel"]')
  const canvasBounds = await canvasPanel.boundingBox()
  if (!canvasBounds) throw new Error("canvas-panel not found")

  await dragComponentToCanvas(
    page,
    "node-express",
    canvasBounds.x + canvasBounds.width * 0.3,
    canvasBounds.y + canvasBounds.height / 2,
  )
  await expect(page.locator('[data-testid="archie-node"]')).toHaveCount(1, { timeout: 5_000 })

  await dragComponentToCanvas(
    page,
    "postgresql",
    canvasBounds.x + canvasBounds.width * 0.65,
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

  // Node-scoped, type-based handle lookup — works for BOTH typed port handles (Epic 12,
  // port-handle-*) and the generic fallback handles (archie-node-handle-*). react-flow tags every
  // handle with a `source`/`target` class, so we grab each node's first source/target handle.
  const sourceHandle = page.locator('[data-testid="archie-node"]').nth(sourceIndex).locator(".react-flow__handle.source").first()
  const targetHandle = page.locator('[data-testid="archie-node"]').nth(targetIndex).locator(".react-flow__handle.target").first()

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
 * Trigger recalculation by changing a node's config variant ON THE BLOCK (Fluidity P1 — config tier
 * is tuned on the canvas node now, not the inspector). Populates computedMetrics + edge heatmaps.
 */
export async function triggerRecalcViaConfigChange(
  page: Page,
  nodeIndex = 0,
): Promise<void> {
  const node = page.locator('[data-testid="archie-node"]').nth(nodeIndex)
  const configTrigger = node.locator('[data-testid="archie-node-config-trigger"]')
  await expect(configTrigger).toBeVisible({ timeout: 3_000 })
  // Open the tier dropdown via keyboard (focus + Enter) rather than a pointer click. focus() bypasses
  // hit-testing, so it works even when the trigger sits under the React Flow minimap (a bottom-right
  // Panel with a high z-index that selection does NOT lift a node above), and it doesn't open the
  // inspector / shift the canvas the way a node-body click does. Radix Select opens on Enter when
  // focused. (Trigger renders only on multi-variant nodes — pick a component with >1 config tier.)
  await configTrigger.focus()
  await page.keyboard.press("Enter")

  const listbox = page.locator('[role="listbox"]')
  await listbox.waitFor({ state: "visible", timeout: 3_000 })

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

/**
 * Place a known component at a fractional canvas position via the drop event (D23). Use this when a
 * test needs a node at a SPECIFIC, predictable spot — e.g. clear of the top-left build-health panel,
 * or two nodes at distinct positions. The "+" add-type buttons drop at a default location that can
 * land under the HUD panels (intercepting later clicks) and can be occluded in a filtered toolbox.
 * Asserts the node count incremented by one.
 */
export async function placeComponentAt(
  page: Page,
  componentId: string,
  fractionX: number,
  fractionY: number,
): Promise<void> {
  const canvasBounds = await page.locator('[data-testid="canvas-panel"]').boundingBox()
  if (!canvasBounds) throw new Error("canvas-panel not found")
  const before = await page.locator('[data-testid="archie-node"]').count()
  await dragComponentToCanvas(
    page,
    componentId,
    canvasBounds.x + canvasBounds.width * fractionX,
    canvasBounds.y + canvasBounds.height * fractionY,
  )
  await expect(page.locator('[data-testid="archie-node"]')).toHaveCount(before + 1, { timeout: 5_000 })
}

/**
 * Open the DashboardOverlay dialog.
 */
export async function openDashboardOverlay(page: Page) {
  const expandButton = page.locator('[data-testid="dashboard-expand-button"]')
  await expect(expandButton).toBeVisible({ timeout: 5_000 })
  await expandButton.click()
  await expect(page.locator('[data-testid="dashboard-overlay"]')).toBeVisible({ timeout: 5_000 })
}

/**
 * Own every PROVIDER (and its config tiers) for the component types currently on the canvas, so a
 * vendor swap / config-tier change APPLIES rather than opening the capability-purchase dialog (the
 * 0-star E2E user can't buy paid vendors). The swap is gated on `unlockedVendors` at TWO chokepoints
 * — NodeProviderSelect's `onValueChange` (isVendorOwned → setPendingVendor) and `swapNodeComponent`
 * itself (architectureStore isVendorOwned bail-with-toast) — and `isVendorOwned` never reads
 * `unlockedTiers`, so granting only tiers leaves the swap intercepted. Grant BOTH maps over
 * `providersForComponent`. Zustand setState re-renders the live gate, so callers just need this to run
 * AFTER the node is on the canvas (it reads `nodes` from the architecture store).
 *
 * Uses the dev-server `/src` module bridge — works in CI (Vite dev server); the static local-build
 * harness lacks the bridge, so swap/config-change tests that rely on this are CI-validated only.
 *
 * This is the single source of truth for both component-swapping and decision-support specs — keeping
 * it here prevents the two from drifting (the bug where one was a vendor+tier grant and the other was
 * tier-only, so cross-vendor swaps silently no-op'd).
 */
export async function grantVendorOwnership(page: Page): Promise<void> {
  await page.evaluate(async () => {
    /* eslint-disable @typescript-eslint/no-explicit-any -- ad-hoc store bridge in browser context */
    const [archMod, progMod, libMod, typesMod] = await Promise.all([
      import("/src/stores/architectureStore.ts"),
      import("/src/stores/userProgressStore.ts"),
      import("/src/services/componentLibrary.ts"),
      import("/src/lib/componentTypes.ts"),
    ])
    const all = (libMod as any).componentLibrary.getAllComponents()
    const vendors: Record<string, true> = { ...(progMod as any).useUserProgressStore.getState().unlockedVendors }
    const tiers: Record<string, true> = { ...(progMod as any).useUserProgressStore.getState().unlockedTiers }
    for (const node of (archMod as any).useArchitectureStore.getState().nodes) {
      const id: string = node.data.archieComponentId
      const comp = (libMod as any).componentLibrary.getComponent(id)
      if (!comp) continue
      for (const provider of (typesMod as any).providersForComponent(comp, all)) {
        vendors[provider.id] = true
        for (const v of provider.configVariants ?? []) tiers[`${provider.id}/${v.id}`] = true
      }
    }
    ;(progMod as any).useUserProgressStore.setState({ unlockedVendors: vendors, unlockedTiers: tiers })
    /* eslint-enable @typescript-eslint/no-explicit-any */
  })
}
