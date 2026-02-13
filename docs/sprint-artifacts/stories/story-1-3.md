# Story: 1-3 Canvas & Component Placement

## Status: done
## Epic: Epic 1 — Architecture Canvas & Component Library

## Overview

As a user, I want to drag components from the toolbox onto an interactive canvas and arrange them freely, so that I can start building my architecture visually.

This story integrates React Flow into the three-zone layout, creates custom ArchieNode components displaying category identity (color stripe + icon), implements HTML5 drag-and-drop from the toolbox, adds snap-to-grid node repositioning, an empty canvas state with suggestions, and the React Flow minimap. It establishes the Zustand architectureStore with node/edge management and the React Flow + Zustand ownership split (AR16).

## Functional Acceptance Criteria

**AC-1: Drag Component to Canvas**
**Given** I am on the Components tab in the toolbox
**When** I drag a component card onto the canvas
**Then** a new component node appears at the drop position
**And** the node displays the component name, category icon, and category color stripe
**And** the node width is 140px (UX16)

**AC-2: Component Repositioning**
**Given** components exist on the canvas
**When** I drag a component node to a new position
**Then** the component moves smoothly with snap-to-grid alignment (UX7)
**And** all interactions respond within 100ms (NFR1)

**AC-3: Empty Canvas State**
**Given** I have an empty canvas with no components
**When** the canvas first renders
**Then** I see helpful suggestions: import YAML, try an example, or drag a component from the toolbox (UX6)

**AC-4: Minimap**
**Given** multiple components are placed on the canvas
**When** I zoom out
**Then** the React Flow minimap shows component positions for navigation (UX8)

## Architectural Acceptance Criteria (MANDATORY)

> These ACs are MANDATORY and will be validated during code review.

### File Location Requirements

- **AC-ARCH-LOC-1:** CanvasView component located at `src/components/canvas/CanvasView.tsx`
- **AC-ARCH-LOC-2:** ArchieNode component located at `src/components/canvas/ArchieNode.tsx`
- **AC-ARCH-LOC-3:** EmptyCanvasState component located at `src/components/canvas/EmptyCanvasState.tsx`
- **AC-ARCH-LOC-4:** Architecture store at `src/stores/architectureStore.ts`
- **AC-ARCH-LOC-5:** UI store at `src/stores/uiStore.ts`
- **AC-ARCH-LOC-6:** Canvas constants in `src/lib/constants.ts`
- **AC-ARCH-LOC-7:** ArchieNode unit tests at `tests/unit/components/canvas/ArchieNode.test.tsx`
- **AC-ARCH-LOC-8:** CanvasView unit tests at `tests/unit/components/canvas/CanvasView.test.tsx`
- **AC-ARCH-LOC-9:** EmptyCanvasState unit tests at `tests/unit/components/canvas/EmptyCanvasState.test.tsx`
- **AC-ARCH-LOC-10:** Architecture store unit tests at `tests/unit/stores/architectureStore.test.ts`

### Pattern Requirements

- **AC-ARCH-PATTERN-1:** React Flow visual state bridged to Zustand domain state via `ArchieNodeData` in node `data` property with `archieComponentId` reference (AR16)
- **AC-ARCH-PATTERN-2:** ArchitectureStore `addNode` action uses synchronous lookup from `componentLibrary.getComponent()` (cached from Story 1-2) — no async calls during node creation
- **AC-ARCH-PATTERN-3:** CanvasView uses Zustand selectors to subscribe only to `nodes` and `edges` arrays — not entire store (AR15)
- **AC-ARCH-PATTERN-4:** All Zustand store updates use immutable patterns — spread operators for arrays, new instances for objects
- **AC-ARCH-PATTERN-5:** HTML5 Drag-and-Drop from ComponentCard writes component ID to `dataTransfer` with MIME type `application/archie-component`
- **AC-ARCH-PATTERN-6:** CanvasView `onDrop` handler converts screen coordinates to React Flow canvas coordinates using `screenToFlowPosition()` from `useReactFlow()`
- **AC-ARCH-PATTERN-7:** ArchieNode renders category identity (color stripe + icon) from `COMPONENT_CATEGORIES` constant (single source of truth from Story 1-2)
- **AC-ARCH-PATTERN-8:** Node IDs generated with `crypto.randomUUID()` for guaranteed uniqueness
- **AC-ARCH-PATTERN-9:** EmptyCanvasState conditionally renders based on `nodes.length === 0` selector, not prop drilling
- **AC-ARCH-PATTERN-10:** React Flow configured with snap-to-grid, minimap, controls, and custom node type `'archie-component'`

### Anti-Pattern Requirements (Must NOT Happen)

- **AC-ARCH-NO-1:** CanvasView MUST NOT directly mutate React Flow nodes/edges arrays — only pass immutable arrays from Zustand
- **AC-ARCH-NO-2:** ArchieNode MUST NOT call componentLibrary service directly — data comes from parent via `data` prop
- **AC-ARCH-NO-3:** Store actions MUST NOT mutate state directly (e.g., `state.nodes.push()`) — always create new arrays
- **AC-ARCH-NO-4:** ComponentCard drag data MUST NOT include full component object — only IDs (hydrate on drop)
- **AC-ARCH-NO-5:** CanvasView MUST NOT use `window` screen coordinates for node placement — always convert to React Flow canvas coordinates via `screenToFlowPosition()`
- **AC-ARCH-NO-6:** Components MUST NOT subscribe to entire Zustand store — use selectors for specific slices
- **AC-ARCH-NO-7:** ArchieNode MUST NOT render component descriptions or metrics (inspector-only data from Story 1-5) — only name, icon, color stripe
- **AC-ARCH-NO-8:** EmptyCanvasState MUST NOT block canvas interactions — use `pointer-events: none` on overlay, `pointer-events: auto` on suggestion cards only
- **AC-ARCH-NO-9:** Node positions MUST NOT be stored separately from React Flow nodes — single source of truth in `nodes[].position`
- **AC-ARCH-NO-10:** React Flow `onNodesChange` MUST NOT be ignored — sync all position changes back to Zustand store

## File Specification

| File/Component | Exact Path | Pattern | Status |
|----------------|------------|---------|--------|
| CanvasView | `src/components/canvas/CanvasView.tsx` | React component (React Flow integration) | NEW |
| ArchieNode | `src/components/canvas/ArchieNode.tsx` | React component (custom React Flow node) | NEW |
| EmptyCanvasState | `src/components/canvas/EmptyCanvasState.tsx` | React component | NEW |
| architectureStore | `src/stores/architectureStore.ts` | Zustand store | MODIFY |
| uiStore | `src/stores/uiStore.ts` | Zustand store | MODIFY |
| constants | `src/lib/constants.ts` | Constants | MODIFY |
| AppLayout | `src/components/layout/AppLayout.tsx` | Layout component | MODIFY |
| ComponentCard | `src/components/toolbox/ComponentCard.tsx` | React component (add drag) | MODIFY (Story 1-2) |
| CanvasView.test | `tests/unit/components/canvas/CanvasView.test.tsx` | Unit test | NEW |
| ArchieNode.test | `tests/unit/components/canvas/ArchieNode.test.tsx` | Unit test | NEW |
| EmptyCanvasState.test | `tests/unit/components/canvas/EmptyCanvasState.test.tsx` | Unit test | NEW |
| architectureStore.test | `tests/unit/stores/architectureStore.test.ts` | Unit test | NEW |

## Tasks / Subtasks

### Task 1: Zustand Store Foundation & Constants
- [x] 1.1 Add canvas constants to `constants.ts`: `CANVAS_GRID_SIZE` (16px), `CANVAS_MIN_ZOOM` (0.5), `CANVAS_MAX_ZOOM` (2), `NODE_TYPE_COMPONENT` (`'archie-component'`)
- [x] 1.2 Define `ArchieNodeData` interface in `architectureStore.ts`: `archieComponentId`, `activeConfigVariantId`, `componentName`, `componentCategory`
- [x] 1.3 Populate `architectureStore.ts` with state: `nodes: Node<ArchieNodeData>[]`, `edges: Edge[]`
- [x] 1.4 Implement store actions: `addNode(componentId, position)` (hydrate from componentLibrary, generate UUID), `updateNodePosition(nodeId, position)` (snap-to-grid), `removeNode(nodeId)` (remove node + connected edges), `setNodes`, `setEdges`
- [x] 1.5 Add `selectedNodeId: string | null` and `setSelectedNodeId` action to `uiStore.ts`
- [x] 1.6 Write unit tests for all store actions — immutability, snap-to-grid logic, node removal cascades edges

### Task 2: Custom ArchieNode Component
- [x] 2.1 Create `ArchieNode.tsx` accepting `NodeProps<ArchieNodeData>`
- [x] 2.2 Render: 4px category color stripe (top), category icon (from `COMPONENT_CATEGORIES`), component name (centered, truncate), 140px width
- [x] 2.3 Add connection handles: `<Handle type="target" position={Position.Left} />` and `<Handle type="source" position={Position.Right} />` — styled but non-functional until Story 1-4
- [x] 2.4 Apply dark-mode Tailwind styling consistent with design system, `data-testid="archie-node"`
- [x] 2.5 Write unit tests — renders name, category stripe color, icon, correct width, handles in DOM

### Task 3: Empty Canvas State
- [x] 3.1 Create `EmptyCanvasState.tsx` — centered overlay with three suggestions: "Import a YAML file", "Try an example from Blueprints", "Drag a component from the toolbox"
- [x] 3.2 Conditionally render based on `nodes.length === 0` Zustand selector
- [x] 3.3 Style: semi-transparent panel, `pointer-events: none` on overlay / `auto` on cards, `z-index` above canvas, `data-testid="canvas-empty-state"`
- [x] 3.4 Write unit tests — shows when empty, hides when nodes exist, renders all three suggestions

### Task 4: CanvasView with React Flow Integration
- [x] 4.1 Create `CanvasView.tsx` — import `ReactFlow`, `Background`, `MiniMap`, `Controls`, `ReactFlowProvider`
- [x] 4.2 Read `nodes` and `edges` from architectureStore via selectors, register custom node type `'archie-component': ArchieNode`
- [x] 4.3 Configure: `snapGrid={[CANVAS_GRID_SIZE, CANVAS_GRID_SIZE]}`, `snapToGrid={true}`, `minZoom`/`maxZoom`, `fitView`
- [x] 4.4 Implement `onNodesChange` handler — sync position updates back to architectureStore
- [x] 4.5 Implement `onNodeClick` handler — call `uiStore.setSelectedNodeId(nodeId)`
- [x] 4.6 Render `<Background variant="dots" />`, `<MiniMap />`, `<Controls />`, `<EmptyCanvasState />` (conditional)
- [x] 4.7 Add `data-testid="canvas-panel"`, wrap with `<ReactFlowProvider>`
- [x] 4.8 Write unit tests — React Flow renders, empty state toggles, minimap present, node click updates uiStore

### Task 5: Drag-and-Drop from Toolbox to Canvas
- [x] 5.1 Update `ComponentCard.tsx` (from Story 1-2): add `draggable={true}`, `onDragStart` handler setting `dataTransfer.setData('application/archie-component', component.id)`, `effectAllowed = 'move'`
- [x] 5.2 Add `onDrop` handler to CanvasView: read componentId from `dataTransfer`, convert screen coords to canvas coords via `useReactFlow().screenToFlowPosition()`, call `architectureStore.addNode(componentId, position)`
- [x] 5.3 Add `onDragOver` handler to CanvasView wrapper: `preventDefault()`, `dropEffect = 'move'`
- [x] 5.4 Write unit tests — ComponentCard sets drag data correctly, drop creates node at correct position, store action called with right args

### Task 6: Layout Integration & Verification
- [x] 6.1 Update `AppLayout.tsx` — replace canvas placeholder with `<CanvasView />`
- [x] 6.2 Run `npm run test:quick` — all unit tests pass
- [x] 6.3 Run `npx tsc --noEmit` — no type errors
- [x] 6.4 Verify coverage meets thresholds (Lines 45%, Branches 30%, Functions 25%, Statements 40%)
- [x] 6.5 Manual smoke test: login → empty canvas with suggestions → drag component → node appears → reposition with snap-to-grid → zoom out → minimap visible

## Dev Notes

### Architecture Guidance

**React Flow + Zustand Ownership Split (AR16):**
```
React Flow owns: node positions, viewport, selection, edge rendering
Zustand owns: component types, config variants, computed metrics, domain logic
Bridge: ArchieNodeData.archieComponentId links React Flow node → Zustand domain entity
```

**Synchronization Flow:**
1. User drops component from toolbox → `onDrop` handler
2. Handler reads componentId from `dataTransfer`, converts screen→canvas coords
3. Calls `architectureStore.addNode(componentId, position)`
4. Store action: lookup component from componentLibrary (sync, cached), create `Node<ArchieNodeData>`, append immutably
5. CanvasView re-renders with new `nodes` → React Flow displays new node
6. User drags node → React Flow fires `onNodesChange` → store updates position immutably

**Implementation Order:** Constants first, then stores, then ArchieNode, then EmptyCanvasState, then CanvasView (integrates everything), then drag-and-drop on ComponentCard, then AppLayout wiring, then tests.

**Key Architecture Patterns:**
1. **State Ownership (AR16):** React Flow manages visual rendering; Zustand manages domain state. Never duplicate state between them.
2. **Zustand Selectors (AR15):** `const nodes = useArchitectureStore((s) => s.nodes)` — never subscribe to entire store.
3. **Immutable Updates:** Always create new arrays/objects in store actions. Never `state.nodes.push()`.
4. **Synchronous Lookups:** componentLibrary.getComponent() is O(1) from in-memory Map (Story 1-2). No async calls during node creation.
5. **Feature-Based Structure (AR20):** Canvas components live in `src/components/canvas/`.

### Technical Notes

**HTML5 Drag-and-Drop:**
- ComponentCard sets `dataTransfer.setData('application/archie-component', component.id)` on drag start
- CanvasView wrapper handles `onDragOver` (preventDefault) and `onDrop` (read data, convert coords, create node)
- Use `screenToFlowPosition()` from `useReactFlow()` — NOT raw mouse coordinates (AC-ARCH-NO-5)

**Snap-to-Grid:**
- `CANVAS_GRID_SIZE = 16` (4px base unit x 4, per UX16 spacing system)
- React Flow config: `snapGrid={[16, 16]}`, `snapToGrid={true}`
- Store also rounds positions to nearest grid for consistency: `Math.round(pos / CANVAS_GRID_SIZE) * CANVAS_GRID_SIZE`

**Node IDs:**
- Generated with `crypto.randomUUID()` — guaranteed unique across sessions
- Format: standard UUID v4 (e.g., `550e8400-e29b-41d4-a716-446655440000`)

**ArchieNode Visual Structure:**
```
┌────────────────────┐  ← 140px wide
│ ██████████████████ │  ← 4px category color stripe
│  🔧  Component    │  ← icon + name
│      Name          │
└────────────────────┘
○ (left handle)   ● (right handle)  ← connection ports
```

**Performance:**
- React Flow virtualizes nodes automatically — no manual optimization needed for MVP (10-20 nodes)
- Zustand selectors prevent unnecessary re-renders
- All component library lookups O(1) from Map cache
- NFR1: <100ms interactions ensured by synchronous operations

**Common Pitfalls:**
- React Flow coordinates are viewport-relative — always use `screenToFlowPosition()` for drop coords
- Don't mutate Zustand state — `state.nodes.push()` is a mutation, use `[...state.nodes, newNode]`
- Default `[]` as hook dependency causes infinite re-renders (`[] !== []` on each render)
- ArchieNode handles must always be in DOM (styled invisible until Story 1-4), not conditionally rendered
- EmptyCanvasState needs `pointer-events: none` on overlay so canvas still receives drag events

**Security:**
- No user-controlled input in this story (drag uses component IDs from library, not user text)
- Component names from library rendered via React default JSX escaping (no XSS risk)
- No `dangerouslySetInnerHTML` anywhere in canvas components

### Cross-Cutting Dependencies

**DEPENDS ON (inbound):**
- Story 1-1: Auth, layout shell, three-zone structure
- Story 1-2: Zod schemas, componentLibrary service, useLibrary hook, ComponentCard, uiStore, architectureStore stub, constants (COMPONENT_CATEGORIES, NODE_WIDTH)

**CONSUMED BY (outbound):**
- Story 1-4 (Connection Wiring): Needs nodes with connection handles, architectureStore with edges
- Story 1-5 (Inspector): Reads `uiStore.selectedNodeId` to show component details
- Epic 2 (Recalculation): Reads `architectureStore.nodes` for metric computation
- Epic 3 (YAML Export): Serializes `architectureStore.nodes` and `edges`

No DEPENDS tags required — dependency chain is linear within Epic 1.

### E2E Testing

E2E coverage recommended — run `/ecc-e2e story-1-3` after implementation.

Key E2E scenarios:
- Login → see canvas with empty state suggestions
- Drag component from toolbox → node appears at drop position with category styling
- Drag node to reposition → snaps to grid
- Place multiple components → zoom out → minimap shows positions
- Click node → selected (visual feedback, prepares for Story 1-5 inspector)

## Senior Developer Review (ECC)

**Date:** 2026-02-12
**Classification:** COMPLEX (4 agents)
**Overall Score:** 9.1/10

| Agent | Score | Status |
|-------|-------|--------|
| Code Quality | 8/10 | CHANGES REQUESTED |
| Security | 9/10 | APPROVE |
| Architecture | 10/10 | APPROVE (30/30 ACs) |
| Testing | 9.5/10 | APPROVE (TEA 95/100) |

**Quick Fixes Applied (7):**
1. Removed console.error from AppLayout.tsx (stack trace leak)
2. Added drag-and-drop data validation (length + pattern check)
3. Added runtime category validation in architectureStore
4. Added data-testid to ArchieNode connection handles
5. Improved categoryIcons.ts type safety (derived from COMPONENT_CATEGORIES)
6. Updated ArchieNode test assertions for new handle testids

**Tech Debt Deferred → TD-1-3a:**
- Error boundary for React Flow canvas (MEDIUM)
- Rate limiting on node creation (LOW)
- Cross-store coupling architectureStore → uiStore (LOW)

**TD Story:** `docs/sprint-artifacts/stories/td-1-3a-canvas-resilience.md`

## ECC Analysis Summary
- Risk Level: MEDIUM
- Complexity: Moderate
- Sizing: MEDIUM (6 tasks, ~28 subtasks, 12 files)
- Agents consulted: Planner, Architect
