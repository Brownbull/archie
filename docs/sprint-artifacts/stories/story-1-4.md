# Story: 1-4 Connection Wiring & Management

## Status: ready-for-dev
## Epic: Epic 1 — Architecture Canvas & Component Library

## Overview

As a user, I want to wire components together, remove components and connections, and see warnings on incompatible pairings, so that I can define my architecture's data flow and catch potential issues early.

This story adds connection creation between component ports, component/connection deletion via keyboard, incompatible connection warnings (WARN mode — never blocks, only flags), and selection management (Escape to deselect). It introduces a custom ArchieEdge component with WARN badge support, a pure compatibility checker function in the engine layer, and wires React Flow's connection/deletion infrastructure into the Zustand stores.

## Functional Acceptance Criteria

**AC-1: Connection Ports on Hover**
**Given** a component exists on the canvas
**When** I hover over it
**Then** connection ports (input/output handles) appear at the component edges (UX17)

**AC-2: Connection Creation**
**Given** I see connection ports on two components
**When** I click and drag from one port to another
**Then** a connection line is drawn between the components
**And** the connection is styled according to the design system

**AC-3: Connection Deletion**
**Given** an existing connection between two components
**When** I select it and press Delete/Backspace
**Then** the connection is removed from the canvas

**AC-4: Component Deletion with Cascade**
**Given** a component exists on the canvas
**When** I select it and press Delete/Backspace
**Then** the component and all its connections are removed from the canvas

**AC-5: Incompatible Connection Warning (WARN Mode)**
**Given** I connect two incompatible components
**When** the connection is established
**Then** a visual WARN indicator appears on the connection (FR7)
**And** the connection is still created (not blocked — WARN mode)

**AC-6: Escape to Deselect**
**Given** I have components or connections selected
**When** I press Escape
**Then** the current selection is deselected (UX4)

## Architectural Acceptance Criteria (MANDATORY)

> These ACs are MANDATORY and will be validated during code review.

### File Location Requirements

- **AC-ARCH-LOC-1:** ArchieEdge component located at `src/components/canvas/ArchieEdge.tsx`
- **AC-ARCH-LOC-2:** ConnectionWarning component located at `src/components/canvas/ConnectionWarning.tsx`
- **AC-ARCH-LOC-3:** compatibilityChecker pure function located at `src/engine/compatibilityChecker.ts`
- **AC-ARCH-LOC-4:** Architecture store modifications in `src/stores/architectureStore.ts`
- **AC-ARCH-LOC-5:** UI store modifications in `src/stores/uiStore.ts`
- **AC-ARCH-LOC-6:** CanvasView modifications in `src/components/canvas/CanvasView.tsx`
- **AC-ARCH-LOC-7:** ArchieNode modifications in `src/components/canvas/ArchieNode.tsx`
- **AC-ARCH-LOC-8:** compatibilityChecker unit tests at `tests/unit/engine/compatibilityChecker.test.ts`
- **AC-ARCH-LOC-9:** ArchieEdge unit tests at `tests/unit/components/canvas/ArchieEdge.test.tsx`
- **AC-ARCH-LOC-10:** ConnectionWarning unit tests at `tests/unit/components/canvas/ConnectionWarning.test.tsx`

### Pattern Requirements

- **AC-ARCH-PATTERN-1:** `ArchieEdgeData` stored in `edge.data` bridges React Flow visual edge to Zustand domain state, following the same pattern as `ArchieNodeData` for nodes (AR16)
- **AC-ARCH-PATTERN-2:** Compatibility computed once at edge creation via `checkCompatibility()` and stored in `edge.data.isIncompatible` — NOT recomputed on render
- **AC-ARCH-PATTERN-3:** `checkCompatibility()` is a pure function in `src/engine/` with no imports from React, Zustand, Firestore, or service layer (AR17)
- **AC-ARCH-PATTERN-4:** All edge store actions (`addEdge`, `removeEdges`, `removeNodes`) use immutable updates — spread operator for arrays, never `state.edges.push()` or `state.edges.splice()` (AR15)
- **AC-ARCH-PATTERN-5:** `addEdge` action uses `componentLibrary.getComponent()` for synchronous O(1) component lookup — no async calls during edge creation
- **AC-ARCH-PATTERN-6:** Edge IDs generated with `crypto.randomUUID()` matching node ID convention from Story 1-3 (AC-ARCH-PATTERN-8)
- **AC-ARCH-PATTERN-7:** CanvasView uses Zustand selectors for `nodes` and `edges` — does not subscribe to entire architectureStore (AR15)
- **AC-ARCH-PATTERN-8:** `uiStore.selectedEdgeId` and `uiStore.selectedNodeId` are mutually exclusive — setting one clears the other
- **AC-ARCH-PATTERN-9:** Connection handle hover uses CSS-only opacity transition (`.react-flow__node:hover .react-flow__handle`) — no React state or event handlers for hover
- **AC-ARCH-PATTERN-10:** ArchieEdge registered as custom edge type `'archie-connection'` in `edgeTypes` map, consistent with `'archie-component'` node type naming convention (AR21)
- **AC-ARCH-PATTERN-11:** `removeNodes` action cascade-deletes all edges connected to deleted nodes in a single Zustand batch update
- **AC-ARCH-PATTERN-12:** React Flow `deleteKeyCode` configured as `['Backspace', 'Delete']` — deletion handled via `onNodesDelete` and `onEdgesDelete` callbacks that sync to Zustand
- **AC-ARCH-PATTERN-13:** Escape key listener scoped to canvas container element (not `window`) to prevent interference with other UI elements

### Anti-Pattern Requirements (Must NOT Happen)

- **AC-ARCH-NO-1:** `onConnect` handler MUST NOT block edge creation for incompatible components — WARN mode means always allow, always connect (FR7)
- **AC-ARCH-NO-2:** `ArchieEdge` MUST NOT recompute compatibility on every render — read `data.isIncompatible` from stored edge data only
- **AC-ARCH-NO-3:** `checkCompatibility()` MUST NOT import from `react`, `zustand`, `firebase`, or any service module — pure function only (AR17)
- **AC-ARCH-NO-4:** Store actions MUST NOT mutate `state.edges` or `state.nodes` arrays directly — always create new arrays via spread/filter
- **AC-ARCH-NO-5:** ConnectionWarning text MUST NOT use `dangerouslySetInnerHTML` — render via React JSX default escaping
- **AC-ARCH-NO-6:** Canvas MUST NOT use `window.addEventListener('keydown', ...)` for Escape — scope to canvas container ref
- **AC-ARCH-NO-7:** CanvasView MUST NOT create edges in both `onConnect` AND `onEdgesChange` — edge creation happens only in `onConnect`; `onEdgesChange` handles selection/removal sync only
- **AC-ARCH-NO-8:** Edge data MUST NOT store full component objects — only IDs (`sourceArchieComponentId`, `targetArchieComponentId`) with library lookup deferred to when needed
- **AC-ARCH-NO-9:** Handle hover visibility MUST NOT use React state or `onMouseEnter`/`onMouseLeave` handlers — CSS-only transition
- **AC-ARCH-NO-10:** `addEdge` MUST NOT throw or return early when `componentLibrary.getComponent()` returns `null` — default to `isIncompatible: false` (permissive fallback)

## File Specification

| File/Component | Exact Path | Pattern | Status |
|----------------|------------|---------|--------|
| ArchieEdge | `src/components/canvas/ArchieEdge.tsx` | Custom React Flow edge (AR20, AR21) | NEW |
| ConnectionWarning | `src/components/canvas/ConnectionWarning.tsx` | React component (AR20) | NEW |
| compatibilityChecker | `src/engine/compatibilityChecker.ts` | Pure function (AR17) | NEW |
| architectureStore | `src/stores/architectureStore.ts` | Zustand store (AR15, AR16) | MODIFY |
| uiStore | `src/stores/uiStore.ts` | Zustand store (AR15) | MODIFY |
| CanvasView | `src/components/canvas/CanvasView.tsx` | React Flow integration (AR16) | MODIFY |
| ArchieNode | `src/components/canvas/ArchieNode.tsx` | Handle hover CSS (UX17) | MODIFY |
| constants | `src/lib/constants.ts` | Constants (AR21) | MODIFY |
| types/index | `src/types/index.ts` | Type re-exports | MODIFY |
| compatibilityChecker.test | `tests/unit/engine/compatibilityChecker.test.ts` | Unit test (AR22) | NEW |
| ArchieEdge.test | `tests/unit/components/canvas/ArchieEdge.test.tsx` | Unit test (AR22) | NEW |
| ConnectionWarning.test | `tests/unit/components/canvas/ConnectionWarning.test.tsx` | Unit test (AR22) | NEW |
| architectureStore.test | `tests/unit/stores/architectureStore.test.ts` | Unit test (AR22) | MODIFY |
| uiStore.test | `tests/unit/stores/uiStore.test.ts` | Unit test (AR22) | NEW or MODIFY |
| CanvasView.test | `tests/unit/components/canvas/CanvasView.test.tsx` | Unit test (AR22) | MODIFY |

## Tasks / Subtasks

### Task 1: Store Extensions & Edge Data Model
- [ ] 1.1 Define `ArchieEdgeData` interface in `architectureStore.ts`: `isIncompatible: boolean`, `incompatibilityReason: string | null`, `sourceArchieComponentId: string`, `targetArchieComponentId: string`
- [ ] 1.2 Update edge type in store: `edges: Edge<ArchieEdgeData>[]`
- [ ] 1.3 Implement `addEdge(connection: Connection)` action: generate UUID, lookup components from `componentLibrary.getComponent()`, call `checkCompatibility()`, create `Edge<ArchieEdgeData>` with type `EDGE_TYPE_CONNECTION`, append immutably
- [ ] 1.4 Implement `removeEdges(edgeIds: string[])` action: filter edges immutably
- [ ] 1.5 Implement/verify `removeNodes(nodeIds: string[])` action: cascade-delete connected edges in single batch update
- [ ] 1.6 Add `selectedEdgeId: string | null` and `setSelectedEdgeId(id)` to `uiStore` — also clears `selectedNodeId`
- [ ] 1.7 Add `clearSelection()` to `uiStore` — resets both `selectedNodeId` and `selectedEdgeId`
- [ ] 1.8 Update existing `setSelectedNodeId` in `uiStore` to also clear `selectedEdgeId` (mutual exclusion)
- [ ] 1.9 Add `EDGE_TYPE_CONNECTION = 'archie-connection'` to `constants.ts`
- [ ] 1.10 Re-export `ArchieEdgeData` and `CompatibilityResult` from `types/index.ts`
- [ ] 1.11 Write unit tests for all new store actions — immutability, mutual exclusion, cascade deletion, compatibility data in edge

### Task 2: Compatibility Checker (Pure Function)
- [ ] 2.1 Create `src/engine/compatibilityChecker.ts` with `checkCompatibility(sourceComponent, targetComponent): CompatibilityResult`
- [ ] 2.2 Logic: check if target's category is in source's `compatibility` array; if `compatibility` field is empty/undefined, default to compatible
- [ ] 2.3 Return `{ isCompatible: boolean; reason: string }`
- [ ] 2.4 Write unit tests: compatible pair, incompatible pair, missing compatibility field (defaults compatible), null component input (defaults compatible), empty compatibility array (compatible with everything)

### Task 3: ArchieEdge & ConnectionWarning Components
- [ ] 3.1 Create `ConnectionWarning.tsx` — lucide-react `AlertTriangle` icon with amber background, tooltip showing incompatibility reason, `data-testid="connection-warning"`
- [ ] 3.2 Create `ArchieEdge.tsx` — `SmoothStepEdge` base path, `EdgeLabelRenderer` for WARN badge when `data.isIncompatible`, `data-testid="archie-edge"`
- [ ] 3.3 Style edge states: default (solid, muted stroke), incompatible (dashed, amber stroke), selected (brighter, thicker)
- [ ] 3.4 Write unit tests for ArchieEdge: renders path, shows warning when incompatible, hides warning when compatible, has correct test IDs
- [ ] 3.5 Write unit tests for ConnectionWarning: renders icon, displays reason, has correct test ID

### Task 4: CanvasView Integration & ArchieNode Handle Hover
- [ ] 4.1 Register custom edge type: `const edgeTypes = useMemo(() => ({ [EDGE_TYPE_CONNECTION]: ArchieEdge }), [])` and pass to `<ReactFlow edgeTypes={edgeTypes} />`
- [ ] 4.2 Add `defaultEdgeOptions={{ type: EDGE_TYPE_CONNECTION }}` to `<ReactFlow>`
- [ ] 4.3 Implement `onConnect` handler: look up source/target `archieComponentId` from node data, call `architectureStore.addEdge(connection)`. Wire to `<ReactFlow onConnect={handleConnect} />`
- [ ] 4.4 Implement `onEdgesChange` handler: sync edge selection and React Flow-initiated changes to Zustand (NOT edge creation — that's only `onConnect`)
- [ ] 4.5 Implement `onNodesDelete` callback: call `architectureStore.removeNodes(nodeIds)` (cascades edges)
- [ ] 4.6 Implement `onEdgesDelete` callback: call `architectureStore.removeEdges(edgeIds)`
- [ ] 4.7 Implement `onEdgeClick` callback: call `uiStore.setSelectedEdgeId(edgeId)` (clears selectedNodeId)
- [ ] 4.8 Implement `onPaneClick` callback: call `uiStore.clearSelection()`
- [ ] 4.9 Configure `deleteKeyCode={['Backspace', 'Delete']}` on `<ReactFlow>`
- [ ] 4.10 Add Escape key `keydown` listener on canvas container ref: call `uiStore.clearSelection()` and deselect all nodes/edges via React Flow
- [ ] 4.11 Update ArchieNode handle CSS: handles `opacity-0` by default, `opacity-100` on hover via CSS transition (`.react-flow__node:hover .react-flow__handle { opacity: 1 }`)
- [ ] 4.12 Write/update unit tests for CanvasView: onConnect creates edge, deletion handlers call store methods, edge click selects, Escape deselects

### Task 5: Verification & Smoke Testing
- [ ] 5.1 Run `npx tsc --noEmit` — no type errors
- [ ] 5.2 Run `npm run test:quick` — all tests pass
- [ ] 5.3 Verify coverage meets thresholds (Lines 45%, Branches 30%, Functions 25%, Statements 40%)
- [ ] 5.4 Manual smoke test: hover component (handles appear) -> drag port-to-port (edge drawn) -> connect incompatible pair (WARN badge) -> select edge + Delete (removed) -> select node + Delete (node + edges removed) -> Escape (deselects)

## Dev Notes

### Architecture Guidance

**React Flow + Zustand Ownership Split (AR16):**
```
React Flow owns: edge visual rendering, selection highlighting, delete key handling
Zustand owns: edge domain data (ArchieEdgeData), compatibility state, component references
Bridge: ArchieEdgeData.sourceArchieComponentId / targetArchieComponentId links edge → library data
```

**Data Flow — Connection Creation:**
```
User drags port-to-port
  -> React Flow fires onConnect(connection: Connection)
  -> CanvasView handler reads source/target archieComponentId from node data
  -> architectureStore.addEdge(connection) called
  -> Store action: componentLibrary.getComponent() (sync O(1))
  -> checkCompatibility(sourceComponent, targetComponent) (pure function)
  -> Creates Edge<ArchieEdgeData> with UUID, type 'archie-connection', compatibility result
  -> set((state) => ({ edges: [...state.edges, newEdge] }))
  -> React Flow re-renders -> ArchieEdge renders with optional WARN badge
```

**Data Flow — Deletion:**
```
Component deletion: user selects node + Delete/Backspace
  -> React Flow fires onNodesDelete(deletedNodes)
  -> architectureStore.removeNodes(nodeIds)
  -> Filters out nodes AND cascade-filters connected edges
  -> Single batch Zustand update

Edge deletion: user selects edge + Delete/Backspace
  -> React Flow fires onEdgesDelete(deletedEdges)
  -> architectureStore.removeEdges(edgeIds)
  -> Filters edges immutably
```

**Implementation Order:**
1. Store extensions (Task 1) — foundation
2. Compatibility checker (Task 2) — pure function, test in isolation
3. ArchieEdge + ConnectionWarning (Task 3) — visual layer, test standalone
4. CanvasView integration + handle hover (Task 4) — wires everything together
5. Verification (Task 5)

**Key Architecture Patterns:**
1. **Pure Engine Functions (AR17):** `checkCompatibility()` lives in `src/engine/` — no React, no Zustand, no Firestore imports. Receives component data as arguments.
2. **Edge Data Bridge (AR16):** `ArchieEdgeData` in `edge.data` mirrors `ArchieNodeData` pattern — React Flow owns visual, Zustand owns domain.
3. **Zustand Selectors (AR15):** `const edges = useArchitectureStore((s) => s.edges)` — never subscribe to entire store.
4. **Immutable Updates:** Always `[...state.edges, newEdge]` and `state.edges.filter()` — never `push()` or `splice()`.
5. **Synchronous Lookups (AR7):** `componentLibrary.getComponent()` is O(1) from Map cache. No async in edge creation path.

### Technical Notes

**React Flow v12 Edge API:**
- `onConnect(connection: Connection)`: fires when user completes a port-to-port drag. Create edge here ONLY.
- `onEdgesChange(changes: EdgeChange[])`: fires for ALL edge mutations (add, remove, select, reset). Do NOT create edges here — use for selection/removal sync only.
- `onEdgesDelete(edges: Edge[])`: fires when edges are deleted via `deleteKeyCode`. Sync to Zustand store.
- `onNodesDelete(nodes: Node[])`: fires when nodes are deleted. Must cascade-delete connected edges.
- `deleteKeyCode={['Backspace', 'Delete']}`: enables native keyboard deletion of selected items.
- `defaultEdgeOptions={{ type: 'archie-connection' }}`: sets default edge type for all new connections.
- `edgeTypes`: map of custom edge type names to components (same pattern as `nodeTypes`).

**SmoothStepEdge vs BezierEdge:**
- SmoothStepEdge produces right-angle connections (cleaner for architecture diagrams).
- If curved lines preferred, switch to BezierEdge (one-line change).

**Compatibility Checker Design:**
```typescript
// src/engine/compatibilityChecker.ts
export interface CompatibilityResult {
  isCompatible: boolean
  reason: string
}

export function checkCompatibility(
  sourceComponent: { name: string; category: string; compatibility?: string[] },
  targetComponent: { name: string; category: string }
): CompatibilityResult
```
- Pure function: receives component data, returns result. No side effects.
- If `compatibility` field missing or empty → compatible (permissive default).
- Checks if `targetComponent.category` is in `sourceComponent.compatibility` array.

**Handle Hover CSS:**
```css
.react-flow__handle {
  opacity: 0;
  transition: opacity 150ms ease;
}
.react-flow__node:hover .react-flow__handle {
  opacity: 1;
}
```
- Pure CSS, no React state for hover.
- Handles must be in DOM at all times (Story 1-3 places them) — only visibility changes.
- May need specificity override if React Flow's default styles conflict.

**Escape Key Handler:**
- Scoped to canvas container ref (not `window`) to avoid conflict with command palette, modals, inspector inputs.
- Uses `useEffect` with `addEventListener`/`removeEventListener` cleanup.
- Clears both `selectedNodeId` and `selectedEdgeId` via `uiStore.clearSelection()`.

**Common Pitfalls:**
1. **Double-state conflict:** React Flow manages internal edge state. Since we use Zustand as source of truth (controlled component), `onEdgesChange` must apply changes correctly. Do NOT create edges in `onEdgesChange`.
2. **Immutability:** `state.edges.push()` will NOT trigger re-renders. Always create new arrays.
3. **componentLibrary not initialized:** If `getComponent()` returns `null` during edge creation, default to `isIncompatible: false`. Never throw.
4. **CSS specificity:** React Flow applies its own handle styles. May need `.react-flow__node:hover .react-flow__handle` with higher specificity or Tailwind `!important`.
5. **Edge selection sync:** React Flow tracks edge `selected` prop internally. Sync to `uiStore.selectedEdgeId` via `onEdgeClick`, clear on `onPaneClick`.

**Security:**
- No user-controlled text input in this story — edge data comes from componentLibrary (trusted)
- ConnectionWarning tooltip text rendered via React JSX escaping (no XSS risk)
- No `dangerouslySetInnerHTML` anywhere in edge components
- No `eval()`, `new Function()`, or dynamic `import()`

### Cross-Cutting Dependencies

**DEPENDS ON (inbound):**
- Story 1-2: componentSchema with `compatibility` field, componentLibrary service (`getComponent()` sync lookup), COMPONENT_CATEGORIES constants
- Story 1-3: CanvasView.tsx (React Flow integration), ArchieNode.tsx (handles in DOM), architectureStore (nodes, edges, addNode, removeNode), uiStore (selectedNodeId), ArchieNodeData interface

**CONSUMED BY (outbound):**
- Story 1-5 (Inspector): Reads `uiStore.selectedEdgeId` to show connection details
- Story 1-6 (Component Swapping): Must recompute `edge.data.isIncompatible` when component is swapped
- Epic 2 (Recalculation): Uses edges from architectureStore to determine metric propagation paths
- Epic 3 (YAML): Serializes edges from architectureStore into YAML export
- Epic 4 Story 4-3 (Connection Inspection): Reads ArchieEdgeData for connection properties

No DEPENDS tags required — dependency chain is linear within Epic 1.

### E2E Testing

E2E coverage recommended — run `/ecc-e2e story-1-4` after implementation.

Key E2E scenarios:
- Hover component -> handles appear (opacity transition)
- Drag from source handle to target handle -> connection line drawn with design system styling
- Connect incompatible components -> WARN badge visible on edge
- Click edge -> selected (visual feedback)
- Select edge + Delete -> edge removed
- Select component + Delete -> component and all connections removed
- Press Escape -> everything deselected
- Place 3 components, connect A->B and B->C, delete B -> both connections removed (cascade)

## ECC Analysis Summary
- Risk Level: LOW-MEDIUM
- Complexity: Moderate
- Sizing: MEDIUM (5 tasks, ~28 subtasks, 15 files)
- Agents consulted: Planner, Architect
