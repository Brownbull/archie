# Story: TD-1-5a Inspector Polish & Quality

## Status: done
## Epic: Epic 1 — Architecture Canvas & Component Library
## Source: Code review of Story 1-5 (2026-02-13)

## Overview

Tech debt items deferred from Story 1-5 code review. Four COMPLEX findings grouped by theme: E2E test improvements, metric display, store optimization, and test maintainability.

## Items

### 1. Replace E2E waitForTimeout with CSS-Assertion Waits (Finding #6 — MEDIUM)

**Problem:** `inspector-and-config.spec.ts` uses `waitForTimeout(300)` for CSS transition settling. Per testing conventions, CSS assertion-based waits are preferred over timeout-based waits.

**Fix:** Replace `waitForTimeout(300)` with assertion-based waits that check the final style state (e.g., `expect(inspector).toHaveCSS('width', '...')`), or use `element.waitFor()` with a visible/hidden state check.

**Files:** `tests/e2e/inspector-and-config.spec.ts`

### 2. Metric Display Names Instead of IDs (Finding #10 — LOW)

**Problem:** `MetricBar` renders `metric.id` (kebab-case like `query-performance`) as the user-facing label. This is a raw data identifier, not a human-readable name.

**Fix:** Add a `name` or `displayName` field to the `MetricValue` type and component library data. MetricBar should render the display name, falling back to id if absent.

**Files:** `src/types/index.ts`, `src/components/inspector/MetricBar.tsx`, component library data files

### 3. Zustand Selector Optimization for Inspector (Finding #12 — LOW)

**Problem:** `InspectorPanel` subscribes to the entire `nodes` array via `useArchitectureStore((s) => s.nodes)`, which re-renders on any node change (position, selection, etc.) rather than only when the selected node changes.

**Fix:** Create a derived selector that returns only the selected node, e.g., `useArchitectureStore((s) => s.nodes.find((n) => n.id === selectedNodeId))`. This reduces unnecessary re-renders when other nodes move.

**Files:** `src/components/inspector/InspectorPanel.tsx`

### 4. Test DRY Refactor for Inspector Tests (Finding #14 — LOW)

**Problem:** `ComponentDetail.test.tsx` and `MetricCard.test.tsx` repeat the same render call with identical props across most tests. This makes tests verbose and harder to maintain.

**Fix:** Extract shared render helpers (e.g., `renderComponentDetail(overrides?)`) to reduce duplication while keeping tests readable.

**Files:** `tests/unit/components/inspector/ComponentDetail.test.tsx`, `tests/unit/components/inspector/MetricCard.test.tsx`

## Acceptance Criteria

- AC-1: E2E inspector tests use assertion-based waits (no `waitForTimeout` for CSS transitions)
- AC-2: MetricBar displays human-readable metric names (not kebab-case IDs)
- AC-3: InspectorPanel only re-renders when its selected node changes (verified by render count or selector test)
- AC-4: Inspector test files use shared render helpers with < 50% duplication of render calls

## Estimation

- Size: Small (4 focused items, all in inspector scope)
- Risk: Low (no architectural changes, all quality improvements)

## Senior Developer Review (ECC)

**Date:** 2026-02-13
**Classification:** STANDARD
**Agents:** code-reviewer, security-reviewer
**Score:** 9/10 — APPROVED

### Findings

| # | Sev | Finding | Effort | Resolution |
|---|-----|---------|--------|------------|
| 1 | LOW | Zustand selector may benefit from shallow equality [InspectorPanel.tsx:14] | COMPLEX | Deferred → td-1-5b |
| 2 | LOW | MetricCard test name misleading post-AC-2 [MetricCard.test.tsx:50] | QUICK | Fixed |
| 3 | LOW | MetricBar tests lack shared render helper [MetricBar.test.tsx] | COMPLEX | Deferred → td-1-5b |

### Triage: Quick + Defer
- **Fixed:** 1 quick fix (Finding #2: renamed test)
- **Deferred:** 2 complex items → `td-1-5b-selector-and-test-polish`

### AC Validation
- AC-1: PASS — All `waitForTimeout` replaced with assertion-based CSS waits
- AC-2: PASS — `metric.name ?? metric.id` fallback; `name` field in schema + YAML schema
- AC-3: PASS — Derived selector `s.nodes.find(n => n.id === selectedNodeId)`
- AC-4: PASS — `renderDefault(overrides?)` helpers in ComponentDetail + MetricCard tests

### Security: APPROVED 9.5/10
- No vulnerabilities found
- No secrets detected
- All user content rendered via JSX (auto-escaped)
- Zod schemas enforce input validation
