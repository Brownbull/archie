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
