# Story: 4-2a-recommendation-engine-and-delta-indicators

## Status: review
## Epic: Epic 4: Deep Intelligence & Polish
## Parent: 4-2-variant-recommendations-and-metric-tools (split)

## Overview

As a user, I want the system to compute variant recommendations for weak metrics and show delta indicators when I switch configs, so that I can quickly identify improvements and understand trade-offs.

**FRs covered:** FR33 (variant recommendations — engine only), FR34 (delta indicators)

## Functional Acceptance Criteria

**AC-FUNC-1 (FR33 — Recommendation computation):**
Given a component has a metric scoring below the health threshold
When recommendations are computed
Then the engine returns a recommendation: "Consider [variant name]"
And includes the improvement amount for the weak metric
And includes the trade-off cost (which metric gets worse and by how much)

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

**AC-FUNC-4 (No recommendation when all metrics healthy):**
Given all metrics for a component are above the health threshold
When recommendations are computed
Then an empty array is returned

**AC-FUNC-5 (Delta baseline):**
Given I select a component for the first time (no prior variant switch)
When I view the inspector
Then no delta indicators are shown (no previous metrics to diff against)

## Architectural Acceptance Criteria (MANDATORY)
> These ACs are MANDATORY and will be validated during code review.

### File Location Requirements

**AC-ARCH-LOC-1:** `recommendationEngine.ts` MUST be placed in `src/engine/` directory (alongside `recalculator.ts`, `heatmapCalculator.ts`, `tierEvaluator.ts`)

### Pattern Requirements

**AC-ARCH-PATTERN-1:** `recommendationEngine` MUST be a pure function — no React hooks, no Zustand imports, no Firestore imports, no side effects (AR17 pattern: engine = pure functions)

**AC-ARCH-PATTERN-2:** Delta computation MUST derive from `architectureStore.previousMetrics` (already snapshotted per recalculation cycle via `set({ previousMetrics: new Map(get().computedMetrics) })`). Do NOT create any new snapshotting mechanism.

**AC-ARCH-PATTERN-4:** Health threshold for recommendations MUST use a named constant added to `src/lib/constants.ts` (e.g., `RECOMMENDATION_THRESHOLD = 5`). Do not inline magic numbers.

**AC-ARCH-PATTERN-6:** `recommendationEngine` output type MUST be a typed interface (e.g., `VariantRecommendation`) defined in the engine file or `src/types/` — no anonymous inline types.

### Anti-Pattern Requirements (Must NOT Happen)

**AC-ARCH-NO-2:** MUST NOT pre-store or cache recommendations in Firestore — computed entirely from existing component library data

**AC-ARCH-NO-3:** MUST NOT add a new `previousMetrics` snapshotting mechanism — use the existing `architectureStore.previousMetrics` field which is already maintained by `triggerRecalculation`

**AC-ARCH-NO-4:** MUST NOT add delta display when `previousMetrics` is empty (no prior variant switch this session) — show deltas only when `previousMetrics.get(nodeId)` returns a value

## File Specification

| File/Component | Exact Path | Pattern | AC Reference |
|----------------|------------|---------|--------------|
| recommendationEngine | `src/engine/recommendationEngine.ts` | Pure function engine | AC-ARCH-LOC-1, AC-ARCH-PATTERN-1 |
| MetricBar (update) | `src/components/inspector/MetricBar.tsx` | Extend: add optional delta prop | AC-ARCH-PATTERN-2 |
| MetricCard (update) | `src/components/inspector/MetricCard.tsx` | Extend: pass delta map | AC-ARCH-PATTERN-2 |
| ComponentDetail (update) | `src/components/inspector/ComponentDetail.tsx` | Extend: previousMetrics read, delta computation | AC-ARCH-PATTERN-2 |
| constants (update) | `src/lib/constants.ts` | Add RECOMMENDATION_THRESHOLD | AC-ARCH-PATTERN-4 |
| Engine unit test | `tests/unit/engine/recommendationEngine.test.ts` | Unit test | AC-ARCH-LOC-1 |

## Tasks / Subtasks

- [x] **Task 1: Recommendation engine (pure function)**
  - [x] 1.1 Define `VariantRecommendation` output interface in `recommendationEngine.ts`
  - [x] 1.2 Implement `computeRecommendations(component: Component, activeVariantId: string): VariantRecommendation[]` — scans all other variants, finds metrics below `RECOMMENDATION_THRESHOLD`, identifies best improving variant
  - [x] 1.3 Add `RECOMMENDATION_THRESHOLD = 5` constant to `src/lib/constants.ts`
  - [x] 1.4 Write unit tests: no weak metrics → empty array; one weak metric → one recommendation; multiple variants → selects best improvement + smallest trade-off

- [x] **Task 2: Delta computation + MetricBar update**
  - [x] 2.1 In `ComponentDetail`, read `previousMetrics` from `architectureStore` for current `nodeId`
  - [x] 2.2 Compute `deltaMap: Map<metricId, number>` = currentMetric.numericValue - previousMetric.numericValue (only when previousMetrics exists for this node)
  - [x] 2.3 Update `MetricBar` to accept optional `delta?: number` prop, render `+2` / `-1` indicator with color coding (green for positive, red for negative)
  - [x] 2.4 Thread `deltaMap` through `MetricCard` → `MetricBar` props chain

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
3. Return deduplicated recommendations (one per unique weak metric)

**MetricBar delta display:**
```typescript
// Extend MetricBar props
interface MetricBarProps {
  metric: MetricValue
  delta?: number  // undefined = no delta to show; 0 = no change; +n / -n = change
}
// Render: if delta defined and delta !== 0 → show "+2" (green) or "-1" (red) to the right of the value
```

### Technical Notes

- `RECOMMENDATION_THRESHOLD` aligns directionally with `HEATMAP_THRESHOLD_BOTTLENECK = 4` and `HEATMAP_THRESHOLD_WARNING = 6`. Setting it to `5` targets the medium/low boundary — catches "marginal" metrics before they become bottlenecks.
- If a component has only one variant, `computeRecommendations` returns `[]` (no alternatives to recommend).

## ECC Analysis Summary
- Risk Level: LOW-MEDIUM
- Complexity: STANDARD (2 tasks, 8 subtasks, 6 files)
- Split from: story-4-2
