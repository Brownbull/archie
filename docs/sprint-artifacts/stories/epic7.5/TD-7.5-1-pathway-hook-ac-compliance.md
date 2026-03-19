# Tech Debt Story TD-7.5-1: Pathway Hook AC Compliance + Test Gaps

Status: done

> **Source:** KDBP Code Review (2026-03-18) on story 7.5-2
> **Priority:** HIGH | **Estimated Effort:** SMALL (1-2 pts)
> **Stage:** MVP

## Story
As a **developer**, I want **the usePathwaySuggestions hook to comply with AC-ARCH-PATTERN-3 or have the AC explicitly updated**, so that **the architectural intent is documented and the dep-array contract is safe**.

## Context

Story 7.5-2 AC-ARCH-PATTERN-3 specifies: `componentLibrary.getAllComponents()` called outside `useMemo` (service is not reactive). The implementation moves it inside `useMemo` to avoid reference instability (Array.from creates new ref each call, defeating memoization). This is a valid trade-off but contradicts the AC.

Code review finding: calling a non-reactive service inside useMemo but omitting it from the dep array is a dep-array lie. If componentLibrary were ever swapped or reset mid-session, the hook would serve stale data.

## Acceptance Criteria

**AC-1: Resolve AC-ARCH-PATTERN-3 Deviation**
Given the architectural AC specifies calling `getAllComponents()` outside useMemo,
When this deviation is evaluated,
Then EITHER:
- (a) Move `getAllComponents()` outside useMemo and stabilize reference with useRef/length-check, OR
- (b) Update AC-ARCH-PATTERN-3 in story 7.5-2 to reflect the intentional deviation with rationale

**AC-2: Test Gap — dataContextItems Reactive Path**
Given the hook flattens `dataContextItems` and passes to `computePathwaySuggestions`,
When dataContextItems contain entries with fit-relevant data,
Then a test verifies fitLevel appears on suggestions.

**AC-3: Test Gap — categoryScores Path**
Given the hook derives categoryScores from computedMetrics,
When a min_category_score tier requirement exists and scores are below threshold,
Then a test verifies suggestions target the deficient category.

## Tasks / Subtasks

- [x] Task 1: Decide AC compliance approach (a or b from AC-1) — chose (b)
  - [ ] 1.1 If (a): N/A — option (b) selected
  - [x] 1.2 If (b): update story 7.5-2 AC-ARCH-PATTERN-3 with rationale
- [x] Task 2: Add dataContextItems test (AC-2)
  - [x] 2.1 Create DataContextItem test data with fit-relevant fields
  - [x] 2.2 Provide component with dataFitProfile on default variant
  - [x] 2.3 Assert fitLevel appears on suggestion
- [x] Task 3: Add categoryScores test (AC-3)
  - [x] 3.1 Set up computedMetrics with low category scores
  - [x] 3.2 Assert min_category_score gap type produces suggestions

## Dev Notes
- Source story: [7.5-2](./7.5-2.md)
- Review findings: #2 (AC deviation), #6 (dataContextItems gap), #8 (categoryScores gap)
- Files affected: `src/hooks/usePathwaySuggestions.ts`, `tests/unit/hooks/usePathwaySuggestions.test.ts`
- AC-1 decision: Option (b) — documented the intentional deviation in 7.5-2 AC-ARCH-PATTERN-3
- Rationale: componentLibrary is a singleton cache (load-once, not reactive). useRef stabilization would add complexity for an impossible runtime scenario.
- Self-review (2026-03-18): 8.5/10. Strengthened fitExplanation assertion per reviewer feedback.
- Session cost: $10.04 (kdbp-dev-story avg: $13.09)

## Deferred Items (Code Review 2026-03-18)

| # | Finding | Stage | Destination | Tracking |
|---|---------|-------|-------------|----------|
| 1 | [P1] pathwayEngine.ts unstaged (prior story artifact) | MVP | Fixed | quick fix |
| 2-9 | LOW: cosmetic test gaps, comment wording, assertion style | — | Archived | n/a |

## Senior Developer Review (KDBP)

- **Date:** 2026-03-18
- **Agents:** code-reviewer (sonnet), tdd-guide (sonnet)
- **Classification:** SIMPLE
- **Outcome:** APPROVE 7.8/10 — 1 quick fix applied (pathwayEngine.ts staging), 8 archived
- **Session cost:** $8.21 (code-review portion)

<!-- CITED: L2-001 (git staging) -->
<!-- ORDERING: clean -->
