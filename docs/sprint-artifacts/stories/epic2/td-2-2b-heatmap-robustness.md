# Story: TD-2-2b Heatmap Robustness

## Status: done
## Epic: Epic 2 — Trade-off Intelligence & Visualization
## Source: Code Review of Story 2-2 (Findings #7, #8)

## Overview

Address two robustness improvements identified during Story 2-2 code review:

1. **setTimeout cleanup** (Finding #7, Security): The ripple animation in `triggerRecalculation` schedules multiple `setTimeout` calls without tracking timeout IDs. Rapid config changes could accumulate stale timeouts. Add cleanup mechanism.

2. **Accessibility indicator** (Finding #8, Architecture): Heatmap status is communicated through color-only glow (box-shadow). While metric values are available in the inspector panel (satisfying AC-ARCH-NO-4), the node itself has no non-color indicator. Consider adding an aria-label or small icon overlay for screen readers and color-blind users.

## Acceptance Criteria

**AC-1: setTimeout Cleanup**
**Given** a user rapidly changes config variants on multiple nodes
**When** each change triggers `triggerRecalculation`
**Then** pending ripple timeouts from the previous recalculation are cancelled before new ones start

**AC-2: Heatmap Accessibility**
**Given** a screen reader user or color-blind user views the canvas
**When** the heatmap is enabled
**Then** each node has an `aria-label` attribute indicating its heatmap status (e.g., "PostgreSQL — warning")

## Tasks / Subtasks

### Task 1: setTimeout Cleanup
- [x] 1.1 Track ripple timeout IDs in architectureStore (array or Set)
- [x] 1.2 Clear pending timeouts at the start of `triggerRecalculation` before scheduling new ones
- [x] 1.3 Clear pending timeouts on node removal
- [x] 1.4 Write tests: rapid recalculation cancels previous ripple, no stale updates after cancellation

### Task 2: Accessibility Indicator
- [x] 2.1 Add `aria-label` to ArchieNode container that includes heatmap status when enabled
- [x] 2.2 Write test: aria-label includes status when heatmap enabled, omits status when disabled
- [x] 2.3 Verify screen reader compatibility (manual testing)

## File Specification

| File | Path | Status |
|------|------|--------|
| architectureStore | `src/stores/architectureStore.ts` | MODIFY |
| ArchieNode | `src/components/canvas/ArchieNode.tsx` | MODIFY |
| architectureStore-heatmap.test | `tests/unit/stores/architectureStore-heatmap.test.ts` | MODIFY |
| ArchieNode.test | `tests/unit/components/canvas/ArchieNode.test.tsx` | MODIFY |

## Dev Notes

- The `recalcGeneration` stale check already prevents stale state updates, but doesn't cancel the setTimeout execution itself. The new cleanup cancels the timer entirely.
- For accessibility, `aria-label` on the node container is the simplest approach. Format: `"{componentName} — {heatmapStatus}"` when enabled, just `"{componentName}"` when disabled.

## ECC Analysis Summary
- Risk Level: LOW
- Complexity: Simple
- Sizing: SMALL (2 tasks, 7 subtasks, 4 files)

## Senior Developer Review (ECC)

**Date:** 2026-02-15 | **Classification:** SIMPLE | **Agents:** code-reviewer, tdd-guide

| Agent | Score | Status |
|-------|-------|--------|
| Code Quality | 7/10 | CHANGES REQUESTED |
| Testing | 5/10 | CHANGES REQUESTED |
| **OVERALL** | **6/10** | **APPROVED w/ TD** |

**Quick Fixes Applied:**
- Extracted `isStale()` helper in `triggerRecalculation` to reduce generation-check repetition
- Expanded module-level `pendingRippleTimeouts` comment to explain why not in store state

**Tech Debt Created:**
- **TD-2-2c** (timeout-test-coverage): AC-1 setTimeout cleanup has zero test coverage — needs `vi.useFakeTimers()` suite for rapid recalc cancellation, stale generation guard, and node deletion during propagation
