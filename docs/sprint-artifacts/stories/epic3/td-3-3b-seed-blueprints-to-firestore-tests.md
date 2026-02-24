# Tech Debt Story TD-3-3b: Unit Tests for seedBlueprintsToFirestore

Status: done

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

- [x] 1. Add test file `tests/unit/scripts/seed-blueprints-to-firestore.test.ts` (or extend `seed-firestore.test.ts`)
- [x] 2. Implement AC-1: empty input returns 0
- [x] 3. Implement AC-2: N blueprints → N batch.set calls, returns N
- [x] 4. Implement AC-3: > BATCH_LIMIT (500) → multiple batch.commit() calls
- [x] 5. Run `npm run test:quick` — all tests pass

## Code Review (2026-02-23)

**Decision: APPROVED 8.8/10** | Agents: code-reviewer + security-reviewer (STANDARD)

4 quick fixes applied during review:

| # | Sev | Finding | Action |
|---|-----|---------|--------|
| 1 | MEDIUM | AC-2: renamed + extended "returns count" test to assert both `setFn` N times and return N | FIXED |
| 2 | LOW | AC-3: swapped `noopLogger` for spy + added chunk-progress log assertions | FIXED |
| 3 | LOW | Removed duplicate "handles empty blueprints array" test (subsumed by AC-1 spy test) | FIXED |
| 4 | LOW | AC-3 comment: added last-chunk size annotation | FIXED |

Post-fix: 1079/1079 tests green.

## Dev Notes

- Source story: [story-3-3.md](./story-3-3.md)
- Review finding: #2 (Code reviewer, LOW severity)
- Files affected:
  - `tests/unit/scripts/seed-blueprints-to-firestore.test.ts` (new) or extend existing seed-firestore.test.ts
- Pattern reference: See `tests/unit/scripts/seed-firestore.test.ts` for `seedToFirestore` test structure to mirror
- `seedBlueprintsToFirestore` uses the same chunked batch write pattern as `seedToFirestore` without the metadata write — tests should be structurally similar but simpler
