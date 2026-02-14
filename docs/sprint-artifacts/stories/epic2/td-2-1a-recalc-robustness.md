# Story: TD-2-1a Recalculation Robustness

## Status: ready-for-dev
## Epic: Epic 2 — Trade-off Intelligence & Visualization
## Source: Code review of Story 2-1 (2026-02-14)

## Overview

Tech debt from Story 2-1 code review. Addresses two robustness improvements to the recalculation engine:

1. **Error path tests for componentLibrary exceptions during propagation** — Current tests cover graceful handling when `componentLibrary.getComponent()` returns `undefined`, but no tests verify behavior when the library throws an exception mid-propagation (e.g., corrupted cache). This is a test coverage gap.

2. **Recalculator nested loop optimization** — `recalculateNode` uses O(n*m) nested loop through connected nodes and interaction rules. While acceptable at MVP scale (~20 nodes), this should be profiled and optimized if graph sizes grow. Pre-computing a rule lookup cache keyed by category-pair would reduce to O(n) per node.

## Functional Acceptance Criteria

**AC-1: Error Path Test Coverage**
**Given** a componentLibrary that throws during `getComponent()` for some nodes
**When** a recalculation propagation traverses through the throwing node
**Then** the pipeline either handles the error gracefully (skip node, log warning) or surfaces a clear error to the caller
**And** a test validates this behavior

**AC-2: Performance-Conscious Rule Lookup**
**Given** the recalculator processes a node with many connections
**When** the same category pair appears multiple times (e.g., 3 caching nodes connected)
**Then** the interaction rule lookup is performed once per unique category pair, not per connection
**And** the optimization is covered by an existing or new test that verifies identical results

## Tasks / Subtasks

### Task 1: Error Path Tests
- [ ] 1.1 Add test in `recalculationService.test.ts`: mock `componentLibrary.getComponent()` to throw for one specific component ID
- [ ] 1.2 Verify the service handles the error (either try/catch with empty metrics or letting it propagate)
- [ ] 1.3 If the current code does NOT handle exceptions, add a try/catch in `getEffectiveMetrics()` that logs and returns `[]`
- [ ] 1.4 Add integration test: 3-node chain where middle node's component throws — verify outer nodes still recalculate

### Task 2: Rule Lookup Optimization
- [ ] 2.1 Profile `recalculateNode` with a 20-node graph (add benchmark test)
- [ ] 2.2 Introduce `categoryPairCache` Map inside `recalculateNode` to memoize rule lookups per category pair
- [ ] 2.3 Verify existing tests still pass (determinism not affected)
- [ ] 2.4 Add a test with 5+ connections of same category to verify cache works

## Dev Notes

- Task 1 is higher priority than Task 2 (error resilience > performance optimization)
- Task 2 is premature optimization at MVP scale but worth tracking for when graph sizes grow
- Both tasks are localized changes — no cross-file impact expected

## ECC Analysis Summary
- Risk Level: LOW
- Complexity: Low-Medium
- Sizing: SMALL (2 tasks, ~8 subtasks, 3 files)
