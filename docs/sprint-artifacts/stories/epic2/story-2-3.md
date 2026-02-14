# Story: 2-3 Scoring Dashboard

## Status: done
## Epic: Epic 2 — Trade-off Intelligence & Visualization

## Overview

As a user, I want a multi-track scoring dashboard showing how my architecture rates across metric categories, so that I can evaluate my architecture's overall health at a glance.

This story builds the DashboardPanel component (bottom 100px zone, replacing the placeholder text), category bar visualizations for each metric category that has data, aggregate architecture-level scores, and real-time animated updates when metrics change. It integrates with the recalculation pipeline to display computed scores.

The dashboard renders only categories that have data in the current architecture. With current seed data, 4 of 7 categories appear (performance, scalability, reliability, operational-complexity). When seed data is enriched with security, cost-efficiency, and developer-experience metrics, those categories appear automatically.

## Functional Acceptance Criteria

**AC-1: Category Bar Display**
**Given** components exist on the canvas with calculated metrics
**When** I view the dashboard panel (bottom, 100px)
**Then** I see category bars for each metric category that has data in the current architecture
**And** each bar shows a visual score indicator with the category icon, abbreviated name, and numeric score
**And** categories without data are not displayed

**AC-2: Aggregate Architecture Ratings**
**Given** multiple components are on the canvas
**When** I view the dashboard
**Then** the dashboard shows an aggregate architecture-level score (FR19)
**And** the aggregate is the arithmetic mean of category scores that have data
**And** categories with no data are excluded from the aggregate calculation

**AC-3: Real-Time Dashboard Updates**
**Given** I change a configuration variant or swap a component
**When** metrics recalculate
**Then** the dashboard bars update in real-time to reflect the new scores
**And** bar width and color changes animate smoothly via CSS transitions (UX13)

**AC-4: Empty State**
**Given** no components exist on the canvas
**When** I view the dashboard
**Then** I see the message "Add components to see architecture scores"
**And** no category bars or aggregate score are displayed

## Architectural Acceptance Criteria (MANDATORY)

> These ACs are MANDATORY and will be validated during code review.

### File Location Requirements

- **AC-ARCH-LOC-1:** Dashboard calculator engine at `src/engine/dashboardCalculator.ts`
- **AC-ARCH-LOC-2:** Dashboard panel container at `src/components/dashboard/DashboardPanel.tsx`
- **AC-ARCH-LOC-3:** Single category bar at `src/components/dashboard/CategoryBar.tsx`
- **AC-ARCH-LOC-4:** Aggregate score display at `src/components/dashboard/AggregateScore.tsx`
- **AC-ARCH-LOC-5:** AppLayout modifications at `src/components/layout/AppLayout.tsx`
- **AC-ARCH-LOC-6:** Constants additions at `src/lib/constants.ts`
- **AC-ARCH-LOC-7:** Icon registry additions at `src/lib/categoryIcons.ts`
- **AC-ARCH-LOC-8:** Type re-exports at `src/types/index.ts`
- **AC-ARCH-LOC-9:** Calculator unit tests at `tests/unit/engine/dashboardCalculator.test.ts`
- **AC-ARCH-LOC-10:** DashboardPanel unit tests at `tests/unit/components/dashboard/DashboardPanel.test.tsx`
- **AC-ARCH-LOC-11:** CategoryBar unit tests at `tests/unit/components/dashboard/CategoryBar.test.tsx`

### Pattern Requirements

- **AC-ARCH-PATTERN-1:** `dashboardCalculator.ts` is a pure function module — no imports from `react`, `zustand`, `firebase`, or any service module (AR17). Only imports from `@/lib/constants` (pure data) and `@/engine/recalculator` (type-only imports).
- **AC-ARCH-PATTERN-2:** DashboardPanel reads `computedMetrics` from `architectureStore` via a targeted Zustand selector `(s) => s.computedMetrics` — does NOT subscribe to the entire store (AR15).
- **AC-ARCH-PATTERN-3:** Category score computation happens inside `useMemo` calling a pure helper function — NOT computed inline in the render body or in a `useEffect`.
- **AC-ARCH-PATTERN-4:** CategoryBar uses CSS `transition` property for smooth bar animation on score changes — `transition: width 300ms ease, background-color 300ms ease`.
- **AC-ARCH-PATTERN-5:** Dashboard replaces the placeholder text in AppLayout's footer zone — same `DASHBOARD_HEIGHT` (100px), same `data-testid="dashboard"` on the footer element.
- **AC-ARCH-PATTERN-6:** Category names, icons, and short names come from the `METRIC_CATEGORIES` constant array — NOT hardcoded in UI components.
- **AC-ARCH-PATTERN-7:** Dashboard renders only categories with data (`hasData === true`). Categories with zero metrics across all nodes are not shown.
- **AC-ARCH-PATTERN-8:** `METRIC_CATEGORIES` is an array (preserves display order), separate from `COMPONENT_CATEGORIES` (object mapping component types). The two taxonomies are independent.
- **AC-ARCH-PATTERN-9:** CategoryBar uses `role="meter"` with `aria-valuenow`, `aria-valuemin`, `aria-valuemax` for screen reader accessibility (UX11).
- **AC-ARCH-PATTERN-10:** Score-to-color thresholds in `getScoreColor()` match `MetricBar.tsx`'s `getBarColor()` thresholds exactly: `>=7` green, `>=4` yellow, `<4` red.

### Anti-Pattern Requirements (Must NOT Happen)

- **AC-ARCH-NO-1:** DashboardPanel MUST NOT compute scores in the render body — use `useMemo` wrapping a pure helper function.
- **AC-ARCH-NO-2:** CategoryBar animation MUST NOT use JavaScript-based animation (`setTimeout`, `requestAnimationFrame`, or animation libraries) — use CSS `transition` property only.
- **AC-ARCH-NO-3:** Dashboard MUST NOT display a loading spinner or skeleton when recalculation updates — scores update reactively in-place via Zustand subscription.
- **AC-ARCH-NO-4:** Dashboard MUST NOT hardcode metric category names, short names, or icons — read from `METRIC_CATEGORIES` constant.
- **AC-ARCH-NO-5:** `dashboardCalculator.ts` MUST NOT import from `react`, `zustand`, `firebase`, `@/services/*`, or `@/stores/*` (AR17 engine purity).
- **AC-ARCH-NO-6:** DashboardPanel MUST NOT access `componentLibrary` or any service directly — it reads only from `architectureStore.computedMetrics`.
- **AC-ARCH-NO-7:** `METRIC_CATEGORIES` ids MUST NOT overlap with `COMPONENT_CATEGORIES` keys. They are separate taxonomies.

## File Specification

| File/Component | Exact Path | Pattern | Status |
|----------------|------------|---------|--------|
| dashboardCalculator | `src/engine/dashboardCalculator.ts` | Pure function module (AR17) | NEW |
| DashboardPanel | `src/components/dashboard/DashboardPanel.tsx` | Smart container component (AR20) | NEW |
| CategoryBar | `src/components/dashboard/CategoryBar.tsx` | Presentational component (AR20) | NEW |
| AggregateScore | `src/components/dashboard/AggregateScore.tsx` | Presentational component (AR20) | NEW |
| AppLayout | `src/components/layout/AppLayout.tsx` | Layout component | MODIFY |
| constants | `src/lib/constants.ts` | Constants | MODIFY |
| categoryIcons | `src/lib/categoryIcons.ts` | Icon lookup | MODIFY |
| types/index | `src/types/index.ts` | Type re-exports | MODIFY |
| index.css | `src/index.css` | CSS variables | MODIFY |
| dashboardCalculator.test | `tests/unit/engine/dashboardCalculator.test.ts` | Unit test (AR22) | NEW |
| DashboardPanel.test | `tests/unit/components/dashboard/DashboardPanel.test.tsx` | Unit test (AR22) | NEW |
| CategoryBar.test | `tests/unit/components/dashboard/CategoryBar.test.tsx` | Unit test (AR22) | NEW |

## Tasks / Subtasks

### Task 1: Dashboard Data Layer
- [x] 1.1 Define `METRIC_CATEGORIES` constant array in `constants.ts` with 7 metric categories: `{ id, name, shortName, iconName, color }`. Categories: performance, reliability, scalability, security, operational-complexity, cost-efficiency, developer-experience. Display name for `operational-complexity` is "Operational Simplicity" per PRD.
- [x] 1.2 Export `MetricCategoryId` type from `constants.ts`
- [x] 1.3 Add CSS variables for metric category colors (`--color-metric-performance`, etc.) to `index.css`
- [x] 1.4 Create `src/engine/dashboardCalculator.ts` with `CategoryScore` interface: `{ categoryId, categoryName, score, metricCount, hasData }`
- [x] 1.5 Implement `computeCategoryScores(computedMetrics)` — flat average of all `numericValue` entries per category across all nodes, returns 7 `CategoryScore` entries (one per `METRIC_CATEGORIES` entry, in order). Categories with no data have `score=0, hasData=false`
- [x] 1.6 Implement `computeAggregateScore(categoryScores)` — arithmetic mean of categories with `hasData===true`, returns 0 if no categories have data. Rounded to one decimal place
- [x] 1.7 Implement `getScoreColor(score)` — matches MetricBar.tsx thresholds: `>=7` bg-green-500, `>=4` bg-yellow-500, `<4` bg-red-500
- [x] 1.8 Re-export `CategoryScore` from `types/index.ts`
- [x] 1.9 Write unit tests for `dashboardCalculator.ts`: empty metrics (all zero/hasData=false), single node, multi-node flat average, multiple categories, unknown categories ignored, rounding, threshold boundaries, aggregate with/without data

### Task 2: Dashboard Components
- [x] 2.1 Create `DashboardPanel.tsx`: reads `computedMetrics` from architectureStore via `(s) => s.computedMetrics` selector. Uses `useMemo` to compute `categoryScores` and `aggregateScore`. Filters to categories with `hasData`. Renders empty state when `computedMetrics.size === 0`
- [x] 2.2 Create `CategoryBar.tsx`: presentational component with props `{ categoryId, shortName, iconName, categoryColor, score }`. Shows icon, short name, score, and filled bar. Bar width = `(score / METRIC_MAX_VALUE) * 100%`. Uses `getScoreColor()` for fill color
- [x] 2.3 Create `AggregateScore.tsx`: presentational component with prop `{ score }`. Shows large numeric score and "Overall" label. Score text colored using same green/yellow/red thresholds
- [x] 2.4 Add `data-testid` attributes: `dashboard-panel`, `category-bar-{categoryId}`, `aggregate-score`
- [x] 2.5 Add ARIA attributes: `role="meter"` with `aria-valuenow`, `aria-valuemin=0`, `aria-valuemax=10` on CategoryBar and AggregateScore. `role="region"` with `aria-label` on DashboardPanel container
- [x] 2.6 Add metric category icons to `categoryIcons.ts`: Gauge, ShieldCheck, TrendingUp, Lock, Wrench, DollarSign, Code. Extend the type to include both component and metric icon names
- [x] 2.7 Style dashboard: horizontal layout with AggregateScore on left, vertical divider, CategoryBars flex row. Dark theme consistent with design tokens. CategoryBars use `min-w-[120px]` and `flex-1`

### Task 3: Layout Integration
- [x] 3.1 Modify `AppLayout.tsx`: replace `Dashboard` placeholder text with `<DashboardPanel />`. Keep `data-testid="dashboard"` on the `<footer>`. Remove `flex items-center justify-center text-text-secondary` classes (DashboardPanel manages its own layout)
- [x] 3.2 Add CSS transition to CategoryBar fill: `transition: width 300ms ease, background-color 300ms ease` as inline style on the fill div
- [x] 3.3 Write unit tests for DashboardPanel: renders empty state when no metrics, renders category bars for categories with data, does not render bars for categories without data, renders aggregate score, has correct ARIA attributes, has data-testid
- [x] 3.4 Write unit tests for CategoryBar: renders short name and score, bar width matches score percentage, correct color classes for all threshold ranges, ARIA attributes present with correct values, CSS transition property on fill element, data-testid correct

### Task 4: Verification
- [x] 4.1 Run `npx tsc --noEmit` — no type errors
- [x] 4.2 Run `npm run test:quick` — all tests pass (670/670)
- [x] 4.3 Verify coverage meets thresholds
- [ ] 4.4 Visual check: dashboard bars animate smoothly on config change, empty state shows correctly, aggregate updates reactively

## Dev Notes

### Architecture Guidance

**Dashboard in the Layout:**
```
+--------------------------------------------------------------+
| Toolbar (44px)                                                |
+----------+----------------------------+----------------------+
| Toolbox  |        Canvas              |     Inspector        |
| (260px)  |       (flexible)           |      (300px)         |
|          |                            |                      |
+----------+----------------------------+----------------------+
| Dashboard (100px) — AggregateScore | CategoryBars            |
+--------------------------------------------------------------+
```

**Dashboard Layout (horizontal):**
```
| [Overall] | [Perf ████████░░ 7.2] [Rel ██████░░░░ 5.8] [Scale ████░░░░░░ 4.1] [Ops ███████░░░ 6.5] |
|   5.9     |   (only categories with data are shown)                                                 |
```

**Category Score Computation (flat average):**
```typescript
// src/engine/dashboardCalculator.ts — pure function (AR17)
// For each category: sum all numericValue for matching metrics across ALL nodes / count
// Example: Node A perf metrics [5,7,8], Node B perf metrics [3,6]
// Performance score = (5+7+8+3+6)/5 = 5.8
```

**Score-to-Color (same as MetricBar.tsx):**
```typescript
score >= 7  ->  bg-green-500  (healthy)
score >= 4  ->  bg-yellow-500 (warning)
score < 4   ->  bg-red-500    (critical)
```

**METRIC_CATEGORIES Constant:**
```typescript
// Array of 7 entries, preserves display order
// id values match MetricValue.category in seed data
// DO NOT confuse with COMPONENT_CATEGORIES (different taxonomy)
export const METRIC_CATEGORIES = [
  { id: "performance", name: "Performance", shortName: "Perf", iconName: "Gauge", color: "var(--color-metric-performance)" },
  { id: "reliability", name: "Reliability", shortName: "Rel", iconName: "ShieldCheck", color: "var(--color-metric-reliability)" },
  { id: "scalability", name: "Scalability", shortName: "Scale", iconName: "TrendingUp", color: "var(--color-metric-scalability)" },
  { id: "security", name: "Security", shortName: "Sec", iconName: "Lock", color: "var(--color-metric-security)" },
  { id: "operational-complexity", name: "Operational Simplicity", shortName: "Ops", iconName: "Wrench", color: "var(--color-metric-ops)" },
  { id: "cost-efficiency", name: "Cost Efficiency", shortName: "Cost", iconName: "DollarSign", color: "var(--color-metric-cost)" },
  { id: "developer-experience", name: "Developer Experience", shortName: "DX", iconName: "Code", color: "var(--color-metric-dx)" },
] as const
```

**Icon Choices (no overlap with COMPONENT_CATEGORIES):**
- Component icons: Cpu, Database, Flame, MessageSquare, Globe, Radio, Shield, Activity, Search, Settings
- Metric icons: Gauge, ShieldCheck, TrendingUp, Lock, Wrench, DollarSign, Code

### Technical Notes

**Seed Data Metric Categories (current state):**
Only 4 of 7 metric categories have data in the 10 component YAML files:
- `performance` — 11 unique metrics, all 10 components
- `scalability` — 2 unique metrics, 7 components
- `reliability` — 3 unique metrics, 5 components
- `operational-complexity` — 1 unique metric, all 10 components

Missing from seed data: `security`, `cost-efficiency`, `developer-experience`. These categories are defined in `METRIC_CATEGORIES` for future-proofing but will not render until seed data is enriched.

**Component vs Metric Category Distinction:**
- `COMPONENT_CATEGORIES` = component types (compute, data-storage, caching, etc.) — used for node color stripes, toolbox grouping
- `METRIC_CATEGORIES` = quality dimensions (performance, scalability, etc.) — used for dashboard scoring

**Common Pitfalls:**
1. **Score computation in render:** Computing category averages inline causes unnecessary work. Use `useMemo` wrapping `computeCategoryScores()` (AC-ARCH-NO-1)
2. **Layout height:** 100px is tight. Horizontal layout with compact bars. Current 4 categories fit comfortably; 7 may need smaller min-widths
3. **Empty state flash:** When no components exist, show message immediately. No intermediate loading state (AC-ARCH-NO-3)
4. **Metric category confusion:** `metric.category` values (performance, scalability) are NOT the same as `component.category` values (compute, data-storage). Be explicit about which taxonomy is being used

### Cross-Cutting Dependencies

**DEPENDS ON (inbound):**
- Story 2-1: `computedMetrics` in architectureStore, `RecalculatedMetrics` type, recalculation pipeline

**CONSUMED BY (outbound):**
- Story 2-4 (Tier System): TierBadge may render in or near the dashboard
- Epic 4 Story 4-4 (Dashboard Drill-Down): CategoryOverlay extends the dashboard

### E2E Testing

Key E2E scenarios:
- Place components -> dashboard bars appear with scores for relevant categories
- Change config -> bars animate to new values smoothly
- Remove all components -> empty state message shows
- Verify category bars show correct abbreviated names and icons

## ECC Analysis Summary
- Risk Level: LOW
- Complexity: Moderate
- Sizing: MEDIUM (4 tasks, ~24 subtasks, 12 files — 5 NEW + 7 MODIFY)
- Agents consulted: Planner, Architect
- Hardening: BUILT-IN (display-only component, no user input)
- Key decisions:
  - Render only categories with data (4 of 7 currently)
  - Pure function in `src/engine/dashboardCalculator.ts` (AR17)
  - Flat average algorithm for category scores
  - Own color thresholds (matching MetricBar.tsx), no dependency on Story 2-2
  - `METRIC_CATEGORIES` array (not object) for ordered display
  - Removed AC-2 from original draft (already satisfied by Story 2-1)

## Senior Developer Review (ECC)

- **Date:** 2026-02-14
- **Classification:** COMPLEX (4 agents)
- **Agents:** code-reviewer, security-reviewer, architect, tdd-guide
- **Score:** 9/10 — APPROVED
- **Architecture:** 11/11 file locations, all patterns PASS, all anti-patterns PASS, ALIGNED
- **Security:** 9/10 — No vulnerabilities, no secrets, pure client-side calculations
- **Quick fixes applied (4):**
  1. AggregateScore: `{score}` → `{score.toFixed(1)}` for display consistency with CategoryBar
  2. AggregateScore: replaced fragile `bgToTextColor` string replace with explicit lookup map + fallback
  3. dashboardCalculator: added clarity comment on division safety
  4. DashboardPanel test: added value assertion for aggregate score
- **TD stories created (1):**
  - `td-2-3a-aggregate-score-tests` — dedicated AggregateScore component test file
