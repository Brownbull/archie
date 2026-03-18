# Tech Debt Story TD-cross-2: aislop Baseline Cleanup

Status: done

> **Source:** aislop v0.2.0 first scan (2026-03-15) — Score: 7/100 (128 issues)
> **Priority:** MEDIUM | **Estimated Effort:** Small (5 tasks, ~12 files)

## Story
As a **developer**, I want **to address the actionable findings from the first aislop quality scan**, so that **the codebase starts from a clean baseline and future scans show real regressions rather than inherited noise**.

## Triage Summary

The first aislop scan found 128 issues across 4 engines. After triage:

| Category | Count | Action |
|----------|-------|--------|
| **Conditional hook bug** | 1 | MUST FIX — real React bug |
| **Lint cleanup** (duplicate imports, unused vars) | 10 | FIX — quick mechanical edits |
| **Dead code** (unused files, dependency, exports) | 7 | FIX — remove dead weight |
| **Dependency vulnerabilities** | 16 | FIX — npm audit fix |
| **knip/shadcn unused re-exports** | ~30 | IGNORE — shadcn generates unused variants by design |
| **knip/types barrel unused** | ~42 | DEFER — barrel exports consumed by upcoming stories (7-2+) |
| **a11y warnings** | 5 | DEFER — separate story, larger UX effort |

## Acceptance Criteria

- [x] AC-1: No `react-hooks/rules-of-hooks` errors remain (conditional hook in StacksTab.tsx fixed)
- [x] AC-2: No `import/no-duplicates` warnings remain
- [x] AC-3: No `eslint/no-unused-vars` warnings in test files
- [x] AC-4: Unused dependency `next-themes` removed from package.json
- [x] AC-5: Unused files deleted (src/components/inspector/index.ts deleted; src/declarations.d.ts trimmed — removed *.md?raw decl, kept react-syntax-highlighter subpath decls needed by build)
- [x] AC-6: Unused exports in architectureStoreHelpers.ts removed (4 exports made module-private, CategoryScore removed from re-export)
- [x] AC-7: `npm audit fix` run; 16 vulns → 8 (all low, firebase-admin transitive)
- [x] AC-8: knip configured to ignore shadcn/ui component re-exports (knip.json created)
- [x] AC-9: aislop re-scan: 7/100 → 10/100, 128 → 107 issues
- [x] AC-10: All existing tests pass (`npm run test:quick`) — 1818/1818

## Tasks / Subtasks

- [x] **Task 1:** Fix conditional hook bug (MUST FIX)
  - [x] 1a. Fix `useMemo` called conditionally in `src/components/toolbox/StacksTab.tsx:75` — restructure to call hook unconditionally
  - [x] 1b. Verify fix with `npm run test:quick`

- [x] **Task 2:** Clean up lint issues
  - [x] 2a. Merge duplicate imports in `src/stores/architectureStoreHelpers.ts`
  - [x] 2b. Merge duplicate imports in `src/services/yamlImporter.ts`
  - [x] 2c. Merge duplicate imports in `tests/unit/repositories/metricCategoryRepository.test.ts`
  - [x] 2d. Merge duplicate imports in `tests/unit/services/yamlExporter-v2.test.ts`
  - [x] 2e. Remove unused `vi` import in `tests/unit/stores/preferencesStore.test.ts`
  - [x] 2f. Remove unused `ArchitectureFileYamlSchema` import in `tests/unit/data/blueprints.test.ts`
  - [x] 2g. Remove unused `PropagationHop` import in `tests/unit/engine/propagator.test.ts`
  - [x] 2h. Prefix unused `initialScore` with `_` in `tests/e2e/stack-browsing.spec.ts`
  - [x] 2i. Remove unnecessary `isReady` dependency from useMemo in `src/hooks/useLibrary.ts`
  - [x] 2j. Remove useless spread in `tests/unit/engine/recalculator.test.ts`

- [x] **Task 3:** Remove dead code
  - [x] 3a. Trim `src/declarations.d.ts` (removed *.md?raw decl; kept react-syntax-highlighter subpath decls needed by build)
  - [x] 3b. Delete `src/components/inspector/index.ts` (unused barrel)
  - [x] 3c. Remove `next-themes` from package.json dependencies
  - [x] 3d. Made unused exports module-private in `src/stores/architectureStoreHelpers.ts` (`recomputeWeightedHeatmap`, `buildPerNodeCategoryScores`, `buildViolationsByNodeId`); removed `CategoryScore` from re-export line
  - [x] 3e. Run `npm install` to regenerate lockfile after dependency removal

- [x] **Task 4:** Dependency vulnerability audit
  - [x] 4a. Run `npm audit fix` (non-breaking fixes only) — 16 → 8 vulns
  - [x] 4b. Remaining: 8 low-severity vulns in firebase-admin transitive deps (@google-cloud/firestore, @google-cloud/storage, @tootallnate/once, google-gax, http-proxy-agent, retry-request, teeny-request)
  - [x] 4c. Build verified (pre-existing architectureFileSchema.ts errors only)

- [x] **Task 5:** Configure knip + establish baseline
  - [x] 5a. Created `knip.json` with ignore for `src/components/ui/**` — zero shadcn/ui warnings in scan
  - [x] 5b. aislop re-scan: 10/100 (was 7/100), 107 issues (was 128)
  - [x] 5c. Baseline documented here and in commit message
  - [x] 5d. `npm run test:quick` — 1818/1818 pass

## Exclusions (Deferred)

| Finding | Reason | Destination |
|---------|--------|-------------|
| a11y warnings (5 issues) | Requires UX review for correct ARIA patterns | Backlog (separate a11y story) |
| types/index.ts barrel cleanup (~42 unused re-exports) | Many will be consumed by Epic 7 stories 7-2 through 7-4 | Re-evaluate after Epic 7 complete |
| tests/e2e/global-setup.ts "unused" | Referenced by playwright.config.ts globalSetup — false positive | Ignore |
| tests/e2e/helpers/auth.ts unused exports | Used by E2E specs or reserved for future E2E | Ignore |

## Dev Notes
- Source: First aislop scan on Archie, score 7/100
- aislop config: `.aislop/config.yml` (format engine disabled, 800-line threshold)
- The conditional hook in StacksTab.tsx (Task 1) is the only real runtime bug — prioritize this
- shadcn/ui components intentionally export more than what's consumed; this is normal
- Many dependency vulns are in `firebase-admin` transitive deps — unfixable until firebase releases patches
- Do NOT touch `src/types/index.ts` barrel — Epic 7 stories will consume those types

## Senior Developer Review (ECC)

- **Date:** 2026-03-17
- **Agents:** code-reviewer (sonnet), security-reviewer (sonnet)
- **Classification:** STANDARD (16 files, mechanical cleanup)
- **Score:** 8.3/10 — APPROVE
- **Findings:** 7 total — 3 fixed (quick), 1 TD story (MVP), 1 backlog (PROD), 1 already tracked, 1 archived
- **TD Stories Created:** TD-cross-2a (StacksTab useMemo reference instability)
- **Backlog Entries Added:** 1 (a11y warnings — PROD)
- **Tests:** 1879/1879 pass after fixes

| # | Finding | Stage | Destination | Tracking |
|---|---------|-------|-------------|----------|
| 1 | useMemo instability in StacksTab | MVP | TD-cross-2a | ready-for-dev |
| 2 | StacksErrorBoundary export | PROD | Already tracked | deferred-findings.md |
| 3 | useLibrary singleton assumption | PROD | Already tracked | deferred-findings.md |
| 4 | _initialScore dead assignment | — | Fixed | Quick fix |
| 5 | knip entry config expanded | — | Fixed | Quick fix |
| 6 | prepare script CI guard | — | Fixed | Quick fix |
| 7 | npm audit firebase-admin vulns | — | Archived | Unfixable upstream |

<!-- CITED: docs/quality-reports/aislop-latest.md -->
<!-- CITED: L2-P1-git-staging, L2-P5-feature-exports, L2-P8-ssot (relevant patterns checked) -->
<!-- ORDERING: clean -->
<!-- ORDERING: Task 1 (bug) → Task 2 (lint) → Task 3 (dead code) → Task 4 (vulns) → Task 5 (baseline) -->
