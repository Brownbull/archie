# Story: TD-3-3e Seed Script AC-1 Behavior Clarification

## Status: done
## Epic: Epic 3 — YAML Workflow & Content Library
## Source: ECC Code Review (2026-02-23) on story td-3-3a

> **Priority:** LOW | **Estimated Effort:** SMALL (1 task, ~4 subtasks, 2 files)

## Story

As a **developer**, I want to verify whether the seed script's validation behavior matches the intent of AC-1 (skip-bad, seed-good) or whether fail-fast is the correct design, and update either the implementation or the story AC to reflect the actual decision.

## Background

TD-3-3a AC-1 states: *"the invalid blueprint is **skipped** with a clear error log... other valid blueprints still seed successfully."*

The current implementation (`loadAndValidateBlueprints`) validates ALL files first, then throws if any fail — causing `main()` to abort with `process.exit(1)`. This means if one blueprint has a schema error, **none** of them seed. This is fail-fast, not skip-and-continue.

The commit message for TD-3-3a notes subtask 1.5 ("blueprint with missing required fields → skipped with error log") as "already covered by Story 3-3 tests" — this may mean the behavior was intentionally redesigned as fail-fast.

## Acceptance Criteria

**AC-1: Decision Made and Documented**
**Given** the ambiguity between "skip invalid, seed valid" vs "fail-fast on any error"
**When** this story is developed
**Then** the chosen behavior is explicitly implemented AND tested
**And** the TD-3-3a story AC-1 text is updated to match the actual behavior if it was intentionally fail-fast

**AC-2: If Skip-and-Continue (behavior change)**
**Given** the decision is to implement skip-and-continue
**When** `loadAndValidateBlueprints` encounters an invalid file
**Then** it logs the error and continues to the next file (does NOT throw)
**And** `main()` seeds all valid blueprints and logs a warning with the count of skipped files
**And** tests cover: all-valid → seeds all; one-invalid + one-valid → seeds valid, skips invalid

**AC-3: If Fail-Fast (documentation update only)**
**Given** the decision is to keep fail-fast behavior
**When** this story is developed
**Then** no production code changes are made
**And** the AC-1 text in TD-3-3a is updated to say "seed script aborts if ANY blueprint fails validation"

## Tasks / Subtasks

### Task 1: Clarify and implement
- [x] 1.1 Review original AC-1 intent with Story 3-3 context — decision: fail-fast (no code change)
- [x] 1.2 If skip-and-continue: refactor `loadAndValidateBlueprints` — N/A (fail-fast chosen)
- [x] 1.3 If skip-and-continue: update tests — added fail-fast mixed-case tests to both load test files
- [x] 1.4 Update AC-1 text in TD-3-3a story to match actual behavior
- [x] 1.5 Run `npm run test:quick` — all tests pass

## Dev Notes

- The same question applies to `loadAndValidateComponents` — if blueprints skip-and-continue, components should too for consistency
- Fail-fast is safer for a seed script (you want to know ALL problems, not just the ones after the first error) — but it contradicts the AC text
- If fail-fast is chosen, no code change is needed — just update the story AC text

## ECC Code Review — 2026-02-24

**Result: APPROVED 8/10** (code-reviewer only — TRIVIAL classification)

Quick fixes applied (findings 1, 2, 4, 5):
- Add spied-logger comment in fail-fast tests explaining why spy vs noopLogger
- Add `logger.log` assertion verifying valid file was actually processed before abort
- Upgrade `.toThrow()` to `.toThrow("Validation failed")` in blueprints test (contract consistency)
- Add collect-all test: 2 bad files → 2 error log entries (confirms AC-1 "all files surfaced" claim)

Deferred to TD stories:

| TD Story | Description | Priority | Action |
|---|---|---|---|
| td-3-3f | Shared `assertFailFastBehavior` helper to dedup the two fail-fast tests (finding #3) | LOW | CREATED |

## Deferred From

| Source Story | Review Finding | Description |
|---|---|---|
| td-3-3a | #3 | AC-1 says "skip invalid, seed valid" but implementation aborts entirely if any blueprint fails schema validation |
