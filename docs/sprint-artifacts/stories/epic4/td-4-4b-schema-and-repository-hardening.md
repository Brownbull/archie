# Tech Debt Story TD-4-4b: Schema & Repository Hardening

Status: ready-for-dev

> **Source:** ECC Code Review (2026-02-25) on story 4-4
> **Priority:** LOW | **Estimated Effort:** Small (3 tasks, 3 files)

## Story
As a **developer**, I want **contiguous score range validation in MetricCategorySchema and typed error wrapping in metricCategoryRepository**, so that **invalid Firestore data is caught earlier and error handling follows existing patterns**.

## Acceptance Criteria

- [ ] `MetricCategorySchema` has a refinement that validates `scoreInterpretations` ranges are non-overlapping and cover `[0, 10]` contiguously
- [ ] `metricCategoryRepository.getAll()` wraps Firestore `getDocs` errors in a typed error before propagating
- [ ] `componentLibrary.reset()` multi-statement style is consistent with rest of codebase

## Tasks / Subtasks

- [ ] **Task 1:** Add contiguous range refinement to MetricCategorySchema
  - [ ] 1a. Add `.refine()` on `scoreInterpretations` validating sorted, non-overlapping, covering 0-10
  - [ ] 1b. Add unit tests for overlapping and gap scenarios

- [ ] **Task 2:** Wrap Firestore errors in metricCategoryRepository
  - [ ] 2a. Add try/catch around `getDocs` call, rethrow as typed error
  - [ ] 2b. Add unit test for error wrapping

- [ ] **Task 3:** Fix reset() style in componentLibrary
  - [ ] 3a. Split one-liner into individual statements matching codebase style

## Dev Notes
- Source story: [story-4-4](./story-4-4.md)
- Review findings: #5, #6, #7
- Files affected: `src/schemas/metricCategorySchema.ts`, `src/repositories/metricCategoryRepository.ts`, `src/services/componentLibrary.ts`
