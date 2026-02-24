# Story: TD-3-3f Seed Test Helper Dedup

## Status: review
## Epic: Epic 3 — YAML Workflow & Content Library

> **Source:** ECC Code Review (2026-02-24) on story td-3-3e
> **Priority:** LOW | **Estimated Effort:** TINY (1 task, ~2 subtasks, 2 files)

## Story

As a **developer**, I want a shared `assertFailFastBehavior` helper in `seed-helpers.ts`, so that the two structurally identical fail-fast tests in `seed-load-blueprints.test.ts` and `seed-load-components.test.ts` have less duplication and future loaders can be tested with one line.

## Acceptance Criteria

**AC-1: Shared Helper Created**
**Given** the two fail-fast tests for blueprints and components are structurally identical (mock 2 files → 1 valid + 1 invalid → assert throw + error log)
**When** this story is developed
**Then** a shared helper `assertFailFastBehavior(loader, validYaml, invalidYaml, dir?)` is added to `tests/unit/scripts/seed-helpers.ts`
**And** both fail-fast tests in the two test files are refactored to use it

## Tasks / Subtasks

### Task 1: Extract and apply helper
- [x] 1.1 Add `assertFailFastBehavior` to `tests/unit/scripts/seed-helpers.ts`
- [x] 1.2 Refactor fail-fast tests in `seed-load-blueprints.test.ts` and `seed-load-components.test.ts` to use helper
- [x] 1.3 Run `npm run test:quick` — all tests pass

## Dev Notes

- The two tests being deduplicated are the "aborts entirely when any file fails" tests added in TD-3-3e
- The collect-all tests ("collects errors from all files") are different enough (asserting file-specific log messages) that they should NOT be extracted into the helper
- Source story: [td-3-3e](./td-3-3e-seed-ac1-behavior-clarification.md)
- Review findings: #3

## Deferred From

| Source Story | Review Finding | Description |
|---|---|---|
| td-3-3e | #3 | Two structurally identical fail-fast tests — shared helper would eliminate duplication |

## Senior Developer Review (ECC)

- **Date:** 2026-02-24
- **Agents:** code-reviewer (TRIVIAL classification)
- **Outcome:** APPROVE — Score 8/10
- **Quick fixes applied:** 2 (JSDoc execution-order contract clarified; `"valid"` → `"valid.yaml"` in string assertion)
- **Deferred items:** 2 → TD story created

| TD Story | Description | Priority | Action |
|---|---|---|---|
| [td-3-3g](./td-3-3g-seed-helpers-quality.md) | seed-helpers fs dependency isolation + explicit no-partial-return guard | LOW | CREATED |
