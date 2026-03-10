# Tech Debt Story TD-6-2b: Constraint Test Hardening

## Status: done
## Epic: Epic 6 -- Constraint Guardrails

> **Source:** KDBP Code Review (2026-03-09) on story TD-6-2a
> **Priority:** LOW | **Estimated Effort:** SMALL (1 pt)

## Story
As a **developer**, I want **constraint test helpers hardened and store-level cap validation tested**, so that **edge cases are covered and test infrastructure is robust**.

## Acceptance Criteria

**AC-1: Weight Guard in buildPerNodeCategoryScores**
Given the shared test helper `buildPerNodeCategoryScores`,
When `getWeight` returns NaN or a negative value,
Then the helper handles it gracefully (clamp to 0 or skip).

**AC-2: Store-Level setConstraints Cap Test**
Given `setConstraints` is called with >50 constraints,
When the store processes the call,
Then verify behavior (either schema rejects or store truncates with warning).

## Tasks / Subtasks

- [x] Task 1: Add defensive guard in `buildPerNodeCategoryScores` for NaN/negative weight values
- [x] Task 2: Add test in `architectureStore-constraints.test.ts` for `setConstraints` with >50 entries

## Dev Notes
- Source story: [TD-6-2a](./TD-6-2a.md)
- Review findings: #3 (weight guard), #6 (store cap test)
- Files affected: tests/helpers/constraintFixtures.ts, tests/unit/stores/architectureStore-constraints.test.ts

## Senior Developer Review (KDBP)
- **Date:** 2026-03-09
- **Classification:** TRIVIAL
- **Agents:** code-reviewer
- **Score:** 8.5/10 (post-fix)
- **Outcome:** APPROVE — 3 quick fixes applied (1 HIGH P4 production weight guard, 1 LOW rename, 1 MED false positive resolved). 0 TD stories created.
- **Quick fixes:** Production weight guard in architectureStore.ts, `w` → `rawWeight` rename in constraintFixtures.ts
