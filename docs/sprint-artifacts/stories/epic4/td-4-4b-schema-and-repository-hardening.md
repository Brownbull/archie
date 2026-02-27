# Tech Debt Story TD-4-4b: Schema & Repository Hardening

Status: done

> **Source:** ECC Code Review (2026-02-25) on story 4-4
> **Priority:** LOW | **Estimated Effort:** Small (3 tasks, 3 files)

## Story
As a **developer**, I want **contiguous score range validation in MetricCategorySchema and typed error wrapping in metricCategoryRepository**, so that **invalid Firestore data is caught earlier and error handling follows existing patterns**.

## Acceptance Criteria

- [x] `MetricCategorySchema` has a refinement that validates `scoreInterpretations` ranges are non-overlapping and cover `[0, 10]` contiguously
- [x] `metricCategoryRepository.getAll()` wraps Firestore `getDocs` errors in a typed error before propagating
- [x] `componentLibrary.reset()` multi-statement style is consistent with rest of codebase

## Tasks / Subtasks

- [x] **Task 1:** Add contiguous range refinement to MetricCategorySchema
  - [x] 1a. Add `.refine()` on `scoreInterpretations` validating sorted, non-overlapping, covering 0-10
  - [x] 1b. Add unit tests for overlapping and gap scenarios

- [x] **Task 2:** Wrap Firestore errors in metricCategoryRepository
  - [x] 2a. Add try/catch around `getDocs` call, rethrow as typed error (`RepositoryError`)
  - [x] 2b. Add unit test for error wrapping (5 test cases)

- [x] **Task 3:** Fix reset() style in componentLibrary
  - [x] 3a. No-op: reset() already uses individual statements matching codebase style

## Dev Notes
- Source story: [story-4-4](./story-4-4.md)
- Review findings: #5, #6, #7
- Files affected: `src/schemas/metricCategorySchema.ts`, `src/repositories/metricCategoryRepository.ts`
- Files unchanged: `src/services/componentLibrary.ts` (Task 3 was already correct)
- New test file: `tests/unit/repositories/metricCategoryRepository.test.ts`
- Epsilon tolerance (RANGE_GAP_EPSILON = 0.02) handles existing 3.99/4 boundary pattern in seed data

## Senior Developer Review (ECC)
- **Date:** 2026-02-25
- **Agents:** code-reviewer, tdd-guide (SIMPLE classification)
- **Outcome:** APPROVE 8.5/10, 5 quick fixes applied
- **Quick fixes applied:**
  1. Test: single-item range `[{0, 10}]` degenerate case
  2. Test: epsilon boundary precision (0.021 fail, 0.019 pass)
  3. Test: out-of-order valid ranges confirmed sort step
  4. Test: `RepositoryError.name` assertion
  5. Test: non-Error rejection cause wrapping
- **Deferred (INFO, no TD story):**
  - Move `RepositoryError` to shared `errors.ts` when other repos adopt it
  - Type-assertion test pattern (`const _*: Type = ...`) adds no runtime value
