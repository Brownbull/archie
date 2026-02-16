# Story: TD-3-1a-b Version Handling Type Safety

## Status: ready-for-dev
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
- [ ] 1.1 Define `VersionStatus` discriminated union in `architectureFileSchema.ts`
- [ ] 1.2 Update `checkSchemaVersion()` return type to `VersionStatus`
- [ ] 1.3 Update all consumers in `yamlImporter.ts` to use discriminated union
- [ ] 1.4 Add tests for exhaustive version status handling

### Task 2: Migration Key Validation
- [ ] 2.1 Add `parseInt` validation before migration key lookup in `yamlImporter.ts`
- [ ] 2.2 Return `INVALID_VERSION_FORMAT` error for non-numeric major versions
- [ ] 2.3 Add test for non-numeric major version in migration branch
- [ ] 2.4 Run `npx tsc --noEmit` — no type errors
- [ ] 2.5 Run `npm run test:quick` — all tests pass

## Dev Notes

- Both issues are in `src/services/yamlImporter.ts` lines 162-174 and `src/schemas/architectureFileSchema.ts`
- Current magic strings: "current", "too-new", "too-old", "migrate" — replace with tagged union
- Migration key extraction: `String(data.schemaVersion.split(".")[0])` — add `parseInt` + `isNaN` guard
- Low risk — these are type-level improvements with no behavioral change for valid inputs

## ECC Analysis Summary
- Risk Level: LOW (type safety improvements, no behavioral changes)
- Complexity: Low
- Sizing: SMALL (2 tasks, ~9 subtasks, ~2 files)
- Source: Code review findings #2 and #3 from td-3-1a review
