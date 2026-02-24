# Tech Debt Story TD-3-2c: Strict Mode Anchor Click Test for ExportButton

Status: done

> **Source:** ECC Code Review (2026-02-23) on story td-3-2a
> **Priority:** LOW | **Estimated Effort:** Small (1-2h)

## Story

As a **developer**, I want an explicit test that verifies ExportButton does not trigger a duplicate download under React Strict Mode double-invocation, so that AC-4 has traceable unit test coverage.

## Acceptance Criteria

**AC-1:** A test wraps `<ExportButton />` in `<React.StrictMode>` and clicks export once.

**AC-2:** The test verifies `anchor.click()` is called exactly once (spy on `HTMLAnchorElement.prototype.click` or `document.createElement`).

**AC-3:** The test verifies `URL.revokeObjectURL` is called exactly once after `BLOB_REVOKE_DELAY_MS` (no double-revocation from Strict Mode's effect re-run).

## Tasks / Subtasks

- [x] 1. Add Strict Mode test to `ExportButton.test.tsx`:
  - Spy on `HTMLAnchorElement.prototype.click` using `vi.spyOn`
  - Wrap render in `<React.StrictMode>`
  - Click export, advance timers, assert click×1 and revokeObjectURL×1

## Dev Notes

- Source story: [td-3-2a-blob-url-unmount-cleanup.md](./td-3-2a-blob-url-unmount-cleanup.md)
- Review finding: #4 (TDD Guide, LOW severity) from code review 2026-02-23
- Files affected:
  - `tests/unit/components/import-export/ExportButton.test.tsx`
- Pattern reference: `vi.spyOn(HTMLAnchorElement.prototype, "click")` — spy on prototype method before render
- Note: useEffect with `[]` deps runs its cleanup once in Strict Mode before re-running setup, but the cleanup only clears the timer (no download has happened yet) so the Strict Mode double-invoke is harmless. The test should confirm this empirically.
