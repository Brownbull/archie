# Story: 1-6 In-Place Component Swapping

## Status: done
## Epic: Epic 1 — Architecture Canvas & Component Library

## Overview

As a user, I want to swap a placed component for a different one in the same category without losing my connections, so that I can quickly compare alternatives (e.g., PostgreSQL vs MongoDB) in my architecture.

This story extends the inspector panel (from Story 1-5) with a ComponentSwapper dropdown that lists alternative component types in the same category. Selecting a different type updates the canvas node's component reference, resets to the new component's default configuration variant, and preserves all existing connections and canvas position. The swap is instantaneous — it updates `archieComponentId` in node data while the React Flow node ID stays the same, so edges (connections) are automatically preserved.

## Functional Acceptance Criteria

**AC-1: Component Swapper Dropdown Shows Alternatives**
**Given** a component is placed on the canvas with connections
**When** I open the component swapper in the inspector
**Then** I see a dropdown of alternative component types in the same category

**AC-2: Swap Updates Node While Preserving Connections**
**Given** I select a different component type from the swapper
**When** the swap is applied
**Then** the canvas node changes to the new component type
**And** all existing connections are preserved (not removed)
**And** the inspector updates to show the new component's details and metrics
**And** the new component's default configuration variant is active

**AC-3: Config Variants Update After Swap**
**Given** I swap a component type
**When** the new component has different configuration variants
**Then** the config variant dropdown updates to show the new component's available variants

**AC-4: Position Preserved After Swap**
**Given** I swap a component type
**When** the swap completes
**Then** the component's position on the canvas does not change

## Architectural Acceptance Criteria (MANDATORY)

> These ACs are MANDATORY and will be validated during code review.

### File Location Requirements

- **AC-ARCH-LOC-1:** ComponentSwapper located at `src/components/inspector/ComponentSwapper.tsx`
- **AC-ARCH-LOC-2:** ComponentDetail modified at `src/components/inspector/ComponentDetail.tsx`
- **AC-ARCH-LOC-3:** architectureStore modified at `src/stores/architectureStore.ts`
- **AC-ARCH-LOC-4:** ComponentSwapper unit tests at `tests/unit/components/inspector/ComponentSwapper.test.tsx`
- **AC-ARCH-LOC-5:** architectureStore unit tests modified at `tests/unit/stores/architectureStore.test.ts`

### Pattern Requirements

- **AC-ARCH-PATTERN-1:** ComponentSwapper is a controlled presentational component — receives `currentComponentId`, `currentCategory`, `nodeId`, `onSwapComponent` as props, does NOT read stores directly
- **AC-ARCH-PATTERN-2:** ComponentSwapper calls `componentLibrary.getComponentsByCategory()` via `useLibrary()` hook for synchronous O(1) lookup — no async calls during render
- **AC-ARCH-PATTERN-3:** `swapNodeComponent` uses immutable update — `nodes.map(n => n.id === nodeId ? { ...n, data: { ...n.data, archieComponentId, activeConfigVariantId } } : n)` (both node AND data spread)
- **AC-ARCH-PATTERN-4:** `swapNodeComponent` resets `activeConfigVariantId` to first variant of new component — never reuses old variant ID (different component = different variants)
- **AC-ARCH-PATTERN-5:** ComponentSwapper filters alternatives to same category only — uses `component.category` to call `getComponentsByCategory(category)`
- **AC-ARCH-PATTERN-6:** ComponentSwapper excludes current component from alternatives list — `alternatives.filter(c => c.id !== currentComponentId)`
- **AC-ARCH-PATTERN-7:** shadcn/ui `Select` component used for component type dropdown — consistent with ConfigSelector pattern from Story 1-5
- **AC-ARCH-PATTERN-8:** ComponentDetail wires ComponentSwapper to architectureStore action — passes `onSwapComponent={(id) => swapNodeComponent(nodeId, id)}`
- **AC-ARCH-PATTERN-9:** ComponentSwapper handles single-component category gracefully — disables dropdown or shows "No alternatives available" message
- **AC-ARCH-PATTERN-10:** `swapNodeComponent` includes defensive check — if `componentLibrary.getComponentById(newComponentId)` returns null, early-return (no-op)

### Anti-Pattern Requirements (Must NOT Happen)

- **AC-ARCH-NO-1:** ComponentSwapper MUST NOT import from `@/stores` or call Zustand stores directly — receives data via props, delegates action via callback
- **AC-ARCH-NO-2:** ComponentSwapper MUST NOT import `firebase/firestore` or call Firestore directly — all data from componentLibrary cache via useLibrary hook
- **AC-ARCH-NO-3:** `swapNodeComponent` MUST NOT mutate `state.nodes` array or node objects directly — always create new arrays and objects via spread
- **AC-ARCH-NO-4:** `swapNodeComponent` MUST NOT reuse old `activeConfigVariantId` — always reset to default variant of new component (first variant in `configVariants` array)
- **AC-ARCH-NO-5:** ComponentSwapper MUST NOT allow cross-category swapping — filter alternatives by `currentCategory` only
- **AC-ARCH-NO-6:** ComponentSwapper MUST NOT include current component in alternatives list — filter using `c.id !== currentComponentId`
- **AC-ARCH-NO-7:** ComponentSwapper MUST NOT make async calls during render — `getComponentsByCategory()` is synchronous from in-memory cache
- **AC-ARCH-NO-8:** ComponentDetail MUST NOT update edges when swapping component — React Flow edges are keyed by node ID, automatically preserved
- **AC-ARCH-NO-9:** `swapNodeComponent` MUST NOT update React Flow visual state (position, dimensions) — only updates `node.data` (domain state)
- **AC-ARCH-NO-10:** ComponentSwapper dropdown MUST NOT use `dangerouslySetInnerHTML` for component names — render via React JSX default escaping

## File Specification

| File/Component | Exact Path | Pattern | Status |
|----------------|------------|---------|--------|
| ComponentSwapper | `src/components/inspector/ComponentSwapper.tsx` | Controlled presentational component (AR20) | NEW |
| ComponentDetail | `src/components/inspector/ComponentDetail.tsx` | Presentational component (AR20) | MODIFY |
| architectureStore | `src/stores/architectureStore.ts` | Zustand store (AR15) | MODIFY |
| ComponentSwapper.test | `tests/unit/components/inspector/ComponentSwapper.test.tsx` | Unit test (AR22) | NEW |
| architectureStore.test | `tests/unit/stores/architectureStore.test.ts` | Unit test (AR22) | MODIFY |
| component-swapping.spec | `tests/e2e/component-swapping.spec.ts` | E2E test (Playwright) | NEW |

## Tasks / Subtasks

### Task 1: Store Extension for Component Swapping
- [x] 1.1 Add `swapNodeComponent(nodeId: string, newComponentId: string)` action to `architectureStore`
- [x] 1.2 Implement immutable update: `nodes.map(n => n.id === nodeId ? { ...n, data: { ...n.data, archieComponentId: newComponentId, activeConfigVariantId: newComponent.configVariants[0]?.id || '' } } : n)`
- [x] 1.3 Add defensive check: if `componentLibrary.getComponentById(newComponentId)` returns null, early-return (no-op)
- [x] 1.4 Write unit tests: verify immutability (new node/data objects), verify default variant assignment, verify position preservation (node position unchanged), verify node-not-found case (no-op), verify other nodes unchanged

### Task 2: ComponentSwapper UI Component
- [x] 2.1 Create `ComponentSwapper.tsx` — controlled component with props: `currentComponentId: string`, `currentCategory: string`, `onSwapComponent: (newComponentId: string) => void`
- [x] 2.2 Use `useLibrary().getComponentsByCategory(currentCategory)` to fetch alternatives
- [x] 2.3 Filter alternatives: exclude current component (`c.id !== currentComponentId`)
- [x] 2.4 Render shadcn `Select` with current component name as value, alternatives as options (show component name + brief description)
- [x] 2.5 `onValueChange` calls `onSwapComponent(newComponentId)` — delegates to parent
- [x] 2.6 Handle edge case: only 1 component in category — hide swapper or show "No alternatives available in this category"
- [x] 2.7 Add `data-testid="component-swapper"` for testing
- [x] 2.8 Write unit tests: renders current component, dropdown lists correct alternatives (same category, excludes current), onChange calls callback with correct ID, single-component-in-category case

### Task 3: Inspector Integration
- [x] 3.1 Add ComponentSwapper section to `ComponentDetail.tsx` — positioned between component header/description and ConfigSelector
- [x] 3.2 Add section label "Component Type" above the swapper dropdown
- [x] 3.3 Wire `onSwapComponent` callback to `architectureStore.swapNodeComponent(nodeId, newComponentId)` via prop from InspectorPanel
- [x] 3.4 Add shadcn `Separator` between ComponentSwapper and ConfigSelector sections for visual hierarchy
- [x] 3.5 Verify visual order: Header → Description → Component Type (swapper) → Separator → Configuration (variant selector) → Separator → Pros/Cons → Metrics
- [x] 3.6 Update ComponentDetail unit tests: verify ComponentSwapper renders with correct props, verify swap callback is wired correctly

### Task 4: Verification & Smoke Testing
- [x] 4.1 Run `npx tsc --noEmit` — no type errors
- [x] 4.2 Run `npm run test:quick` — all tests pass (364/364)
- [x] 4.3 Verify coverage meets thresholds (Lines 45%, Branches 30%, Functions 25%, Statements 40%)
- [ ] 4.4 Manual smoke test: login -> drag component -> wire connection -> click component -> see ComponentSwapper dropdown -> select alternative -> verify: name changes, metrics update to new component, connections preserved, position unchanged, ConfigSelector shows new component's variants
- [ ] 4.5 Manual edge case test: component with only 1 in category (swapper hidden or disabled)
- [ ] 4.6 Manual test: swap component -> change config variant -> swap again -> verify independent operations

## Dev Notes

### Architecture Guidance

**Data Flow — Component Swap:**
```
User selects alternative in ComponentSwapper dropdown
  → ComponentSwapper calls onSwapComponent(newComponentId)
  → ComponentDetail passes through to architectureStore.swapNodeComponent(nodeId, newComponentId)
  → Store looks up new component via componentLibrary.getComponentById(newComponentId)
  → Store updates node.data immutably: { archieComponentId: newComponentId, activeConfigVariantId: defaultVariant }
  → InspectorPanel re-renders (Zustand selector on nodes)
  → Finds updated node with new archieComponentId
  → Loads new component from componentLibrary
  → Passes new component data to ComponentDetail
  → ComponentDetail renders new name, category, metrics, ConfigSelector with new variants
  → Canvas node label updates (displays new component name)
  → Connections unchanged (edges reference node ID, not component ID)
```

**Why Connections Are Preserved:**
React Flow edges are keyed by `source` (node ID) and `target` (node ID). Component swapping changes `node.data.archieComponentId` but NOT `node.id`. Since edge source/target reference the node ID, all connections remain intact automatically. No edge manipulation code is needed.

**Implementation Order:**
1. Task 1 (Store Extension) — foundation, independently testable
2. Task 2 (ComponentSwapper) — pure presentational, develop in isolation
3. Task 3 (Inspector Integration) — wires everything together
4. Task 4 (Verification) — final validation

**Key Architecture Patterns:**
1. **Controlled Component:** ComponentSwapper receives value + onChange props, does not manage internal state or call stores (same pattern as ConfigSelector from Story 1-5)
2. **Smart Container + Presentational Children:** InspectorPanel remains the only component that reads stores. ComponentSwapper receives data via ComponentDetail props.
3. **Synchronous Lookups (AR7):** `getComponentsByCategory()` is O(1) from in-memory Map cache. No async calls.
4. **Immutable Updates (AR15):** Must spread both node AND node.data — `{ ...n, data: { ...n.data, archieComponentId } }`. Missing inner spread mutates original data object.

### Technical Notes

**Nested Immutability Pattern (CRITICAL):**
```typescript
swapNodeComponent: (nodeId, newComponentId) => {
  const newComponent = componentLibrary.getComponentById(newComponentId)
  if (!newComponent) return // Defensive check

  set((state) => ({
    nodes: state.nodes.map(n =>
      n.id === nodeId
        ? {
            ...n,  // Spread node (preserves position, dimensions, etc.)
            data: {
              ...n.data,  // Spread data (REQUIRED — preserves other data fields)
              archieComponentId: newComponentId,
              activeConfigVariantId: newComponent.configVariants[0]?.id || ''
            }
          }
        : n
    )
  }))
}
```

**Default Variant Assignment:**
When swapping, always use new component's first config variant as default:
```typescript
activeConfigVariantId: newComponent.configVariants[0]?.id || ''
```
Rationale: Mapping old variant to new component is complex and error-prone (variants are component-specific). Better to reset to known good state.

**Single-Component Category Edge Case:**
```typescript
const alternatives = useLibrary().getComponentsByCategory(currentCategory)
const otherComponents = alternatives.filter(c => c.id !== currentComponentId)

if (otherComponents.length === 0) {
  return null // Hide swapper entirely — or show disabled message
}
```

**Visual Hierarchy in Inspector:**
```
Component Detail Card
├── Header (name, category badge)
├── Description
├── Component Type (ComponentSwapper) ← NEW
│   └── Select dropdown: "PostgreSQL" → [MongoDB, MySQL, Redis]
├── ─────────── (Separator) ──────────
├── Configuration (ConfigSelector) ← Existing from Story 1-5
│   └── Select dropdown: variant options
├── ─────────── (Separator) ──────────
├── Pros / Cons
└── Metrics (grouped by 7 categories)
```
Rationale: Type selection before variant selection (logical hierarchy: what → how).

**Common Pitfalls:**
1. **Nested immutability:** `swapNodeComponent` MUST spread both node AND node.data. Missing inner spread mutates the original data object.
2. **Variant reset:** MUST reset `activeConfigVariantId` when swapping type. Old variant ID won't exist in new component — causes runtime error.
3. **Component lookup failure:** If `getComponentById()` returns null, early-return. Don't crash.
4. **Store subscription scope:** ComponentSwapper should NOT subscribe to architectureStore — data via props only.
5. **Self-filtering:** Exclude current component from alternatives list. Allowing "swap to same" is a no-op that confuses users.

**Security:**
- All component data from componentLibrary (trusted, Zod-validated at repository boundary)
- No user-controlled text input in this story (dropdown lists library data)
- React JSX escaping handles all text rendering
- No `dangerouslySetInnerHTML`, `eval()`, or dynamic `import()`

**Performance:**
- `getComponentsByCategory()`: O(1) Map lookup from in-memory cache
- Alternative filtering: O(n) where n = components in category (typically 5-10)
- Immutable store update: O(m) where m = total nodes (MVP target 10-20)
- Total swap time: <10ms store update + <50ms React re-render — well within NFR1 (100ms)

### Cross-Cutting Dependencies

**DEPENDS ON (inbound):**
- Story 1-2: `componentLibrary.getComponentsByCategory()`, `componentLibrary.getComponentById()`, `Component` type, `COMPONENT_CATEGORIES`, `useLibrary` hook
- Story 1-3: `architectureStore.nodes`, `ArchieNodeData` with `archieComponentId` + `activeConfigVariantId`, React Flow node structure
- Story 1-5: `InspectorPanel` (smart container), `ComponentDetail` (presentational), `ConfigSelector` pattern, inspector directory, `updateNodeConfigVariant` pattern reference

**CONSUMED BY (outbound):**
- Epic 2 Story 2-1 (Recalculation Engine): `swapNodeComponent` becomes a trigger for metric recalculation across connected components
- Epic 4 Story 4-2 (Variant Recommendations): May suggest component swaps as alternative to variant changes

No DEPENDS tags required — dependency chain is linear within Epic 1.

### E2E Testing
- Action: CREATE
- Test File: `tests/e2e/component-swapping.spec.ts`
- Result: PASS (6 tests, 2/2 determinism runs passed, ~19s)
- Multi-User: SINGLE-USER
- Quality Score: 82/100
- Date: 2026-02-13

Tests cover all 4 functional ACs:
- AC-1: Swapper dropdown shows alternatives (multi-member) + hidden for single-member categories
- AC-2: Swap updates node label, inspector, metrics, connections preserved
- AC-2+3: Config variant reset + metric update after swap
- AC-4: Node position preserved after swap
- Regression: Round-trip swap restores original component

### Tech Debt
- **TD-1-6a** — Swapper Robustness: `docs/sprint-artifacts/stories/td-1-6a-swapper-robustness.md`
  - Finding #1: Lift `useLibrary()` from ComponentSwapper to parent (pure presentational pattern)
  - Finding #2: Guard against empty `configVariants` in `swapNodeComponent`

### Senior Developer Review (ECC)
- **Date:** 2026-02-13
- **Classification:** STANDARD (2 agents: code-reviewer, security-reviewer)
- **Overall Score:** 9.5/10
- **Code Quality:** 9/10 — APPROVE (2 warnings, 3 suggestions)
- **Security:** 10/10 — APPROVE (zero findings)
- **Quick Fixes Applied:** 1 (added interaction test for ComponentSwapper + Radix pointer capture polyfills)
- **TD Stories Created:** 1 (td-1-6a-swapper-robustness)
- **All functional ACs (1-4):** PASS
- **All architectural ACs (25):** PASS (5 location + 10 pattern + 10 anti-pattern)

## ECC Analysis Summary
- Risk Level: LOW
- Complexity: Moderate
- Sizing: MEDIUM (4 tasks, 24 subtasks, 5 files)
- Agents consulted: Planner, Architect
