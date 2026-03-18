# Tech Debt Story TD-7-3a: Affirmative AC-6 Fit Re-Derivation Test

Status: done

> **Source:** KDBP Code Review (2026-03-17) on story 7-3
> **Priority:** LOW | **Estimated Effort:** ~30 min
> **Stage:** MVP

## Story
As a **developer**, I want **an affirmative test that verifies fit indicators are computed from current library data after import**, so that **AC-6's positive behavior (not just the negative "fit not exported" check) is covered by automated tests**.

## Acceptance Criteria

**AC-1:** After importing YAML with data context items, call `evaluateFitBatch()` with the imported items and a mock `dataFitProfile`. Verify fit results are computed (not null/undefined) and reflect the mock library data.

**AC-2:** Verify that if the library's `dataFitProfile` changes between export and import, the fit result after import reflects the NEW library data (proving re-derivation, not stale storage).

## Tasks / Subtasks

- [x] Task 1: Add affirmative fit re-derivation test
  - [x] 1.1 In `yaml-dataContext-roundtrip.test.ts`, add test: import YAML → call `evaluateFitBatch` with imported items + mock profile → verify fit result computed
  - [x] 1.2 Add test: export with profile A, import, evaluate with profile B → fit reflects B (not A)
  - [x] 1.3 Run `npm run test:quick` — all pass (1946/1946)

## Dev Notes
- Source story: [7-3](./7-3.md)
- Review findings: #8 (TDD guide)
- Files affected: `tests/integration/yaml-dataContext-roundtrip.test.ts`
- The existing AC-6 tests only verify the negative side (fit fields absent from YAML export). This story adds the affirmative side (fit computed from library after import).

## Senior Developer Review (KDBP)
- **Date:** 2026-03-17
- **Agents:** code-reviewer (TRIVIAL classification)
- **Outcome:** APPROVE 7.5/10 — 5 quick fixes applied, 1 backlog deferral
- **Quick fixes:** Clarified profile comment (#1), removed redundant assertion (#2), disambiguated AC labels (#3), removed redundant inequality check (#4), strengthened explanation assertion (#7)
- **Backlog:** Duplicated export-then-import preamble (PROD) → deferred-findings.md
<!-- CITED: none -->
