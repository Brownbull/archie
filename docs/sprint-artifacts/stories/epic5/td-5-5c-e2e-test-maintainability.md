# Tech Debt Story TD-5-5c: E2E Test Maintainability & Edge Cases

## Status: done
## Epic: Epic 5 -- Priority Scoring

> **Source:** KDBP Code Review (2026-03-07) on story td-5-5b
> **Priority:** LOW | **Estimated Effort:** SMALL (1 pt)

## Story
As a **developer**, I want **DRY fixture helpers, source-imported constants, and additional edge-case boundary tests**, so that **E2E tests are maintainable, drift-resistant, and cover more schema validation boundaries**.

## Acceptance Criteria

**AC-1: Extract YAML fixture helper**
Given the export-parse-mutate-import pattern is duplicated across 3+ tests,
When a developer needs to add a new fixture-based test,
Then a shared helper like `exportMutateAndReimport(page, mutator)` exists to eliminate boilerplate.

**AC-2: Import ALL_CATEGORY_IDS from source**
Given `ALL_CATEGORY_IDS` in the spec is a manual copy of `src/lib/constants.ts METRIC_CATEGORIES`,
When a category is added or removed upstream,
Then the E2E spec automatically reflects the change (import from source or derive from it).

**AC-3: Negative boundary weight test**
Given a YAML with `weight_profile.performance = -0.1` (below valid range),
When imported into Archie,
Then verify schema validation error toast appears.

**AC-4: Unknown category key test**
Given a YAML with `weight_profile.unknown-category = 0.5` (key not in schema),
When imported into Archie,
Then verify the import handles the unknown key gracefully (error or ignore).

**AC-5: Score-impact assertion for zero weight**
Given a component with non-zero security metrics and `weight_profile.security = 0`,
When the architecture is scored,
Then verify the aggregate score reflects the zero-weighted category (security contribution = 0).

## Tasks / Subtasks

- [x] Task 1: Extract YAML fixture helper
  - [x] 1.1 Create `exportMutateAndReimport(page, mutator)` helper in spec or helpers file
  - [x] 1.2 Refactor TD-5-5b AC-2 and AC-2b tests to use the helper

- [x] Task 2: Import ALL_CATEGORY_IDS from source
  - [x] 2.1 Verify Playwright can resolve TS imports from src/ (relative path)
  - [x] 2.2 Replace manual array with import from `src/lib/constants.ts`

- [x] Task 3: Add edge-case tests
  - [x] 3.1 Add negative boundary test (weight=-0.1)
  - [x] 3.2 Add unknown category key test
  - [x] 3.3 Add score-impact assertion for weight=0 (new test, not extending AC-2b)

## Dev Notes
- Source story: [td-5-5b](./td-5-5b-e2e-test-quality-polish.md)
- Review findings: #1, #4, #7, #8, #9
- Files affected: `tests/e2e/priority-scoring.spec.ts`

## Senior Developer Review (KDBP)
- **Date:** 2026-03-07
- **Agents:** code-reviewer, tdd-guide (SIMPLE classification)
- **Outcome:** APPROVE 8/10
- **Quick fixes applied:** 2 (AC-5 directional assertion, AC-4 schema comment)
- **Deferred:** 0 TD stories (2 LOW/LOW items not actionable)

<!-- CITED: none -->
<!-- ORDERING: clean -->
