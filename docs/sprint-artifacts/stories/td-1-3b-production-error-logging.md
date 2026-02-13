# Story: TD-1-3b Production Error Logging

## Status: ready-for-dev
## Epic: Epic 1 — Architecture Canvas & Component Library
## Source: Code review of Story TD-1-3a (2026-02-13)

## Overview

Replace `console.error` in `CanvasErrorBoundary.componentDidCatch` with conditional production-safe logging. Stack traces in production builds can expose file paths, component names, and internal structure.

## Items

### 1. Conditional Error Logging (Finding #1 from TD-1-3a review — MEDIUM)

**Problem:** `componentDidCatch` unconditionally logs error + errorInfo via `console.error`. In production builds, this exposes stack traces including file paths and component hierarchy. While client-side only, it aids reconnaissance.

**Fix:** Add conditional logging — `console.error` in development, sanitized/silent in production. When an error monitoring service (Sentry, LogRocket) is added in later MVPs, integrate here.

**Files:** `src/components/canvas/CanvasErrorBoundary.tsx`

## Acceptance Criteria

- AC-1: `console.error` in `componentDidCatch` is conditional on `import.meta.env.DEV`
- AC-2: Production builds do not log raw stack traces to the console
- AC-3: Existing CanvasErrorBoundary tests continue to pass

## Priority

LOW — Information disclosure risk is minimal for a client-side-only app with no auth in early MVPs. Address when error monitoring is set up.
