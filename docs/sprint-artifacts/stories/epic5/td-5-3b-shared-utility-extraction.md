# Tech Debt Story TD-5-3b: Shared Utility Extraction (DRY)

Status: review

> **Source:** KDBP Code Review (2026-03-06) on story td-5-3a
> **Priority:** LOW | **Estimated Effort:** 1 pt

## Story
As a **developer**, I want **duplicated utility code extracted to shared modules**, so that **future changes to weight helpers and category lookups only need to happen in one place**.

## Acceptance Criteria

**AC-1:** `getWeight` helper extracted from `dashboardCalculator.ts` and `heatmapCalculator.ts` to a shared location (e.g., `src/lib/weightUtils.ts`), imported by both engine files.
**AC-2:** `CATEGORY_LOOKUP` Map extracted from `DashboardPanel.tsx` and `DashboardOverlay.tsx` to a shared location (e.g., `src/lib/constants.ts` or `src/lib/categoryLookup.ts`), imported by both components.

## Tasks / Subtasks

- [x] Task 1: Extract `getWeight` helper
  - [x] 1.1 Create shared location for `getWeight(weightProfile, categoryId)` function
  - [x] 1.2 Replace duplicate in `src/engine/dashboardCalculator.ts`
  - [x] 1.3 Replace duplicate in `src/engine/heatmapCalculator.ts`
  - [x] 1.4 Add unit test for extracted helper

- [x] Task 2: Extract `CATEGORY_LOOKUP` Map
  - [x] 2.1 Add `CATEGORY_LOOKUP` to shared location
  - [x] 2.2 Replace in `src/components/dashboard/DashboardPanel.tsx`
  - [x] 2.3 Replace in `src/components/dashboard/DashboardOverlay.tsx`

## Dev Notes
- Source story: [td-5-3a](./td-5-3a-dashboard-weight-dry-extraction.md)
- Review findings: #1, #4
- Files affected: dashboardCalculator.ts, heatmapCalculator.ts, DashboardPanel.tsx, DashboardOverlay.tsx
- Note: getWeight was flagged as "fixed" in story 5-2 review but duplication persists — verify current state before acting
- Completed: 2026-03-06 | Self-review: APPROVE 8.5/10 | Cost: $8.04

<!-- CITED: none -->
<!-- ORDERING: clean -->

