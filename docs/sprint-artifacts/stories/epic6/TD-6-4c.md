# Tech Debt Story TD-6-4c: Store-layer test for constraint ID assignment

## Status: done
## Epic: Epic 6 -- Constraint Guardrails

> **Source:** KDBP Code Review (2026-03-10) on story TD-6-4b
> **Priority:** LOW | **Estimated Effort:** 1 pt (TRIVIAL — 1 test file, 1 assertion block)

## Story
As a **developer**, I want **a store-layer test that verifies `loadArchitecture` assigns `crypto.randomUUID()` IDs to imported constraints**, so that **a regression in architectureStore.ts line 709 would be caught by the test suite**.

## Acceptance Criteria

**AC-1:** A unit test in `tests/unit/stores/` verifies that after calling `loadArchitecture` with `ParsedConstraint[]` (no `id` field), the resulting `constraints` in the store state contain `Constraint[]` objects with valid string `id` values.
**AC-2:** The test verifies that IDs are unique across constraints (no duplicate UUIDs).

## Tasks / Subtasks

- [x] Task 1: Add store-layer constraint ID assignment test
  - [x] 1.1 In `architectureStore-constraints.test.ts` (or new describe block), call `loadArchitecture` with `ParsedConstraint[]` inputs (no `id`)
  - [x] 1.2 Assert each resulting constraint in `store.constraints` has a non-empty string `id`
  - [x] 1.3 Assert all constraint IDs are unique
  - [x] 1.4 Verify existing tests still pass

## Dev Notes
- Source story: [TD-6-4b](./TD-6-4b.md)
- Review findings: #6
- Files affected: `tests/unit/stores/architectureStore-constraints.test.ts`

## Senior Developer Review (KDBP)
- **Date:** 2026-03-10
- **Classification:** TRIVIAL
- **Agents:** code-reviewer (sonnet)
- **Score:** 9.5/10 — APPROVE
- **Quick fixes applied:** 1 (tightened ID assertion to verify `crypto.randomUUID` stub invocation)
- **TD stories created:** 0 (1 LOW deferred item — DRY crypto stub — too low-value for separate story)
<!-- CITED: none -->
