# Tech Debt Story TD-5-3a: Dashboard Weight UI DRY Extraction & Type Strengthening

Status: done

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

- [x] Task 1: Extract shared weight selectors
  - [x] 1.1 Create `useDashboardWeights` hook (src/hooks/useDashboardWeights.ts)
  - [x] 1.2 Replace inline `isNonDefaultWeights` in DashboardPanel and DashboardOverlay
  - [x] 1.3 Replace inline `weightedAggregateScore` in both components
  - [x] 1.4 Update tests for both components

- [x] Task 2: Centralize icon lookup
  - [x] 2.1 Create `getCategoryIcon(iconName: string)` helper in `lib/categoryIcons`
  - [x] 2.2 Replace 3 inline casts in WeightSliders, DashboardOverlay, CategoryBar

- [x] Task 3: Strengthen CategoryBar types
  - [x] 3.1 Change `categoryId: string` to `MetricCategoryId`
  - [x] 3.2 `weight` kept as `number` with JSDoc noting range (branded type deferred — low value)
  - [x] 3.3 Update all call sites + removed unnecessary `as keyof` casts

## Dev Notes
- Source story: [5-3](./5-3.md)
- Review findings: #2, #3, #5, #6
- Files affected: DashboardPanel.tsx, DashboardOverlay.tsx, WeightSliders.tsx, CategoryBar.tsx, categoryIcons.ts

## Senior Developer Review (KDBP)

- **Date:** 2026-03-06
- **Classification:** COMPLEX (13 files)
- **Agents:** code-reviewer (8.5/10), security-reviewer (9/10), architect (8/10), tdd-guide (7/10)
- **Overall Score:** 8.1/10
- **Outcome:** APPROVE — 8 quick fixes applied, 2 deferred to td-5-3b, 4 tests added
- **Quick fixes:** SLIDER_MIN comment, import ordering, getCategoryIcon guard, handleChange type narrowing, infoCategoryId type, residual cast removal, weight badge tests, weighted score display test

<!-- CITED: L2-004 (DRY extraction), L2-008 (type strengthening) -->

## Review-Generated Tech Debt

| TD Story | Description | Priority | Action |
|----------|-------------|----------|--------|
| [td-5-3b](./td-5-3b-shared-utility-extraction.md) | Extract duplicated `getWeight` helper + `CATEGORY_LOOKUP` Map to shared modules | LOW | CREATED |
