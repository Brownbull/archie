# Story: 2-2 Bottleneck Heatmap

## Status: done
## Epic: Epic 2 — Trade-off Intelligence & Visualization

## Overview

As a user, I want a color-coded heatmap overlay on my architecture showing which components are healthy, concerning, or bottlenecked, so that I can instantly see where my architecture's weak points are without reading individual metrics.

This story adds the heatmap calculation engine (pure function), integrates heatmap computation into the recalculation pipeline (synchronous with metric updates per NFR3), adds heatmap state to Zustand stores, modifies ArchieNode/ArchieEdge for visual glow/color, and adds the H keyboard toggle. It enforces the color separation principle (UX18): category colors (stripes/accents) are identity, heatmap colors (border glows/connection lines) are performance — they never overlap.

**Dependency:** Story 2-1 (Recalculation Engine & Metric Propagation) must be complete before this story can start. Story 2-1 provides `computedMetrics`, `RecalculatedMetrics.overallScore`, `recalculationService.run()`, `triggerRecalculation()`, and the extensible `RecalculationResult` type.

## Functional Acceptance Criteria

**AC-1: Heatmap Color Overlay**
**Given** components exist on the canvas with calculated metrics
**When** the heatmap is enabled
**Then** each component displays a color overlay: green (healthy), yellow (warning), red (bottleneck)
**And** connection lines also reflect health status through color (worst-case of two endpoints)

**AC-2: Synchronous Heatmap Update**
**Given** the heatmap is active
**When** I change a configuration variant on any component
**Then** the heatmap colors update synchronously with the metric recalculation (NFR3) — no separate loading state

**AC-3: Heatmap Toggle**
**Given** I am on the canvas
**When** I press the H key (UX4)
**Then** the heatmap overlay toggles on/off

**AC-4: Color Separation Principle**
**Given** the heatmap is active
**When** I view the canvas
**Then** category colors (component identity) are distinct from heatmap colors (performance) — they never overlap (UX18)
**And** heatmap status is communicated through both color and metric values (never color-only — UX11 accessibility)

## Architectural Acceptance Criteria (MANDATORY)

> These ACs are MANDATORY and will be validated during code review.

### File Location Requirements

- **AC-ARCH-LOC-1:** Heatmap calculation logic located at `src/engine/heatmapCalculator.ts` — exports `computeHeatmapStatus`, `computeArchitectureHeatmap`, `computeEdgeHeatmapStatus`, and the `HeatmapStatus` type
- **AC-ARCH-LOC-2:** Heatmap threshold constants located in `src/lib/constants.ts` — exports `HEATMAP_THRESHOLD_WARNING`, `HEATMAP_THRESHOLD_BOTTLENECK`, `HEATMAP_COLORS`
- **AC-ARCH-LOC-3:** Heatmap store state (`heatmapColors`, `edgeHeatmapColors`) located in `src/stores/architectureStore.ts`
- **AC-ARCH-LOC-4:** Heatmap toggle state (`heatmapEnabled`, `toggleHeatmap`) located in `src/stores/uiStore.ts`
- **AC-ARCH-LOC-5:** Heatmap calculator unit tests at `tests/unit/engine/heatmapCalculator.test.ts`
- **AC-ARCH-LOC-6:** `HeatmapStatus` type re-exported from `src/types/index.ts`
- **AC-ARCH-LOC-7:** Heatmap-specific store tests at `tests/unit/stores/architectureStore-heatmap.test.ts`

### Pattern Requirements

- **AC-ARCH-PATTERN-1:** `heatmapCalculator.ts` is a pure function module — no imports from `react`, `zustand`, `firebase`, or any service module (AR17). Only imports from `@/lib/constants` (pure data)
- **AC-ARCH-PATTERN-2:** Heatmap colors computed inside `recalculationService.run()` as part of the same synchronous pipeline — called after metric computation but before returning `RecalculationResult` (NFR3 synchronous update)
- **AC-ARCH-PATTERN-3:** `heatmapColors: Map<string, HeatmapStatus>` and `edgeHeatmapColors: Map<string, HeatmapStatus>` stored in `architectureStore` as domain state (derived from metrics = domain data)
- **AC-ARCH-PATTERN-4:** `heatmapEnabled: boolean` stored in `uiStore` (visual preference toggle, not domain state)
- **AC-ARCH-PATTERN-5:** ArchieNode reads its heatmap status via targeted Zustand selector: `useArchitectureStore(s => s.heatmapColors.get(id))`. The `id` prop is destructured from `NodeProps`. Rendering conditional on `useUiStore(s => s.heatmapEnabled)`
- **AC-ARCH-PATTERN-6:** Color separation (UX18): heatmap glow applied via `box-shadow` on node container. Category color stripe (top `div` with `backgroundColor`) remains unchanged. These are independent visual channels
- **AC-ARCH-PATTERN-7:** H key toggle listener scoped to canvas container ref (same `useEffect` pattern as existing Escape key handler) — not a `window`-level listener
- **AC-ARCH-PATTERN-8:** H key handler guards against modifier keys (`ctrlKey`, `altKey`, `metaKey`) to prevent conflicts with browser shortcuts
- **AC-ARCH-PATTERN-9:** Edge heatmap color uses worst-case principle: `computeEdgeHeatmapStatus(sourceStatus, targetStatus)` returns the worse of the two endpoint statuses (bottleneck > warning > healthy)
- **AC-ARCH-PATTERN-10:** When heatmap is enabled, edge stroke color comes from `HEATMAP_COLORS[edgeHeatmapStatus]`. When disabled, edge reverts to existing Story 1-4 logic. Incompatible edges retain dashed pattern (`strokeDasharray: "5 3"`) regardless of heatmap state
- **AC-ARCH-PATTERN-11:** `RecalculationResult` extended (not replaced) with `nodeHeatmap` and `edgeHeatmap` fields. Existing `metrics` and `propagationHops` fields remain unchanged
- **AC-ARCH-PATTERN-12:** Heatmap updates during ripple animation follow the same per-hop setTimeout scheduling as metric updates. Each hop's callback updates both `computedMetrics` and `heatmapColors` for that node in a single `set()` call
- **AC-ARCH-PATTERN-13:** CSS transition for heatmap glow (`transition: box-shadow 300ms ease`) defined in `src/index.css` on `[data-testid="archie-node"]` selector, not inline

### Anti-Pattern Requirements (Must NOT Happen)

- **AC-ARCH-NO-1:** `heatmapCalculator.ts` MUST NOT import from `react`, `zustand`, `firebase`, or any service — pure function only (AR17)
- **AC-ARCH-NO-2:** Heatmap colors MUST NOT be computed in a React `useEffect` or `useMemo` — they are computed in `recalculationService.run()` and stored in Zustand
- **AC-ARCH-NO-3:** Heatmap MUST NOT use category colors (blue/green/purple/orange from `COMPONENT_CATEGORIES`) for health status — only `--color-heatmap-green`, `--color-heatmap-yellow`, `--color-heatmap-red` (UX18)
- **AC-ARCH-NO-4:** Heatmap MUST NOT rely on color alone for accessibility — metric values always available in inspector panel (UX11)
- **AC-ARCH-NO-5:** H key listener MUST NOT be on `window` or `document` — scoped to canvas container ref to avoid triggering during text input
- **AC-ARCH-NO-6:** ArchieNode MUST NOT subscribe to entire `architectureStore` state for heatmap — use targeted selector `s => s.heatmapColors.get(id)` to avoid unnecessary re-renders
- **AC-ARCH-NO-7:** Store updates MUST NOT mutate existing Map instances — always create new Maps (consistent with Story 2-1 AC-ARCH-NO-8)
- **AC-ARCH-NO-8:** There MUST NOT be a `HeatmapProvider.tsx` or React context for heatmap — Zustand selectors provide equivalent per-node subscriptions without the additional component tree layer
- **AC-ARCH-NO-9:** Heatmap glow MUST NOT be applied to the category color stripe (top `div` with `backgroundColor`) — stripe is identity (UX18), glow is performance
- **AC-ARCH-NO-10:** Edge heatmap logic MUST NOT break existing incompatibility visual behavior when heatmap is disabled — `ConnectionWarning` label and dashed stroke must remain intact

## File Specification

| File/Component | Exact Path | Pattern | Status |
|----------------|------------|---------|--------|
| heatmapCalculator | `src/engine/heatmapCalculator.ts` | Pure function (AR17) | NEW |
| constants | `src/lib/constants.ts` | Constants | MODIFY |
| recalculationService | `src/services/recalculationService.ts` | Service (AR18) | MODIFY |
| architectureStore | `src/stores/architectureStore.ts` | Zustand store (AR15) | MODIFY |
| uiStore | `src/stores/uiStore.ts` | Zustand store (AR15) | MODIFY |
| ArchieNode | `src/components/canvas/ArchieNode.tsx` | React Flow node (AR20) | MODIFY |
| ArchieEdge | `src/components/canvas/ArchieEdge.tsx` | React Flow edge (AR20) | MODIFY |
| CanvasView | `src/components/canvas/CanvasView.tsx` | React Flow integration | MODIFY |
| index.css | `src/index.css` | CSS | MODIFY |
| types/index | `src/types/index.ts` | Type re-exports | MODIFY |
| heatmapCalculator.test | `tests/unit/engine/heatmapCalculator.test.ts` | Unit test (AR22) | NEW |
| architectureStore-heatmap.test | `tests/unit/stores/architectureStore-heatmap.test.ts` | Unit test (AR22) | NEW |
| uiStore.test | `tests/unit/stores/uiStore.test.ts` | Unit test (AR22) | MODIFY |

## Tasks / Subtasks

### Task 1: Heatmap Calculator Pure Function
- [x] 1.1 Create `src/engine/heatmapCalculator.ts` with `HeatmapStatus` type (`'healthy' | 'warning' | 'bottleneck'`) and `computeHeatmapStatus(overallScore: number): HeatmapStatus` — maps overall score to status using threshold constants
- [x] 1.2 Implement threshold logic: `healthy` if `overallScore >= HEATMAP_THRESHOLD_WARNING` (6), `warning` if `>= HEATMAP_THRESHOLD_BOTTLENECK` (4), `bottleneck` otherwise
- [x] 1.3 Implement `computeArchitectureHeatmap(metrics: ReadonlyMap<string, { overallScore: number }>): Map<string, HeatmapStatus>` — computes heatmap status for all nodes
- [x] 1.4 Implement `computeEdgeHeatmapStatus(sourceStatus: HeatmapStatus | undefined, targetStatus: HeatmapStatus | undefined): HeatmapStatus` — returns the worse of two endpoint statuses via severity ordering: `{ healthy: 2, warning: 1, bottleneck: 0 }`. Undefined defaults to `'healthy'`
- [x] 1.5 Add to `src/lib/constants.ts`: `HEATMAP_THRESHOLD_WARNING = 6`, `HEATMAP_THRESHOLD_BOTTLENECK = 4`, and `HEATMAP_COLORS = { healthy: 'var(--color-heatmap-green)', warning: 'var(--color-heatmap-yellow)', bottleneck: 'var(--color-heatmap-red)' } as const`
- [x] 1.6 Re-export `HeatmapStatus` from `src/types/index.ts`
- [x] 1.7 Write unit tests at `tests/unit/engine/heatmapCalculator.test.ts`: score 8 → healthy, score 6 → healthy (boundary), score 5.9 → warning, score 4 → warning (boundary), score 3.9 → bottleneck, score 1 → bottleneck, score 10 → healthy, empty map → empty map, 3-node map → correct statuses, edge worst-case all combinations, undefined endpoint handling

### Task 2: Store & Service Integration
- [x] 2.1 Add `heatmapColors: Map<string, HeatmapStatus>` to `architectureStore` (initialized as empty Map)
- [x] 2.2 Add `edgeHeatmapColors: Map<string, HeatmapStatus>` to `architectureStore` (initialized as empty Map)
- [x] 2.3 Add `heatmapEnabled: boolean` (default: `true`) and `toggleHeatmap()` action to `uiStore`
- [x] 2.4 Extend `RecalculationResult` interface with `nodeHeatmap: Map<string, HeatmapStatus>` and `edgeHeatmap: Map<string, HeatmapStatus>` fields
- [x] 2.5 Modify `recalculationService.run()` to call `computeArchitectureHeatmap(metrics)` after metric computation, then compute edge heatmap for all edges — return heatmap data in `RecalculationResult`
- [x] 2.6 Modify `architectureStore.triggerRecalculation()` to store `result.nodeHeatmap` as `heatmapColors` and `result.edgeHeatmap` as `edgeHeatmapColors` alongside `computedMetrics` in single batch update
- [x] 2.7 Update ripple scheduling: each hop's setTimeout callback updates both `computedMetrics` and `heatmapColors` for that node in a single `set()` call, using the same `recalcGeneration` stale check
- [x] 2.8 Write tests: `uiStore.test.ts` — heatmapEnabled defaults to true, toggleHeatmap toggles correctly. `architectureStore-heatmap.test.ts` — heatmapColors/edgeHeatmapColors update when triggerRecalculation runs, empty state when no recalculation has occurred

### Task 3: Visual Integration (Nodes, Edges, Canvas)
- [x] 3.1 Modify `ArchieNode.tsx`: destructure `id` alongside `data` from `NodeProps`. Add Zustand selectors: `useArchitectureStore(s => s.heatmapColors.get(id))` and `useUiStore(s => s.heatmapEnabled)`. When `heatmapEnabled && heatmapStatus`, apply `box-shadow` glow using `HEATMAP_COLORS[status]`. Category stripe remains unchanged
- [x] 3.2 Modify `ArchieEdge.tsx`: add Zustand selectors for `heatmapEnabled` and `edgeHeatmapColors.get(id)`. Implement edge color priority: heatmap enabled → heatmap color (+ dashed if incompatible); heatmap disabled → existing logic unchanged. `ConnectionWarning` label always visible for incompatible edges
- [x] 3.3 Add to `src/index.css`: `[data-testid="archie-node"] { transition: box-shadow 300ms ease; }` (UX13 smooth animation). Add edge stroke transition in `ArchieEdge` style: `transition: 'stroke 300ms ease'`
- [x] 3.4 Add H key toggle handler in `CanvasView.tsx` inside existing `handleKeyDown` useEffect: `if ((event.key === 'h' || event.key === 'H') && !event.ctrlKey && !event.altKey && !event.metaKey) { useUiStore.getState().toggleHeatmap() }`. Scoped to canvas container ref
- [x] 3.5 Verify color separation visually: category stripe on top border unchanged, heatmap glow on outer container `box-shadow`. Heatmap green/yellow/red never used for category identity

### Task 4: Testing & Verification
- [x] 4.1 Write unit tests for ArchieNode heatmap rendering: glow renders when heatmap enabled + status exists, no glow when disabled, no glow when status undefined, correct CSS class per status, category stripe unchanged during heatmap
- [x] 4.2 Write unit tests for ArchieEdge heatmap stroke: heatmap color when enabled, reverts when disabled, priority over incompatibility color, dashed pattern preserved for incompatible edges
- [x] 4.3 Run `npx tsc --noEmit` — no type errors
- [x] 4.4 Run `npm run test:quick` — all tests pass
- [x] 4.5 Verify coverage meets thresholds (Lines 45%, Branches 30%, Functions 25%, Statements 40%)

## Dev Notes

### Architecture Guidance

**Heatmap in the Recalculation Pipeline (NFR3 — synchronous):**
```
recalculationService.run(nodes, edges, changedNodeId)
  → propagator.getAffectedNodes() → affected nodeIds
  → recalculator.recalculateNode() for each → metrics (Map<nodeId, RecalculatedMetrics>)
  → heatmapCalculator.computeArchitectureHeatmap(metrics) → nodeHeatmap (Map<nodeId, HeatmapStatus>)
  → heatmapCalculator.computeEdgeHeatmapStatus() for each edge → edgeHeatmap (Map<edgeId, HeatmapStatus>)
  → return { metrics, propagationHops, nodeHeatmap, edgeHeatmap }
```
Heatmap is computed IN the pipeline, not after — this ensures NFR3 (synchronous update).

**Color Separation (UX18) — Critical:**
```
Category colors (identity):         Heatmap colors (performance):
- Top stripe (backgroundColor)      - Container box-shadow glow
- Category icon tint (color)        - Edge stroke color
- Toolbox card accent               - Dashboard bars (Story 2-3)
                                     - NEVER on category stripe
```
The user must identify WHAT a component is (blue = Compute) independently of HOW it performs (red = bottleneck). These are orthogonal visual channels.

**Edge Color Priority Logic:**
```typescript
// In ArchieEdge.tsx — determine stroke color
let strokeColor = "var(--archie-border)"
let strokeWidth = 1.5
let strokeDasharray: string | undefined

if (heatmapEnabled && edgeHeatmapStatus) {
  strokeColor = HEATMAP_COLORS[edgeHeatmapStatus]
  strokeWidth = 2
  if (isIncompatible) strokeDasharray = "5 3"  // keep dashed for incompatible
} else if (isIncompatible) {
  strokeColor = "var(--color-heatmap-yellow)"
  strokeDasharray = "5 3"
}

if (selected) {
  strokeWidth = 2.5
  if (!heatmapEnabled && !isIncompatible) strokeColor = "var(--archie-accent)"
}
```

**CSS Heatmap Glow (box-shadow approach):**
```css
/* Applied conditionally via inline style */
box-shadow: 0 0 8px 2px var(--color-heatmap-green|yellow|red);
/* Transition in index.css for smooth changes */
[data-testid="archie-node"] { transition: box-shadow 300ms ease; }
```

**ArchieNode `id` Prop:**
Change `function ArchieNodeComponent({ data }: NodeProps<ArchieNodeType>)` to `function ArchieNodeComponent({ id, data }: NodeProps<ArchieNodeType>)`. The `id` is needed for the Zustand selector `s.heatmapColors.get(id)`.

**Selector Stability:** `useArchitectureStore(s => s.heatmapColors.get(id))` returns `HeatmapStatus | undefined` — a primitive. Zustand's default `===` equality check works correctly. No custom comparator needed.

### Technical Notes

**Heatmap Threshold Tuning:**
Thresholds (6 for warning, 4 for bottleneck) align with the MetricValue enum ranges: `low` = 1-3, `medium` = 4-7, `high` = 8-10. A component with `overallScore` < 4 has an average in the "low" range — clearly a bottleneck. Score 4-5.9 is low-medium — a warning. Score >= 6 is mid-high — healthy. These are tunable constants in `constants.ts`, not magic numbers.

**Common Pitfalls:**
1. **Color proximity:** `--color-cat-data-storage` and `--color-heatmap-green` are both `#22c55e`. They appear on different visual channels (stripe vs glow), so a data-storage component that is healthy shows green stripe + green glow — acceptable since both signal "good" in their respective dimensions
2. **Edge color when heatmap disabled:** Edges MUST revert to existing Story 1-4 styling. Test this explicitly
3. **H key in input fields:** Scoped to canvas container ref. If user is typing in search/command palette, H triggers normal text input, not heatmap toggle
4. **Memo + Zustand hooks:** `ArchieNode` is `memo()` wrapped. Adding Zustand hooks means subscriptions trigger re-renders independently of `memo`. This is desired — `memo` still prevents re-renders from parent (ReactFlow pan/zoom)
5. **Pre-recalculation state:** Before any recalculation runs, `heatmapColors` is an empty Map. `heatmapColors.get(nodeId)` returns `undefined`, so no glow renders even if `heatmapEnabled` is true. This is correct behavior

### Cross-Cutting Dependencies

**DEPENDS ON (inbound):**
- Story 2-1: `computedMetrics` in architectureStore, `RecalculatedMetrics.overallScore`, `recalculationService.run()` pipeline, `RecalculationResult` extensible type, `triggerRecalculation()` action, `recalcGeneration` stale check, ripple scheduling

**CONSUMED BY (outbound):**
- Story 2-3 (Dashboard): Dashboard bars may use heatmap colors for consistency
- Story 2-4 (Tier System): Tier badge may reference heatmap status
- Epic 4 Story 4-5 (Flow Particles): Particle speed varies by heatmap health status
- Epic 4 Story 4-5 (Canvas Legend): Legend explains heatmap colors

### E2E Testing

E2E coverage recommended — run `/ecc-e2e story-2-2` after implementation.

Key E2E scenarios:
- Press H key → heatmap toggles on/off
- Change config variant → heatmap colors update (green, yellow, red visible)
- Verify category stripe color unchanged when heatmap active
- Verify connection line color changes with heatmap
- Verify incompatible edge retains dashed pattern when heatmap active
- Verify H key does NOT toggle when typing in search input

## ECC Analysis Summary
- Risk Level: LOW-MEDIUM
- Complexity: Moderate
- Sizing: MEDIUM (4 tasks, 20 subtasks, 13 files — 3 NEW + 10 MODIFY)
- Agents consulted: Planner, Architect
- Hardening: BUILT-IN (pure function pattern, no user input, no database, no auth)
- Key risks: Story 2-1 dependency (clean sequential), edge color priority logic (addressed in dev notes)

## Senior Developer Review (ECC)

**Date:** 2026-02-14
**Classification:** COMPLEX (4 agents)
**Agents:** code-reviewer (8/10), security-reviewer (9/10), architect (9/10), tdd-guide (6/10)
**Overall Score:** 8/10 — APPROVED

### Findings Summary
- 10 findings total: 1 CRITICAL, 3 MEDIUM, 6 LOW
- 7 QUICK fixes applied in-session
- 3 COMPLEX items deferred to TD stories

### Quick Fixes Applied
1. Staged untracked files (heatmapCalculator.ts, 2 test files)
2. Added input element guard to H key handler (INPUT/TEXTAREA/contentEditable)
3. Added stroke-width to edge transition for smooth heatmap toggle
4. Tightened loose toContain assertion to exact match in store test
5. Added edge case tests: negative/above-range scores
6. Added selected edge + heatmap interaction tests (2 new tests)

### Tech Debt Created
- **td-2-2a-canvas-heatmap-toggle-tests:** CanvasView H key toggle unit tests (AC-3 coverage)
- **td-2-2b-heatmap-robustness:** setTimeout cleanup + accessibility indicator

### Architecture Compliance
- 30/30 architectural ACs validated: all PASS
- File locations: 8/8 compliant
- Pattern violations: none
- Anti-patterns: none
- Alignment: ALIGNED

### E2E Coverage
- UI changes on critical path (ArchieNode, ArchieEdge, CanvasView)
- No existing E2E specs cover heatmap behavior
- Recommend: Run `/ecc-e2e story-2-2`
