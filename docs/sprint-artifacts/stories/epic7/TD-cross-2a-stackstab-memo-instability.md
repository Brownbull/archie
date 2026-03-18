# Tech Debt Story TD-cross-2a: StacksTab useMemo Reference Instability

Status: done

> **Source:** ECC Code Review (2026-03-17) on story TD-cross-2
> **Priority:** MEDIUM | **Estimated Effort:** Small (1 file, ~10 lines)
> **Stage:** MVP

## Story
As a **developer**, I want **the `useMemo` dependency in StacksTabInner to use a stable reference**, so that **the resolved stack map doesn't recompute on every render when stacks haven't changed**.

## Context

The TD-cross-2 hook fix moved `const stacks = isReady ? componentLibrary.getStacks() : []` before the `useMemo` call to comply with rules-of-hooks. However, `getStacks()` returns a new array reference on each call, and the `[]` fallback is also a new reference each render. Since `useMemo` depends on `[stacks]`, it never stabilizes — the memo recomputes every render.

## Acceptance Criteria

- [x] AC-1: `resolvedMap` useMemo in StacksTabInner does not recompute when stacks haven't changed
- [x] AC-2: No rules-of-hooks violation (hook must still be called unconditionally)
- [x] AC-3: Existing StacksTab tests pass

## Tasks / Subtasks

- [x] **Task 1:** Stabilize useMemo dependency
  - [x] 1a. Option A: Depend on `isReady` instead of `stacks` — call `getStacks()` inside the memo callback
  - [ ] ~~1b. Option B: Memoize `getStacks()` in componentLibrary to return a stable reference~~ (not needed, Option A suffices)
  - [x] 1c. Pick simplest option that satisfies AC-1 and AC-2 → **Option A chosen**
  - [x] 1d. Run `npm run test:quick` to verify

## Dev Notes
- Source story: [TD-cross-2](./TD-cross-2-aislop-baseline-cleanup.md)
- Review findings: #1 (HIGH severity, HIGH certainty)
- Files affected: `src/components/toolbox/StacksTab.tsx`
- The performance impact is bounded (stacks list is small in v1) but worth fixing for correctness

## Senior Developer Review (ECC)

- **Date:** 2026-03-17
- **Classification:** TRIVIAL
- **Agents:** code-reviewer (sonnet)
- **Outcome:** APPROVE 9/10 — 3 quick fixes applied (lint suppress, assertion idiom, shared mock map), 0 TD stories
- **Cost:** $4.98

<!-- CITED: docs/sprint-artifacts/stories/epic7/TD-cross-2-aislop-baseline-cleanup.md -->
<!-- CITED: none -->
