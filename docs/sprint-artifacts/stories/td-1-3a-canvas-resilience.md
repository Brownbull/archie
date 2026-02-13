# Story: TD-1-3a Canvas Resilience & Store Improvements

## Status: done
## Epic: Epic 1 — Architecture Canvas & Component Library
## Source: Code review of Story 1-3 (2026-02-12)

## Overview

Tech debt items deferred from Story 1-3 code review. Three COMPLEX findings grouped by theme: canvas error resilience, client-side DoS prevention, and store coupling.

## Items

### 1. Error Boundary for React Flow (Finding #4 — MEDIUM)

**Problem:** React Flow can throw errors during drag/drop operations. No error boundary wraps the canvas, so canvas errors could crash the entire app.

**Fix:** Wrap `<CanvasView />` in `AppLayout.tsx` with an ErrorBoundary component providing a recovery UI.

**Files:** `src/components/layout/AppLayout.tsx`, potentially a new `src/components/canvas/CanvasErrorBoundary.tsx`

### 2. Rate Limiting on Node Creation (Finding #9 — LOW)

**Problem:** `architectureStore.addNode` has no throttle. Rapid drag-and-drop could degrade client performance via excessive node creation.

**Fix:** Add client-side throttle (e.g., max 10 nodes/second) or a max-nodes guard (e.g., 50 nodes for MVP).

**Files:** `src/stores/architectureStore.ts`

### 3. Cross-Store Coupling (Finding #10 — LOW)

**Problem:** `architectureStore.removeNode` directly reads/writes `uiStore` state (lines 87-88). This creates tight coupling between stores.

**Fix:** Consider event-based or callback-based decoupling pattern. Monitor for circular dependencies as more stores interact in future stories.

**Files:** `src/stores/architectureStore.ts`, `src/stores/uiStore.ts`

## Acceptance Criteria

- AC-1: Canvas errors do not crash the app — an error boundary catches and shows recovery UI
- AC-2: Node creation has a reasonable upper bound or throttle
- AC-3: Cross-store coupling is documented or refactored (at minimum, add a code comment explaining the pattern)

## Priority

LOW — These are defense-in-depth improvements, not functional bugs. Can be addressed before or during Story 1-4.

## Senior Developer Review (ECC)

**Date:** 2026-02-13
**Classification:** STANDARD
**Agents:** code-reviewer, security-reviewer
**Overall Score:** 8.5/10
**Recommendation:** APPROVED

### Quick Fixes Applied
- **#2 (MEDIUM):** Added toast notification when MAX_CANVAS_NODES limit reached
- **#3 (LOW):** Added ARIA `role="alert"` to error fallback UI
- **#4 (LOW):** Extracted console.error mock to beforeEach in CanvasErrorBoundary tests

### Tech Debt Created
- **TD-1-3b** (ready-for-dev): Production error logging — replace `console.error` in `componentDidCatch` with conditional logging
