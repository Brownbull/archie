# Tech Debt Story TD-3-3b: Unit Tests for seedBlueprintsToFirestore

Status: ready-for-dev

> **Source:** ECC Code Review (2026-02-23) on story 3-3
> **Priority:** LOW | **Estimated Effort:** Small (1-2h)

## Story

As a **developer**, I want unit tests for `seedBlueprintsToFirestore` in `seed-firestore.ts`, so that the blueprint Firestore write path has the same test coverage as the existing `seedToFirestore` component path.

## Acceptance Criteria

**AC-1:** A test verifies that `seedBlueprintsToFirestore` with an empty array returns 0 and logs "No blueprints to seed."

**AC-2:** A test verifies that a list of N blueprints results in N `batch.set()` calls and N returned from the function.

**AC-3:** A test verifies that `seedBlueprintsToFirestore` with > 500 blueprints splits correctly into multiple batch commits (chunking boundary).

**AC-4:** All new tests use the existing `noopLogger` + `vi.fn()` mock patterns from `seed-helpers.ts`.

## Tasks / Subtasks

- [ ] 1. Add test file `tests/unit/scripts/seed-blueprints-to-firestore.test.ts` (or extend `seed-firestore.test.ts`)
- [ ] 2. Implement AC-1: empty input returns 0
- [ ] 3. Implement AC-2: N blueprints → N batch.set calls, returns N
- [ ] 4. Implement AC-3: > BATCH_LIMIT (500) → multiple batch.commit() calls
- [ ] 5. Run `npm run test:quick` — all tests pass

## Dev Notes

- Source story: [story-3-3.md](./story-3-3.md)
- Review finding: #2 (Code reviewer, LOW severity)
- Files affected:
  - `tests/unit/scripts/seed-blueprints-to-firestore.test.ts` (new) or extend existing seed-firestore.test.ts
- Pattern reference: See `tests/unit/scripts/seed-firestore.test.ts` for `seedToFirestore` test structure to mirror
- `seedBlueprintsToFirestore` uses the same chunked batch write pattern as `seedToFirestore` without the metadata write — tests should be structurally similar but simpler
