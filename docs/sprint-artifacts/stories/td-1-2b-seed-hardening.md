# Tech Debt: TD-1-2B Seed Script Hardening & Schema Test Coverage

## Status: done
## Epic: Epic 1 — Architecture Canvas & Component Library
## Source: TD-1-2A Code Review (findings #2, #3, #6, #7)

## Overview

Deferred items from TD-1-2A code review. Two themes:

1. **Seed script robustness** — Firestore batch writes have a 500-operation limit. The current seed script writes all components in a single batch, which will fail silently or error when the component library grows beyond 500 items.

2. **Schema test coverage gaps** — YAML transform schemas lack round-trip tests (load, transform, serialize, reload = identical). Required fields don't test null/empty-string rejection. Seed script has 0% automated test coverage.

## Tasks

### Task 1: Firestore Batch Chunking
- [x] 1.1 Implement batch chunking in `scripts/seed-firestore.ts` (500-op limit per batch)
- [x] 1.2 Include metadata write in chunk accounting
- [x] 1.3 Log chunk progress (`Batch 1/3 committed...`)

### Task 2: Seed Script Integration Tests
- [x] 2.1 Create `tests/unit/scripts/seed-firestore.test.ts`
- [x] 2.2 Mock Firebase Admin SDK (initializeApp, getFirestore, batch)
- [x] 2.3 Test `--dry-run` flag (validates but skips writes)
- [x] 2.4 Test missing `GOOGLE_APPLICATION_CREDENTIALS` error path
- [x] 2.5 Test malformed YAML rejection via seed pipeline

### Task 3: Schema Edge Case Tests
- [x] 3.1 Add round-trip tests for StackYamlSchema and BlueprintYamlSchema (snake_case in, camelCase out, matches base schema)
- [x] 3.2 Add empty string rejection tests for required `id`, `name`, `description` fields across all schemas
- [x] 3.3 Add null value rejection tests for required fields

## Acceptance Criteria

- Seed script handles >500 components without error
- Seed script has integration tests covering happy path, dry-run, error paths
- All YAML schemas have round-trip identity tests
- All required string fields reject empty strings and null values

## Senior Developer Review (ECC)

**Date:** 2026-02-13 | **Classification:** STANDARD | **Score:** 7/10

**Agents:** code-reviewer (Sonnet), security-reviewer (Sonnet)

**Findings (9 total):** 5 fixed, 1 TD story created (TD-1-2C)

| # | Sev | Status | Finding |
|---|-----|--------|---------|
| 1 | HIGH | Deferred → TD-1-2C | Service account credential file lacks validation |
| 2 | MEDIUM | Fixed | Added file size limit (1MB) before YAML parsing |
| 3 | MEDIUM | Fixed | Added 500-component edge case test |
| 4 | MEDIUM | Fixed | Improved credential error message |
| 5 | LOW | Deferred → TD-1-2C | Test mock double cast bypasses type safety |
| 6 | LOW | Accepted | Error messages expose filenames (acceptable for admin script) |
| 7 | LOW | Fixed | Added warning for empty data directory |
| 8 | LOW | Deferred → TD-1-2C | No write integrity verification after batch commit |
| 9 | LOW | Fixed | Added batch size split assertions in multi-chunk test |

**Verdict:** APPROVED — All HIGH/MEDIUM items addressed. COMPLEX items tracked in TD-1-2C.
