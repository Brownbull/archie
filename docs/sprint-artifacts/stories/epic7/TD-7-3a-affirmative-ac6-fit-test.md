# Tech Debt Story TD-7-3a: Affirmative AC-6 Fit Re-Derivation Test

Status: ready-for-dev

> **Source:** KDBP Code Review (2026-03-17) on story 7-3
> **Priority:** LOW | **Estimated Effort:** ~30 min
> **Stage:** MVP

## Story
As a **developer**, I want **an affirmative test that verifies fit indicators are computed from current library data after import**, so that **AC-6's positive behavior (not just the negative "fit not exported" check) is covered by automated tests**.

## Acceptance Criteria

**AC-1:** After importing YAML with data context items, call `evaluateFitBatch()` with the imported items and a mock `dataFitProfile`. Verify fit results are computed (not null/undefined) and reflect the mock library data.

**AC-2:** Verify that if the library's `dataFitProfile` changes between export and import, the fit result after import reflects the NEW library data (proving re-derivation, not stale storage).

## Tasks / Subtasks

- [ ] Task 1: Add affirmative fit re-derivation test
  - [ ] 1.1 In `yaml-dataContext-roundtrip.test.ts`, add test: import YAML → call `evaluateFitBatch` with imported items + mock profile → verify fit result computed
  - [ ] 1.2 Add test: export with profile A, import, evaluate with profile B → fit reflects B (not A)
  - [ ] 1.3 Run `npm run test:quick` — all pass

## Dev Notes
- Source story: [7-3](./7-3.md)
- Review findings: #8 (TDD guide)
- Files affected: `tests/integration/yaml-dataContext-roundtrip.test.ts`
- The existing AC-6 tests only verify the negative side (fit fields absent from YAML export). This story adds the affirmative side (fit computed from library after import).
