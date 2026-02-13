# Tech Debt: TD-1-2D Seed Script Test Quality

## Status: ready-for-dev
## Epic: Epic 1 — Architecture Canvas & Component Library
## Source: TD-1-2C Code Review (findings #1, #2, #4, #6)

## Overview

Deferred items from TD-1-2C code review. Four themes around seed script test quality and strictness:

1. **Test file splitting** (MEDIUM) — Test file is 277+ lines covering 3 exported functions. Should be split by function under test for maintainability.

2. **Mock type completeness** (LOW) — `createMockDb()` returns a minimal mock matching `FirestoreSubset` but doesn't verify all `WriteBatch` interface methods. Could miss interface drift.

3. **Batch integrity strictness** (LOW) — `seedToFirestore()` warns on write count mismatch but doesn't throw. For integrity verification, a hard failure may be more appropriate.

4. **Test fixture duplication** (LOW) — Inline component objects in `seedToFirestore` tests duplicate structure. Should extract to shared helper like `makeComponent()`.

## Tasks

### Task 1: Split Test File by Function
- [ ] 1.1 Create `tests/unit/scripts/seed-validate-credentials.test.ts` for `validateServiceAccountFile`
- [ ] 1.2 Create `tests/unit/scripts/seed-load-components.test.ts` for `loadAndValidateComponents`
- [ ] 1.3 Keep `seed-firestore.test.ts` for `seedToFirestore` tests
- [ ] 1.4 Extract shared helpers (`makeComponentYaml`, `makeServiceAccountJson`, `createMockDb`) to `tests/unit/scripts/seed-helpers.ts`

### Task 2: Improve Mock Type Completeness
- [ ] 2.1 Extend `createMockDb()` to include stub methods for `create`, `update`, `delete` on the batch mock
- [ ] 2.2 Update type assertion to verify full `WriteBatch` compatibility

### Task 3: Strict Batch Integrity
- [ ] 3.1 Change `seedToFirestore()` to throw on write count mismatch instead of warn
- [ ] 3.2 Update existing tests to reflect new error behavior
- [ ] 3.3 Add test for partial write count mismatch scenario

### Task 4: Extract Test Component Factory
- [ ] 4.1 Create `makeComponent(id)` helper that returns a camelCase `Component` object
- [ ] 4.2 Replace all inline component objects in seedToFirestore tests with `makeComponent()`

## Acceptance Criteria

- Test file split into focused files (< 150 lines each)
- Mock types are complete without unsafe casts
- Batch integrity throws on mismatch (not just warn)
- No duplicate component fixture objects in tests

## File List

| File | Action |
|------|--------|
| `tests/unit/scripts/seed-firestore.test.ts` | MODIFY (split) |
| `tests/unit/scripts/seed-validate-credentials.test.ts` | CREATE |
| `tests/unit/scripts/seed-load-components.test.ts` | CREATE |
| `tests/unit/scripts/seed-helpers.ts` | CREATE |
| `scripts/seed-firestore.ts` | MODIFY (Task 3 only) |
