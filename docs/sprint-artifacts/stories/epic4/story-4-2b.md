# Story: 4-2b-metric-filter-and-recommendation-ui

## Status: review
## Epic: Epic 4: Deep Intelligence & Polish
## Parent: 4-2-variant-recommendations-and-metric-tools (split)
## Depends on: 4-2a-recommendation-engine-and-delta-indicators

## Overview

As a user, I want to see recommendation cards suggesting better variants, and filter which metrics I see in the inspector, so that I can focus on what matters most and quickly act on improvement suggestions.

**FRs covered:** FR33 (variant recommendations — UI), FR35 (metric filter)

## Functional Acceptance Criteria

**AC-FUNC-1 (FR33 — Recommendation display):**
Given a component has a metric scoring below the health threshold
When I view the inspector
Then the system displays a recommendation card: "Consider [variant name]"
And shows the improvement amount for the weak metric
And shows the trade-off cost (which metric gets worse and by how much)

**AC-FUNC-2 (FR33 — No recommendation when all healthy):**
Given all metrics for a component are above the health threshold
When I view the inspector
Then no recommendation banner is shown

**AC-FUNC-3 (FR35 — Metric filter):**
Given I want to focus on specific metrics
When I use the metric filter in the inspector
Then I can show or hide individual metrics
And the filtered view persists while inspecting the current component (resets on component deselect)

## Architectural Acceptance Criteria (MANDATORY)
> These ACs are MANDATORY and will be validated during code review.

### File Location Requirements

**AC-ARCH-LOC-2:** `VariantRecommendation.tsx` and `MetricFilter.tsx` MUST be placed in `src/components/inspector/`

### Pattern Requirements

**AC-ARCH-PATTERN-3:** Metric filter state MUST be local `useState` in `ComponentDetail` (transient UI state, ephemeral per inspection — NOT in Zustand stores)

**AC-ARCH-PATTERN-5:** `VariantRecommendation` and `MetricFilter` MUST be exported from `src/components/inspector/index.ts` barrel export file.

### Anti-Pattern Requirements (Must NOT Happen)

**AC-ARCH-NO-1:** MUST NOT store metric filter state in Zustand (it is ephemeral per-inspection session, not shared cross-component)

## File Specification

| File/Component | Exact Path | Pattern | AC Reference |
|----------------|------------|---------|--------------|
| VariantRecommendation | `src/components/inspector/VariantRecommendation.tsx` | Inspector component | AC-ARCH-LOC-2 |
| MetricFilter | `src/components/inspector/MetricFilter.tsx` | Inspector component | AC-ARCH-LOC-2 |
| MetricCard (update) | `src/components/inspector/MetricCard.tsx` | Extend: pass hidden metrics | AC-ARCH-PATTERN-3 |
| ComponentDetail (update) | `src/components/inspector/ComponentDetail.tsx` | Extend: filter state, recommendations | AC-ARCH-PATTERN-3 |
| inspector barrel (update) | `src/components/inspector/index.ts` | Add new exports | AC-ARCH-PATTERN-5 |
| MetricFilter test | `tests/unit/components/inspector/MetricFilter.test.tsx` | Unit test | AC-ARCH-LOC-2 |

## Tasks / Subtasks

- [x] **Task 3: Metric filter component**
  - [x] 3.1 Create `MetricFilter.tsx` — collapsible panel listing all metric names with checkboxes
  - [x] 3.2 Initialize filter state from all metric IDs (all visible by default)
  - [x] 3.3 Expose `hiddenMetricIds: Set<string>` to parent `ComponentDetail`
  - [x] 3.4 Thread `hiddenMetricIds` through `MetricCard` → filter `metrics` before rendering `MetricBar`

- [x] **Task 4: VariantRecommendation component**
  - [x] 4.1 Create `VariantRecommendation.tsx` — compact card showing "Consider [Variant]" with improvement metric and trade-off metric
  - [x] 4.2 Integrate `computeRecommendations()` call in `ComponentDetail` — pass `component` and `activeVariantId`
  - [x] 4.3 Render recommendation cards above the metrics section (only when recommendations array is non-empty)

- [x] **Task 5: Exports, tests, and git staging**
  - [x] 5.1 Export `VariantRecommendation` and `MetricFilter` from `src/components/inspector/index.ts`
  - [x] 5.2 Write `MetricFilter.test.tsx` — toggle visibility, all hidden, all visible scenarios
  - [x] 5.3 Run `npm run test:quick` — all tests pass
  - [x] 5.4 Verify all new and modified files are staged: `git status --porcelain | grep "^??"` → no untracked relevant files

## Dev Notes

### Architecture Guidance

**MetricFilter:** Local `useState<Set<string>>` in `ComponentDetail`. Reset to all-visible when `nodeId` changes (use `useEffect` with `[nodeId]` dependency). Display as a collapsible section above the metric cards.

**Recommendation cards:** Should show component-library variant names (not IDs). Use `component.configVariants.find(v => v.id === improvedVariantId)?.name`.

**MetricFilter selectors:** Use `data-testid="metric-filter"` and `data-testid="metric-filter-toggle-{metricId}"` for E2E selectors.

### Technical Notes

- If a component has only one variant, `computeRecommendations` returns `[]` (no alternatives to recommend). Handle this in the UI by not rendering the section.
- Recommendation engine (`computeRecommendations`) is already implemented in story 4-2a — import from `src/engine/recommendationEngine.ts`.

### E2E Testing
E2E coverage recommended — run `/ecc-e2e 4-2b-metric-filter-and-recommendation-ui` after implementation.

## ECC Analysis Summary
- Risk Level: LOW
- Complexity: STANDARD (3 tasks, 11 subtasks, 6 files)
- Split from: story-4-2
- Depends on: story-4-2a
