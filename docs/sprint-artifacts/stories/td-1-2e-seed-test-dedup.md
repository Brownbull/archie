# Tech Debt: TD-1-2E Seed Test Mock Deduplication & Helpers Test Split

## Status: ready-for-dev
## Epic: Epic 1 — Architecture Canvas & Component Library
## Source: TD-1-2D Code Review (findings #2, #3, #10)

## Overview

Deferred items from TD-1-2D code review. Three themes around test maintainability:

1. **Shared mock setup** (MEDIUM) — Identical `vi.mock("node:fs")` block (11 lines) is copy-pasted in 3 test files (`seed-firestore.test.ts`, `seed-validate-credentials.test.ts`, `seed-load-components.test.ts`). Should extract to a vitest `setupFile` or shared mock module.

2. **Helpers test file splitting** (MEDIUM) — `seed-helpers.test.ts` at 209 lines exceeds the 150-line per-file guideline from TD-1-2D. Should split by function under test (e.g., `seed-helpers-yaml.test.ts`, `seed-helpers-mock.test.ts`).

3. **Configurable logging** (LOW) — Seed script has 8 `console.log/warn/error` calls that pollute test output. Consider a `verbose` flag or injected logger for quieter test runs.

## Tasks

### Task 1: Extract Shared Mock Setup
- [ ] 1.1 Create shared mock setup module or vitest setupFile for `node:fs` + `firebase-admin` mocks
- [ ] 1.2 Update all 3 seed test files to use shared setup
- [ ] 1.3 Verify no regressions

### Task 2: Split seed-helpers.test.ts
- [ ] 2.1 Split into focused test files (< 150 lines each)
- [ ] 2.2 Verify all helper tests still pass

### Task 3: Configurable Logging (Optional)
- [ ] 3.1 Add `verbose` parameter or logger injection to seed functions
- [ ] 3.2 Update tests to use quiet mode

## Acceptance Criteria

- No duplicate `vi.mock` blocks across seed test files
- All seed helper test files < 150 lines
- All existing tests pass without regression

## File List

| File | Action |
|------|--------|
| `tests/unit/scripts/seed-firestore.test.ts` | MODIFY |
| `tests/unit/scripts/seed-validate-credentials.test.ts` | MODIFY |
| `tests/unit/scripts/seed-load-components.test.ts` | MODIFY |
| `tests/unit/scripts/seed-helpers.test.ts` | MODIFY (split) |
| `scripts/seed-firestore.ts` | MODIFY (Task 3 only) |
