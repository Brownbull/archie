# Story: 2-4 Architecture Tier System

## Status: done
## Epic: Epic 2 — Trade-off Intelligence & Visualization

## Overview

As a user, I want to see what tier my architecture has reached and what I'd need to improve to reach the next tier, so that I have a concrete measure of completeness and a clear path for improvement.

This story implements the tier evaluator engine (pure function), a TierBadge component in the dashboard area, and a click-to-expand detail view showing next-tier gap descriptions. Tier names, count, and thresholds are data-driven from code constants — the evaluator receives definitions as arguments and never hardcodes tier names. The tier system runs after every state change (add/remove/recalculate) and provides the gamification element that gives users confidence and motivation.

Tier evaluation happens in the store (not recalculationService) because it needs the FULL merged metrics map across all nodes, not just the BFS-affected subset returned by the service. Default 3-tier definitions are code constants in `tierDefinitions.ts` — migration to Firestore is a backwards-compatible future change since the evaluator receives definitions as arguments.

## Functional Acceptance Criteria

**AC-1: Tier Evaluation**
**Given** components and connections exist on the canvas
**When** the tier evaluator runs (after each state change)
**Then** the system evaluates the current architecture against the tier definitions (FR20)
**And** structural requirements (component count, category diversity) evaluate even without metrics

**AC-2: Tier Display**
**Given** the tier evaluation completes
**When** I view the dashboard area
**Then** I see the current tier name and a progress indicator (e.g., "1/3") displayed as a compact badge (FR21)
**And** tier names come from the tier definitions data — not hardcoded in the UI
**And** the badge uses visual styling that communicates progress (not judgment)

**AC-3: Next-Tier Gap Indicators**
**Given** my architecture is at a tier below the maximum
**When** I click the tier badge
**Then** I see a detail panel showing what specific improvements are needed to reach the next tier (FR22)
**And** gap descriptions are human-readable and actionable (e.g., "Add 2 more components" or "Improve Reliability score to 5+")
**And** when I have reached the maximum tier, the detail shows "All tier requirements met"

**AC-4: Tier Update on Change**
**Given** I make a change that crosses a tier threshold (add/remove component, change config, add/remove connection)
**When** the state settles
**Then** the tier indicator updates to show the new tier
**And** the color transition is visually smooth (CSS transition)
**And** when all components are removed, the tier indicator returns to the empty state ("Add components to begin")

## Architectural Acceptance Criteria (MANDATORY)

> These ACs are MANDATORY and will be validated during code review.

### File Location Requirements

- **AC-ARCH-LOC-1:** Tier evaluation logic at `src/engine/tierEvaluator.ts`
- **AC-ARCH-LOC-2:** Tier definitions and types at `src/lib/tierDefinitions.ts`
- **AC-ARCH-LOC-3:** Tier badge component at `src/components/dashboard/TierBadge.tsx`
- **AC-ARCH-LOC-4:** Architecture store modifications at `src/stores/architectureStore.ts`
- **AC-ARCH-LOC-5:** DashboardPanel modifications at `src/components/dashboard/DashboardPanel.tsx`
- **AC-ARCH-LOC-6:** Type re-exports at `src/types/index.ts`
- **AC-ARCH-LOC-7:** Tier evaluator unit tests at `tests/unit/engine/tierEvaluator.test.ts`
- **AC-ARCH-LOC-8:** TierBadge unit tests at `tests/unit/components/dashboard/TierBadge.test.tsx`

### Pattern Requirements

- **AC-ARCH-PATTERN-1:** `tierEvaluator.ts` is a pure function module — no imports from `react`, `zustand`, `firebase`, or any service module (AR17). Receives node summaries, category scores, and tier definitions as arguments, returns `TierResult | null`.
- **AC-ARCH-PATTERN-2:** `tierDefinitions.ts` is a pure data module — no imports from `react`, `zustand`, `firebase`, or any service module. Contains only types and the `DEFAULT_TIER_DEFINITIONS` constant.
- **AC-ARCH-PATTERN-3:** Tier evaluation called inside `architectureStore.ts` via a module-level `evaluateAndSetTier()` helper, invoked after metric merge in `triggerRecalculation`, after `addNode`, and after `removeNode`/`removeNodes`. NOT inside `recalculationService.run()`.
- **AC-ARCH-PATTERN-4:** Tier result stored in `architectureStore`: `currentTier: TierResult | null` initialized to `null`.
- **AC-ARCH-PATTERN-5:** TierBadge reads tier state via Zustand selector: `useArchitectureStore(s => s.currentTier)` — minimal subscription, no full-store subscription.
- **AC-ARCH-PATTERN-6:** Tier transition uses CSS `transition-colors duration-300 ease-in-out` on the badge button for smooth color shift when tier changes.
- **AC-ARCH-PATTERN-7:** Gap descriptions are human-readable and actionable: "Add 2 more components (currently 3, need 5)" or "Add a Monitoring component to your architecture" — not raw metric numbers.
- **AC-ARCH-PATTERN-8:** `evaluateAndSetTier()` accepts an optional `overrideMetrics` parameter so `triggerRecalculation` can pass the fully-merged metrics map (existing + newly computed) rather than reading stale state from `get().computedMetrics`.
- **AC-ARCH-PATTERN-9:** TierBadge detail panel uses `position: absolute; bottom: 100%` to render above the badge (dashboard is at viewport bottom).
- **AC-ARCH-PATTERN-10:** `computeCategoryScores` from `dashboardCalculator.ts` (Story 2-3) is imported into `architectureStore.ts` for tier evaluation. This cross-engine import is acceptable because both are pure functions.

### Anti-Pattern Requirements (Must NOT Happen)

- **AC-ARCH-NO-1:** `tierEvaluator.ts` MUST NOT import from `react`, `zustand`, `firebase`, or any service — pure function only (AR17).
- **AC-ARCH-NO-2:** `tierDefinitions.ts` MUST NOT import from `react`, `zustand`, `firebase`, or any service — pure data only.
- **AC-ARCH-NO-3:** Tier names MUST NOT be hardcoded in the UI component — read from `TierResult.tierName`.
- **AC-ARCH-NO-4:** Tier thresholds MUST NOT be hardcoded in the evaluator — receive as arguments from `TierDefinition[]`.
- **AC-ARCH-NO-5:** TierBadge MUST NOT use judgmental language (e.g., "bad", "poor", "failing") — use neutral progress framing.
- **AC-ARCH-NO-6:** Tier evaluation MUST NOT be placed inside `recalculationService.run()` — the service only computes metrics for BFS-affected nodes, not the full architecture picture.
- **AC-ARCH-NO-7:** TierBadge MUST NOT subscribe to the entire architecture store — use targeted selector `(s) => s.currentTier`.

## File Specification

| File/Component | Exact Path | Pattern | Status |
|----------------|------------|---------|--------|
| tierDefinitions | `src/lib/tierDefinitions.ts` | Pure data module | NEW |
| tierEvaluator | `src/engine/tierEvaluator.ts` | Pure function (AR17) | NEW |
| TierBadge | `src/components/dashboard/TierBadge.tsx` | React component (AR20) | NEW |
| architectureStore | `src/stores/architectureStore.ts` | Zustand store (AR15) | MODIFY |
| DashboardPanel | `src/components/dashboard/DashboardPanel.tsx` | React component | MODIFY |
| types/index | `src/types/index.ts` | Type re-exports | MODIFY |
| tierEvaluator.test | `tests/unit/engine/tierEvaluator.test.ts` | Unit test (AR22) | NEW |
| TierBadge.test | `tests/unit/components/dashboard/TierBadge.test.tsx` | Unit test (AR22) | NEW |

## Tasks / Subtasks

### Task 1: Tier Definition Data Model
- [x] 1.1 Create `src/lib/tierDefinitions.ts` with type definitions: `TierRequirement` (discriminated union of 4 types: `min_component_count`, `min_category_score`, `required_categories`, `min_distinct_categories`), `TierDefinition` (id, name, index, color, textColor, requirements), `TierGap` (requirementDescription, currentValue, targetValue), `TierResult` (tierId, tierName, tierIndex, totalTiers, tierColor, tierTextColor, nextTierGaps, isMaxTier)
- [x] 1.2 Define `DEFAULT_TIER_DEFINITIONS` constant with 3 tiers: Foundation (>=3 components, >=2 distinct categories), Production-Ready (>=5 components, >=3 distinct categories, performance >=5, reliability >=5), Resilient (>=8 components, >=5 distinct categories, performance >=6, reliability >=6, scalability >=6, monitoring category present)
- [x] 1.3 Use Tailwind color classes for tier badges: Foundation=bg-amber-700/text-amber-100, Production-Ready=bg-slate-500/text-slate-100, Resilient=bg-yellow-500/text-yellow-950
- [x] 1.4 Re-export `TierDefinition`, `TierResult`, `TierGap`, `TierRequirement` from `types/index.ts`

### Task 2: Tier Evaluator Pure Function
- [x] 2.1 Create `src/engine/tierEvaluator.ts` with `TierNodeSummary` and `TierCategoryScore` interfaces (minimal input types, no store/service dependencies)
- [x] 2.2 Implement `evaluateTier(nodes, categoryScores, tierDefinitions): TierResult | null` — sort definitions descending by index, iterate highest-first, find first where ALL requirements pass
- [x] 2.3 Implement `isRequirementMet()` for all 4 requirement types: component count check, distinct category count, category score with hasData guard, required category presence
- [x] 2.4 Implement `computeGaps()` — for the next tier above current, generate human-readable gap descriptions for each unmet requirement. Handle pluralization ("1 more component" vs "2 more components")
- [x] 2.5 Implement `formatCategoryName()` helper — converts kebab-case to Title Case (e.g., "auth-security" → "Auth Security")
- [x] 2.6 Edge cases: empty nodes → null, empty definitions → null, no tier met → null, all tiers met → isMaxTier=true with empty gaps
- [x] 2.7 Write unit tests: edge cases (empty/null), each tier qualification, tier fallback (fails higher → qualifies lower), gap descriptions for all 4 requirement types, max-tier state, custom definitions, formatCategoryName

### Task 3: Store Integration
- [x] 3.1 Add `currentTier: TierResult | null` to `ArchitectureState` interface, initialize to `null`
- [x] 3.2 Create module-level `evaluateAndSetTier(get, set, overrideMetrics?)` helper that computes `computeCategoryScores`, maps to `TierCategoryScore[]`, calls `evaluateTier`, and sets `currentTier`
- [x] 3.3 Call `evaluateAndSetTier` in `triggerRecalculation` after merging service result with existing metrics (pass merged `fullMetrics` as override)
- [x] 3.4 Call `evaluateAndSetTier` at end of `addNode` (tier updates for component-count-based requirements even without connections)
- [x] 3.5 In `removeNode`: if `nodes.length === 0` after removal, set `currentTier: null`. Otherwise, `triggerRecalculation` for neighbors handles tier update
- [x] 3.6 In `removeNodes`: if `nodes.length === 0` after batch removal, set `currentTier: null`
- [x] 3.7 Add store integration tests: `currentTier` null initially, updates after triggerRecalculation, null when canvas empties

### Task 4: TierBadge Component
- [x] 4.1 Create `TierBadge.tsx`: reads `currentTier` from store via `(s) => s.currentTier` selector. Uses `useState` for expanded/collapsed detail view
- [x] 4.2 Null state: render Trophy icon (dimmed) + "Add components to begin" text
- [x] 4.3 Badge format: `[Trophy] [TierName] [index+1/total] [chevron]`. Apply tier color/textColor classes from `TierResult`. Use `transition-colors duration-300 ease-in-out` for smooth tier changes
- [x] 4.4 Detail panel: absolute positioned above badge (`bottom-full`). When expanded, show gap descriptions as bullet list. When max tier, show "All tier requirements met" with check icon
- [x] 4.5 Add `data-testid="tier-badge"` on container, `data-testid="tier-detail"` on expanded panel
- [x] 4.6 Add `aria-expanded` and `aria-controls` on the badge button for accessibility
- [x] 4.7 Integrate into DashboardPanel: render TierBadge to the LEFT of AggregateScore, with a mini divider between them
- [x] 4.8 Write unit tests: null state rendering, tier name display, progress indicator, detail expansion on click, gap descriptions, max-tier state, transition class presence, data-testid attributes

### Task 5: Verification
- [x] 5.1 Run `npx tsc --noEmit` — no type errors
- [x] 5.2 Run `npm run test:quick` — all tests pass
- [x] 5.3 Verify coverage meets thresholds
- [x] 5.4 Visual check: tier badge updates on component add/remove, tier transitions are smooth, detail panel positions correctly above badge

## Dev Notes

### Architecture Guidance

**Tier Evaluator Design (pure function — AR17):**
```typescript
// src/engine/tierEvaluator.ts
export function evaluateTier(
  nodes: TierNodeSummary[],      // { id, category }
  categoryScores: TierCategoryScore[],  // { categoryId, score, hasData }
  tierDefinitions: TierDefinition[]
): TierResult | null
```
- Receives ALL data as arguments — no side effects, no lookups
- Sort definitions descending by index (highest first)
- First tier where ALL requirements pass → current tier
- Next tier's unmet requirements → gap descriptions

**4 Tier Requirement Types (discriminated union):**
```typescript
type TierRequirement =
  | { type: 'min_component_count'; minCount: number; description: string }
  | { type: 'min_category_score'; categoryId: string; minScore: number; description: string }
  | { type: 'required_categories'; requiredCategories: ComponentCategoryId[]; description: string }
  | { type: 'min_distinct_categories'; minCount: number; description: string }
```
- `required_categories` uses COMPONENT categories (compute, monitoring, etc.)
- `min_category_score` uses METRIC categories (performance, reliability, etc.)
- These are different taxonomies — do not confuse them

**Store Integration (NOT recalculationService):**
```typescript
// Module-level helper in architectureStore.ts
function evaluateAndSetTier(
  get: () => ArchitectureState,
  set: (partial: Partial<ArchitectureState>) => void,
  overrideMetrics?: Map<string, RecalculatedMetrics>
): void {
  const { nodes } = get()
  if (nodes.length === 0) { set({ currentTier: null }); return }
  const metrics = overrideMetrics ?? get().computedMetrics
  const categoryScores = computeCategoryScores(metrics)
  // ... map to TierCategoryScore[], call evaluateTier, set result
}
```
Called from: `triggerRecalculation` (with merged fullMetrics), `addNode`, `removeNode`/`removeNodes` (for empty-canvas check)

**Why NOT recalculationService:** The service's `run()` returns metrics for BFS-affected nodes only. Tier evaluation needs ALL node metrics. The store has the full merged map.

**Dashboard Layout with TierBadge:**
```
+------------------------------------------------------------------+
| [TierBadge] | [Overall] | [Perf ====] [Rel ====] [Scale ====]    |
| Foundation  |   5.9     |                                        |
| 1/3         |           |                                        |
+------------------------------------------------------------------+
```

**Default 3-Tier Definitions:**
| Tier | Index | Requirements |
|------|-------|-------------|
| Foundation | 0 | >=3 components, >=2 distinct categories |
| Production-Ready | 1 | >=5 components, >=3 distinct categories, performance >=5, reliability >=5 |
| Resilient | 2 | >=8 components, >=5 distinct categories, performance >=6, reliability >=6, scalability >=6, monitoring present |

**Gap Description Examples:**
```
"Add 2 more components (currently 3, need 5)"
"Use components from 1 more category (currently 2, need 3)"
"Improve reliability score to 5+ (currently 3.8)"
"Add a Monitoring component to your architecture"
```

### Technical Notes

**Seed Data Constraints:**
- 10 components across 7 of 10 COMPONENT_CATEGORIES (missing: auth-security, search, devops)
- Resilient tier requires monitoring (reachable with Prometheus) but NOT auth-security (would be unreachable)
- Default tier definitions are tuned to be achievable with current seed data

**No Hysteresis for MVP:**
Tier flapping (rapid toggling at threshold boundary) is possible but unlikely in practice. The CSS `transition-colors duration-300` provides visual smoothing. If user feedback indicates flapping is a problem, hysteresis can be added later without changing the evaluator's pure function signature.

**Common Pitfalls:**
1. **Tier evaluation with stale metrics:** `evaluateAndSetTier` in `triggerRecalculation` must use the merged fullMetrics (service result + existing), not `get().computedMetrics` which hasn't been updated with ripple hops yet
2. **Empty architecture:** `addNode` then immediately `removeNode` — ensure `currentTier` goes from null → Foundation (or null if <3) → null
3. **Component count vs metric requirements:** Foundation tier can be reached with just 3 components and no connections (no metrics needed). Production-Ready requires metric scores, so connections (which trigger recalculation) are implicitly needed

### Cross-Cutting Dependencies

**DEPENDS ON (inbound):**
- Story 2-1: `computedMetrics` in architectureStore, `RecalculatedMetrics` type, recalculation pipeline
- Story 2-3: `computeCategoryScores()` from `dashboardCalculator.ts`, `CategoryScore` type, `DashboardPanel` component, `METRIC_CATEGORIES` constant

**CONSUMED BY (outbound):**
- Epic 3 Story 3-3: Example architectures should demonstrate different tiers
- Epic 4: Tier data visible in architecture overview

### E2E Testing

- Action: EXTEND
- Test File: `tests/e2e/scoring-dashboard.spec.ts` (lines 475-622)
- Result: PASS (2/2 deterministic runs, ~12s)
- Multi-User: SINGLE-USER
- Quality Score: 94/100
- Date: 2026-02-14

Tests added (4):
1. AC-4: tier badge empty state — "Add components to begin" with no components
2. AC-2: Foundation tier badge — place 3 components, verify "Foundation" + "1/3"
3. AC-3: tier detail expand/collapse — click badge, verify gap descriptions, collapse
4. AC-4: tier returns to empty — place 3, delete all, verify empty state returns

## ECC Analysis Summary
- Risk Level: LOW
- Complexity: Moderate
- Sizing: MEDIUM (5 tasks, ~26 subtasks, 8 files — 5 NEW + 3 MODIFY)
- Agents consulted: Planner, Architect
- Hardening: BUILT-IN (pure function pattern, data-driven design, no user input)
- Key decisions:
  - Tier definitions as code constants (not Firestore) — `src/lib/tierDefinitions.ts`
  - Tier evaluation in store (not recalculationService) — needs full merged metrics
  - 4 requirement types (discriminated union): component count, category score, required categories, distinct categories
  - No hysteresis — pure function, CSS transition provides visual smoothing
  - TierBadge left of AggregateScore with click-to-expand detail (no Popover dependency)
  - Removed componentLibrary and recalculationService from MODIFY list

## Senior Developer Review (ECC)

**Date:** 2026-02-14
**Classification:** STANDARD
**Agents:** code-reviewer (Sonnet), security-reviewer (Sonnet)
**Architecture ACs:** Orchestrator-validated 25/25

### Scores

| Agent | Score | Status |
|-------|-------|--------|
| Code Quality | 8/10 | APPROVE |
| Security | 9/10 | APPROVE |
| Architecture (orchestrator) | 10/10 | 25/25 ACs pass |
| **OVERALL** | **9/10** | **APPROVED** |

### Findings & Resolution

| # | Sev | Finding | Resolution |
|---|-----|---------|------------|
| 1 | MEDIUM | Missing try/catch in evaluateAndSetTier | FIXED — added graceful degradation |
| 2 | LOW | formatCategoryName accepts arbitrary strings | FIXED — added sanitization + whitespace guard |
| 3 | LOW | formatCategoryName whitespace-only input | FIXED — combined with #2 |
| 4 | LOW | z-50 may conflict with future overlays | DEFERRED → td-2-4a-overlay-z-index |

### TD Stories Created
- **td-2-4a-overlay-z-index:** Z-index scale coordination for overlay components

### Notes
- Code reviewer flagged 2 false positives (removeNode tier logic, removeNodes duplicate calls) — orchestrator corrected
- Pure function pattern (AR17) perfectly maintained across tierEvaluator and tierDefinitions
- All 723 tests pass after fixes
