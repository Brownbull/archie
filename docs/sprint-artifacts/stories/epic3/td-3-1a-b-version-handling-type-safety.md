# Story: TD-3-1a-b Version Handling Type Safety

## Status: done
## Epic: Epic 3 — YAML Workflow & Content Library
## Source: Code review of td-3-1a (2026-02-15)

## Overview

Tech debt from td-3-1a code review. Two pre-existing type safety issues in the YAML import pipeline's version handling logic. These patterns work correctly today but are fragile — magic strings and implicit format assumptions that could silently fail if version handling is extended.

## Functional Acceptance Criteria

**AC-1: Discriminated Union for Version Status**
**Given** `checkSchemaVersion()` returns a version status
**When** the caller handles the result
**Then** the return type is a discriminated union (not magic strings)
**And** TypeScript enforces exhaustive handling of all variants

**AC-2: Migration Key Validation**
**Given** a schema version reaches the `migrate` branch
**When** the migration key is extracted
**Then** the major version is validated with `parseInt` before lookup
**And** non-numeric major versions produce a clear error (not silent failure)

## Tasks / Subtasks

### Task 1: Version Status Type Safety
- [x] 1.1 Define `VersionStatus` discriminated union in `architectureFileSchema.ts`
- [x] 1.2 Update `checkSchemaVersion()` return type to `VersionStatus`
- [x] 1.3 Update all consumers in `yamlImporter.ts` to use discriminated union
- [x] 1.4 Add tests for exhaustive version status handling

### Task 2: Migration Key Validation
- [x] 2.1 Add `isNaN` validation in `checkSchemaVersion()` (centralized, not duplicated in consumer)
- [x] 2.2 Return `INVALID_VERSION_FORMAT` error for non-numeric major versions
- [x] 2.3 Add test for non-numeric major version in migration branch
- [x] 2.4 Run `npx tsc --noEmit` — no type errors
- [x] 2.5 Run `npm run test:quick` — all tests pass (961/961)

## Dev Notes

- Both issues are in `src/services/yamlImporter.ts` lines 162-174 and `src/schemas/architectureFileSchema.ts`
- Current magic strings: "current", "too-new", "too-old", "migrate" — replace with tagged union
- Migration key extraction: `String(data.schemaVersion.split(".")[0])` — add `parseInt` + `isNaN` guard
- Low risk — these are type-level improvements with no behavioral change for valid inputs

## Tech Debt Created
- [td-3-1a-c-migration-test-isolation](td-3-1a-c-migration-test-isolation.md) — MIGRATIONS test isolation + integration migrate test

## Senior Developer Review (ECC)

**Date:** 2026-02-15 | **Classification:** SIMPLE | **Agents:** code-reviewer, tdd-guide

| Agent | Score | Status |
|-------|-------|--------|
| Code Quality | 8.5/10 | APPROVE (after fixes) |
| Testing | 8/10 | APPROVE |
| **OVERALL** | **8.3/10** | **APPROVED** |

**Quick Fixes Applied (6):**
1. Removed unnecessary `String()` coercion in yamlImporter.ts migrate branch
2. Added test for non-numeric app version (symmetric with file version test)
3. Added `reason` field assertion in adversarial "not-semver" test
4. Improved empty version test comment clarity
5. Replaced generic `expect(status).toBeDefined()` with meaningful assertion in exhaustive check test
6. Git staging verified at commit time

**TD Created:** td-3-1a-c-migration-test-isolation (MIGRATIONS test isolation + integration migrate test)

## ECC Analysis Summary
- Risk Level: LOW (type safety improvements, no behavioral changes)
- Complexity: Low
- Sizing: SMALL (2 tasks, ~9 subtasks, ~2 files)
- Source: Code review findings #2 and #3 from td-3-1a review
