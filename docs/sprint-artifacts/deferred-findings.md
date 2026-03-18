# Deferred Findings Backlog

> Items identified during code review but deferred beyond the current epic.
> Grouped by product stage. Review during epic planning for future epics.

## PROD Backlog

### [PROD] Repository integration test for schema-triggered silent drop

- **Source:** TD-8-1a review (2026-03-12)
- **Finding:** No repository test confirms that a structurally plausible but schema-invalid document (e.g., 201-char `componentId`) triggers the silent-drop path in `stackRepository.getAll()`. Current tests only use missing-field rejection. A test passing a document with a 201-char `componentId` and confirming it is silently filtered would close the loop between the new schema constraints and the drop behavior.
- **Files:** `tests/unit/repositories/stackRepository.test.ts`
- **Stage:** PROD — integration coverage for defense-in-depth validation; not blocking functionality
- **Estimated effort:** Small (1 test case addition)

### [PROD] StacksErrorBoundary export is implementation detail leak

- **Source:** 8-2 review (2026-03-12)
- **Finding:** `StacksErrorBoundary` is exported from `StacksTab.tsx` but only consumed by the unit test (direct import for error boundary testing). This exposes an implementation detail. Consider keeping it unexported and testing error state via `StacksTab` directly, or accepting the export as a deliberate test seam.
- **Files:** `src/components/toolbox/StacksTab.tsx`
- **Stage:** PROD — code hygiene, not functional
- **Estimated effort:** Small (1-line change + test refactor)

### [PROD] useLibrary hook has no reactive subscription for initialization state

- **Source:** 8-2 review (2026-03-12)
- **Finding:** `useLibrary()` reads `componentLibrary.isInitialized()` synchronously — a plain boolean return, not a reactive subscription. If library initialization completes asynchronously after first render, nothing triggers a re-render, and StacksTab/ComponentTab/BlueprintTab may show a perpetual loading skeleton. Pre-existing pattern (not introduced by 8-2) but propagated. Confirm whether the parent component or initialization flow forces a re-render after `componentLibrary.initialize()` completes.
- **Files:** `src/hooks/useLibrary.ts`, all tabs consuming `useLibrary`
- **Stage:** PROD — correctness risk in async initialization path
- **Estimated effort:** Medium (may require adding an event emitter or state sync to componentLibrary)

### [PROD] Accessibility (a11y) warnings from aislop scan

- **Source:** TD-cross-2 review (2026-03-17)
- **Finding:** First aislop scan identified 5 a11y warnings. These require UX review for correct ARIA patterns — not mechanical fixes. Needs a dedicated a11y story with design input.
- **Files:** Multiple UI components (exact files in aislop scan output)
- **Stage:** PROD — accessibility is required for production readiness, not feature-blocking
- **Estimated effort:** Medium (5 issues, requires UX/design review for correct ARIA roles)

### [PROD] Duplicated drag-to-canvas helper bodies

- **Source:** 8-4 review (2026-03-13)
- **Finding:** `dragStackToCanvas` and `dragComponentToCanvas` share ~30 identical lines of `page.evaluate` body — only the MIME type (`application/archie-stack` vs `application/archie-component`) and variable name differ. Extract a shared `dispatchDragToCanvas(page, mimeType, payload, x, y)` primitive and have both functions delegate to it.
- **Files:** `tests/e2e/helpers/canvas-helpers.ts`
- **Stage:** PROD — DRY/maintainability, not blocking functionality
- **Estimated effort:** Small (extract shared function, update two callers)

### [PROD] MIME type check uses reject-list instead of accept-list

- **Source:** 7-3 review (2026-03-17)
- **Finding:** `importYaml()` uses a reject-list (`REJECTED_MIME_PREFIXES`) for MIME type validation. Files with MIME types like `application/x-executable` or `text/html` pass if extension is `.yaml`. Converting to an accept-list (e.g., `text/yaml`, `text/plain`, empty string) would close a defense-in-depth gap in the drag-and-drop import path. Extension check and Zod schema validation provide existing safety layers.
- **Files:** `src/services/yamlImporter.ts`
- **Stage:** PROD — defense-in-depth enhancement, not feature-blocking. Existing layers prevent exploitation.
- **Estimated effort:** Small (add accept-list alongside reject-list, test browser MIME behaviors)

### [PROD] Duplicated export-then-import preamble in data context round-trip tests

- **Source:** TD-7-3a review (2026-03-17)
- **Finding:** The affirmative AC-6 tests duplicate a 10-line export-then-import preamble (build Map, exportArchitecture, importYamlString, assert success, extract items) verbatim across both test cases. Pre-existing pattern in the file — other describe blocks inline the same setup too. A shared `beforeEach` with `let importedItems` within the new describe block would eliminate the duplication.
- **Files:** `tests/integration/yaml-dataContext-roundtrip.test.ts`
- **Stage:** PROD — DRY/maintainability, not functional
- **Estimated effort:** Small (extract shared setup within describe block)

### [PROD] Two-Map pattern in checkConstraintSafety could be single-pass

- **Source:** 7.5-1 review (2026-03-18)
- **Finding:** `checkConstraintSafety` in `pathwayEngine.ts` allocates both `categoryCounts` and `categoryAvgs` Maps when a single-pass approach (computing averages inline) would suffice. The sibling function `computeCandidateWeightedScore` uses a single Map. Minor DRY/consistency cleanup, no correctness impact.
- **Files:** `src/engine/pathwayEngine.ts`
- **Stage:** PROD — code hygiene, not functional
- **Estimated effort:** Small (refactor two Maps into one, ~10 lines)

## SCALE Backlog

### [SCALE] Extract shared blueprint-load-and-add-data-item helper for E2E specs

- **Source:** 7-4 review (2026-03-17)
- **Finding:** AC-1 and AC-2 in `data-context.spec.ts` perform identical setup sequences: goto → waitForBlueprints → blueprint-load → selectNode → navigateToDataSection → addDataContextItem with the same arguments. Extracting a `loadBlueprintAndAddDataItem` helper into `canvas-helpers.ts` would reduce maintenance surface and make divergence points obvious. Currently 2 callers.
- **Files:** `tests/e2e/data-context.spec.ts`, `tests/e2e/helpers/canvas-helpers.ts`
- **Stage:** SCALE — DRY improvement for test infrastructure; no functional impact
- **Estimated effort:** Small (extract helper, update 2 callers)

### [SCALE] YAML shape validation in E2E round-trip assertion

- **Source:** 7-4 review (2026-03-17)
- **Finding:** AC-4 round-trip test casts `load(rawYaml)` to `Record<string, unknown>` and accesses `nodes` via a second cast. A Zod partial check or manual shape guard would produce more informative assertion failure messages ("nodes is undefined" vs a clear shape description). Low priority for test files.
- **Files:** `tests/e2e/data-context.spec.ts`
- **Stage:** SCALE — developer experience improvement for test diagnostics; no correctness impact
- **Estimated effort:** Small (add 5-line shape guard or Zod partial parse)
