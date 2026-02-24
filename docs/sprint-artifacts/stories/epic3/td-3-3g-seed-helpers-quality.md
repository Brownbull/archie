# Tech Debt Story TD-3-3g: Seed Helpers Quality

## Status: review
## Epic: Epic 3 — YAML Workflow & Content Library

> **Source:** ECC Code Review (2026-02-24) on story td-3-3f
> **Priority:** LOW | **Estimated Effort:** TINY (1 task, ~3 subtasks, 1-2 files)

## Story

As a **developer**, I want `seed-helpers.ts` to be more robust and focused, so that future maintainers don't encounter hidden execution-order contracts or silently weakening assertions in the fail-fast test helper.

## Acceptance Criteria

**AC-1: Explicit partial-return guard**
**Given** `assertFailFastBehavior` currently asserts the loader throws via `expect(() => loader(...)).toThrow()`
**When** this story is developed
**Then** the helper also verifies the loader does NOT return a partial result when it throws (explicit no-partial-return contract)

**AC-2: fs dependency isolation (optional)**
**Given** `seed-helpers.ts` imports `node:fs` only for `assertFailFastBehavior`
**When** the story author judges the file is growing large enough to warrant splitting
**Then** `assertFailFastBehavior` is extracted to a `seed-assert-helpers.ts` file, keeping the fs import isolated from non-fs helpers
**Note:** Only do this if the helpers file grows. At current size (~220 lines) it's borderline.

## Tasks / Subtasks

### Task 1: Strengthen assertFailFastBehavior contract
- [x] 1.1 Add no-partial-return assertion: wrap loader call in try/catch, assert result is never set when loader throws
- [x] 1.2 (Optional) Extract `assertFailFastBehavior` to `seed-assert-helpers.ts` if file size warrants it — **Skipped: 234 lines, no extraction warranted**
- [x] 1.3 Run `npm run test:quick` — all tests pass (1083 tests, 71 files, 0 failures)

## Dev Notes

- Finding #3 (code review td-3-3f): `seed-helpers.ts` imports `node:fs` even for tests that don't use `assertFailFastBehavior` — splitting would isolate this, but current file size (~220 lines) is within acceptable range
- Finding #5 (code review td-3-3f): `expect(() => loader(...)).toThrow()` covers partial-return implicitly, but making the no-partial-return contract explicit would make test intent clearer
- Source story: [td-3-3f](./td-3-3f-seed-test-helper-dedup.md)
- Review findings: #3, #5

## Deferred From

| Source Story | Review Finding | Description |
|---|---|---|
| td-3-3f | #3 | seed-helpers.ts imports node:fs even for non-fs helper tests — consider extracting assertFailFastBehavior |
| td-3-3f | #5 | assertFailFastBehavior has no explicit no-partial-return assertion — implicit via toThrow |
