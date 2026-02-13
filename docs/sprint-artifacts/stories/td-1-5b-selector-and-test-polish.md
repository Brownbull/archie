# Story: TD-1-5b Selector & Test Polish

## Status: done
## Epic: Epic 1 — Architecture Canvas & Component Library
## Source: Code review of Story TD-1-5a (2026-02-13)

## Overview

Two LOW-severity deferred findings from TD-1-5a review: Zustand selector hardening and MetricBar test DRY consistency.

## Items

### 1. Add Shallow Equality to InspectorPanel Zustand Selector (Finding #1 — LOW)

**Problem:** `InspectorPanel.tsx` uses `useArchitectureStore((s) => s.nodes.find(n => n.id === selectedNodeId))` without a custom equality function. If React Flow recreates node objects during batch updates, the selector may return a new reference for the same logical node, causing unnecessary re-renders.

**Fix:** Import `shallow` from `zustand/shallow` and pass as the second argument to `useArchitectureStore`, or use a custom comparator that checks `node.id` + `node.data` equality.

**Files:** `src/components/inspector/InspectorPanel.tsx`

### 2. MetricBar Test DRY Consistency (Finding #3 — LOW)

**Problem:** `MetricBar.test.tsx` uses 14 direct `render(<MetricBar metric={...} />)` calls without a shared render helper, inconsistent with the `renderDefault(overrides?)` pattern established in `ComponentDetail.test.tsx` and `MetricCard.test.tsx` by TD-1-5a Item 4.

**Fix:** Extract a `renderDefault(overrides?)` helper in MetricBar.test.tsx following the same pattern as sibling test files.

**Files:** `tests/unit/components/inspector/MetricBar.test.tsx`

## Acceptance Criteria

- [x] AC-1: InspectorPanel Zustand selector uses shallow equality or custom comparator
- [x] AC-2: MetricBar.test.tsx uses a shared render helper consistent with sibling test files

## Estimation

- Size: Trivial (2 focused items, single-file each)
- Risk: Low (no behavioral changes, quality improvements only)

## Dev Notes

- Used `useShallow` from `zustand/react/shallow` (zustand v5 API) instead of passing `shallow` as second arg (v4 API)
- All 510 tests pass, build clean, lint clean
- Self-review: APPROVED 9/10

## Senior Developer Review (ECC)

- **Date:** 2026-02-13
- **Classification:** TRIVIAL
- **Agents:** code-reviewer
- **Score:** 9.5/10
- **Status:** APPROVED
- **Findings:** None — all checks pass
- **AC Verification:**
  - AC-1: VERIFIED — `useShallow` from `zustand/react/shallow` (v5 API) applied to selectedNode selector
  - AC-2: VERIFIED — `renderDefault(overrides?)` helper consistent with sibling test files
