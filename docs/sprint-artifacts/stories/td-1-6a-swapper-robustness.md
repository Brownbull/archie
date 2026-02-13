# Story: TD-1-6a Component Swapper Robustness

## Status: ready-for-dev
## Epic: Epic 1 — Architecture Canvas & Component Library
## Source: Code review of Story 1-6 (2026-02-13)

## Overview

Tech debt from Story 1-6 code review. Addresses two design robustness issues in the component swapping feature:

1. **ComponentSwapper uses `useLibrary()` hook directly** — borderline vs the "controlled presentational component" pattern (AC-ARCH-PATTERN-1). While the hook reads a service (not a Zustand store), a pure presentational approach would receive `alternatives` as a prop from the parent container.

2. **Empty `configVariants` edge case** — `swapNodeComponent` allows swapping to a component with empty `configVariants`, setting `activeConfigVariantId` to `""`. This creates a node in an arguably invalid state where downstream code (`ComponentDetail`) will fail to find a variant, rendering an empty metrics view.

## Functional Acceptance Criteria

**AC-1: Pure Presentational ComponentSwapper**
**Given** the ComponentSwapper component
**When** it renders
**Then** it receives `alternatives` list as a prop from the parent (ComponentDetail)
**And** it does NOT call `useLibrary()` or any hooks that read external data sources

**AC-2: Empty ConfigVariants Guard**
**Given** a user swaps to a component with zero `configVariants`
**When** the swap executes in `swapNodeComponent`
**Then** the store either rejects the swap (no-op with console warning) OR assigns a sentinel value that downstream components handle gracefully

## Tasks / Subtasks

### Task 1: Lift `useLibrary()` Call to Parent
- [ ] 1.1 Move `getComponentsByCategory()` call from `ComponentSwapper` to `ComponentDetail`
- [ ] 1.2 Pass `alternatives` array as a new prop to `ComponentSwapper`
- [ ] 1.3 Remove `useLibrary` import from `ComponentSwapper`
- [ ] 1.4 Update `ComponentSwapper` unit tests to pass `alternatives` directly
- [ ] 1.5 Update `ComponentDetail` unit tests to verify it passes alternatives

### Task 2: Guard Against Empty ConfigVariants
- [ ] 2.1 Add guard in `swapNodeComponent`: if `newComponent.configVariants.length === 0`, early-return (no-op) with `console.warn`
- [ ] 2.2 Add unit test: swap to component with empty `configVariants` is a no-op
- [ ] 2.3 Verify existing unit test for empty `configVariants` is updated

## Dev Notes

- Low risk, localized changes (2 source files + 2 test files)
- No E2E impact expected (E2E uses real component library data which always has variants)
- Sizing: SMALL (2 tasks, 8 subtasks, 4 files)

## ECC Analysis Summary
- Risk Level: LOW
- Complexity: Low
- Sizing: SMALL (2 tasks, 8 subtasks, 4 files)
- Source: Code review finding #1 + #2 from Story 1-6
