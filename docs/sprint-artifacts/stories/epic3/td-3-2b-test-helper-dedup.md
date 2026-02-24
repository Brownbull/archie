# Tech Debt Story TD-3-2b: Deduplicate makeNode/makeEdge Test Helpers

Status: done

> **Source:** ECC Code Review (2026-02-23) on story 3-2
> **Priority:** LOW | **Estimated Effort:** Small (1h)

## Story

As a **developer**, I want `makeNode` and `makeEdge` factory helpers extracted into the shared `tests/helpers/` barrel, so that future `ArchieNode`/`ArchieEdge` shape changes only require a single update and both the unit and integration test files stay in sync.

## Acceptance Criteria

**AC-1:** `makeNode` and `makeEdge` factory functions exist in `tests/helpers/` (e.g., `tests/helpers/factories.ts` or the existing helpers barrel) and are exported from `tests/helpers/index.ts`.

**AC-2:** `tests/unit/services/yamlExporter.test.ts` imports `makeNode` and `makeEdge` from `tests/helpers` — local duplicates removed.

**AC-3:** `tests/integration/yamlRoundTrip.test.ts` imports `makeNode` and `makeEdge` from `tests/helpers` — local duplicates removed.

**AC-4:** `npm run test:quick` passes with no test regressions.

**AC-5:** The existing `tests/unit/helpers/barrelExport.test.ts` barrel export test is updated (or passes automatically) to cover the new exports.

## Tasks / Subtasks

- [x] 1. Add `makeNode` and `makeEdge` to `tests/helpers/` (merge with any existing helpers — avoid overwriting existing `makeNode` if one already exists under a different name)
- [x] 2. Export from `tests/helpers/index.ts`
- [x] 3. Update `tests/unit/services/yamlExporter.test.ts` to import from `tests/helpers`
- [x] 4. Update `tests/integration/yamlRoundTrip.test.ts` to import from `tests/helpers`
- [x] 5. Update `barrelExport.test.ts` if needed
- [x] 6. Run `npm run test:quick` — all tests pass

## Dev Notes

- Source story: [story-3-2.md](./story-3-2.md)
- Review findings: #3 and #4 (Code reviewer, LOW/SUGGESTION severity)
- Files affected: `tests/unit/services/yamlExporter.test.ts`, `tests/integration/yamlRoundTrip.test.ts`
- Tasks 1+2: `makeNode`/`makeEdge` already existed in `tests/helpers/factories.ts` and `tests/helpers/index.ts` from a prior story — no factory changes needed.
- Tasks 3+4: Removed local function definitions; updated all call sites to the shared factory's nested API (`data: { archieComponentId }` instead of flat `archieComponentId`).
- Task 5: `barrelExport.test.ts` already covered `makeNode`/`makeEdge` — no changes needed.
- `expectPositionClose` kept local to `yamlRoundTrip.test.ts` (only used in one file).
- 996 tests pass, 66 test files, 0 regressions.
