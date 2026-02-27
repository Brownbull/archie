# Story: 4-3-connection-inspection-system

## Status: done
## Epic: Epic 4: Deep Intelligence & Polish

## Overview

As a user, I want to click a connection to see its properties and health, and reposition connection labels for readability, so that I can understand how components communicate and keep my canvas clean.

**FRs covered:** FR36 (connection properties), FR37 (endpoint health), FR38 (draggable labels)
**ARs referenced:** AR12 (connectionProperties on Component schema — already present)

## Functional Acceptance Criteria

**AC-FUNC-1 (FR36 — Connection inspector opens on click):**
Given a connection exists between two components
When I click the connection line or its label
Then the inspector panel switches to show connection properties: protocol, communication pattern, typical latency, and co-location potential

**AC-FUNC-2 (FR36 — Properties derived from component library):**
Given connection properties are displayed
When I review them
Then the properties are derived from the source component's `connectionProperties` field in the component library
(Note: `connectionProperties` is already present on `ComponentSchema` as an optional field — no new Firestore collection needed for this story)

**AC-FUNC-3 (FR37 — Endpoint health display):**
Given the connection inspector is showing a connection
When I view the health section
Then I see per-endpoint health metrics: heatmap status (healthy / warning / bottleneck) for both source and target components
And the overall connection heatmap status is also shown

**AC-FUNC-4 (FR36 — Inspector deselects on pane click):**
Given I have a connection selected and inspector showing connection view
When I click the canvas pane (empty area)
Then the selection clears and the inspector closes (consistent with existing node deselect behavior)

**AC-FUNC-5 (FR38 — Draggable connection labels):**
Given connections have labels on the canvas (showing protocol type when connectionProperties exists)
When labels overlap or are hard to read
Then I can drag a connection label to reposition it

**AC-FUNC-6 (FR38 — Label position persists through recalculations):**
Given I have repositioned a connection label
When a metric recalculation occurs
Then the label remains in its repositioned location

**AC-FUNC-7 (Missing connectionProperties graceful handling):**
Given a connection's source component has no `connectionProperties` defined
When I click the connection
Then the inspector shows a "No connection properties available" message
And the endpoint health section still shows health status for both endpoints

## Architectural Acceptance Criteria (MANDATORY)
> These ACs are MANDATORY and will be validated during code review.

### File Location Requirements

**AC-ARCH-LOC-1:** `ConnectionDetail.tsx` MUST be placed in `src/components/inspector/` (parallel to `ComponentDetail.tsx`)

**AC-ARCH-LOC-2:** `updateEdgeLabelOffset` action MUST be added to `src/stores/architectureStore.ts` (domain state belongs in the domain store)

### Pattern Requirements

**AC-ARCH-PATTERN-1:** `InspectorPanel` MUST branch on `selectedEdgeId` vs `selectedNodeId` — show `ConnectionDetail` for edge selection, `ComponentDetail` for node selection. These are mutually exclusive per `uiStore` (setting one clears the other).

**AC-ARCH-PATTERN-2:** `ConnectionDetail` MUST derive connection properties from `componentLibrary.getComponent(sourceArchieComponentId)?.connectionProperties` — NOT from a new Firestore collection fetch. `connectionProperties` is already on `Component` schema.

**AC-ARCH-PATTERN-3:** Draggable label offset MUST be stored as `labelOffset?: { x: number; y: number }` in `ArchieEdgeData` in `architectureStore.ts`. Visual state that affects rendering belongs in the domain store (enables consistent behavior across recalculation cycles).

**AC-ARCH-PATTERN-4:** `yamlExporter` MUST explicitly exclude `labelOffset` from the exported YAML skeleton. Visual positioning is runtime state, not architecture definition (NFR11: exported YAML must not include runtime state).

**AC-ARCH-PATTERN-5:** Pointer event handling for draggable label MUST use `onPointerDown` / `onPointerMove` / `onPointerUp` with `setPointerCapture` to ensure smooth drag without losing capture on fast movement.

**AC-ARCH-PATTERN-6:** `ConnectionDetail` MUST be exported from `src/components/inspector/index.ts` barrel export file.

**AC-ARCH-PATTERN-7:** `ConnectionDetail` uses `useLibrary()` hook (via `useArchitectureStore` + `componentLibrary`) to look up source/target component data — follows the same pattern as `ComponentDetail`.

### Anti-Pattern Requirements (Must NOT Happen)

**AC-ARCH-NO-1:** MUST NOT create a new Firestore `connectionTypes` collection fetch in this story — use `connectionProperties` already on the `Component` schema (AR12 deferred to Phase 2 if deeper connection type modeling needed)

**AC-ARCH-NO-2:** MUST NOT include `labelOffset` in YAML export — explicitly strip it in `yamlExporter.ts`

**AC-ARCH-NO-3:** MUST NOT use global `document` event listeners for drag — use React pointer events on the label div only

**AC-ARCH-NO-4:** MUST NOT show connection inspector when `selectedEdgeId` is null — guard `InspectorPanel` rendering with null check

## File Specification

| File/Component | Exact Path | Pattern | AC Reference |
|----------------|------------|---------|--------------|
| ConnectionDetail | `src/components/inspector/ConnectionDetail.tsx` | New inspector component | AC-ARCH-LOC-1 |
| InspectorPanel (update) | `src/components/inspector/InspectorPanel.tsx` | Extend: handle selectedEdgeId | AC-ARCH-PATTERN-1 |
| architectureStore (update) | `src/stores/architectureStore.ts` | Add labelOffset to ArchieEdgeData + updateEdgeLabelOffset action | AC-ARCH-LOC-2, AC-ARCH-PATTERN-3 |
| ArchieEdge (update) | `src/components/canvas/ArchieEdge.tsx` | Add protocol label + draggable position | AC-ARCH-PATTERN-5 |
| yamlExporter (update) | `src/services/yamlExporter.ts` | Exclude labelOffset from export | AC-ARCH-PATTERN-4 |
| inspector barrel (update) | `src/components/inspector/index.ts` | Add ConnectionDetail export | AC-ARCH-PATTERN-6 |
| ConnectionDetail test | `tests/unit/components/inspector/ConnectionDetail.test.tsx` | Unit test | AC-ARCH-LOC-1 |
| ArchieEdge test (update) | `tests/unit/components/canvas/ArchieEdge.test.tsx` | Unit test | AC-ARCH-PATTERN-5 |

## Tasks / Subtasks

- [x] **Task 1: ConnectionDetail component**
  - [x] 1.1 Define `ConnectionDetail` props interface: `{ edgeId: string }` — derives all data internally via store selectors
  - [x] 1.2 Implement component: read `edge` from `architectureStore.edges`, look up source + target components via `componentLibrary.getComponent()`
  - [x] 1.3 Display connection properties section: protocol, communicationPatterns (as list), typicalLatency, coLocationPotential — with "No properties available" fallback
  - [x] 1.4 Display endpoint health section: source component name + heatmap status, target component name + heatmap status (from `architectureStore.heatmapColors`)
  - [x] 1.5 Display overall connection heatmap: `architectureStore.edgeHeatmapColors.get(edgeId)`

- [x] **Task 2: InspectorPanel edge mode**
  - [x] 2.1 Read `selectedEdgeId` from `uiStore`
  - [x] 2.2 Add conditional branch: if `selectedEdgeId` → render `ConnectionDetail`, if `selectedNodeId` → render existing `ComponentDetail`, if neither → return null
  - [x] 2.3 Ensure collapsed state works correctly for both node and edge selection

- [x] **Task 3: ArchieEdgeData labelOffset + store action**
  - [x] 3.1 Add `labelOffset?: { x: number; y: number }` to `ArchieEdgeData` interface in `architectureStore.ts`
  - [x] 3.2 Add `updateEdgeLabelOffset(edgeId: string, offset: { x: number; y: number }): void` action to store
  - [x] 3.3 Update `yamlExporter.ts` to explicitly exclude `labelOffset` from edge data in exported YAML (strip it when building the export payload)

- [x] **Task 4: Draggable edge label in ArchieEdge**
  - [x] 4.1 Render a protocol label via `EdgeLabelRenderer` for all edges where source component has `connectionProperties` (show protocol string)
  - [x] 4.2 Apply stored `labelOffset` to label position: `transform: translate(-50%, -50%) translate(${labelX + offset.x}px, ${labelY + offset.y}px)`
  - [x] 4.3 Implement drag handler: `onPointerDown` starts drag, `onPointerMove` computes delta from drag start, `onPointerUp` calls `updateEdgeLabelOffset(edgeId, newOffset)` and releases pointer capture
  - [x] 4.4 Use `setPointerCapture` on pointer down for smooth drag (prevents label from losing capture on fast movement)
  - [x] 4.5 Add `data-testid="edge-label-{id}"` to draggable label div

- [x] **Task 5: Exports, tests, and git staging**
  - [x] 5.1 Export `ConnectionDetail` from `src/components/inspector/index.ts`
  - [x] 5.2 Write `ConnectionDetail.test.tsx` — renders properties, renders "no properties" fallback, shows endpoint health
  - [x] 5.3 Write/update `ArchieEdge.test.tsx` — label renders when connectionProperties present, label absent when no connectionProperties, label position applies offset
  - [ ] 5.4 Run `npm run test:quick` — all tests pass
  - [ ] 5.5 Verify all new and modified files staged: `git status --porcelain | grep "^??"` → no untracked relevant files (AC-MUST-CHECK-1)

## Dev Notes

### Architecture Guidance

**InspectorPanel branching pattern:**
```typescript
// In InspectorPanel.tsx — mutually exclusive selection (uiStore guarantees this)
const selectedNodeId = useUiStore((s) => s.selectedNodeId)
const selectedEdgeId = useUiStore((s) => s.selectedEdgeId)

if (selectedEdgeId) return <ConnectionDetail edgeId={selectedEdgeId} />
if (selectedNodeId) {
  // existing ComponentDetail rendering...
}
return null
```

**ConnectionDetail data derivation:**
```typescript
const edge = useArchitectureStore(useShallow((s) => s.edges.find(e => e.id === edgeId)))
const sourceHeatmap = useArchitectureStore((s) => s.heatmapColors.get(edge?.source ?? ''))
const targetHeatmap = useArchitectureStore((s) => s.heatmapColors.get(edge?.target ?? ''))
const connectionHeatmap = useArchitectureStore((s) => s.edgeHeatmapColors.get(edgeId))

const sourceComponent = edge ? componentLibrary.getComponent(edge.data.sourceArchieComponentId) : undefined
const connectionProps = sourceComponent?.connectionProperties  // may be undefined
```

**Draggable label pointer events:**
```typescript
const [dragState, setDragState] = useState<{ startX: number; startY: number; originOffset: { x: number; y: number } } | null>(null)

const handlePointerDown = (e: React.PointerEvent) => {
  e.stopPropagation()
  e.currentTarget.setPointerCapture(e.pointerId)
  setDragState({ startX: e.clientX, startY: e.clientY, originOffset: currentLabelOffset ?? { x: 0, y: 0 } })
}

const handlePointerMove = (e: React.PointerEvent) => {
  if (!dragState) return
  const dx = e.clientX - dragState.startX
  const dy = e.clientY - dragState.startY
  updateEdgeLabelOffset(id, { x: dragState.originOffset.x + dx, y: dragState.originOffset.y + dy })
}

const handlePointerUp = (e: React.PointerEvent) => {
  e.currentTarget.releasePointerCapture(e.pointerId)
  setDragState(null)
}
```

**YAML export guard** — in `yamlExporter.ts`, when serializing edge data:
```typescript
// Exclude labelOffset — it is visual runtime state, not architecture definition (NFR11, AC-ARCH-PATTERN-4)
const { labelOffset: _labelOffset, ...exportableData } = edge.data
```

**yamlExporter change note:** Check existing `yamlExporter.ts` structure to see how edges are serialized. The `labelOffset` field does not exist yet on the type, but should be pre-emptively excluded in the exporter so that if labelOffset is added to ArchieEdgeData, it won't accidentally leak into exports.

### Technical Notes

- `connectionProperties` is optional on `Component` (`.optional()` in Zod schema). All code paths in `ConnectionDetail` MUST handle the undefined case.
- `communicationPatterns` is an array — render as a comma-separated string or bullet list.
- `coLocationPotential` is a boolean — display as "Yes" / "No" or with a check/cross icon.
- Edge label drag MUST call `e.stopPropagation()` on pointer down to prevent React Flow from interpreting the drag as canvas pan.
- The drag coordinates from pointer events are in screen pixels, but the label position offset in the store is also in screen pixels (React Flow renders labels via `EdgeLabelRenderer` in absolute screen space via CSS transform). No coordinate system conversion needed.
- `useShallow` from zustand/react/shallow SHOULD be used when reading the edge object (to prevent unnecessary re-renders when unrelated store fields change) — follow the `selectedNode` pattern from `InspectorPanel.tsx`.

### E2E Testing
- Action: CREATE + EXTEND | File: `tests/e2e/connection-inspection.spec.ts` | Result: PASS
- Extended: `tests/e2e/inspector-and-config.spec.ts` (fixed outdated edge-selection test)
- Multi-User: N/A (single-user) | Quality Score: 79/100 | Date: 2026-02-24
- ACs covered: AC-FUNC-1, AC-FUNC-3, AC-FUNC-4, AC-FUNC-5, AC-FUNC-7, plus node/edge switching & collapse/expand
- AC-FUNC-6 (label persists through recalculation): not E2E-tested — unit coverage sufficient
- Source change: added `data-testid="endpoint-health-row"` to `ConnectionDetail.tsx` endpoint rows

## Senior Developer Review (ECC)
- **Date:** 2026-02-24
- **Agents:** code-reviewer (sonnet), security-reviewer (sonnet)
- **Classification:** STANDARD
- **Outcome:** APPROVE (8.5/10)
- **Quick fixes applied:** 4 (schema max-length, useShallow removal, endDrag dedup, constant extraction)
- **TD stories created:** 2 (td-4-3a, td-4-3b)

## Code Review Deferred Items (2026-02-24)

| TD Story | Description | Priority | Action |
|----------|-------------|----------|--------|
| td-4-3a | Edge drag UX hardening — throttle per-pixel updates, bounds clamping, drag interaction tests | MEDIUM | CREATED |
| td-4-3b | Library-sourced data rendering hardening — reactivity model, incompatibilityReason length, MUST CHECK #7 | LOW | CREATED |

## ECC Analysis Summary
- Risk Level: MEDIUM
- Complexity: Moderate
- Classification: STANDARD
- Agents consulted: orchestrator (planner agents ran out of turns reading files; orchestrator analysis applied directly)
