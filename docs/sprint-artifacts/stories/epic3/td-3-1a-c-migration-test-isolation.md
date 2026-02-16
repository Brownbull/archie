# Story: TD-3-1a-c Migration Test Isolation

## Status: ready-for-dev
## Epic: Epic 3 — YAML Workflow & Content Library
## Source: Code review of td-3-1a-b (2026-02-15)

## Overview

Tech debt from td-3-1a-b code review. Two related test quality issues: (1) the MIGRATIONS mutation pattern in unit tests is fragile — direct module mutation risks state leakage if a test throws before cleanup, and (2) there's no integration-level test for the migrate branch exercising the full import pipeline with an actual data transform.

## Functional Acceptance Criteria

**AC-1: Isolated MIGRATIONS Mocking**
**Given** a test needs to exercise the migration branch of `checkSchemaVersion()`
**When** the test sets up a migration function
**Then** it uses `vi.mock` or `beforeEach`/`afterEach` cleanup (not raw module mutation)
**And** state cannot leak between tests even if a test throws

**AC-2: Integration-Level Migrate Branch Test**
**Given** `importYamlString()` receives YAML with an older major version
**When** a migration function exists for that major version
**Then** the migration transforms the data and import succeeds
**And** the test verifies the transformed data is reflected in the hydrated output

## Tasks / Subtasks

### Task 1: Refactor MIGRATIONS Test Pattern
- [ ] 1.1 Replace direct MIGRATIONS mutation in `architectureFileSchema.test.ts` with `vi.mock` or `beforeEach`/`afterEach` pattern
- [ ] 1.2 Verify all existing migration-related tests still pass
- [ ] 1.3 Run `npm run test:quick` — all tests pass

### Task 2: Add Integration Migrate Test
- [ ] 2.1 Add test in `yamlImporter.test.ts` that sets up a migration function and imports older-version YAML
- [ ] 2.2 Verify the migration function is called and transforms data correctly
- [ ] 2.3 Run `npm run test:quick` — all tests pass

## Dev Notes

- Current fragile pattern: `architectureFileSchema.test.ts` lines ~332-337 directly mutate the exported `MIGRATIONS` object
- Risk: if the test assertion fails or throws, the `delete` cleanup never runs, polluting subsequent tests
- Safer approach: use `vi.spyOn` or wrap in `beforeEach`/`afterEach` with guaranteed cleanup
- For integration test: temporarily register a migration for major version 0, import YAML with `schema_version: "0.5.0"`, verify import succeeds

## ECC Analysis Summary
- Risk Level: LOW (test-only changes, no production code)
- Complexity: Low
- Sizing: SMALL (2 tasks, ~6 subtasks, ~2 files)
- Source: Code review findings #2 and #5 from td-3-1a-b review
