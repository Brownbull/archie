# Story: 4-2-variant-recommendations-and-metric-tools

## Status: split
## Split into: story-4-2a, story-4-2b
## Epic: Epic 4: Deep Intelligence & Polish

## Overview

As a user, I want the system to suggest better variants for weak metrics, show me what changed when I switch configs, and let me filter which metrics I see, so that I can quickly identify improvements, understand trade-offs, and focus on what matters most.

**FRs covered:** FR33 (variant recommendations), FR34 (delta indicators), FR35 (metric filter)

## Functional Acceptance Criteria

**AC-FUNC-1 (FR33 — Recommendation display):**
Given a component has a metric scoring below the health threshold
When I view the inspector
Then the system displays a recommendation: "Consider [variant name]"
And shows the improvement amount for the weak metric
And shows the trade-off cost (which metric gets worse and by how much)

**AC-FUNC-2 (FR33 — Computed, not pre-stored):**
Given the recommendation is computed
When it is generated
Then it is derived entirely from existing metric data in the component library
And it is NOT pre-stored — computed at inspection time by comparing variant metrics

**AC-FUNC-3 (FR34 — Delta indicators on variant switch):**
Given I switch a component's configuration variant
When the metrics update in the inspector
Then each metric shows a +/- delta indicator showing the change from the previous variant
And deltas persist until the next variant switch (i.e., delta = 0 if no prior switch this session)

**AC-FUNC-4 (FR35 — Metric filter):**
Given I want to focus on specific metrics
When I use the metric filter in the inspector
Then I can show or hide individual metrics
And the filtered view persists while inspecting the current component (resets on component deselect)

**AC-FUNC-5 (No recommendation when all metrics healthy):**
Given all metrics for a component are above the health threshold
When I view the inspector
Then no recommendation banner is shown

**AC-FUNC-6 (Delta baseline):**
Given I select a component for the first time (no prior variant switch)
When I view the inspector
Then no delta indicators are shown (no previous metrics to diff against)

## Architectural Acceptance Criteria (MANDATORY)
> These ACs are MANDATORY and will be validated during code review.

### File Location Requirements

**AC-ARCH-LOC-1:** `recommendationEngine.ts` MUST be placed in `src/engine/` directory (alongside `recalculator.ts`, `heatmapCalculator.ts`, `tierEvaluator.ts`)

**AC-ARCH-LOC-2:** `VariantRecommendation.tsx` and `MetricFilter.tsx` MUST be placed in `src/components/inspector/`

### Pattern Requirements

**AC-ARCH-PATTERN-1:** `recommendationEngine` MUST be a pure function — no React hooks, no Zustand imports, no Firestore imports, no side effects (AR17 pattern: engine = pure functions)

**AC-ARCH-PATTERN-2:** Delta computation MUST derive from `architectureStore.previousMetrics` (already snapshotted per recalculation cycle via `set({ previousMetrics: new Map(get().computedMetrics) })`). Do NOT create any new snapshotting mechanism.

**AC-ARCH-PATTERN-3:** Metric filter state MUST be local `useState` in `ComponentDetail` (transient UI state, ephemeral per inspection — NOT in Zustand stores)

**AC-ARCH-PATTERN-4:** Health threshold for recommendations MUST use a named constant added to `src/lib/constants.ts` (e.g., `RECOMMENDATION_THRESHOLD = 5`). Do not inline magic numbers.

**AC-ARCH-PATTERN-5:** `VariantRecommendation` and `MetricFilter` MUST be exported from `src/components/inspector/index.ts` barrel export file.

**AC-ARCH-PATTERN-6:** `recommendationEngine` output type MUST be a typed interface (e.g., `VariantRecommendation`) defined in the engine file or `src/types/` — no anonymous inline types.

### Anti-Pattern Requirements (Must NOT Happen)

**AC-ARCH-NO-1:** MUST NOT store metric filter state in Zustand (it is ephemeral per-inspection session, not shared cross-component)

**AC-ARCH-NO-2:** MUST NOT pre-store or cache recommendations in Firestore — computed entirely from existing component library data

**AC-ARCH-NO-3:** MUST NOT add a new `previousMetrics` snapshotting mechanism — use the existing `architectureStore.previousMetrics` field which is already maintained by `triggerRecalculation`

**AC-ARCH-NO-4:** MUST NOT add delta display when `previousMetrics` is empty (no prior variant switch this session) — show deltas only when `previousMetrics.get(nodeId)` returns a value

## File Specification

| File/Component | Exact Path | Pattern | AC Reference |
|----------------|------------|---------|--------------|
| recommendationEngine | `src/engine/recommendationEngine.ts` | Pure function engine | AC-ARCH-LOC-1, AC-ARCH-PATTERN-1 |
| VariantRecommendation | `src/components/inspector/VariantRecommendation.tsx` | Inspector component | AC-ARCH-LOC-2 |
| MetricFilter | `src/components/inspector/MetricFilter.tsx` | Inspector component | AC-ARCH-LOC-2 |
| MetricBar (update) | `src/components/inspector/MetricBar.tsx` | Extend: add optional delta prop | AC-ARCH-PATTERN-2 |
| MetricCard (update) | `src/components/inspector/MetricCard.tsx` | Extend: pass delta map + hidden metrics | AC-ARCH-PATTERN-2 |
| ComponentDetail (update) | `src/components/inspector/ComponentDetail.tsx` | Extend: previousMetrics read, filter state, recommendations | AC-ARCH-PATTERN-2, AC-ARCH-PATTERN-3 |
| inspector barrel (update) | `src/components/inspector/index.ts` | Add new exports | AC-ARCH-PATTERN-5 |
| constants (update) | `src/lib/constants.ts` | Add RECOMMENDATION_THRESHOLD | AC-ARCH-PATTERN-4 |
| Engine unit test | `tests/unit/engine/recommendationEngine.test.ts` | Unit test | AC-ARCH-LOC-1 |
| MetricFilter test | `tests/unit/components/inspector/MetricFilter.test.tsx` | Unit test | AC-ARCH-LOC-2 |

## Tasks / Subtasks

- [ ] **Task 1: Recommendation engine (pure function)**
  - [ ] 1.1 Define `VariantRecommendation` output interface in `recommendationEngine.ts`
  - [ ] 1.2 Implement `computeRecommendations(component: Component, activeVariantId: string): VariantRecommendation[]` — scans all other variants, finds metrics below `RECOMMENDATION_THRESHOLD`, identifies best improving variant
  - [ ] 1.3 Add `RECOMMENDATION_THRESHOLD = 5` constant to `src/lib/constants.ts`
  - [ ] 1.4 Write unit tests: no weak metrics → empty array; one weak metric → one recommendation; multiple variants → selects best improvement + smallest trade-off

- [ ] **Task 2: Delta computation + MetricBar update**
  - [ ] 2.1 In `ComponentDetail`, read `previousMetrics` from `architectureStore` for current `nodeId`
  - [ ] 2.2 Compute `deltaMap: Map<metricId, number>` = currentMetric.numericValue - previousMetric.numericValue (only when previousMetrics exists for this node)
  - [ ] 2.3 Update `MetricBar` to accept optional `delta?: number` prop, render `+2` / `-1` indicator with color coding (green for positive, red for negative)
  - [ ] 2.4 Thread `deltaMap` through `MetricCard` → `MetricBar` props chain

- [ ] **Task 3: Metric filter component**
  - [ ] 3.1 Create `MetricFilter.tsx` — collapsible panel listing all metric names with checkboxes
  - [ ] 3.2 Initialize filter state from all metric IDs (all visible by default)
  - [ ] 3.3 Expose `hiddenMetricIds: Set<string>` to parent `ComponentDetail`
  - [ ] 3.4 Thread `hiddenMetricIds` through `MetricCard` → filter `metrics` before rendering `MetricBar`

- [ ] **Task 4: VariantRecommendation component**
  - [ ] 4.1 Create `VariantRecommendation.tsx` — compact card showing "Consider [Variant]" with improvement metric and trade-off metric
  - [ ] 4.2 Integrate `computeRecommendations()` call in `ComponentDetail` — pass `component` and `activeVariantId`
  - [ ] 4.3 Render recommendation cards above the metrics section (only when recommendations array is non-empty)

- [ ] **Task 5: Exports, tests, and git staging**
  - [ ] 5.1 Export `VariantRecommendation` and `MetricFilter` from `src/components/inspector/index.ts`
  - [ ] 5.2 Write `MetricFilter.test.tsx` — toggle visibility, all hidden, all visible scenarios
  - [ ] 5.3 Run `npm run test:quick` — all tests pass
  - [ ] 5.4 Verify all new and modified files are staged: `git status --porcelain | grep "^??"` → no untracked relevant files (AC-MUST-CHECK-1 from code-review-patterns.md)

## Dev Notes

### Architecture Guidance

**Delta computation timing:** `architectureStore.triggerRecalculation` sets `previousMetrics = new Map(get().computedMetrics)` at the START of each recalculation (line: `set({ recalcGeneration: generation, previousMetrics: new Map(get().computedMetrics) })`). This means when `ComponentDetail` renders after a variant switch, `previousMetrics.get(nodeId)` contains the metrics FROM THE PRIOR VARIANT and `computedMetrics.get(nodeId)` contains the new metrics. Delta = `computedMetrics[metricId].numericValue - previousMetrics[metricId].numericValue`.

**Recommendation engine signature:**
```typescript
// src/engine/recommendationEngine.ts
export interface VariantRecommendation {
  weakMetricId: string
  weakMetricName: string
  improvedVariantId: string
  improvedVariantName: string
  improvementDelta: number      // how much the weak metric improves
  tradeCostMetricId: string     // metric that gets worse
  tradeCostMetricName: string
  tradeCostDelta: number        // how much the trade-off metric worsens (negative)
}

export function computeRecommendations(
  component: Component,
  activeVariantId: string,
): VariantRecommendation[]
```

**Recommendation algorithm:**
1. Find active variant metrics
2. For each metric where `numericValue < RECOMMENDATION_THRESHOLD`:
   - Scan all OTHER variants for higher `numericValue` on this metric
   - For each candidate variant that improves the weak metric, find the metric with the worst delta (biggest regression) as the trade-off cost
   - Keep the candidate with best improvement for this weak metric
3. Return deduplicated recommendations (one per unique weak metric, or one per unique improved variant — choose per-unique-weak-metric to keep it focused)

**MetricBar delta display:**
```typescript
// Extend MetricBar props
interface MetricBarProps {
  metric: MetricValue
  delta?: number  // undefined = no delta to show; 0 = no change; +n / -n = change
}
// Render: if delta defined and delta !== 0 → show "+2" (green) or "-1" (red) to the right of the value
```

**MetricFilter:** Local `useState<Set<string>>` in `ComponentDetail`. Reset to all-visible when `nodeId` changes (use `useEffect` with `[nodeId]` dependency). Display as a collapsible section above the metric cards.

### Technical Notes

- `RECOMMENDATION_THRESHOLD` aligns directionally with `HEATMAP_THRESHOLD_BOTTLENECK = 4` and `HEATMAP_THRESHOLD_WARNING = 6`. Setting it to `5` targets the medium/low boundary — catches "marginal" metrics before they become bottlenecks.
- Recommendation cards should show component-library variant names (not IDs). Use `component.configVariants.find(v => v.id === improvedVariantId)?.name`.
- If a component has only one variant, `computeRecommendations` returns `[]` (no alternatives to recommend). Handle this in the UI by not rendering the section.
- MetricFilter should use `data-testid="metric-filter"` and `data-testid="metric-filter-toggle-{metricId}"` for E2E selectors.

### E2E Testing
E2E coverage recommended — run `/ecc-e2e 4-2-variant-recommendations-and-metric-tools` after implementation.

## ECC Analysis Summary
- Risk Level: MEDIUM
- Complexity: Moderate
- Classification: STANDARD
- Agents consulted: orchestrator (planner agents ran out of turns reading files; orchestrator analysis applied directly)
