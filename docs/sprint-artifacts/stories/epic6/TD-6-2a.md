# Tech Debt Story TD-6-2a: Constraint Engine Hardening & Test Cleanup

## Status: ready-for-dev
## Epic: Epic 6 -- Constraint Guardrails

> **Source:** KDBP Code Review (2026-03-09) on story 6-2
> **Priority:** LOW | **Estimated Effort:** SMALL (2 pts)

## Story
As a **developer**, I want **constraint evaluation hardened with input caps and test helpers consolidated**, so that **the engine handles edge cases safely and tests are maintainable**.

## Acceptance Criteria

**AC-1: Constraint Array Size Cap**
Given a YAML import or programmatic setConstraints call,
When constraints array exceeds 50 entries,
Then the array is truncated/rejected with a warning.

**AC-2: Exhaustive Operator Check**
Given an unknown operator value reaches isViolated at runtime,
When the function evaluates,
Then it logs a DEV-only warning (not silent swallow).

**AC-3: evaluateNodeConstraints Consistency**
Given evaluateNodeConstraints,
When checking scores,
Then use Map lookup (consistent with evaluateConstraints) instead of Array.find().

**AC-4: Shared Test Helpers**
Given constraint test files,
When helpers (makeMetrics, buildPerNodeCategoryScores) are needed,
Then import from a shared fixture file rather than duplicating.

## Tasks / Subtasks

- [ ] Task 1: Add `.max(50)` to constraints array in architectureFileSchema.ts
- [ ] Task 2: Add DEV-only console.warn in isViolated for unknown operators
- [ ] Task 3: Refactor evaluateNodeConstraints to use Map lookup
- [ ] Task 4: Extract shared test helpers to tests/helpers/constraintFixtures.ts
  - [ ] 4.1 Move makeMetrics to shared file
  - [ ] 4.2 Move buildPerNodeCategoryScores to shared file
  - [ ] 4.3 Update imports in architectureStore-constraints.test.ts
  - [ ] 4.4 Update imports in constraint-evaluation-flow.test.ts

## Dev Notes
- Source story: [6-2](./6-2.md)
- Review findings: #3 (duplicate buildPerNodeCategoryScores), #4 (duplicate makeMetrics), #5 (.find vs Map), #6 (array cap), #7 (operator check)
- Files affected: src/engine/constraintEvaluator.ts, src/schemas/architectureFileSchema.ts, tests/helpers/, tests/unit/stores/, tests/integration/
