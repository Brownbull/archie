# Story: TD-2-3a AggregateScore Component Tests

## Status: ready-for-dev
## Epic: Epic 2 — Trade-off Intelligence & Visualization
## Parent Story: 2-3 (Scoring Dashboard)

## Overview

Add a dedicated unit test file for the `AggregateScore` component. The component contains `bgToTextColor()` utility logic and score formatting that are currently untested. This was identified during the Story 2-3 code review as a coverage gap.

## Origin

- **Source:** ECC Code Review of Story 2-3 (Finding #4)
- **Severity:** LOW
- **Reason deferred:** COMPLEX — requires new test file creation

## Functional Acceptance Criteria

**AC-1:** Unit test file exists at `tests/unit/components/dashboard/AggregateScore.test.tsx`

**AC-2:** Tests cover `bgToTextColor()` mapping:
- `bg-green-500` → `text-green-500`
- `bg-yellow-500` → `text-yellow-500`
- `bg-red-500` → `text-red-500`
- Unknown class → `text-text-primary` (fallback)

**AC-3:** Tests cover score display format:
- Score renders with `.toFixed(1)` format (e.g., "8.0", "5.3")
- Score of 0 renders as "0.0"

**AC-4:** Tests cover ARIA attributes:
- `role="meter"` present
- `aria-valuenow` matches score prop
- `aria-valuemin=0`, `aria-valuemax=10`

**AC-5:** Tests cover "Overall" label text

## File Specification

| File | Exact Path | Status |
|------|-----------|--------|
| AggregateScore.test | `tests/unit/components/dashboard/AggregateScore.test.tsx` | NEW |

## Tasks / Subtasks

### Task 1: Create AggregateScore Test File
- [ ] 1.1 Create test file with Vitest + RTL imports
- [ ] 1.2 Test bgToTextColor mapping for all 3 known colors + fallback
- [ ] 1.3 Test score display format with `.toFixed(1)` (whole numbers, decimals, zero)
- [ ] 1.4 Test ARIA attributes (role=meter, valuenow, valuemin, valuemax)
- [ ] 1.5 Test "Overall" label text present
- [ ] 1.6 Test data-testid="aggregate-score" present
- [ ] 1.7 Run tests: `npx vitest run tests/unit/components/dashboard/AggregateScore.test.tsx`

## ECC Analysis Summary
- Risk Level: LOW
- Complexity: Simple
- Sizing: SMALL (1 task, 7 subtasks, 1 file)
