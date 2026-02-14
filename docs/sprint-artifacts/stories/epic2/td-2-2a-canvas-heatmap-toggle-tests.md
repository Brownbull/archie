# Story: TD-2-2a Canvas Heatmap Toggle Tests

## Status: ready-for-dev
## Epic: Epic 2 — Trade-off Intelligence & Visualization
## Source: Code Review of Story 2-2 (Finding #4)

## Overview

Add unit tests for the H key heatmap toggle handler in CanvasView.tsx. Story 2-2 code review identified AC-3 (Heatmap Toggle) has no direct test coverage for the keyboard handler in CanvasView. The handler is implemented and working, but untested.

## Acceptance Criteria

**AC-1:** Test that pressing H key calls `toggleHeatmap()` when canvas container is focused
**AC-2:** Test that H key does NOT fire when modifier keys are held (Ctrl, Alt, Meta)
**AC-3:** Test that H key does NOT fire when typing in an INPUT or TEXTAREA element
**AC-4:** Test that Escape key still clears selection (regression guard)

## Tasks / Subtasks

### Task 1: CanvasView Keyboard Tests
- [ ] 1.1 Create `tests/unit/components/canvas/CanvasView.test.tsx` with appropriate mocks (ReactFlow, stores, etc.)
- [ ] 1.2 Test: H key triggers toggleHeatmap on canvas container
- [ ] 1.3 Test: H key ignored with Ctrl/Alt/Meta modifiers
- [ ] 1.4 Test: H key ignored when target is INPUT element
- [ ] 1.5 Test: Escape key calls clearSelection and deselectAll

## File Specification

| File | Path | Status |
|------|------|--------|
| CanvasView.test | `tests/unit/components/canvas/CanvasView.test.tsx` | NEW |

## Dev Notes

- CanvasView uses `containerRef.current.addEventListener("keydown", ...)` — tests need to simulate keydown events on the container element
- Mock ReactFlow, ReactFlowProvider, useReactFlow, and both Zustand stores
- The input guard was added during Story 2-2 code review (checks `tagName === "INPUT" || "TEXTAREA" || isContentEditable`)

## ECC Analysis Summary
- Risk Level: LOW
- Complexity: Simple
- Sizing: SMALL (1 task, 5 subtasks, 1 file)
