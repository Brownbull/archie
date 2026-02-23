# Tech Debt Story TD-3-2a: Blob URL Revoke Cleanup on Unmount

Status: review

> **Source:** ECC Code Review (2026-02-23) on story 3-2
> **Priority:** LOW | **Estimated Effort:** Small (1-2h)

## Story

As a **developer**, I want the Blob URL revoke `setTimeout` in `ExportButton` to be cleared on component unmount, so that React Strict Mode double-invocation and unmount-before-fire scenarios don't leave dangling timer references.

## Acceptance Criteria

**AC-1:** The `setTimeout` ID for Blob URL revocation is stored in a `useRef` and cleared via a `useEffect` cleanup function when the component unmounts.

**AC-2:** Revocation still occurs at `BLOB_REVOKE_DELAY_MS` (1000ms) when the component stays mounted through the download lifecycle.

**AC-3:** A unit test verifies that `URL.revokeObjectURL` is called after the delay (use `vi.useFakeTimers()` + `vi.advanceTimersByTime()`).

**AC-4:** React Strict Mode (double-invoke) does not cause duplicate downloads or double-revocation.

## Tasks / Subtasks

- [x] 1. Refactor `handleExport` in `ExportButton.tsx`:
  - Replace bare `setTimeout` with a `useRef`-tracked timeout ID
  - Add `useEffect` cleanup to `clearTimeout` on unmount
- [x] 2. Update or add unit test for Blob URL revoke timing using `vi.useFakeTimers()`
- [x] 3. Run `npm run test:quick` — all tests pass

## Dev Notes

- Source story: [story-3-2.md](./story-3-2.md)
- Review finding: #4 (Security reviewer, LOW severity)
- Files affected:
  - `src/components/import-export/ExportButton.tsx`
  - `tests/unit/components/import-export/ExportButton.test.tsx` (new)
- Pattern reference: React `useEffect` cleanup for setTimeout — standard React pattern for async side effects
- Implementation: `revokeTimeoutRef` (timer ID) + `blobUrlRef` (URL) both stored in refs. Cleanup cancels timer AND revokes URL on unmount to prevent memory leak.
- Self-review finding addressed: blobUrlRef added so cleanup revokes the URL (not just cancels timer); `BLOB_REVOKE_DELAY_MS` exported for single source of truth in tests.
