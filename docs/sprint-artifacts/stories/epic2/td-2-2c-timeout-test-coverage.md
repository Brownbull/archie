# Story: TD-2-2c Timeout Test Coverage

## Status: done
## Epic: Epic 2 — Trade-off Intelligence & Visualization
## Source: Code Review of TD-2-2b (Findings #1, #2)

## Overview

TD-2-2b implemented setTimeout cleanup in `triggerRecalculation` (module-level `pendingRippleTimeouts` Set + `clearPendingRippleTimeouts()` function) but shipped without tests for the cleanup mechanism itself. The accessibility aria-label (AC-2) is fully tested, but AC-1's core behavior — rapid recalculation cancelling previous timeouts — has zero test coverage.

This TD adds the missing test suite using `vi.useFakeTimers()` to verify timeout cancellation, stale generation guards, and node deletion during propagation.

## Acceptance Criteria

**AC-1: Rapid Recalculation Cancellation Test**
**Given** a node triggers `triggerRecalculation` with pending ripple timeouts
**When** a second `triggerRecalculation` fires before the first completes
**Then** the first recalculation's pending timeouts are cancelled (clearTimeout called)

**AC-2: Stale Generation Guard Test**
**Given** a ripple timeout fires after a newer recalculation has started
**When** the timeout callback executes
**Then** it returns early without updating state (generation mismatch)

**AC-3: Node Deletion During Propagation Test**
**Given** a ripple timeout is pending for a node
**When** that node is removed before the timeout fires
**Then** the timeout callback skips the update (node existence check)

## Tasks / Subtasks

### Task 1: setTimeout Cleanup Test Suite
- [x] 1.1 Add `vi.useFakeTimers()` setup in `architectureStore-heatmap.test.ts` (new describe block)
- [x] 1.2 Test: `clearPendingRippleTimeouts` is called at start of triggerRecalculation (verify via spy or timer cancellation)
- [x] 1.3 Test: Rapid recalculation cancels previous pending ripple timeouts
- [x] 1.4 Test: Stale generation check prevents old ripple from executing
- [x] 1.5 Test: Node deletion during propagation skips ripple callback
- [x] 1.6 Restore real timers in afterEach to prevent test contamination

## File Specification

| File | Path | Status |
|------|------|--------|
| architectureStore-heatmap.test | `tests/unit/stores/architectureStore-heatmap.test.ts` | MODIFY |

## Dev Notes

- Use `vi.useFakeTimers()` and `vi.advanceTimersByTime()` to control setTimeout execution
- The module-level `pendingRippleTimeouts` Set is not directly accessible from tests — verify behavior through state assertions (e.g., rippleActiveNodeIds should NOT update after cancellation)
- The `recalcGeneration` counter is the stale guard — increment it between recalculations to simulate rapid changes
- Keep the fake timers in a separate `describe` block to avoid contaminating existing heatmap tests

## ECC Analysis Summary
- Risk Level: LOW
- Complexity: Simple
- Sizing: SMALL (1 task, 6 subtasks, 1 file)

## Senior Developer Review (ECC)
- **Date:** 2026-02-15
- **Classification:** SIMPLE
- **Agents:** code-reviewer, tdd-guide
- **Score:** 9/10 — APPROVED
- **Findings:** 2 LOW (both fixed in-session)
  1. Replaced bare `toHaveBeenCalled()` with specific `toBeGreaterThan(0)` assertion
  2. Replaced magic number `999` with relative `currentGen + 100` for stale generation test
- **TD Stories Created:** 0
- **Status:** done
