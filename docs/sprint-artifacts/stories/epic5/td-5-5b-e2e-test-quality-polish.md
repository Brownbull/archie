# Tech Debt Story TD-5-5b: E2E Test Quality Polish

## Status: done
## Epic: Epic 5 -- Priority Scoring

> **Source:** KDBP Code Review (2026-03-07) on story td-5-5a
> **Priority:** LOW | **Estimated Effort:** SMALL (1 pt)

## Story
As a **developer**, I want **optimized E2E test timing, edge-case weight import coverage, and per-test result namespacing**, so that **E2E tests are faster, more thorough, and parallel-safe**.

## Acceptance Criteria

**AC-1: Reduce cumulative adjustSlider delay**
Given `adjustSlider` waits 300ms per call,
When called N times in sequence (e.g., AC-2 calls it 3×),
Then refactor to accept a `settle` flag so the debounce wait fires once after the loop, not per-call.

**AC-2: Edge-case weight import test**
Given a YAML file with weight values outside valid range (e.g., weight=0 or weight=5.0),
When imported into Archie,
Then verify clamping behavior (values clamped to min/max) or graceful error.

**AC-3: Per-test result namespacing**
Given tests write artifacts to `test-results/priority-scoring/`,
When tests could theoretically run in parallel,
Then namespace output paths to avoid file collisions (e.g., include test name in path).

## Tasks / Subtasks

- [x] Task 1: Refactor adjustSlider timing
  - [x] 1.1 Add optional `settle` param (default true)
  - [x] 1.2 Update AC-2 to call adjustSlider with settle=false, then single wait after loop

- [x] Task 2: Add out-of-range weight import test
  - [x] 2.1 Create fixture YAML with weight=0 and weight=5.0 (programmatic via export+modify)
  - [x] 2.2 Import and verify: weight=5.0 → schema error toast; weight=0 → valid import

- [x] Task 3: Namespace test-results paths
  - [x] 3.1 Per-test subdirectories (ac1-*, ac2-*, etc.) for screenshot and artifact isolation

## Senior Developer Review (KDBP)
- **Date:** 2026-03-07
- **Agents:** code-reviewer (sonnet), tdd-guide (sonnet)
- **Classification:** SIMPLE
- **Score:** 7.5/10 — APPROVE
- **Quick fixes:** 4 (dir naming, toast assertion, typed local, settle comment)
- **Deferred:** 5 → td-5-5c
<!-- CITED: L2-004 (E2E test quality), L2-006 (DRY) -->

## Deferred Items

| TD Story | Description | Priority | Action |
|----------|-------------|----------|--------|
| td-5-5c | DRY fixture helper, import from source, edge-case boundary tests | LOW | CREATED |

## Dev Notes
- Source story: [td-5-5a](./td-5-5a-e2e-test-hardening.md)
- Review findings: #2, #7, #8
- Files affected: `tests/e2e/priority-scoring.spec.ts`
