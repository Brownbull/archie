# Story: 2-1 Recalculation Engine & Metric Propagation

## Status: done
## Epic: Epic 2 — Trade-off Intelligence & Visualization

## Overview

As a user, I want metrics to automatically recalculate when I change a component's configuration or swap a component type, so that I can see the real impact of every architecture decision across connected components.

This story implements the core recalculation pipeline: pure engine functions for metric computation, a graph propagator for traversing connected components, and a recalculation service that orchestrates cache lookups + engine computation + store updates. It also adds the visual sequential ripple propagation (UX3) where metric changes visibly cascade through connected components with ~100ms delay per hop and a CSS pulse animation on each node as the wave passes. This is the "aha moment" — the core loop that makes Archie valuable.

## Functional Acceptance Criteria

**AC-1: Metric Recalculation on Config Change**
**Given** a component is on the canvas with a configuration variant selected
**When** I switch to a different configuration variant
**Then** the component's metrics recalculate to reflect the new variant's values
**And** the recalculation completes within 200ms (NFR2)

**AC-2: Metric Propagation Through Connected Components**
**Given** component A is connected to component B
**When** I change component A's configuration variant
**Then** component B's displayed metrics update to reflect the interaction change (FR14)
**And** the propagation cascades through all affected connected components

**AC-3: Visual Sequential Ripple Propagation**
**Given** component A is connected to B, and B is connected to C
**When** I change component A's configuration variant
**Then** the propagation is visually sequential: each hop animates with ~100ms delay so the user sees a ripple wave moving outward from the changed component (UX3)
**And** each node shows a brief CSS pulse/glow animation as the ripple passes through it (via `rippleActiveNodeIds`)
**Note:** Heatmap color integration comes in Story 2-2. This story implements the structural ripple animation only.

**AC-4: Recalculation on Component Swap**
**Given** I swap a component type (from Epic 1 Story 1.6)
**When** the swap completes
**Then** all affected metrics recalculate including propagated effects on connected components

**AC-5: Recalculation on Connection Change**
**Given** I add or remove a connection between two components
**When** the connection change completes
**Then** metrics on both components recalculate to reflect the new connectivity

**AC-6: Deterministic Output**
**Given** the recalculation engine runs
**When** the same inputs are provided
**Then** the output is always identical (deterministic — same inputs = same outputs)

**AC-7: Computed Metrics Visible in Inspector**
**Given** a component has been recalculated (computedMetrics exist in store)
**When** I select that component to view in the inspector
**Then** the inspector displays the computed metrics (not raw library metrics)
**And** components without computed metrics still display library metrics as fallback

## Architectural Acceptance Criteria (MANDATORY)

> These ACs are MANDATORY and will be validated during code review.

### File Location Requirements

- **AC-ARCH-LOC-1:** Core recalculation logic located at `src/engine/recalculator.ts`
- **AC-ARCH-LOC-2:** Graph traversal and propagation logic located at `src/engine/propagator.ts`
- **AC-ARCH-LOC-3:** Recalculation service located at `src/services/recalculationService.ts`
- **AC-ARCH-LOC-4:** Architecture store modifications in `src/stores/architectureStore.ts`
- **AC-ARCH-LOC-5:** Recalculator unit tests at `tests/unit/engine/recalculator.test.ts`
- **AC-ARCH-LOC-6:** Propagator unit tests at `tests/unit/engine/propagator.test.ts`
- **AC-ARCH-LOC-7:** Recalculation service unit tests at `tests/unit/services/recalculationService.test.ts`
- **AC-ARCH-LOC-8:** Integration test at `tests/integration/recalculationPipeline.test.ts`

### Pattern Requirements

- **AC-ARCH-PATTERN-1:** `recalculator.ts` and `propagator.ts` are pure functions — no imports from `react`, `zustand`, `firebase`, or any service module. Data passed as arguments, results returned (AR17)
- **AC-ARCH-PATTERN-2:** `recalculationService.ts` orchestrates: reads component data from `componentLibrary` cache (synchronous O(1)) → merges base metrics with variant overlay → calls engine pure functions → returns computed results. Service never calls Firestore directly (AR18)
- **AC-ARCH-PATTERN-3:** Store action calls `recalculationService.run()`, receives results, and updates computed state. The initial computation result is applied immediately for the changed node. The visual ripple involves sequential `set()` calls per hop via setTimeout — this is intentional for the animation, not an accidental multi-update (AR19)
- **AC-ARCH-PATTERN-4:** Propagator performs BFS traversal on the edges array from architectureStore — does NOT build a separate graph data structure. Receives `nodes` and `edges` as arguments
- **AC-ARCH-PATTERN-5:** Metric values use the existing `MetricValue` schema (id, name, value enum, numericValue 1-10, category) — no new metric types
- **AC-ARCH-PATTERN-6:** Visual ripple propagation uses `setTimeout` with ~100ms per hop to create sequential visual updates. Each hop triggers a store update for that node only, causing React to re-render that component with updated metrics
- **AC-ARCH-PATTERN-7:** Config change pipeline snapshots previous metrics before recalculation (AR19) — stored temporarily for delta computation (consumed by Story 2.3/Epic 4)
- **AC-ARCH-PATTERN-8:** `updateNodeConfigVariant` and `swapNodeComponent` store actions trigger recalculation after updating the node data
- **AC-ARCH-PATTERN-9:** `addEdge` and `removeEdges` store actions trigger recalculation for affected endpoint nodes
- **AC-ARCH-PATTERN-10:** Config variant metrics are PARTIAL overlays on base metrics. The service must merge `component.baseMetrics` with `activeVariant.metrics` (variant values override base values for matching metric IDs) before passing to the recalculator. The recalculator receives the merged "effective metrics" — it does not need to know about base vs variant distinction

### Anti-Pattern Requirements (Must NOT Happen)

- **AC-ARCH-NO-1:** Engine functions (`recalculator.ts`, `propagator.ts`) MUST NOT import from `react`, `zustand`, `firebase`, or any service — pure functions only (AR17)
- **AC-ARCH-NO-2:** `recalculationService` MUST NOT import from `firebase` or `react` — it reads from `componentLibrary` cache only
- **AC-ARCH-NO-3:** Store actions MUST NOT call engine functions directly — always go through `recalculationService` (AR18)
- **AC-ARCH-NO-4:** Recalculation MUST NOT use async operations — `componentLibrary.getComponent()` is synchronous O(1) from Map cache
- **AC-ARCH-NO-5:** Propagator MUST NOT create a separate graph/adjacency-list class — work directly with the `nodes` and `edges` arrays
- **AC-ARCH-NO-6:** Visual ripple MUST NOT block the UI thread — use microtask scheduling (setTimeout) for sequential hop updates
- **AC-ARCH-NO-7:** Engine functions MUST NOT mutate input arguments — always return new objects/arrays
- **AC-ARCH-NO-8:** Store updates MUST NOT mutate existing Map/Set instances — always create new instances (e.g., `new Map([...state.computedMetrics, [id, value]])`, never `state.computedMetrics.set(id, value)`)

## File Specification

| File/Component | Exact Path | Pattern | Status |
|----------------|------------|---------|--------|
| recalculator | `src/engine/recalculator.ts` | Pure function (AR17) | NEW |
| propagator | `src/engine/propagator.ts` | Pure function (AR17) | NEW |
| recalculationService | `src/services/recalculationService.ts` | Service orchestration (AR18) | NEW |
| architectureStore | `src/stores/architectureStore.ts` | Zustand store (AR15) | MODIFY |
| ComponentDetail | `src/components/inspector/ComponentDetail.tsx` | React component | MODIFY |
| constants | `src/lib/constants.ts` | Constants | MODIFY |
| types/index | `src/types/index.ts` | Type re-exports | MODIFY |
| recalculator.test | `tests/unit/engine/recalculator.test.ts` | Unit test (AR22) | NEW |
| propagator.test | `tests/unit/engine/propagator.test.ts` | Unit test (AR22) | NEW |
| recalculationService.test | `tests/unit/services/recalculationService.test.ts` | Unit test (AR22) | NEW |
| recalculationPipeline.test | `tests/integration/recalculationPipeline.test.ts` | Integration test (AR22) | NEW |
| architectureStore.test | `tests/unit/stores/architectureStore.test.ts` | Unit test (AR22) | MODIFY |

## Tasks / Subtasks

### Task 1: Recalculator Pure Function
- [x] 1.1 Create `src/engine/recalculator.ts` with `recalculateNode(nodeId, effectiveMetrics, connectedNodes, edges): RecalculatedMetrics` — takes node ID, its pre-merged effective metrics (base + variant overlay), connected nodes with their metrics and categories, and edges; returns updated metric values
- [x] 1.2 Implement base metric computation: receive `effectiveMetrics` (already merged by the service from `component.baseMetrics` overlaid with `activeVariant.metrics` — variant values replace base values for matching metric IDs, base values fill in the rest)
- [x] 1.3 Define v1 interaction rules as `INTERACTION_RULES` constant inside recalculator.ts. Start with 5-8 rules covering the most impactful category pairs from the 10 seeded component categories: caching→data-storage, messaging→compute, delivery-network→compute, data-storage→compute, monitoring→compute, etc. Each rule specifies 1-3 metric adjustments (metricId, delta -2 to +2, bounded to 1-10 range). Audit all 10 component YAML files in `src/data/components/` to catalog available metric IDs before defining rules
- [x] 1.4 Implement connection interaction modifiers: for each connected component, look up category-pair in `INTERACTION_RULES` and apply adjustments to the node's effective metrics. Clamp all numericValues to [1, 10] range. Derive the `value` enum ("low"=1-3, "medium"=4-7, "high"=8-10) from the clamped numericValue
- [x] 1.5 Implement `recalculateArchitecture(nodes, edges, getEffectiveMetrics): ArchitectureMetrics` — computes metrics for all nodes in the graph using a provided lookup function, returns a map of nodeId → computed metrics. Used for full-graph recalculation (import, initial load)
- [x] 1.6 Define `RecalculatedMetrics` type: `{ nodeId: string, metrics: MetricValue[], overallScore: number }` where overallScore = average of all numericValues
- [x] 1.7 Define `ArchitectureMetrics` type: `Map<string, RecalculatedMetrics>`
- [x] 1.8 Write unit tests: single node with only effective metrics (no connections — returns base unchanged), two connected nodes with matching interaction rule (modifier applied), two connected nodes with no matching rule (base unchanged), determinism (same input → same output), empty graph (returns empty map), numericValue clamping at boundaries (1 and 10), value enum derivation from numericValue

### Task 2: Propagator Pure Function
- [x] 2.1 Create `src/engine/propagator.ts` with `getAffectedNodes(changedNodeId, nodes, edges): string[]` — returns ordered list of nodeIds that need recalculation, starting from the changed node and BFS-traversing outward through edges
- [x] 2.2 Implement BFS traversal: starting from `changedNodeId`, visit all connected nodes via edges (both source and target directions), tracking visited nodes to avoid cycles
- [x] 2.3 Return results ordered by BFS depth (changed node first, then direct neighbors, then their neighbors, etc.) — this order drives the visual ripple timing
- [x] 2.4 Implement `getPropagationHops(changedNodeId, nodes, edges): PropagationHop[]` — returns `{ nodeId, hopIndex, delayMs }` for each affected node, where `delayMs = hopIndex * RIPPLE_DELAY_MS`
- [x] 2.5 Add `RIPPLE_DELAY_MS = 100` constant to `src/lib/constants.ts`
- [x] 2.6 Write unit tests: linear chain (A→B→C returns [A,B,C]), branching (A→B, A→C returns [A,B,C] or [A,C,B]), cycle detection (A→B→A doesn't infinite loop), disconnected nodes not included, single node (returns [changedNode] only), bidirectional traversal (edges are followed in both directions regardless of source/target)

### Task 3: Recalculation Service
- [x] 3.1 Create `src/services/recalculationService.ts` with `run(nodes, edges, changedNodeId): RecalculationResult` — orchestrates the full pipeline
- [x] 3.2 Service reads component data from `componentLibrary.getComponent()` for each affected node (synchronous O(1) lookup)
- [x] 3.3 Service merges base metrics with variant overlay for each node: start from `component.baseMetrics`, overlay `activeVariant.metrics` for matching metric IDs (variant values replace base). This produces the `effectiveMetrics` passed to the recalculator (AC-ARCH-PATTERN-10)
- [x] 3.4 Service calls `propagator.getAffectedNodes()` to determine recalculation order
- [x] 3.5 Service calls `recalculator.recalculateNode()` for each affected node in propagation order, using the merged effective metrics
- [x] 3.6 Service computes `propagator.getPropagationHops()` for visual ripple timing data
- [x] 3.7 Service returns `RecalculationResult`: `{ metrics: ArchitectureMetrics, propagationHops: PropagationHop[] }`. Design this type as extensible — later stories (2-2, 2-3, 2-4) will add heatmap, tier, and recommendation results
- [x] 3.8 Write unit tests with mocked componentLibrary: single node recalc with partial variant metrics (merge verified), multi-node propagation, correct propagation order, service returns complete result, handles componentLibrary returning undefined for unknown IDs gracefully

### Task 4: Store Integration & Ripple Animation
- [x] 4.1 Add computed metrics state to `architectureStore`: `computedMetrics: Map<string, RecalculatedMetrics>` (initialized empty)
- [x] 4.2 Add `previousMetrics: Map<string, RecalculatedMetrics>` for delta snapshots (AR19)
- [x] 4.3 Add `rippleActiveNodeIds: Set<string>` state — tracks which nodes are currently animating in the ripple wave
- [x] 4.4 Add `recalcGeneration: number` state (initialized 0) — generation counter for stale timeout prevention
- [x] 4.5 Add `triggerRecalculation(changedNodeId: string)` action: increments `recalcGeneration`, snapshots current `computedMetrics` into `previousMetrics`, calls `recalculationService.run()`, schedules ripple animation, applies computed metrics
- [x] 4.6 Implement ripple scheduling in `triggerRecalculation`: capture current generation before scheduling. For each `PropagationHop`, use `setTimeout(delay)` to sequentially update each node's metrics and add/remove from `rippleActiveNodeIds`. Each setTimeout callback checks `get().recalcGeneration === capturedGeneration` before writing — skips if stale (rapid change cancellation)
- [x] 4.7 Modify `updateNodeConfigVariant` to call `triggerRecalculation(nodeId)` after updating variant
- [x] 4.8 Modify `swapNodeComponent` to call `triggerRecalculation(nodeId)` after swapping component
- [x] 4.9 Modify `addEdge` to call `triggerRecalculation` for source and target nodes after edge creation
- [x] 4.10 Modify `removeEdges` to capture source/target node IDs from edges BEFORE filtering, then call `triggerRecalculation` for affected endpoint nodes AFTER edge removal
- [x] 4.11 Modify `removeNode` to capture neighbor node IDs BEFORE removing the node and its edges, then call `triggerRecalculation` for surviving neighbors AFTER the state update
- [x] 4.12 Re-export new types (`RecalculatedMetrics`, `ArchitectureMetrics`, `PropagationHop`, `RecalculationResult`) from `src/types/index.ts`
- [x] 4.13 Update `ComponentDetail.tsx` to read metrics from `computedMetrics` in architectureStore when available for the selected node, falling back to `activeVariant.metrics` from the library for nodes that have not yet been recalculated (AC-7)
- [x] 4.14 Write unit tests: config change triggers recalculation, swap triggers recalculation, add/remove edge triggers recalculation, previousMetrics snapshot is taken before recalc, rippleActiveNodeIds populated during animation, generation counter prevents stale writes on rapid changes (use `vi.useFakeTimers()`)

### Task 5: Integration Test & Verification
- [x] 5.1 Create `tests/integration/recalculationPipeline.test.ts`: end-to-end test with real engine functions + mocked componentLibrary data — place 3 components, connect A→B→C, change A's config, verify B and C metrics update correctly
- [x] 5.2 Test propagation order: A updates first, B second, C third
- [x] 5.3 Test determinism: run same scenario twice, verify identical results
- [x] 5.4 Test partial variant metrics: component with 5 base metrics and variant overriding 2 — verify merged result has all 5 metrics with 2 overridden
- [x] 5.5 Run `npx tsc --noEmit` — no type errors
- [x] 5.6 Run `npm run test:quick` — all tests pass
- [x] 5.7 Verify coverage meets thresholds (Lines 45%, Branches 30%, Functions 25%, Statements 40%)

## Dev Notes

### Architecture Guidance

**Config Change Pipeline (AR19 — the core flow):**
```
User clicks config dropdown
  → ConfigSelector calls architectureStore.updateNodeConfigVariant(nodeId, variantId)
  → Store action updates node data: { ...data, activeConfigVariantId: variantId }
  → Store action increments recalcGeneration
  → Store action snapshots previousMetrics (for delta display in Epic 4)
  → Store action calls recalculationService.run(nodes, edges, nodeId)
  → Service reads component data from componentLibrary cache (sync O(1))
  → Service merges baseMetrics + activeVariant.metrics → effectiveMetrics per node
  → Service calls propagator.getAffectedNodes(nodeId, nodes, edges) → [nodeId, neighbor1, ...]
  → Service calls recalculator.recalculateNode() for each affected node with effectiveMetrics
  → Service calls propagator.getPropagationHops() for ripple timing
  → Service returns { metrics, propagationHops }
  → Store schedules ripple: setTimeout per hop to update computedMetrics[hopNodeId]
  → Each setTimeout callback checks recalcGeneration before writing (stale prevention)
  → React re-renders each affected ArchieNode as its metrics update (visual wave)
```

**Metric Merge Logic (in recalculationService — AC-ARCH-PATTERN-10):**
```typescript
// Service assembles effectiveMetrics BEFORE calling engine
function mergeMetrics(baseMetrics: MetricValue[], variantMetrics: MetricValue[]): MetricValue[] {
  const merged = new Map(baseMetrics.map(m => [m.id, m]))
  for (const vm of variantMetrics) {
    merged.set(vm.id, vm) // variant overrides base for matching IDs
  }
  return Array.from(merged.values())
}
```

**Recalculator Design:**
```typescript
// src/engine/recalculator.ts — PURE FUNCTION
export interface RecalculatedMetrics {
  nodeId: string
  metrics: MetricValue[]
  overallScore: number  // average of all numericValues
}

export function recalculateNode(
  nodeId: string,
  effectiveMetrics: MetricValue[],  // pre-merged by service (base + variant)
  connectedNodes: { nodeId: string; category: string; metrics: MetricValue[] }[],
  edges: { source: string; target: string }[]
): RecalculatedMetrics
```
- Start from effectiveMetrics as base (already merged by service)
- For each connected node, look up category-pair interaction rules and apply adjustments
- Clamp numericValues to [1, 10], derive value enum from result
- Return computed metrics + overall score

**Propagator Design:**
```typescript
// src/engine/propagator.ts — PURE FUNCTION
export interface PropagationHop {
  nodeId: string
  hopIndex: number   // 0 = changed node, 1 = direct neighbors, 2 = their neighbors
  delayMs: number    // hopIndex * RIPPLE_DELAY_MS
}

export function getAffectedNodes(
  changedNodeId: string,
  nodes: { id: string }[],
  edges: { source: string; target: string }[]
): string[]

export function getPropagationHops(
  changedNodeId: string,
  nodes: { id: string }[],
  edges: { source: string; target: string }[]
): PropagationHop[]
```

**Visual Ripple Implementation (with generation counter):**
```typescript
// In architectureStore.triggerRecalculation:
const generation = get().recalcGeneration + 1
set({ recalcGeneration: generation })

// Snapshot previous metrics
set({ previousMetrics: new Map(get().computedMetrics) })

const result = recalculationService.run(nodes, edges, changedNodeId)

// Immediate update for changed node (hop 0)
set({ computedMetrics: new Map([...get().computedMetrics, [changedNodeId, result.metrics.get(changedNodeId)!]]) })

// Sequential ripple for remaining nodes
for (const hop of result.propagationHops.filter(h => h.hopIndex > 0)) {
  setTimeout(() => {
    // Stale check — skip if a newer recalculation has started
    if (get().recalcGeneration !== generation) return

    set(state => ({
      computedMetrics: new Map([...state.computedMetrics, [hop.nodeId, result.metrics.get(hop.nodeId)!]]),
      rippleActiveNodeIds: new Set([...state.rippleActiveNodeIds, hop.nodeId])
    }))
    // Clear ripple indicator after animation
    setTimeout(() => {
      if (get().recalcGeneration !== generation) return
      set(state => {
        const next = new Set(state.rippleActiveNodeIds)
        next.delete(hop.nodeId)
        return { rippleActiveNodeIds: next }
      })
    }, 200) // ripple visual duration
  }, hop.delayMs)
}
```

**Key Architecture Patterns:**
1. **Pure Engine Functions (AR17):** Everything in `src/engine/` receives data as arguments and returns results. Zero side effects.
2. **Service Orchestration (AR18):** `recalculationService` is the glue between cache and engine. It reads from `componentLibrary` (sync), merges base + variant metrics, passes to engine functions, returns results.
3. **Immutable Store Updates:** Always create new Map/Set instances — never mutate existing ones.
4. **Synchronous Critical Path:** No async operations in the recalculation path. `componentLibrary.getComponent()` is O(1) from Map cache.
5. **Extensible Return Type:** `RecalculationResult` will grow in later stories (heatmap, tier, recommendations).

### Technical Notes

**Interaction Rules Table:**
The recalculator needs category-pair interaction rules to compute how connections affect metrics. For v1, this is a hardcoded lookup table inside `recalculator.ts`:
```typescript
// Audit src/data/components/*.yaml to catalog all metric IDs before defining rules
const INTERACTION_RULES: Record<string, MetricAdjustment[]> = {
  "caching→data-storage": [
    { metricId: "read-latency", adjustment: +2 },
    { metricId: "consistency", adjustment: -1 },
  ],
  "messaging→compute": [
    { metricId: "decoupling", adjustment: +2 },
    { metricId: "latency", adjustment: -1 },
  ],
  // 5-8 rules total for v1, covering the most impactful pairs
}
```
The key format is `"sourceCategory→targetCategory"`. Both directions should be checked (A→B and B→A both apply rules to the target node). This table is starter content — it will grow based on feedback.

**Config Variant Metrics Are Partial:**
Examining seed data (e.g., `postgresql.yaml`), variants contain only a SUBSET of metrics. For example, `single-node` has 2 metrics while the component has 5 base metrics. The service MUST merge: start from `baseMetrics`, overlay `variantMetrics` for matching IDs.

**Performance Budget:**
- NFR2 requires <200ms for recalculation
- At MVP scale (10-20 components), BFS + recalculation is O(n) where n is number of affected nodes
- Each node recalculation is O(m) where m is number of connected nodes
- Total: O(n*m) which for 20 nodes with 3-4 connections each is ~80 operations — well within 200ms

**removeNode / removeEdges Ordering:**
- `removeNode`: Capture neighbor node IDs BEFORE removing the node and its edges. After state update, trigger recalculation for surviving neighbors.
- `removeEdges`: Capture source/target node IDs from edges BEFORE filtering. After state update, trigger recalculation for affected endpoint nodes.

**Common Pitfalls:**
1. **Circular propagation:** BFS with visited set prevents infinite loops in cyclic graphs
2. **Stale reads during ripple:** Each setTimeout callback reads fresh state via `get()` — not stale closure state. Generation counter prevents writes from superseded recalculations.
3. **Multiple rapid changes:** Generation counter handles this — stale setTimeout callbacks check generation and skip if outdated
4. **Empty graph:** Handle gracefully — recalculation with 0 nodes returns empty metrics
5. **Node with no connections:** Returns effective metrics unchanged (no interaction modifiers)
6. **Store test file size:** `architectureStore.test.ts` is already 1017 lines. Consider organizing new recalculation tests in clear `describe("recalculation", ...)` blocks. If approaching pre-edit guard limits, split into `architectureStore-recalculation.test.ts`.
7. **Map serialization in Zustand:** Using `new Map(...)` creates new references on every update — subscribers to `computedMetrics` will always re-render. This is desired at MVP scale. Per-node selectors can optimize later if needed.

### Cross-Cutting Dependencies

**DEPENDS ON (inbound — all satisfied by Epic 1):**
- Story 1-2: componentSchema (MetricValue type), componentLibrary service (getComponent sync lookup)
- Story 1-3: architectureStore (nodes, edges), ArchieNodeData interface (archieComponentId, activeConfigVariantId)
- Story 1-4: ArchieEdge data (source, target), addEdge/removeEdges actions
- Story 1-5: Inspector panel reads computed metrics for display, ComponentDetail.tsx (modified in this story)
- Story 1-6: swapNodeComponent action (trigger point for recalculation)

**CONSUMED BY (outbound):**
- Story 2-2 (Heatmap): Reads `computedMetrics` to derive heatmap colors + rippleActiveNodeIds for heatmap ripple integration
- Story 2-3 (Dashboard): Reads `computedMetrics` for aggregate scores and per-component ratings
- Story 2-4 (Tier System): Reads full architecture metrics for tier evaluation
- Epic 4 Story 4-2 (Deltas): Reads `previousMetrics` for delta computation

### E2E Testing

E2E coverage recommended — run `/ecc-e2e story-2-1` after implementation.

Key E2E scenarios:
- Place 2 components, connect them, change config on one → verify other's metrics update in inspector
- Place 3 components in chain (A→B→C), change A → verify sequential ripple visual
- Swap component type → verify connected metrics recalculate
- Remove connection → verify metrics revert to base values
- Rapid config switching → verify no stale/corrupted state

## Senior Developer Review (ECC)

**Date:** 2026-02-14
**Classification:** COMPLEX
**Agents:** code-reviewer (Sonnet), security-reviewer (Sonnet), architect (Opus), tdd-guide (Haiku)

| Agent | Score | Status |
|-------|-------|--------|
| Code Quality | 7/10 | CHANGES REQUESTED |
| Security | 10/10 | APPROVE |
| Architecture | 10/10 | APPROVE |
| Testing | 7/10 | CHANGES REQUESTED |
| **OVERALL** | **9/10** | **APPROVED (after fixes)** |

**Architecture:** All 26 ACs passed (8/8 LOC, 10/10 PATTERN, 8/8 NO-ANTIPATTERN). Clean 3-layer separation: engine -> service -> store.

**Quick Fixes Applied (7):**
1. Race condition: added node existence check in setTimeout callbacks
2. Extracted 200ms ripple animation magic number to `RIPPLE_ANIMATION_DURATION_MS` constant
3. Added console.warn in recalculationService when component not found
4. Strengthened ripple timing test with precise ms-level assertions
5. Added variant-not-found test in propagation context
6. Added value enum boundary precision tests (6 tests)
7. Strengthened stale write test to verify ripple cleanup

**TD Story Created:** td-2-1a-recalc-robustness (error path tests + rule lookup optimization)

## ECC Analysis Summary
- Risk Level: MEDIUM
- Complexity: High
- Sizing: LARGE (5 tasks, ~38 subtasks, 12 files)
- Agents consulted: Planner, Architect
- Hardening: BUILT-IN (pure function pattern eliminates most risk categories)
- Key risks: Interaction rules content definition, config variant partial merge, rapid change race condition (all addressed in story)
