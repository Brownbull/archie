import { test, expect, type Page } from "@playwright/test"
import {
  waitForComponentLibrary,
  addComponentToCanvas,
  dragComponentToCanvas,
  selectNodeOnCanvas,
  expandInspectorSection,
  useAdvancedLevel,
} from "./helpers/canvas-helpers"

const SCREENSHOT_DIR = "test-results/inspector-and-config"

/**
 * Fluidity P1: the config-tier picker moved onto the canvas block and only renders for
 * MULTI-VARIANT providers (`archie-node-config-trigger`). To exercise config behaviour
 * deterministically, place a known multi-variant compute provider (Node.js + Express has
 * Single Process + Cluster Mode tiers) instead of relying on the first toolbox block.
 * Returns the placed node locator and its on-node config trigger.
 */
async function placeMultiVariantComponent(page: Page) {
  // The toolbox lists logical TYPES via `add-type-{typeId}`; compute's default vendor (Node.js + Express)
  // is multi-tier (Single Process / Cluster Mode), so the on-node config picker renders.
  await page.locator('[data-testid="add-type-compute"]').click()
  await expect(page.locator('[data-testid="archie-node"]')).toHaveCount(1, { timeout: 5_000 })
  const node = page.locator('[data-testid="archie-node"]').first()
  const configTrigger = node.locator('[data-testid="archie-node-config-trigger"]')
  return { node, configTrigger }
}

/**
 * Mark the placed node's NON-BASE config tiers as already-owned. D103: every variant beyond
 * configVariants[0] is a ≥1★ purchase, and the E2E user has 0 spendable stars here — so selecting an
 * unowned tier takes NodeConfigSelect's purchase branch, the buy fails, and the variant never changes
 * (the trigger stays on "Single Process"). Seeding ownership keeps the switch deterministic and
 * currency-free; the intent is "switching tier updates metrics/code", not "buying a tier". Keyed
 * `${componentId}/${variantId}` to match isTierOwned (vendorId IS the componentId). The `.ts` module
 * URL is required — the extensionless specifier yields a separate store record the app never reads.
 */
async function grantNodeTierOwnership(page: Page): Promise<void> {
  const result = await page.evaluate(async () => {
    /* eslint-disable @typescript-eslint/no-explicit-any -- ad-hoc store bridge in browser context */
    const [archMod, progMod, libMod] = await Promise.all([
      import("/src/stores/architectureStore.ts"),
      import("/src/stores/userProgressStore.ts"),
      import("/src/services/componentLibrary.ts"),
    ])
    const node = (archMod as any).useArchitectureStore.getState().nodes[0]
    if (!node) return "no-node"
    const componentId: string = node.data.archieComponentId
    const variants: Array<{ id: string }> =
      (libMod as any).componentLibrary.getComponent(componentId)?.configVariants ?? []
    const progStore = (progMod as any).useUserProgressStore
    const owned: Record<string, true> = { ...progStore.getState().unlockedTiers }
    for (const v of variants) owned[`${componentId}/${v.id}`] = true
    progStore.setState({ unlockedTiers: owned })
    return "ok"
    /* eslint-enable @typescript-eslint/no-explicit-any */
  })
  if (result !== "ok") throw new Error(`grantNodeTierOwnership: ${result}`)
}

/**
 * Place node-express + postgresql via the canvas, not the toolbox "+": each TypeBlockCard's
 * `group-hover:visible` vendor tooltip is `absolute top-full z-20`, so hovering the nth add button
 * reveals the card-above's tooltip, which overlaps and intercepts the click (timeout). Identities are
 * preserved for connectFirstTwoNodesViaStore: nodes[0]=node-express (db-out), nodes[1]=postgresql
 * (db-in). Selection later goes through the store, so the exact drop spot is incidental.
 */
async function placeTwoNodesClearOfPanel(page: Page): Promise<void> {
  const bounds = await page.locator('[data-testid="canvas-panel"]').boundingBox()
  if (!bounds) throw new Error("canvas-panel not found")
  await dragComponentToCanvas(page, "node-express", bounds.x + bounds.width * 0.5, bounds.y + bounds.height * 0.68)
  await expect(page.locator('[data-testid="archie-node"]')).toHaveCount(1, { timeout: 5_000 })
  await dragComponentToCanvas(page, "postgresql", bounds.x + bounds.width * 0.72, bounds.y + bounds.height * 0.68)
  await expect(page.locator('[data-testid="archie-node"]')).toHaveCount(2, { timeout: 5_000 })
}

/**
 * Connect the first two canvas nodes via the store's `addEdge` (node-express db-out → postgresql db-in)
 * — the same path the UI onConnect calls. Drag-to-connect is flaky for multi-port nodes; the intent is
 * "edge SELECTION opens the connection inspector", so the creation method is incidental.
 */
async function connectFirstTwoNodesViaStore(page: Page): Promise<void> {
  const result = await page.evaluate(async () => {
    /* eslint-disable @typescript-eslint/no-explicit-any -- ad-hoc store bridge in browser context */
    const archStore = (await import("/src/stores/architectureStore.ts") as any).useArchitectureStore
    const nodes = archStore.getState().nodes
    if (nodes.length < 2) return "need-two-nodes"
    archStore.getState().addEdge({ source: nodes[0].id, target: nodes[1].id, sourceHandle: "db-out", targetHandle: "db-in" })
    return archStore.getState().edges.length === 1 ? "ok" : "no-edge"
    /* eslint-enable @typescript-eslint/no-explicit-any */
  })
  if (result !== "ok") throw new Error(`connectFirstTwoNodesViaStore: ${result}`)
}

/**
 * Select the nth canvas node via the uiStore bridge (`setSelectedNodeId`) — the inspector renders that
 * node's content. A header click is unreliable for a SECOND node: once the first selection opens the
 * 300px inspector, fit-view re-frames the remaining node under the build-health / canvas-legend panels,
 * which intercept the click. Store selection sets the same selectedNodeId CanvasView's onNodeClick does.
 */
async function selectNthNodeViaStore(page: Page, index: number): Promise<void> {
  const result = await page.evaluate(async (i) => {
    /* eslint-disable @typescript-eslint/no-explicit-any -- ad-hoc store bridge in browser context */
    const archStore = (await import("/src/stores/architectureStore.ts") as any).useArchitectureStore
    const uiStore = (await import("/src/stores/uiStore.ts") as any).useUiStore
    const node = archStore.getState().nodes[i]
    if (!node) return "no-node"
    uiStore.getState().setSelectedNodeId(node.id)
    return "ok"
    /* eslint-enable @typescript-eslint/no-explicit-any */
  }, index)
  if (result !== "ok") throw new Error(`selectNthNodeViaStore[${index}]: ${result}`)
  await expect(page.locator('[data-testid="inspector-panel"]')).toBeVisible({ timeout: 5_000 })
}

/**
 * Select the first canvas edge via the uiStore bridge (`setSelectedEdgeId`) — InspectorPanel renders
 * ConnectionDetail when it is set. Clicking the edge is unreliable: the two nodes overlap after fit-view
 * (node-express is wide), so the click lands on a node (opening the component inspector). Store
 * selection sets the same selectedEdgeId CanvasView's onEdgeClick would.
 */
async function selectFirstEdgeViaStore(page: Page): Promise<void> {
  const result = await page.evaluate(async () => {
    /* eslint-disable @typescript-eslint/no-explicit-any -- ad-hoc store bridge in browser context */
    const archStore = (await import("/src/stores/architectureStore.ts") as any).useArchitectureStore
    const uiStore = (await import("/src/stores/uiStore.ts") as any).useUiStore
    const edge = archStore.getState().edges[0]
    if (!edge) return "no-edge"
    uiStore.getState().setSelectedEdgeId(edge.id)
    return "ok"
    /* eslint-enable @typescript-eslint/no-explicit-any */
  })
  if (result !== "ok") throw new Error(`selectFirstEdgeViaStore: ${result}`)
}

test.describe("Component Inspector & Configuration E2E (Story 1-5)", () => {
  // D22: advanced level (the default "beginner" hides the inspector's gains/costs/metrics/code
  // disclosures) + a clean canvas (the desktop project reuses one storageState, so prior placements
  // would leak in). Verified: this renders the gated disclosure sections.
  test.beforeEach(async ({ page }) => {
    await useAdvancedLevel(page)
  })

  test("AC-1: selected component node shows inspector with detail card", async ({ page }) => {
    await page.goto("/")

    const hasComponents = await waitForComponentLibrary(page)
    test.skip(!hasComponents, "Skipped: Firestore has no seeded component data")

    // Place a component on the canvas (auto-selects the new node, opening the inspector).
    await addComponentToCanvas(page)

    // Ensure the node is selected
    await selectNodeOnCanvas(page)

    // Inspector panel opens on the right side
    const inspector = page.locator('[data-testid="inspector"]')
    await expect(inspector).toBeVisible()

    // Verify inspector width is 300px (INSPECTOR_WIDTH constant)
    await expect(inspector).toHaveCSS("width", "300px")

    // Inspector panel shows component detail content
    const inspectorPanel = page.locator('[data-testid="inspector-panel"]')
    await expect(inspectorPanel).toBeVisible()

    // AC-1: Name displayed (h2 heading inside inspector)
    const heading = inspectorPanel.locator("h2")
    await expect(heading).toBeVisible()
    const componentName = await heading.textContent()
    expect(componentName!.length).toBeGreaterThan(0)

    // AC-1: Category badge displayed
    const badge = inspectorPanel.locator('[data-slot="badge"]')
    await expect(badge.first()).toBeVisible()

    // AC-1: Description displayed
    const descriptionParagraph = inspectorPanel.locator("p").first()
    await expect(descriptionParagraph).toBeVisible()

    // AC-1: Gains + Costs sections present (P3: now collapse-by-default disclosure triggers)
    await expect(page.locator('[data-testid="disclosure-gains"]')).toBeVisible()
    await expect(page.locator('[data-testid="disclosure-costs"]')).toBeVisible()

    await page.screenshot({
      path: `${SCREENSHOT_DIR}/01-inspector-opens-with-detail.png`,
      fullPage: true,
    })
  })

  test("AC-2: config variant dropdown shows current variant and lists all variants", async ({
    page,
  }) => {
    await page.goto("/")

    const hasComponents = await waitForComponentLibrary(page)
    test.skip(!hasComponents, "Skipped: Firestore has no seeded component data")

    // Place a multi-variant component (config tier is on the block now — Fluidity P1).
    const { configTrigger } = await placeMultiVariantComponent(page)

    // On-node config trigger should be visible (multi-variant provider).
    await expect(configTrigger).toBeVisible()

    // Verify dropdown trigger shows the current variant name (non-empty text)
    const currentVariantText = await configTrigger.textContent()
    expect(currentVariantText!.trim().length).toBeGreaterThan(0)

    await page.screenshot({
      path: `${SCREENSHOT_DIR}/02-config-selector-current-variant.png`,
      fullPage: true,
    })

    // Open the dropdown to see all variants
    await configTrigger.click()

    // Wait for dropdown content to appear (radix select renders in a portal)
    const selectContent = page.locator("[role=listbox]")
    await expect(selectContent).toBeVisible({ timeout: 3_000 })

    // Verify at least one option is listed
    const options = selectContent.locator("[role=option]")
    const optionCount = await options.count()
    expect(optionCount).toBeGreaterThanOrEqual(1)

    await page.screenshot({
      path: `${SCREENSHOT_DIR}/03-config-selector-dropdown-open.png`,
      fullPage: true,
    })

    // Close dropdown by pressing Escape
    await page.keyboard.press("Escape")
  })

  test("AC-3: switch variant updates metrics to new variant values", async ({ page }) => {
    await page.goto("/")

    const hasComponents = await waitForComponentLibrary(page)
    test.skip(!hasComponents, "Skipped: Firestore has no seeded component data")

    // Place a multi-variant component, then open the read-only inspector for the metric bars.
    const { configTrigger } = await placeMultiVariantComponent(page)
    await selectNodeOnCanvas(page)
    // D103: the non-base tier (Cluster Mode) is a 1★ purchase and the E2E user has 0 spendable stars
    // here — own the tiers up front so the switch updates the variant instead of failing the buy.
    await grantNodeTierOwnership(page)
    // Metrics live in a collapse-by-default disclosure (P3) — expand to read the bars.
    await expandInspectorSection(page, "disclosure-metrics")

    // Fluidity P1: config tier is tuned on the canvas block now — drive the on-node trigger.
    await expect(configTrigger).toBeVisible()

    const triggerButton = configTrigger
    const initialVariantText = await triggerButton.textContent()

    // Open dropdown
    await triggerButton.click()
    const selectContent = page.locator("[role=listbox]")
    await expect(selectContent).toBeVisible({ timeout: 3_000 })

    // Count options — skip if only one variant available
    const options = selectContent.locator("[role=option]")
    const optionCount = await options.count()
    test.skip(optionCount < 2, "Skipped: Component has only one config variant")

    // Capture initial metric bars state
    const metricBars = page.locator('[data-testid="metric-bar"]')
    const initialMetricCount = await metricBars.count()

    // Capture initial fill widths for comparison
    const initialFills: string[] = []
    const fillCount = await page.locator('[data-testid="metric-bar-fill"]').count()
    for (let i = 0; i < fillCount; i++) {
      const style = await page.locator('[data-testid="metric-bar-fill"]').nth(i).getAttribute("style")
      initialFills.push(style ?? "")
    }

    // Select a not-currently-selected variant via data-state (deterministic — a text compare against
    // the trigger label can mis-match formatting and re-pick the current variant, so nothing changes).
    await selectContent.locator('[role=option][data-state="unchecked"]').first().click()

    // Dropdown should close after selection
    await expect(selectContent).not.toBeVisible({ timeout: 3_000 })

    // Verify variant text changed in the trigger
    const newVariantText = await triggerButton.textContent()
    expect(newVariantText?.trim()).not.toBe(initialVariantText?.trim())

    // Wait for metrics to re-render (deterministic check)
    await expect(metricBars.first()).toBeVisible()

    // Verify metrics still display (count may differ between variants)
    const newMetricCount = await metricBars.count()
    expect(newMetricCount).toBeGreaterThan(0)

    // Check if at least one fill width changed (metrics updated)
    const newFills: string[] = []
    const newFillCount = await page.locator('[data-testid="metric-bar-fill"]').count()
    for (let i = 0; i < newFillCount; i++) {
      const style = await page.locator('[data-testid="metric-bar-fill"]').nth(i).getAttribute("style")
      newFills.push(style ?? "")
    }

    // Either the count changed or at least one fill value changed
    const fillsChanged =
      initialMetricCount !== newMetricCount ||
      initialFills.length !== newFills.length ||
      initialFills.some((f, i) => f !== newFills[i])
    expect(fillsChanged).toBe(true)

    await page.screenshot({
      path: `${SCREENSHOT_DIR}/04-variant-switched-metrics-updated.png`,
      fullPage: true,
    })
  })

  test("AC-4: collapse inspector to 40px and expand back to 300px", async ({ page }) => {
    await page.goto("/")

    const hasComponents = await waitForComponentLibrary(page)
    test.skip(!hasComponents, "Skipped: Firestore has no seeded component data")

    // Place a multi-variant component (so the on-node config trigger is present) and open inspector.
    const { configTrigger } = await placeMultiVariantComponent(page)
    await selectNodeOnCanvas(page)

    const inspector = page.locator('[data-testid="inspector"]')
    await expect(inspector).toHaveCSS("width", "300px")

    // Click the collapse button
    const collapseBtn = page.locator('[data-testid="inspector-collapse-btn"]')
    await expect(collapseBtn).toBeVisible()
    await collapseBtn.click()

    // CSS assertion waits for transition to complete (TD-1-5a Item 1)

    // Inspector should be collapsed to 40px
    await expect(inspector).toHaveCSS("width", "40px")

    await page.screenshot({
      path: `${SCREENSHOT_DIR}/05-inspector-collapsed-40px.png`,
      fullPage: true,
    })

    // Expand button should be visible (collapse btn is reused with different icon)
    const expandBtn = page.locator('[data-testid="inspector-collapse-btn"]')
    await expect(expandBtn).toBeVisible()
    await expandBtn.click()

    // Assertion-based wait replaces waitForTimeout (TD-1-5a Item 1)

    // Inspector should be back to 300px
    await expect(inspector).toHaveCSS("width", "300px")

    // Full content should be visible again. Fluidity P1: the inspector is read-only now (no
    // config-selector); assert the read-only summary is back, plus the on-node config trigger.
    await expect(page.locator('[data-testid="inspector-panel"]')).toBeVisible()
    await expect(page.locator('[data-testid="inspector-summary-provider"]')).toBeVisible()
    await expect(configTrigger).toBeVisible()

    await page.screenshot({
      path: `${SCREENSHOT_DIR}/06-inspector-expanded-300px.png`,
      fullPage: true,
    })
  })

  test("AC-5: metrics display with visual bars grouped by category", async ({ page }) => {
    await page.goto("/")

    const hasComponents = await waitForComponentLibrary(page)
    test.skip(!hasComponents, "Skipped: Firestore has no seeded component data")

    // Place and select a component
    await addComponentToCanvas(page)
    await selectNodeOnCanvas(page)

    const inspectorPanel = page.locator('[data-testid="inspector-panel"]')
    await expect(inspectorPanel).toBeVisible()

    // Metrics is a collapse-by-default disclosure (P3) — expand it before asserting its content.
    await expect(page.locator('[data-testid="disclosure-metrics"]')).toBeVisible()
    await expandInspectorSection(page, "disclosure-metrics")

    // Verify at least one metric card (category group) is rendered
    const metricCards = page.locator('[data-testid^="metric-card-"]')
    const cardCount = await metricCards.count()
    expect(cardCount).toBeGreaterThanOrEqual(1)

    // Verify each metric card has a category label in its header
    for (let i = 0; i < cardCount; i++) {
      const card = metricCards.nth(i)
      await expect(card).toBeVisible()
      // Card should contain at least one metric bar
      const bars = card.locator('[data-testid="metric-bar"]')
      expect(await bars.count()).toBeGreaterThanOrEqual(1)
    }

    // Verify metric bars have fill elements with width styling
    const allBars = page.locator('[data-testid="metric-bar"]')
    const barCount = await allBars.count()
    expect(barCount).toBeGreaterThan(0)

    // Verify fills have width percentage style
    const firstFill = page.locator('[data-testid="metric-bar-fill"]').first()
    await expect(firstFill).toBeVisible()
    const fillStyle = await firstFill.getAttribute("style")
    expect(fillStyle).toContain("width:")

    // Verify fill colors match heatmap semantics (green/yellow/red classes)
    const fillClasses = await firstFill.getAttribute("class")
    expect(fillClasses).toMatch(/bg-(green|yellow|red)-500/)

    await page.screenshot({
      path: `${SCREENSHOT_DIR}/07-metrics-grouped-by-category.png`,
      fullPage: true,
    })
  })

  test("deselecting (Escape) clears selection and hides inspector", async ({ page }) => {
    await page.goto("/")

    const hasComponents = await waitForComponentLibrary(page)
    test.skip(!hasComponents, "Skipped: Firestore has no seeded component data")

    // Place and select a component to open inspector
    await addComponentToCanvas(page)
    await selectNodeOnCanvas(page)

    const inspector = page.locator('[data-testid="inspector"]')
    await expect(inspector).toHaveCSS("width", "300px")

    // Deselect via Escape — the canvas keydown handler runs clearSelection + deselectAll (the same path
    // as an empty-canvas pane click, but deterministic — a programmatic .pane click is flaky here).
    await page.keyboard.press("Escape")

    // Assertion-based wait: inspector-panel hidden confirms transition complete (TD-1-5a Item 1)
    await expect(page.locator('[data-testid="inspector-panel"]')).not.toBeVisible({ timeout: 3_000 })

    // Inspector should collapse (no selected node) — border-box + border-l
    // means minimum computed width is 1px from the border, not 0px
    // Poll — the inspector wrapper has a 200ms width transition (AppLayout), so a single read can catch
    // it mid-collapse even after the panel content has unmounted.
    await expect
      .poll(() => inspector.evaluate((el) => el.getBoundingClientRect().width))
      .toBeLessThanOrEqual(1)

    await page.screenshot({
      path: `${SCREENSHOT_DIR}/08-inspector-hidden-after-pane-click.png`,
      fullPage: true,
    })
  })

  test("delete selected node clears inspector", async ({ page }) => {
    await page.goto("/")

    const hasComponents = await waitForComponentLibrary(page)
    test.skip(!hasComponents, "Skipped: Firestore has no seeded component data")

    // Place and select a component
    await addComponentToCanvas(page)
    await selectNodeOnCanvas(page)

    // Inspector should be open
    await expect(page.locator('[data-testid="inspector-panel"]')).toBeVisible()

    // Remove via the inspector's Remove button — deterministic (keyboard Delete depends on React Flow
    // holding canvas focus, flaky once the node carries on-canvas dropdowns).
    await page.getByTestId("inspector-remove-node").click()

    // Node should be removed from canvas
    await expect(page.locator('[data-testid="archie-node"]')).toHaveCount(0, { timeout: 5_000 })

    // Assertion-based wait: panel hidden confirms transition complete (TD-1-5a Item 1)
    await expect(page.locator('[data-testid="inspector-panel"]')).not.toBeVisible({ timeout: 3_000 })

    // Inspector should hide (selectedNodeId cleared) — border-box + border-l
    // means minimum computed width is 1px, not 0px
    const inspector = page.locator('[data-testid="inspector"]')
    // Poll — the inspector wrapper has a 200ms width transition (AppLayout), so a single read can catch
    // it mid-collapse even after the panel content has unmounted.
    await expect
      .poll(() => inspector.evaluate((el) => el.getBoundingClientRect().width))
      .toBeLessThanOrEqual(1)

    await page.screenshot({
      path: `${SCREENSHOT_DIR}/09-inspector-cleared-after-node-delete.png`,
      fullPage: true,
    })
  })

  test("edge selection shows connection inspector (not component inspector)", async ({ page }) => {
    await page.goto("/")

    const hasComponents = await waitForComponentLibrary(page)
    test.skip(!hasComponents, "Skipped: Firestore has no seeded component data")

    // D23: the default toolbox renders type-block cards (type-block-<typeId>), not the old
    // component-card-* grid; need ≥2 to form an edge.
    const cards = page.locator('[data-testid^="type-block-"]')
    const cardCount = await cards.count()
    test.skip(cardCount < 2, "Skipped: Need at least 2 components to create an edge")

    // Place node-express + postgresql via the canvas, then connect them through the store.
    await placeTwoNodesClearOfPanel(page)
    await connectFirstTwoNodesViaStore(page)

    // Wait for edge to appear in DOM (SVG edges may not pass Playwright visibility check)
    const edges = page.locator(".react-flow__edge")
    await expect(edges).toHaveCount(1, { timeout: 5_000 })

    // Select the edge via the store (see selectFirstEdgeViaStore) — opens ConnectionDetail.
    await selectFirstEdgeViaStore(page)

    // Story 4-3: edge selection now opens ConnectionDetail in the inspector
    await expect(page.locator('[data-testid="inspector-panel"]')).toBeVisible({ timeout: 5_000 })
    await expect(page.locator('[data-testid="connection-detail"]')).toBeVisible({ timeout: 3_000 })

    // Component-specific inspector content should NOT be visible (mutually exclusive selection).
    // Fluidity P1: the inspector no longer carries the config-selector — use the component-detail
    // heading (`inspector-heading`) as the "component inspector is showing" marker instead.
    await expect(page.locator('[data-testid="inspector-heading"]')).not.toBeVisible()

    await page.screenshot({
      path: `${SCREENSHOT_DIR}/10-edge-click-shows-connection-inspector.png`,
      fullPage: true,
    })
  })

  test("selecting different nodes updates inspector content", async ({ page }) => {
    await page.goto("/")

    const hasComponents = await waitForComponentLibrary(page)
    test.skip(!hasComponents, "Skipped: Firestore has no seeded component data")

    // D23: the default toolbox renders type-block cards (type-block-<typeId>); need ≥2 distinct types.
    const cards = page.locator('[data-testid^="type-block-"]')
    const cardCount = await cards.count()
    test.skip(cardCount < 2, "Skipped: Need at least 2 different components")

    // Place two different components via the canvas (node-express + postgresql).
    await placeTwoNodesClearOfPanel(page)

    // Select node 0 then node 1 via the store (panel-independent — see selectNthNodeViaStore).
    await selectNthNodeViaStore(page, 0)
    const inspectorPanel = page.locator('[data-testid="inspector-panel"]')
    const firstName = await inspectorPanel.locator("h2").textContent()

    await page.screenshot({
      path: `${SCREENSHOT_DIR}/11-first-node-selected.png`,
      fullPage: true,
    })

    await selectNthNodeViaStore(page, 1)

    const secondName = await inspectorPanel.locator("h2").textContent()

    // At minimum the inspector should still be visible with valid content (names compared below).
    await expect(inspectorPanel).toBeVisible()
    expect(secondName!.length).toBeGreaterThan(0)

    await page.screenshot({
      path: `${SCREENSHOT_DIR}/12-second-node-selected.png`,
      fullPage: true,
    })

    // If the two placed components are different, the inspector names should differ.
    // D23: read the placed-node names from the canvas (the archie-node contains the component
    // name), NOT from toolbox cards — the type-block grid no longer exposes per-component h4 names.
    if (cardCount >= 2) {
      const firstNodeName = await page.locator('[data-testid="archie-node"]').nth(0).textContent()
      const secondNodeName = await page.locator('[data-testid="archie-node"]').nth(1).textContent()
      if (firstNodeName !== secondNodeName) {
        expect(firstName).not.toBe(secondName)
      }
    }
  })

  test("inspector CSS transition animates width changes", async ({ page }) => {
    await page.goto("/")

    const hasComponents = await waitForComponentLibrary(page)
    test.skip(!hasComponents, "Skipped: Firestore has no seeded component data")

    // Verify the inspector aside has CSS transition property set
    const inspector = page.locator('[data-testid="inspector"]')
    await expect(inspector).toBeVisible()

    // Check that the transition property includes width
    const transition = await inspector.evaluate((el) => getComputedStyle(el).transitionProperty)
    expect(transition).toContain("width")

    // Check transition duration is 200ms (0.2s)
    const duration = await inspector.evaluate((el) => getComputedStyle(el).transitionDuration)
    expect(duration).toBe("0.2s")

    await page.screenshot({
      path: `${SCREENSHOT_DIR}/13-inspector-has-css-transition.png`,
      fullPage: true,
    })
  })

  // ---------------------------------------------------------------------------
  // Story 4-1: Code Snippets & Metric Explanations
  // AC-3 (graceful absence when no code snippet) covered by unit tests in
  // tests/unit/components/inspector/CodeSnippetViewer.test.tsx — not E2E-testable
  // without a component that lacks code snippet data in Firestore seed.
  // ---------------------------------------------------------------------------

  test("4-1 AC-1/2: code snippet section visible for active variant", async ({ page }) => {
    await page.goto("/")

    const hasComponents = await waitForComponentLibrary(page)
    test.skip(!hasComponents, "Skipped: Firestore has no seeded component data")

    // Place a component and open the inspector
    await addComponentToCanvas(page)
    await selectNodeOnCanvas(page)

    const inspectorPanel = page.locator('[data-testid="inspector-panel"]')
    await expect(inspectorPanel).toBeVisible()

    // Code lives behind a collapse-by-default "Code example" disclosure (P3 density) — open it.
    await page.locator('[data-testid="disclosure-code"]').click()

    // Seed data guarantees all components have codeSnippet — section must be present once expanded
    const codeSnippetSection = page.locator('[data-testid="code-snippet-section"]')
    await expect(codeSnippetSection).toBeVisible({ timeout: 5_000 })

    // Section must contain rendered code (the SyntaxHighlighter wraps code in <code> elements)
    const codeBlock = codeSnippetSection.locator("code").first()
    await expect(codeBlock).toBeVisible()
    const codeText = await codeBlock.textContent()
    expect(codeText!.trim().length).toBeGreaterThan(0)

    await page.screenshot({
      path: `${SCREENSHOT_DIR}/14-code-snippet-section-visible.png`,
      fullPage: true,
    })
  })

  test("4-1 AC-2: switching variant updates code snippet content", async ({ page }) => {
    await page.goto("/")

    const hasComponents = await waitForComponentLibrary(page)
    test.skip(!hasComponents, "Skipped: Firestore has no seeded component data")

    // Place a multi-variant component and open the read-only inspector for the code snippet.
    const { configTrigger } = await placeMultiVariantComponent(page)
    await selectNodeOnCanvas(page)
    // D103: the non-base tier (Cluster Mode) is a 1★ purchase and the E2E user has 0 spendable stars
    // here — own the tiers up front so the switch updates the snippet instead of failing the buy.
    await grantNodeTierOwnership(page)

    // Fluidity P1: the config dropdown is on the canvas block now.
    await expect(configTrigger).toBeVisible()
    const triggerButton = configTrigger

    // Expand the collapse-by-default "Code example" disclosure before reading the snippet.
    await page.locator('[data-testid="disclosure-code"]').click()

    // Capture the code snippet text before switching variant
    const codeSnippetSection = page.locator('[data-testid="code-snippet-section"]')
    await expect(codeSnippetSection).toBeVisible({ timeout: 5_000 })
    const initialCode = await codeSnippetSection.textContent()

    // Open dropdown and check for a second variant
    await triggerButton.click()
    const selectContent = page.locator("[role=listbox]")
    await expect(selectContent).toBeVisible({ timeout: 3_000 })

    const options = selectContent.locator("[role=option]")
    const optionCount = await options.count()
    test.skip(optionCount < 2, "Skipped: Component has only one config variant")

    // Select a not-currently-selected variant via data-state (deterministic — a text compare against
    // the trigger label can mis-match formatting and re-pick the current variant, so nothing changes).
    await selectContent.locator('[role=option][data-state="unchecked"]').first().click()

    // Dropdown closes after selection
    await selectContent.waitFor({ state: "hidden", timeout: 3_000 })

    // Code snippet section should still be present (both variants have snippets per seed data)
    await expect(codeSnippetSection).toBeVisible({ timeout: 5_000 })

    // The content should have changed to reflect the new variant
    const newCode = await codeSnippetSection.textContent()
    expect(newCode).not.toBe(initialCode)

    await page.screenshot({
      path: `${SCREENSHOT_DIR}/15-code-snippet-updated-after-variant-switch.png`,
      fullPage: true,
    })
  })

  test("4-1 AC-4/5/6: metric explanation expands on row click and collapses on second click", async ({
    page,
  }) => {
    await page.goto("/")

    const hasComponents = await waitForComponentLibrary(page)
    test.skip(!hasComponents, "Skipped: Firestore has no seeded component data")

    // Place a component and open the inspector
    await addComponentToCanvas(page)
    await selectNodeOnCanvas(page)

    const inspectorPanel = page.locator('[data-testid="inspector-panel"]')
    await expect(inspectorPanel).toBeVisible()
    await expandInspectorSection(page, "disclosure-metrics")

    // Find a metric bar that has an explanation (identified by the chevron testid)
    const chevron = page.locator('[data-testid="metric-explanation-chevron"]').first()
    await expect(chevron).toBeVisible({ timeout: 5_000 })

    // The explanation div should NOT be visible before clicking
    const explanation = page.locator('[data-testid="metric-explanation"]').first()
    await expect(explanation).not.toBeVisible()

    // Locate the parent metric-bar row that owns the chevron and click it
    const metricRow = page
      .locator('[data-testid="metric-bar"]')
      .filter({ has: page.locator('[data-testid="metric-explanation-chevron"]') })
      .first()
    await expect(metricRow).toBeVisible()
    await metricRow.click()

    // AC-4/5: explanation div is now visible with reason text
    await explanation.waitFor({ state: "visible", timeout: 3_000 })
    const reasonText = await explanation.locator("p").first().textContent()
    expect(reasonText!.trim().length).toBeGreaterThan(0)

    // AC-5: contributing factors list is present (at least one <li>)
    const factorItems = explanation.locator("li")
    expect(await factorItems.count()).toBeGreaterThanOrEqual(1)

    await page.screenshot({
      path: `${SCREENSHOT_DIR}/16-metric-explanation-expanded.png`,
      fullPage: true,
    })

    // AC-6: click the same row again to collapse
    await metricRow.click()
    await explanation.waitFor({ state: "hidden", timeout: 3_000 })
    await expect(explanation).not.toBeVisible()

    await page.screenshot({
      path: `${SCREENSHOT_DIR}/17-metric-explanation-collapsed.png`,
      fullPage: true,
    })
  })

  test("4-1 AC-7: metric rows without explanation have no chevron", async ({ page }) => {
    await page.goto("/")

    const hasComponents = await waitForComponentLibrary(page)
    test.skip(!hasComponents, "Skipped: Firestore has no seeded component data")

    // Place a component and open the inspector
    await addComponentToCanvas(page)
    await selectNodeOnCanvas(page)

    const inspectorPanel = page.locator('[data-testid="inspector-panel"]')
    await expect(inspectorPanel).toBeVisible()
    await expandInspectorSection(page, "disclosure-metrics")

    // Count total metric bars and total chevrons
    const allMetricBars = page.locator('[data-testid="metric-bar"]')
    await expect(allMetricBars.first()).toBeVisible({ timeout: 5_000 })
    const totalBars = await allMetricBars.count()
    expect(totalBars).toBeGreaterThan(0)

    const allChevrons = page.locator('[data-testid="metric-explanation-chevron"]')
    const chevronCount = await allChevrons.count()

    // At minimum, chevrons must never outnumber metric bars
    expect(chevronCount).toBeLessThanOrEqual(totalBars)

    // Verify metric bars without chevrons are NOT clickable to expand
    // (they have no onClick — clicking them is a no-op, no explanation appears)
    const barsWithoutChevron = page
      .locator('[data-testid="metric-bar"]')
      .filter({ hasNot: page.locator('[data-testid="metric-explanation-chevron"]') })

    const barsWithoutChevronCount = await barsWithoutChevron.count()
    if (barsWithoutChevronCount > 0) {
      await barsWithoutChevron.first().click()
      // No explanation should appear after clicking a row without chevron
      await expect(
        page.locator('[data-testid="metric-explanation"]').first(),
      ).not.toBeVisible({ timeout: 1_000 })
    }

    await page.screenshot({
      path: `${SCREENSHOT_DIR}/18-metric-rows-without-explanation-no-chevron.png`,
      fullPage: true,
    })
  })
})
