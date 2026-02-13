# Story: 1-5 Component Inspector & Configuration

## Status: done
## Epic: Epic 1 — Architecture Canvas & Component Library

## Overview

As a user, I want to click a component to see its full details and switch its configuration variant, so that I can understand each component's characteristics and explore different configurations.

This story creates the right-side inspector panel that displays full component information when a canvas node is clicked. It includes a detail view (name, category, description, pros, cons), a configuration variant dropdown for switching between variants (FR12 two-level selection), and a metrics display grouped by 7 categories with directional ratings and visual bar indicators. The inspector panel is collapsible (UX9) and updates synchronously when the user switches variants — metrics reflect the new variant's base values from the component library (connected-component recalculation is deferred to Epic 2).

## Functional Acceptance Criteria

**AC-1: Click Component Opens Inspector**
**Given** components exist on the canvas
**When** I click a component node
**Then** the inspector panel opens on the right side (300px, collapsible — UX9)
**And** displays the component's detail card: name, category, description, metrics list, pros, cons

**AC-2: Configuration Variant Dropdown**
**Given** the inspector is showing a component
**When** I view the configuration section
**Then** I see a dropdown showing the current configuration variant
**And** the dropdown lists all available variants for this component type (FR12: two-level selection)

**AC-3: Variant Selection Updates Metrics**
**Given** the inspector is showing a component
**When** I select a different configuration variant from the dropdown
**Then** the component's displayed metrics update to reflect the new variant's base values from the component library (connected-component recalculation is added in Epic 2)
**And** the component node on the canvas updates its label to show the active variant name

**AC-4: Collapse and Expand Inspector**
**Given** the inspector panel is open
**When** I click the collapse button
**Then** the inspector collapses to maximize canvas space
**And** clicking expand restores it

**AC-5: Metrics Display with Visual Bars**
**Given** I view the metrics section in the inspector
**When** metrics are displayed
**Then** each metric shows a directional rating with a visual bar indicator
**And** metrics are grouped by their category (7 categories)

## Architectural Acceptance Criteria (MANDATORY)

> These ACs are MANDATORY and will be validated during code review.

### File Location Requirements

- **AC-ARCH-LOC-1:** InspectorPanel located at `src/components/inspector/InspectorPanel.tsx`
- **AC-ARCH-LOC-2:** ComponentDetail located at `src/components/inspector/ComponentDetail.tsx`
- **AC-ARCH-LOC-3:** ConfigSelector located at `src/components/inspector/ConfigSelector.tsx`
- **AC-ARCH-LOC-4:** MetricCard located at `src/components/inspector/MetricCard.tsx`
- **AC-ARCH-LOC-5:** MetricBar located at `src/components/inspector/MetricBar.tsx`
- **AC-ARCH-LOC-6:** Architecture store modifications in `src/stores/architectureStore.ts`
- **AC-ARCH-LOC-7:** UI store modifications in `src/stores/uiStore.ts`
- **AC-ARCH-LOC-8:** AppLayout modifications in `src/components/layout/AppLayout.tsx`
- **AC-ARCH-LOC-9:** InspectorPanel unit tests at `tests/unit/components/inspector/InspectorPanel.test.tsx`
- **AC-ARCH-LOC-10:** ComponentDetail unit tests at `tests/unit/components/inspector/ComponentDetail.test.tsx`
- **AC-ARCH-LOC-11:** ConfigSelector unit tests at `tests/unit/components/inspector/ConfigSelector.test.tsx`
- **AC-ARCH-LOC-12:** MetricCard unit tests at `tests/unit/components/inspector/MetricCard.test.tsx`

### Pattern Requirements

- **AC-ARCH-PATTERN-1:** InspectorPanel reads `selectedNodeId` from `uiStore` via Zustand selector — NOT from props or context (AR15)
- **AC-ARCH-PATTERN-2:** InspectorPanel reads `nodes` from `architectureStore` via Zustand selector — subscribes only to `nodes` array, not entire store (AR15)
- **AC-ARCH-PATTERN-3:** InspectorPanel calls `componentLibrary.getComponent()` via `useLibrary()` hook for synchronous O(1) lookup — no async calls during render (AR7)
- **AC-ARCH-PATTERN-4:** `updateNodeConfigVariant` uses immutable update — `nodes.map(n => n.id === nodeId ? { ...n, data: { ...n.data, activeConfigVariantId } } : n)` (AR15)
- **AC-ARCH-PATTERN-5:** ConfigSelector is a controlled component — receives `activeVariantId` and `onVariantChange` as props, does NOT read store directly (separation of concerns)
- **AC-ARCH-PATTERN-6:** MetricBar and MetricCard are pure presentational components — receive data via props, no store access, no service calls
- **AC-ARCH-PATTERN-7:** ComponentDetail receives component data as props from InspectorPanel — does NOT call componentLibrary directly
- **AC-ARCH-PATTERN-8:** `inspectorCollapsed` state lives in `uiStore` — AppLayout reads via selector, InspectorPanel toggle button dispatches via action
- **AC-ARCH-PATTERN-9:** Metric bar color derives from `numericValue`: green (7-10), yellow (4-6), red (1-3) — consistent with heatmap semantics (UX18 color separation)
- **AC-ARCH-PATTERN-10:** Metrics grouped by category using `COMPONENT_CATEGORIES` constant order — same source of truth as toolbox category colors (from Story 1-2)
- **AC-ARCH-PATTERN-11:** shadcn/ui `Select` component used for config variant dropdown — consistent with UI component library pattern
- **AC-ARCH-PATTERN-12:** Inspector panel width uses `INSPECTOR_WIDTH` constant (300px) from `src/lib/constants.ts` — single source of truth

### Anti-Pattern Requirements (Must NOT Happen)

- **AC-ARCH-NO-1:** InspectorPanel MUST NOT import `firebase/firestore` or call Firestore directly — all data from componentLibrary cache via useLibrary hook
- **AC-ARCH-NO-2:** InspectorPanel MUST NOT subscribe to entire `architectureStore` — use selectors for specific slices (`nodes`, `updateNodeConfigVariant`)
- **AC-ARCH-NO-3:** `updateNodeConfigVariant` MUST NOT mutate `state.nodes` array or node objects directly — always create new arrays and objects via spread
- **AC-ARCH-NO-4:** MetricBar, MetricCard, ComponentDetail MUST NOT access Zustand stores directly — pure presentational, data via props only
- **AC-ARCH-NO-5:** ConfigSelector `onVariantChange` MUST NOT make async calls — `updateNodeConfigVariant` is synchronous (updates store immutably, React re-renders)
- **AC-ARCH-NO-6:** Inspector panel MUST NOT use `dangerouslySetInnerHTML` for component descriptions, pros, cons — render via React JSX default escaping (NFR8)
- **AC-ARCH-NO-7:** Inspector MUST NOT render edge details when `selectedEdgeId` is set — edge inspection is deferred to Epic 4 Story 4-3
- **AC-ARCH-NO-8:** Metric bar width MUST NOT be calculated using CSS `calc()` with user-provided values — use `numericValue` (1-10) as percentage of max width
- **AC-ARCH-NO-9:** Inspector collapse animation MUST NOT use `setTimeout` or `requestAnimationFrame` — use CSS `transition` property for smooth width change
- **AC-ARCH-NO-10:** ComponentDetail MUST NOT import from `@xyflow/react` — it receives plain component data, not React Flow nodes

## File Specification

| File/Component | Exact Path | Pattern | Status |
|----------------|------------|---------|--------|
| InspectorPanel | `src/components/inspector/InspectorPanel.tsx` | Smart container (AR15, AR20) | NEW |
| ComponentDetail | `src/components/inspector/ComponentDetail.tsx` | Presentational component (AR20) | NEW |
| ConfigSelector | `src/components/inspector/ConfigSelector.tsx` | Controlled component (AR20) | NEW |
| MetricCard | `src/components/inspector/MetricCard.tsx` | Presentational component (AR20) | NEW |
| MetricBar | `src/components/inspector/MetricBar.tsx` | Presentational component (AR20) | NEW |
| architectureStore | `src/stores/architectureStore.ts` | Zustand store (AR15) | MODIFY |
| uiStore | `src/stores/uiStore.ts` | Zustand store (AR15) | MODIFY |
| constants | `src/lib/constants.ts` | Constants (AR21) | MODIFY |
| AppLayout | `src/components/layout/AppLayout.tsx` | Layout component (UX1) | MODIFY |
| InspectorPanel.test | `tests/unit/components/inspector/InspectorPanel.test.tsx` | Unit test (AR22) | NEW |
| ComponentDetail.test | `tests/unit/components/inspector/ComponentDetail.test.tsx` | Unit test (AR22) | NEW |
| ConfigSelector.test | `tests/unit/components/inspector/ConfigSelector.test.tsx` | Unit test (AR22) | NEW |
| MetricCard.test | `tests/unit/components/inspector/MetricCard.test.tsx` | Unit test (AR22) | NEW |
| architectureStore.test | `tests/unit/stores/architectureStore.test.ts` | Unit test (AR22) | MODIFY |
| uiStore.test | `tests/unit/stores/uiStore.test.ts` | Unit test (AR22) | NEW or MODIFY |
| inspector-and-config.spec | `tests/e2e/inspector-and-config.spec.ts` | E2E test (Playwright) | NEW |

## Tasks / Subtasks

### Task 1: Store Extensions & Constants
- [x] 1.1 Add `inspectorCollapsed: boolean` state to `uiStore` (default `false`)
- [x] 1.2 Add `setInspectorCollapsed(collapsed: boolean)` action to `uiStore`
- [x] 1.3 Add `updateNodeConfigVariant(nodeId: string, variantId: string)` action to `architectureStore`
- [x] 1.4 Implement immutable update logic in `updateNodeConfigVariant`: `nodes.map(n => n.id === nodeId ? { ...n, data: { ...n.data, activeConfigVariantId: variantId } } : n)`
- [x] 1.5 Verify `removeNodes` action (from Story 1-4) clears `selectedNodeId` via `uiStore.clearSelection()` if deleted node was selected
- [x] 1.6 Add `INSPECTOR_COLLAPSED_WIDTH = 40` constant to `constants.ts`
- [x] 1.7 Write unit tests for all new store actions — immutability, selection clearing, collapse toggle

### Task 2: Metric Display Components
- [x] 2.1 Create `MetricBar.tsx` — displays single metric: name (left), visual bar (proportional to `numericValue` 1-10), directional rating text (right: low/medium/high)
- [x] 2.2 Bar color follows heatmap semantics: green (`bg-green-500`, numericValue 7-10), yellow (`bg-yellow-500`, 4-6), red (`bg-red-500`, 1-3)
- [x] 2.3 Add `data-testid="metric-bar"` and `data-metric-id={metric.id}` for testing
- [x] 2.4 Create `MetricCard.tsx` — groups metrics by category: renders category name + icon + color stripe header, followed by list of `MetricBar` components
- [x] 2.5 Write unit tests for `MetricBar` (renders name, bar width based on numericValue, correct color for each range, correct data-testid)
- [x] 2.6 Write unit tests for `MetricCard` (renders category header with icon and color, displays correct number of MetricBars)

### Task 3: Configuration Selector Component
- [x] 3.1 Install shadcn/ui components: `npx shadcn@latest add select card separator`
- [x] 3.2 Create `ConfigSelector.tsx` — controlled component with props: `variants: ConfigVariant[]`, `activeVariantId: string`, `onVariantChange: (id: string) => void`
- [x] 3.3 Render shadcn `Select` with current variant as value, all variants as options
- [x] 3.4 `onValueChange` calls `onVariantChange(newVariantId)` — delegates to parent
- [x] 3.5 Add `data-testid="config-selector"` for testing
- [x] 3.6 Handle edge case: component with single variant (dropdown still functional, just one option)
- [x] 3.7 Write unit tests: renders current variant, dropdown lists all variants, onChange calls callback, single-variant case

### Task 4: ComponentDetail & InspectorPanel
- [x] 4.1 Create `ComponentDetail.tsx` — presentational component with props: `component: Component`, `activeVariantId: string`, `onVariantChange: (variantId: string) => void`
- [x] 4.2 Render component header: name (title), category badge with color, description paragraph
- [x] 4.3 Render `ConfigSelector` wired to `architectureStore.updateNodeConfigVariant(nodeId, variantId)` via callback prop
- [x] 4.4 Render pros list (bullet points) and cons list (bullet points)
- [x] 4.5 Group active variant's metrics by category using `useMemo`: `Map<string, MetricValue[]>` ordered by `COMPONENT_CATEGORIES`
- [x] 4.6 Render `MetricCard` for each category that has metrics
- [x] 4.7 Wrap content in shadcn `ScrollArea` for overflow scrolling
- [x] 4.8 Create `InspectorPanel.tsx` — smart container: reads `selectedNodeId` from `uiStore`, `nodes` from `architectureStore`, calls `useLibrary().getComponentById()`
- [x] 4.9 Defensive checks: return `null` if no `selectedNodeId`, no matching node, or component not found in library
- [x] 4.10 Read `inspectorCollapsed` from `uiStore`: when collapsed render 40px panel with expand button (`ChevronLeft` icon); when expanded render full panel with collapse button (`ChevronRight` icon)
- [x] 4.11 Pass component data + activeVariantId to `ComponentDetail`
- [x] 4.12 Add `data-testid="inspector-panel"` for testing
- [x] 4.13 Write unit tests for `ComponentDetail`: renders header, category badge, description, pros, cons, ConfigSelector, metric groups
- [x] 4.14 Write unit tests for `InspectorPanel`: renders when node selected, returns null when no selection, returns null when node not found, collapse/expand behavior, defensive error handling, aria-labels

### Task 5: Layout Integration & Styling
- [x] 5.1 Update `AppLayout.tsx` — replace inspector placeholder `<aside>` with `<InspectorPanel />`
- [x] 5.2 Read `inspectorCollapsed` from `uiStore` to adjust layout: when collapsed the inspector column is 40px, when expanded it is 300px
- [x] 5.3 Add CSS transition on the inspector container for smooth collapse/expand animation
- [x] 5.4 Verify dark-mode styling: panel background uses `bg-panel` token, text uses `text-text-primary`/`text-text-secondary`, border uses `border-archie-border`
- [x] 5.5 Apply 4px base spacing unit (`SPACING_*` constants) for internal padding and gaps

### Task 6: Verification & Smoke Testing
- [x] 6.1 Run `npx tsc --noEmit` — no type errors
- [x] 6.2 Run `npm run test:quick` — all 340 tests pass
- [x] 6.3 Verify coverage meets thresholds (Lines 45%, Branches 30%, Functions 25%, Statements 40%)
- [ ] 6.4 Manual smoke test: login -> drag component -> click component -> inspector opens with name/category/description/pros/cons -> change config variant -> metrics update -> collapse inspector -> expand inspector -> click canvas background -> inspector hides -> select node then delete -> inspector clears
- [ ] 6.5 Verify edge selection does NOT show edge details in inspector (out of scope — Epic 4 Story 4-3)

## Dev Notes

### Architecture Guidance

**Data Flow — Node Selection to Inspector:**
```
User clicks canvas node
  -> CanvasView calls uiStore.setSelectedNodeId(nodeId)
  -> InspectorPanel re-renders (Zustand selector on selectedNodeId)
  -> Finds node in architectureStore.nodes by ID
  -> Extracts archieComponentId + activeConfigVariantId from node.data
  -> Calls useLibrary().getComponentById(archieComponentId) — sync O(1)
  -> Passes component + variant data to ComponentDetail
  -> ComponentDetail renders header, ConfigSelector, pros/cons, MetricCards
```

**Data Flow — Config Variant Switch:**
```
User selects new variant in ConfigSelector dropdown
  -> ConfigSelector calls onVariantChange(newVariantId)
  -> ComponentDetail passes through to architectureStore.updateNodeConfigVariant(nodeId, variantId)
  -> Store updates node.data.activeConfigVariantId immutably
  -> InspectorPanel re-renders (Zustand selector on nodes)
  -> Finds same node, extracts NEW activeConfigVariantId
  -> Reads NEW variant's metrics from component library
  -> Renders updated MetricCards with new metrics
  (NOTE: No connected-component recalculation — that's Epic 2)
```

**Implementation Order:**
1. Store extensions (Task 1) — foundation
2. MetricBar + MetricCard (Task 2) — pure presentational, test in isolation
3. ConfigSelector (Task 3) — controlled component, standalone
4. ComponentDetail + InspectorPanel (Task 4) — integrates everything
5. Layout wiring (Task 5) — replaces placeholder
6. Verification (Task 6)

**Key Architecture Patterns:**
1. **Smart Container + Presentational Children:** InspectorPanel is the only component that reads stores. All children (ComponentDetail, ConfigSelector, MetricCard, MetricBar) receive data via props.
2. **Zustand Selectors (AR15):** `const selectedNodeId = useUiStore((s) => s.selectedNodeId)` — never subscribe to entire store.
3. **Synchronous Lookups (AR7):** `useLibrary().getComponentById()` is O(1) from Map cache. No async calls during render.
4. **Immutable Updates (AR15):** `nodes.map(n => n.id === nodeId ? { ...n, data: { ...n.data, activeConfigVariantId } } : n)` — never `state.nodes[i].data = ...`.
5. **Controlled Components:** ConfigSelector receives value + onChange, doesn't manage internal state or call stores.

### Technical Notes

**shadcn/ui Components:**
- `Select` — config variant dropdown (radix-ui/react-select under the hood)
- `ScrollArea` — scrollable inspector content (metrics can overflow)
- `Badge` — category badges on component header
- `Card` — component detail card wrapper (optional, can use plain div with styling)
- `Separator` — section dividers between header/config/pros/cons/metrics
- `Button` — collapse/expand toggle (already installed from Story 1-1)

**Metric Bar Visual Structure:**
```
┌──────────────────────────────────────────────┐
│ Query Performance   ████████░░  high         │
│ Data Consistency    ██████████  high         │
│ Write Throughput    ████░░░░░░  medium       │
│ Memory Usage        ██░░░░░░░░  low          │
└──────────────────────────────────────────────┘
```
- Bar width = `numericValue * 10` (percentage)
- Color: green (7-10), yellow (4-6), red (1-3)
- Rating text: low/medium/high from `metric.value`

**Inspector Panel Collapse:**
- Collapsed: 40px wide, shows `ChevronLeft` icon button only
- Expanded: 300px wide (`INSPECTOR_WIDTH`), shows full content with `ChevronRight` collapse button
- State: `uiStore.inspectorCollapsed` (boolean)
- Animation: CSS `transition: width 200ms ease` on the panel container

**Defensive Checks in InspectorPanel:**
```typescript
// All defensive — return null early for safe states
const selectedNodeId = useUiStore((s) => s.selectedNodeId)
if (!selectedNodeId) return null  // No node selected

const nodes = useArchitectureStore((s) => s.nodes)
const selectedNode = nodes.find((n) => n.id === selectedNodeId)
if (!selectedNode) return null  // Node was deleted

const { getComponentById } = useLibrary()
const component = getComponentById(selectedNode.data.archieComponentId)
if (!component) return <ErrorState />  // Component not in library
```

**Common Pitfalls:**
1. **Nested immutability:** `updateNodeConfigVariant` must spread both the node AND node.data — `{ ...n, data: { ...n.data, activeConfigVariantId } }`. Missing the inner spread mutates the original data object.
2. **Store subscription scope:** Don't subscribe to entire architectureStore for just one node — use `(s) => s.nodes` selector, then find in component.
3. **Edge selection interference:** When `selectedEdgeId` is set (Story 1-4), do NOT render edge details — InspectorPanel only responds to `selectedNodeId`. Since `setSelectedNodeId` clears `selectedEdgeId` and vice versa (mutual exclusion from Story 1-4), this is naturally handled.
4. **Metric category ordering:** Group metrics by category using `COMPONENT_CATEGORIES` order, not arbitrary Map insertion order. Use the constant as the iteration source.
5. **Component without variants:** If `component.configVariants` is empty, hide the ConfigSelector section entirely. Some components may only have baseMetrics.

**Security:**
- Component data comes from componentLibrary (trusted, Zod-validated at repository boundary)
- All text rendered via React JSX escaping — no `dangerouslySetInnerHTML`
- No `eval()`, `new Function()`, or dynamic `import()`
- No user-controlled text input in this story (inspector displays library data)

### Cross-Cutting Dependencies

**DEPENDS ON (inbound):**
- Story 1-2: `componentSchema.ts` (Component, ConfigVariant types), `metricSchema.ts` (MetricValue, MetricCategory), `componentLibrary` service (`getComponent()` sync lookup), `useLibrary` hook, `COMPONENT_CATEGORIES` constants
- Story 1-3: `architectureStore` (`nodes`, `ArchieNodeData` with `archieComponentId` and `activeConfigVariantId`), `uiStore` (`selectedNodeId`, `setSelectedNodeId`), `CanvasView` (`onNodeClick` dispatches selection)
- Story 1-4: `uiStore` (`selectedEdgeId`, `clearSelection()`), `architectureStore` (`removeNodes` clears selection)

**CONSUMED BY (outbound):**
- Story 1-6 (Component Swapping): Extends inspector with `ComponentSwapper.tsx` alongside `ConfigSelector` — reads same component data, provides type-level swap
- Epic 2 Story 2-1 (Recalculation): `updateNodeConfigVariant` becomes the trigger for metric propagation across connected components
- Epic 2 Story 2-3 (Scoring Dashboard): Dashboard reads same metrics displayed in inspector for aggregate scores
- Epic 4 Story 4-1 (Code Snippets & Metric Explanations): Extends `ComponentDetail` with `CodeSnippet.tsx` and `MetricExplanation.tsx`
- Epic 4 Story 4-2 (Variant Recommendations & Metric Tools): Extends inspector with `VariantRecommendation.tsx`, `MetricDelta.tsx`, `MetricFilter.tsx`
- Epic 4 Story 4-3 (Connection Inspection): `InspectorPanel` routes to `ConnectionInspector.tsx` when `selectedEdgeId` is set

No DEPENDS tags required — dependency chain is linear within Epic 1.

### E2E Testing

- Action: CREATE
- Test File: `tests/e2e/inspector-and-config.spec.ts`
- Result: PASS (11 tests, 3 consecutive green runs)
- Multi-User: SINGLE-USER
- Quality Score: 94/100 (TEA 5-Dimension)
  - Determinism: 18/20
  - Isolation: 20/20
  - Maintainability: 19/20
  - Coverage: 20/20
  - Performance: 17/20
- Duration: ~23s
- Date: 2026-02-12

Tests cover all 5 functional ACs plus 5 additional scenarios:
1. AC-1: Click component → inspector opens with name/category/description/gains/costs
2. AC-2: Config variant dropdown shows current + all variants
3. AC-3: Switch variant → metrics update
4. AC-4: Collapse (40px) and expand (300px) inspector
5. AC-5: Metrics with visual bars grouped by category
6. Canvas background click hides inspector
7. Delete selected node clears inspector
8. Edge selection does NOT show component inspector
9. Switching between different nodes updates inspector content
10. Inspector CSS transition animates width changes

## ECC Analysis Summary
- Risk Level: MEDIUM
- Complexity: Moderate
- Sizing: LARGE (6 tasks, ~35 subtasks, 15 files)
- Agents consulted: Planner, Architect
