# Tech Debt Story TD-5-3a: Dashboard Weight UI DRY Extraction & Type Strengthening

Status: ready-for-dev

> **Source:** KDBP Code Review (2026-03-06) on story 5-3
> **Priority:** LOW | **Estimated Effort:** 2 pts

## Story
As a **developer**, I want **shared hooks/selectors for duplicated weight logic and stronger prop types in dashboard components**, so that **the dashboard weight UI stays maintainable as more weight-aware features are added**.

## Acceptance Criteria

**AC-1:** `isNonDefaultWeights` computed once (shared hook or Zustand derived selector), consumed by DashboardPanel and DashboardOverlay.
**AC-2:** `weightedAggregateScore` computed once (same mechanism), consumed by both components.
**AC-3:** `iconName` lookup centralized in a typed helper (e.g., `getCategoryIcon(iconName)`), replacing 3 inline casts.
**AC-4:** `CategoryBar.categoryId` typed as `MetricCategoryId` and `weight` typed as a clamped range or branded type.

## Tasks / Subtasks

- [ ] Task 1: Extract shared weight selectors
  - [ ] 1.1 Create `useDashboardWeights` hook or Zustand derived state
  - [ ] 1.2 Replace inline `isNonDefaultWeights` in DashboardPanel and DashboardOverlay
  - [ ] 1.3 Replace inline `weightedAggregateScore` in both components
  - [ ] 1.4 Update tests for both components

- [ ] Task 2: Centralize icon lookup
  - [ ] 2.1 Create `getCategoryIcon(iconName: string)` helper in `lib/categoryIcons`
  - [ ] 2.2 Replace 3 inline casts in WeightSliders, DashboardOverlay, CategoryBar

- [ ] Task 3: Strengthen CategoryBar types
  - [ ] 3.1 Change `categoryId: string` to `MetricCategoryId`
  - [ ] 3.2 Optionally brand `weight` prop type
  - [ ] 3.3 Update all call sites

## Dev Notes
- Source story: [5-3](./5-3.md)
- Review findings: #2, #3, #5, #6
- Files affected: DashboardPanel.tsx, DashboardOverlay.tsx, WeightSliders.tsx, CategoryBar.tsx, categoryIcons.ts
