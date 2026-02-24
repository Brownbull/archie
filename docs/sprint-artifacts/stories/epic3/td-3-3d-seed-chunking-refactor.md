# Story: TD-3-3d Seed Script Chunking Refactor

## Status: ready-for-dev
## Epic: Epic 3 — YAML Workflow & Content Library
## Source: ECC Code Review (2026-02-23) on story td-3-3a

> **Priority:** LOW | **Estimated Effort:** SMALL (1 task, ~4 subtasks, 2 files)

## Story

As a **developer**, I want `seedToFirestore` to use the same clean `slice`-based chunking pattern as `seedBlueprintsToFirestore`, so that the seed script is internally consistent and the complex reserved-slot logic is eliminated.

## Acceptance Criteria

**AC-1: Consistent Chunking Pattern**
**Given** the seed script has two batch-write functions (`seedToFirestore` and `seedBlueprintsToFirestore`)
**When** both functions are read side-by-side
**Then** both use the same `slice`-based chunking approach (not a mix of `while`+index and `slice`)

**AC-2: Metadata in Separate Batch**
**Given** `seedToFirestore` writes components + a metadata document
**When** the refactor is applied
**Then** components are written in standard 500-op `slice` chunks and metadata is committed in its own single-op batch after the component writes
**And** the metadata document still contains `version`, `seededAt`, `componentCount`

**AC-3: Tests Pass**
**Given** the refactored implementation
**When** the full test suite runs
**Then** all existing tests pass unchanged

## Tasks / Subtasks

### Task 1: Refactor seedToFirestore
- [x] 1.1 Replace `while`+index loop with `slice`-based chunking (matching `seedBlueprintsToFirestore` pattern)
- [x] 1.2 Move metadata write into its own single-op `batch.set()` + `batch.commit()` after all component chunks
- [x] 1.3 Remove `reservedSlots`, `isLastChunk`, and `opsInBatch` complexity
- [x] 1.4 Run `npm run test:quick` — all tests pass (71 files, 1079 tests)

## Dev Notes

- Reference `seedBlueprintsToFirestore` for the target chunking pattern
- Metadata batch can be a simple: `const metaBatch = db.batch(); metaBatch.set(ref, data); await metaBatch.commit()`
- No behavior changes — same end state in Firestore, just cleaner implementation
- The `writtenIds.length !== components.length` assertion can be simplified once the loop is cleaner
- **AC-3 test note (2026-02-23):** AC-3 said "tests pass unchanged" but AC-2 required separate metadata batch, which changed batch-count expectations in 3 tests. Updated: (1) small count test 1→2 batches, (2) 501 count test 2→3 batches + "1 operations" log, (3) 499 count test renamed + 1→2 batches. Removed: "throws on write count mismatch" test (writtenIds tracking eliminated). All 1079 tests pass.

## Deferred From

| Source Story | Review Finding | Description |
|---|---|---|
| td-3-3a | #1 | seedToFirestore complex chunk-boundary logic with reservedSlots |
| td-3-3a | #2 | Inconsistent chunking style vs seedBlueprintsToFirestore |
