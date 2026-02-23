# Story: TD-3-1a-d Migration Error-Path Coverage

## Status: done
## Epic: Epic 3 — YAML Workflow & Content Library
## Source: Code review of td-3-1a-c (2026-02-23)

## Overview

Tech debt from td-3-1a-c code review. The migration integration test covers the happy path (migration called, data transformed) but three edge cases are untested: (1) migration function throws, (2) migration returns null/undefined, and (3) migration with non-empty nodes/edges to verify structural data survives the transform.

## Functional Acceptance Criteria

**AC-1: Migration Throw Handling**
**Given** `importYamlString()` receives YAML with an older major version
**When** the registered migration function throws
**Then** the import returns a failure result with a meaningful error code
**And** the thrown error does not propagate uncaught

**AC-2: Migration Null/Undefined Return**
**Given** `importYamlString()` receives YAML with an older major version
**When** the registered migration function returns null or undefined
**Then** the import returns a failure result (not a silent undefined architecture)
**And** the error is distinguishable from a schema validation error

**AC-3: Migration with Structured Data**
**Given** `importYamlString()` receives YAML with an older major version and non-empty nodes/edges
**When** the migration function transforms the data
**Then** the transformed nodes/edges appear in the hydrated output
**And** the migration test does not rely on empty arrays to pass

## Tasks / Subtasks

### Task 1: Audit Production Migration Error Handling
- [x] 1.1 Read `src/services/yamlImporter.ts` migration branch — verify throw and null/undefined return paths
- [x] 1.2 If unhandled: add try/catch around migration call with `MIGRATION_ERROR` error code
- [x] 1.3 If null/undefined: add null-guard after migration call with `MIGRATION_NULL_RESULT` error code

### Task 2: Add Migration Edge-Case Tests
- [x] 2.1 Add test: migration throws → import returns failure with error code
- [x] 2.2 Add test: migration returns null → import returns failure with error code
- [x] 2.3 Add test: migration with non-empty nodes/edges → output reflects transformed structure
- [x] 2.4 Run `npm run test:quick` — all tests pass

## Dev Notes

- All new tests go in `tests/unit/services/yamlImporter.test.ts` inside the `"importYamlString — migration"` describe block
- Use the same `beforeEach`/`afterEach` MIGRATIONS["0"] pattern established in td-3-1a-c
- If production code has no error handling for throw/null, Task 1 must be done first
- Pre-existing concern: `Object.assign` in migrate branch mutates data in place — if Task 1 adds try/catch, the mutation is safe but the pattern should be noted in a comment

## Deferred Item Tracking

| Finding | Source | Description |
|---------|--------|-------------|
| #5 | td-3-1a-c review | Migration function throws — behavior untested |
| #6 | td-3-1a-c review | Migration returns null/undefined — failure mode untested |
| #8 | td-3-1a-c review | Migration test uses empty nodes/edges — non-empty migration untested |

## ECC Analysis Summary
- Risk Level: LOW (test-only + minimal production guard additions)
- Complexity: Low
- Sizing: SMALL (2 tasks, ~7 subtasks, ~2 files)
- Source: Code review findings #5, #6, #8 from td-3-1a-c review
