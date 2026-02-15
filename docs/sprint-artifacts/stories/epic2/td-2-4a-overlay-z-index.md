# Story: TD-2-4a Overlay Z-Index Coordination

## Status: done
## Epic: Epic 2 — Trade-off Intelligence & Visualization
## Source: Code review of Story 2-4 (Finding #4)

## Overview

The TierBadge detail panel uses `z-50` for its absolute-positioned overlay. As more overlay components are added (tooltips, popovers, modals), z-index values need coordination to prevent stacking conflicts. This TD establishes a z-index scale and applies it to existing overlays.

## Functional Acceptance Criteria

**AC-1:** Define a z-index scale constant in `src/lib/constants.ts` (e.g., `Z_DROPDOWN: 40`, `Z_OVERLAY: 50`, `Z_MODAL: 60`, `Z_TOAST: 70`)
**AC-2:** Replace hardcoded `z-50` in TierBadge detail panel with the appropriate constant class
**AC-3:** Audit all existing `z-*` classes in `src/components/` and align to the scale

## Tasks / Subtasks

### Task 1: Z-Index Scale
- [x] 1.1 Add z-index scale constants to `src/lib/constants.ts`
- [x] 1.2 Audit existing z-index usage across components
- [x] 1.3 Replace hardcoded z-index classes with scale-aligned values
- [x] 1.4 Verify no visual stacking regressions

## File Specification

| File | Path | Status |
|------|------|--------|
| constants | `src/lib/constants.ts` | MODIFY |
| TierBadge | `src/components/dashboard/TierBadge.tsx` | MODIFY |

## ECC Analysis Summary
- Risk Level: LOW
- Complexity: Low
- Sizing: TRIVIAL (1 task, 4 subtasks, 2+ files)

## Senior Developer Review (ECC)
- **Date:** 2026-02-15
- **Classification:** TRIVIAL (1 agent: code-reviewer)
- **Score:** 8/10 (APPROVED)
- **AC-1:** PASS — Z_INDEX scale with 5 levels in constants.ts
- **AC-2:** PASS — TierBadge uses Z_INDEX.OVERLAY
- **AC-3:** PASS — Audit complete, shadcn ui/ z-50 documented in scale comments, EmptyCanvasState uses Z_INDEX.CANVAS_OVERLAY
- **Findings:** 0 blocking. 1 MEDIUM (OVERLAY==MODAL both z-50) accepted as intentional — shadcn defaults alignment.
- **TD stories created:** 0
