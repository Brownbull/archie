# Tech Debt Story TD-5-5a: E2E Test Hardening

## Status: done
## Epic: Epic 5 -- Priority Scoring

> **Source:** KDBP Code Review (2026-03-07) on story 5-5
> **Priority:** LOW | **Estimated Effort:** SMALL (1 pt)

## Story
As a **developer**, I want **hardened E2E test fixtures and broader reset coverage**, so that **CI is reliable on all platforms and edge cases are caught**.

## Acceptance Criteria

**AC-1: Robust v1 YAML fixture generation**
Given AC-4's v1 test fixture creation,
When weight_profile block is removed from exported YAML,
Then use js-yaml parse/delete/dump instead of regex (handles CRLF, trailing whitespace, last-key edge cases).

**AC-2: Multi-slider reset coverage**
Given multiple sliders adjusted to non-default values,
When "Reset Weights" is clicked,
Then ALL adjusted sliders revert to 1.0 (not just the last-touched one).

**AC-3: Library ready-wait after reimport navigation**
Given AC-3's round-trip test navigates to "/" for reimport,
When the page reloads,
Then `waitForComponentLibrary(page)` is called before import to prevent race on slow CI.

## Tasks / Subtasks

- [x] Task 1: Replace regex with js-yaml in AC-4 fixture
  - [x] 1.1 Parse exported YAML with `js-yaml.load()`
  - [x] 1.2 Delete `weight_profile` key from parsed object
  - [x] 1.3 Set `schema_version` to "1.0.0"
  - [x] 1.4 Write back with `js-yaml.dump()`
  - [x] 1.5 Add assertion: `expect(yamlContent).not.toContain("weight_profile")`

- [x] Task 2: Expand AC-2 reset test
  - [x] 2.1 Adjust 3+ sliders to different values before reset
  - [x] 2.2 After reset, verify all 7 sliders are at 1.0

- [x] Task 3: Add waitForComponentLibrary in AC-3
  - [x] 3.1 After `page.goto("/")` in round-trip test, call `waitForComponentLibrary(page)`
  - [x] 3.2 Verify import proceeds only after library is ready

## Dev Notes
- Source story: [5-5](./5-5.md)
- Review findings: #3, #8, #11
- Files affected: `tests/e2e/priority-scoring.spec.ts`
- Implemented: 2026-03-07

## Senior Developer Review (ECC)
- **Date:** 2026-03-07
- **Agents:** code-reviewer (sonnet), tdd-guide (sonnet)
- **Classification:** SIMPLE
- **Outcome:** APPROVE 8/10
- **Quick fixes:** 4 (ignored return value, null guard, comment cleanup, source-of-truth comment)
- **TD stories created:** 1 (td-5-5b)

<!-- CITED: none -->

## Deferred Items (from code review)

| TD Story | Description | Priority | Action |
|----------|-------------|----------|--------|
| td-5-5b | E2E test quality polish (adjustSlider timing, edge-case weight import, result namespacing) | LOW | CREATED |
