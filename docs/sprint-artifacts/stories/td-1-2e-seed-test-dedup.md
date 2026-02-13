# Tech Debt: TD-1-2E Seed Test Mock Deduplication & Helpers Test Split

## Status: done
## Epic: Epic 1 — Architecture Canvas & Component Library
## Source: TD-1-2D Code Review (findings #2, #3, #10)

## Overview

Deferred items from TD-1-2D code review. Three themes around test maintainability:

1. **Shared mock setup** (MEDIUM) — Identical `vi.mock("node:fs")` block (11 lines) is copy-pasted in 3 test files (`seed-firestore.test.ts`, `seed-validate-credentials.test.ts`, `seed-load-components.test.ts`). Should extract to a vitest `setupFile` or shared mock module.

2. **Helpers test file splitting** (MEDIUM) — `seed-helpers.test.ts` at 209 lines exceeds the 150-line per-file guideline from TD-1-2D. Should split by function under test (e.g., `seed-helpers-yaml.test.ts`, `seed-helpers-mock.test.ts`).

3. **Configurable logging** (LOW) — Seed script has 8 `console.log/warn/error` calls that pollute test output. Consider a `verbose` flag or injected logger for quieter test runs.

## Tasks

### Task 1: Extract Shared Mock Setup
- [x] 1.1 Create shared mock setup module or vitest setupFile for `node:fs` + `firebase-admin` mocks
- [x] 1.2 Update all 3 seed test files to use shared setup
- [x] 1.3 Verify no regressions

### Task 2: Split seed-helpers.test.ts
- [x] 2.1 Split into focused test files (< 150 lines each)
- [x] 2.2 Verify all helper tests still pass

### Task 3: Configurable Logging (Optional)
- [x] 3.1 Add `verbose` parameter or logger injection to seed functions
- [x] 3.2 Update tests to use quiet mode

## Acceptance Criteria

- No duplicate `vi.mock` blocks across seed test files
- All seed helper test files < 150 lines
- All existing tests pass without regression

## File List

| File | Action |
|------|--------|
| `tests/unit/scripts/seed-mocks.ts` | CREATE (shared vi.mock setup) |
| `tests/unit/scripts/seed-firestore.test.ts` | MODIFY (use seed-mocks, noopLogger) |
| `tests/unit/scripts/seed-validate-credentials.test.ts` | MODIFY (use seed-mocks) |
| `tests/unit/scripts/seed-load-components.test.ts` | MODIFY (use seed-mocks, noopLogger) |
| `tests/unit/scripts/seed-helpers.ts` | MODIFY (add noopLogger export) |
| `tests/unit/scripts/seed-helpers.test.ts` | DELETE (split into two files) |
| `tests/unit/scripts/seed-helpers-yaml.test.ts` | CREATE (makeComponentYaml + makeComponent tests) |
| `tests/unit/scripts/seed-helpers-mock.test.ts` | CREATE (createMockDb + makeServiceAccountJson tests) |
| `scripts/seed-firestore.ts` | MODIFY (SeedLogger interface, injectable logger) |

## Senior Developer Review (ECC)

**Date:** 2026-02-13 | **Classification:** STANDARD | **Score:** 8.5/10 | **Status:** APPROVED

**Agents:** code-reviewer (Sonnet, 8/10), security-reviewer (Sonnet, 9/10)

**AC Verification:**
- No duplicate vi.mock blocks: PASS
- All helper test files < 150 lines: PASS (yaml: 103, mock: 105)
- All tests pass: PASS (52/52)

**Findings (5 LOW, 0 deferred):**
1. JSDoc on seed-mocks.ts — FIXED
2. Over-engineered mock stubs — DISMISSED (stubs are tested)
3. Missing 498-component edge case — DISMISSED (499 test covers boundary)
4. More realistic fake key — DISMISSED (validation checks presence, not format)
5. JSDoc on SeedLogger — FIXED

**Session cost:** $4.37
