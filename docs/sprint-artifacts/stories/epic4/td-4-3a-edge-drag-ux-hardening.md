# Tech Debt Story TD-4-3a: Edge Drag UX Hardening

Status: review

> **Source:** ECC Code Review (2026-02-24) on story 4-3-connection-inspection-system
> **Priority:** MEDIUM | **Estimated Effort:** Small (3-5 tasks)

## Story
As a **developer**, I want **the edge label drag interaction to be throttled and bounded**, so that **dragging doesn't cause excessive store updates per frame and labels can't be dragged infinitely off-screen**.

## Acceptance Criteria

**AC-1 (Throttle drag updates):**
Given I am dragging a protocol label
When I move the pointer rapidly
Then `updateEdgeLabelOffset` is NOT called on every `pointermove` pixel, but is throttled (via `requestAnimationFrame` or local state batching with commit on `pointerup`)
And the label visually tracks my pointer smoothly

**AC-2 (Bounds clamping):**
Given I am dragging a protocol label
When I drag it far from its origin
Then the offset is clamped to a reasonable range (e.g., +/-500px)
And the label does not disappear off-screen

**AC-3 (Drag interaction test coverage):**
Given the existing ArchieEdge.test.tsx
When I review test coverage for drag behavior
Then there are unit tests covering the pointerdown -> pointermove -> pointerup sequence
And the tests assert `updateEdgeLabelOffset` is called with the correct delta
And the tests assert `releasePointerCapture` is invoked on pointerup/pointercancel

## Tasks / Subtasks
- [x] 1.1 Refactor `handlePointerMove` to batch offset into local state (not store) during drag
- [x] 1.2 Commit final offset to store on `endDrag` only (single `updateEdgeLabelOffset` call per drag)
- [x] 1.3 Add offset clamping constant to `constants.ts` (e.g., `MAX_LABEL_OFFSET = 500`)
- [x] 1.4 Apply clamp in `endDrag` before committing to store
- [x] 2.1 Add drag interaction tests to `ArchieEdge.test.tsx`: pointerdown → pointermove → pointerup sequence
- [x] 2.2 Assert `updateEdgeLabelOffset` called with correct delta
- [x] 2.3 Run `npm run test:quick` — all tests pass

## Dev Notes
- Source story: [4-3-connection-inspection-system](./story-4-3.md)
- Review findings: #1 (throttle), #7 (test coverage), #10 (bounds clamping)
- Files affected: `src/components/canvas/ArchieEdge.tsx`, `src/lib/constants.ts`, `tests/unit/components/canvas/ArchieEdge.test.tsx`
