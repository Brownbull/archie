# Tech Debt Story TD-5-1b: Schema Hardening Follow-up

Status: done

> **Source:** KDBP Code Review (2026-03-06) on story td-5-1a
> **Priority:** LOW | **Estimated Effort:** Small (2 tasks, 1 file)

## Story
As a **developer**, I want **PositionSchema to have numeric bounds on x/y and the METRIC_CATEGORIES static assertion throw-path to be tested**, so that **malicious YAML cannot inject extreme float values and the module-level guard has verified coverage**.

## Acceptance Criteria

- [x] `PositionSchema` x/y fields have reasonable `.min()`/`.max()` bounds (e.g., -10000 to 10000) to reject extreme values like `1e308`
- [x] A test verifies the static assertion in `architectureFileSchema.ts` throws when `METRIC_CATEGORIES.length !== 7` (via dynamic import with mocked constant, or equivalent approach)
- [x] Existing tests still pass

## Tasks / Subtasks

- [x] **Task 1:** Add numeric bounds to PositionSchema
  - [x] 1a. Add `.min(-10000).max(10000)` to x and y in PositionSchema
  - [x] 1b. Shared PositionSchema covers both camelCase and YAML variants — one change
  - [x] 1c. Add tests for out-of-bounds position values being rejected (6 tests: ±10001, ±1e308)
  - [x] 1d. Add boundary tests for values at exactly the limits (2 tests: ±10000)

- [x] **Task 2:** Test static assertion throw-path
  - [x] 2a. Add test using `vi.doMock` + `vi.resetModules()` + dynamic import to verify module throws when METRIC_CATEGORIES has wrong length
  - [x] 2b. All 74 tests pass (73 existing + 1 new throw-path test + 9 new bounds tests = 74 total after net)

## Dev Notes
- Source story: [td-5-1a](./td-5-1a-schema-defense-in-depth.md)
- Review findings: #4, #8
- Files affected: `src/schemas/architectureFileSchema.ts`, `tests/unit/schemas/architectureFileSchema.test.ts`, `src/lib/constants.ts`

## Senior Developer Review (KDBP)
- **Date:** 2026-03-06
- **Agents:** code-reviewer (sonnet), tdd-guide (sonnet)
- **Classification:** SIMPLE
- **Score:** 8.5/10 — APPROVE
- **Quick fixes applied:** 6 (position bounds exported to constants, comment on major-only comparison, afterEach order fix, Infinity/negative bounds tests, length > 7 assertion test)
- **TD stories created:** 0
