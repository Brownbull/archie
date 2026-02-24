# Story 4-6: Inspector UX Polish

## Status: ready-for-dev
## Epic: Epic 4 — Deep Intelligence & Polish
## Branch: feature/epic-4

## Overview

As a user,
I want flexible inspector sizing with toggle, drag-resize, and full-screen overlay modes,
So that I can comfortably read code snippets, metric explanations, and other rich content without the 300px panel cramping the view.

**Motivation:** Story 4-1 added code snippets and expandable metric explanations. At 300px, code blocks wrap excessively and explanations require excessive scrolling. Users need control over how much screen real estate the inspector occupies.

**Risk:** LOW — purely client-side UI/state work. No data layer, no auth, no schema changes.

## Functional Acceptance Criteria

**AC-1 (Toggle button):**
Given I have the inspector open (300px),
When I click the expand toggle button in the inspector header,
Then the inspector widens to 500px with a smooth CSS transition.
Clicking again returns to 300px.

**AC-2 (Drag handle):**
Given I have the inspector open,
When I drag the inspector's left edge,
Then the inspector resizes freely between 200px (minimum) and 700px (maximum).
The canvas flexes to accommodate the new width.

**AC-3 (Drag handle — visual affordance):**
Given I hover over the inspector's left edge,
Then I see a resize cursor (`col-resize`) and a subtle visual indicator (1px highlight line).

**AC-4 (Full-screen overlay):**
Given I have the inspector open,
When I click the maximize button in the inspector header,
Then the inspector expands to a full-screen overlay (covers the canvas, not the toolbox).
The overlay has a semi-transparent backdrop and a close button.

**AC-5 (Full-screen overlay — exit):**
Given the inspector is in full-screen overlay mode,
When I click the close button OR press Escape,
Then the overlay closes and the inspector returns to its previous width (300px, 500px, or dragged width).

**AC-6 (Content section anchors):**
Given the inspector has long content (code snippet + metrics + explanations),
When I view the inspector header area,
Then I see small section anchor buttons (Code, Metrics, Details) that scroll the inspector content to that section on click.

**AC-7 (Width persistence per session):**
Given I resize the inspector (toggle or drag),
When I select a different node,
Then the inspector retains my chosen width (not reset to 300px).
Width resets to 300px on page reload (session-level, not persisted).

**AC-8 (Collapse still works):**
Given the inspector is in any width state (300, 500, dragged, overlay),
When I click the collapse button,
Then the inspector collapses to 40px as before.
Expanding from collapsed restores the previous non-collapsed width.

## Architectural Acceptance Criteria (MANDATORY)
> These ACs are MANDATORY and will be validated during code review.

### File Location Requirements

**AC-ARCH-LOC-1:** `InspectorResizeHandle` component MUST be created at `src/components/inspector/InspectorResizeHandle.tsx`

**AC-ARCH-LOC-2:** `InspectorOverlay` component MUST be created at `src/components/inspector/InspectorOverlay.tsx`

**AC-ARCH-LOC-3:** Section anchor navigation MUST be added to `InspectorPanel.tsx` (not a new component — it's 3-4 buttons in the header bar)

**AC-ARCH-LOC-4:** Unit tests MUST mirror `src/` structure in `tests/unit/components/inspector/`

### Pattern Requirements

**AC-ARCH-PATTERN-1:** Inspector width state MUST live in `uiStore` (Zustand) — NOT local `useState`. This is UI layout state shared between `AppLayout` (reads width) and `InspectorPanel` (sets width via controls). New fields: `inspectorWidth: number` (default 300), `inspectorOverlay: boolean` (default false), `setInspectorWidth: (width: number) => void`, `setInspectorOverlay: (overlay: boolean) => void`.

**AC-ARCH-PATTERN-2:** `INSPECTOR_WIDTH` constant (300) becomes `INSPECTOR_DEFAULT_WIDTH`. Add: `INSPECTOR_EXPANDED_WIDTH = 500`, `INSPECTOR_MIN_WIDTH = 200`, `INSPECTOR_MAX_WIDTH = 700`.

**AC-ARCH-PATTERN-3:** Drag resize MUST use `onPointerDown` / `onPointerMove` / `onPointerUp` events on the resize handle element (NOT `onMouseDown`). Pointer events work with touch devices and mouse. Capture pointer with `setPointerCapture` for smooth dragging.

**AC-ARCH-PATTERN-4:** Full-screen overlay MUST render as a portal sibling to the main layout (using React `createPortal` to `document.body`), NOT by widening the `<aside>` element. The overlay is a separate rendering context with its own backdrop.

**AC-ARCH-PATTERN-5:** Section anchors MUST use `scrollIntoView({ behavior: 'smooth', block: 'start' })` on target elements identified by `data-section` attributes on section headings in `ComponentDetail`.

**AC-ARCH-PATTERN-6:** When transitioning from collapsed (40px) back to expanded, restore `inspectorWidth` from uiStore (which remembers the last non-collapsed width). The current `inspectorCollapsed` boolean stays — it takes priority over `inspectorWidth` when true.

### Anti-Pattern Requirements (Must NOT Happen)

**AC-ARCH-NO-1:** Do NOT use `resize: horizontal` CSS property — it has inconsistent cross-browser behavior and doesn't integrate with the state management needed for width persistence.

**AC-ARCH-NO-2:** Do NOT use `window.addEventListener('mousemove')` for drag resize — use pointer events on the handle element with `setPointerCapture`.

**AC-ARCH-NO-3:** Do NOT persist inspector width to `localStorage` or Firestore — session-level only (Zustand in-memory).

**AC-ARCH-NO-4:** Do NOT remove the existing collapse/expand functionality — it must coexist with the new resize modes.

**AC-ARCH-NO-5:** Do NOT use `position: fixed` for the overlay — use `createPortal` to render outside the flex layout, with `position: fixed` only on the portal'd overlay wrapper (not on the `<aside>`).

## File Specification

| File/Component | Exact Path | Action | AC Reference |
|----------------|------------|--------|--------------|
| InspectorResizeHandle | `src/components/inspector/InspectorResizeHandle.tsx` | CREATE | AC-ARCH-LOC-1, AC-2/3 |
| InspectorOverlay | `src/components/inspector/InspectorOverlay.tsx` | CREATE | AC-ARCH-LOC-2, AC-4/5 |
| InspectorPanel | `src/components/inspector/InspectorPanel.tsx` | MODIFY | AC-ARCH-LOC-3, AC-1/6/8 |
| ComponentDetail | `src/components/inspector/ComponentDetail.tsx` | MODIFY | AC-ARCH-PATTERN-5 (data-section attrs) |
| inspector barrel | `src/components/inspector/index.ts` | MODIFY | exports |
| AppLayout | `src/components/layout/AppLayout.tsx` | MODIFY | AC-ARCH-PATTERN-6, width logic |
| uiStore | `src/stores/uiStore.ts` | MODIFY | AC-ARCH-PATTERN-1 |
| constants | `src/lib/constants.ts` | MODIFY | AC-ARCH-PATTERN-2 |
| InspectorResizeHandle test | `tests/unit/components/inspector/InspectorResizeHandle.test.tsx` | CREATE | AC-ARCH-LOC-4 |
| InspectorOverlay test | `tests/unit/components/inspector/InspectorOverlay.test.tsx` | CREATE | AC-ARCH-LOC-4 |
| InspectorPanel test | `tests/unit/components/inspector/InspectorPanel.test.tsx` | MODIFY | AC-1/6/8 |

**Total:** 3 creates + 8 modifies = 11 files

## Tasks / Subtasks

- [ ] Task 1: State management updates
  - [ ] 1.1 Add `inspectorWidth: number` (default 300) and `inspectorOverlay: boolean` (default false) to uiStore
  - [ ] 1.2 Add `setInspectorWidth()` and `setInspectorOverlay()` actions
  - [ ] 1.3 Update `INSPECTOR_WIDTH` to `INSPECTOR_DEFAULT_WIDTH`, add `INSPECTOR_EXPANDED_WIDTH`, `INSPECTOR_MIN_WIDTH`, `INSPECTOR_MAX_WIDTH` constants
  - [ ] 1.4 Update `AppLayout.tsx` width calculation: use `inspectorWidth` from uiStore instead of hardcoded `INSPECTOR_WIDTH`

- [ ] Task 2: Toggle expand/compact button
  - [ ] 2.1 Add toggle button (Maximize2/Minimize2 icons from lucide-react) to InspectorPanel header bar
  - [ ] 2.2 On click: toggle between `INSPECTOR_DEFAULT_WIDTH` (300) and `INSPECTOR_EXPANDED_WIDTH` (500)
  - [ ] 2.3 Add `data-testid="inspector-expand-toggle"` to the button

- [ ] Task 3: Drag resize handle
  - [ ] 3.1 Create `InspectorResizeHandle.tsx` — 4px-wide div on inspector's left edge
  - [ ] 3.2 Implement `onPointerDown` → `setPointerCapture` → `onPointerMove` updates `inspectorWidth` → `onPointerUp` releases
  - [ ] 3.3 Clamp width between `INSPECTOR_MIN_WIDTH` (200) and `INSPECTOR_MAX_WIDTH` (700)
  - [ ] 3.4 Show `cursor-col-resize` on hover, highlight line on active drag
  - [ ] 3.5 Add `data-testid="inspector-resize-handle"` to the handle
  - [ ] 3.6 Render handle in `AppLayout.tsx` adjacent to the inspector `<aside>`

- [ ] Task 4: Full-screen overlay mode
  - [ ] 4.1 Create `InspectorOverlay.tsx` — portal to `document.body`
  - [ ] 4.2 Overlay: fixed position, covers viewport minus toolbox width, semi-transparent backdrop
  - [ ] 4.3 Close on: close button click, Escape key press
  - [ ] 4.4 On close: set `inspectorOverlay: false` (returns to previous inline width)
  - [ ] 4.5 Add maximize button to InspectorPanel header (Maximize icon from lucide-react)
  - [ ] 4.6 Add `data-testid="inspector-overlay"`, `data-testid="inspector-overlay-close"`, `data-testid="inspector-maximize-btn"`

- [ ] Task 5: Section anchor navigation
  - [ ] 5.1 Add `data-section="code"`, `data-section="metrics"`, `data-section="details"` attributes to section headings in ComponentDetail
  - [ ] 5.2 Add 3 small anchor buttons in InspectorPanel header (below the title bar)
  - [ ] 5.3 On click: `document.querySelector('[data-section="X"]').scrollIntoView({ behavior: 'smooth', block: 'start' })`
  - [ ] 5.4 Add `data-testid="inspector-section-nav"` to the nav container

- [ ] Task 6: Unit tests
  - [ ] 6.1 Test InspectorResizeHandle: pointer events update width within bounds
  - [ ] 6.2 Test InspectorOverlay: renders portal, closes on Escape, closes on button click
  - [ ] 6.3 Test InspectorPanel: toggle button switches width, section anchors scroll
  - [ ] 6.4 Test uiStore: inspectorWidth persists across node selections, overlay state toggles
  - [ ] 6.5 Run `npm run test:quick` — all tests pass

## Dev Notes

### Architecture Guidance

**Width state flow:**
```
uiStore.inspectorWidth (300 default)
  ↓ read by AppLayout.tsx
  ↓ sets <aside style={{ width }}>
  ↓ CSS transition-[width] animates
  ↓ Canvas <main flex-1> auto-flexes
```

**Overlay vs inline modes:**
- Inline mode: inspector is the `<aside>` in the flex layout (current behavior + new width control)
- Overlay mode: inspector content renders in a portal overlay ON TOP of the layout (aside stays hidden/collapsed)
- Transitions: inline ↔ overlay are independent of width state. Width is preserved when entering/exiting overlay.

**Collapse + width interaction:**
```
inspectorCollapsed: true  → aside width = 40px (ignores inspectorWidth)
inspectorCollapsed: false → aside width = inspectorWidth (from uiStore)
inspectorOverlay: true    → aside hidden + overlay portal renders
```

**Drag resize implementation:**
```typescript
// InspectorResizeHandle.tsx
const onPointerDown = (e: React.PointerEvent) => {
  e.currentTarget.setPointerCapture(e.pointerId)
  startX.current = e.clientX
  startWidth.current = inspectorWidth
}
const onPointerMove = (e: React.PointerEvent) => {
  if (!e.currentTarget.hasPointerCapture(e.pointerId)) return
  const delta = startX.current - e.clientX  // leftward = wider
  const newWidth = clamp(startWidth.current + delta, MIN, MAX)
  setInspectorWidth(newWidth)
}
```

### Technical Notes

- No database, no auth, no schema changes — purely UI/state work
- CSS transitions already exist on the inspector `<aside>` — toggle animation works automatically
- Drag resize should disable the CSS transition during active drag (add `transition-none` class while dragging) to prevent laggy feel
- Portal overlay needs `z-index` above the canvas but below modals — use `Z_INDEX.INSPECTOR_OVERLAY` constant
- Section anchors only appear when content is long enough (more than one section visible)

### E2E Testing
E2E coverage recommended — run `/ecc-e2e 4-6` after implementation.
Key journeys: toggle button switches width, drag handle resizes, overlay opens/closes, section anchors scroll, collapse still works in all modes.

## ECC Analysis Summary
- Risk Level: LOW
- Complexity: Moderate (UI state + 3 interaction patterns)
- Classification: STANDARD
- Agents consulted: planner (sonnet), architect (sonnet)
- Sizing: MEDIUM-LARGE (11 files: 3 create + 8 modify, 6 tasks)
