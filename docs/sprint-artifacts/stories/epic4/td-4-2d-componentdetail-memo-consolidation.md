# Tech Debt Story TD-4-2d: ComponentDetail Memo Consolidation

Status: review

> **Source:** ECC Code Review (2026-02-24) on story 4-2b
> **Priority:** LOW | **Estimated Effort:** Small (1 task, 2 subtasks, 1 file)

## Story
As a **developer**, I want **the dual `useMemo` hooks for `metricsByCategory` and `allMetricIds` consolidated into a single memo pass**, so that **the metrics source is iterated once instead of twice and both derived values share the same computation boundary**.

## Acceptance Criteria

- AC-1: `metricsByCategory` and `allMetricIds` are derived in a single `useMemo` call
- AC-2: Both values share the same dependency array (`[computedMetrics, activeVariant]`)
- AC-3: Existing ComponentDetail tests pass without modification
- AC-4: No observable behavior change in the inspector UI

## Tasks / Subtasks

- [x] **Task 1: Unify dual useMemo into single pass**
  - [x] 1.1 Merge `metricsByCategory` and `allMetricIds` memo hooks into one `useMemo` returning `{ metricsByCategory, allMetricIds }`
  - [x] 1.2 Run `npm run test:quick` — all tests pass

## Dev Notes
- Source story: [4-2b](./story-4-2b.md)
- Review findings: #8 (dual useMemo could be unified)
- Files affected: `src/components/inspector/ComponentDetail.tsx`
- This is a minor performance/maintainability improvement — not a bug
