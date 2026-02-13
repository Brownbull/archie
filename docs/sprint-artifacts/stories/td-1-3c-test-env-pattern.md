# Story: TD-1-3c Test Environment Variable Pattern

## Status: ready-for-dev
## Epic: Epic 1 — Architecture Canvas & Component Library
## Source: Code review of Story TD-1-3b (2026-02-13)

## Overview

Replace direct `import.meta.env.DEV` mutation in CanvasErrorBoundary tests with a more robust pattern. Vite treats `import.meta.env.DEV` as a compile-time constant; mutating it at runtime is fragile and may break across test environments.

## Items

### 1. Replace env mutation with robust pattern (Findings #1-#2 from TD-1-3b review — MEDIUM/LOW)

**Problem:** The production mode test in `CanvasErrorBoundary.test.tsx` directly mutates `import.meta.env.DEV` with a `false as unknown as boolean` cast. While this works in current Vitest, it relies on Vite's compile-time constant being mutable at runtime — which is not guaranteed.

**Fix:** Replace with `vi.stubEnv('DEV', false)` or a build-time test configuration approach. Vitest's `vi.stubEnv` is the idiomatic way to override env variables in tests.

**Files:** `tests/unit/components/canvas/CanvasErrorBoundary.test.tsx`

## Acceptance Criteria

- AC-1: Production mode test uses `vi.stubEnv` or equivalent instead of direct `import.meta.env.DEV` mutation
- AC-2: No `as unknown as boolean` cast needed for env variable override
- AC-3: All existing CanvasErrorBoundary tests continue to pass

## Priority

LOW — Current pattern works; this is a robustness improvement for test infrastructure.
