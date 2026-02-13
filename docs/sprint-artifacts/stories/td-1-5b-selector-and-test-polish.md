# Story: TD-1-5b Selector & Test Polish

## Status: ready-for-dev
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

- AC-1: InspectorPanel Zustand selector uses shallow equality or custom comparator
- AC-2: MetricBar.test.tsx uses a shared render helper consistent with sibling test files

## Estimation

- Size: Trivial (2 focused items, single-file each)
- Risk: Low (no behavioral changes, quality improvements only)
