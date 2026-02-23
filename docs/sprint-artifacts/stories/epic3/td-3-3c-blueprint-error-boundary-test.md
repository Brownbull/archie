# Tech Debt Story TD-3-3c: BlueprintErrorBoundary Error State Unit Test

Status: ready-for-dev

> **Source:** ECC Code Review (2026-02-23) on story 3-3
> **Priority:** LOW | **Estimated Effort:** Small (< 1h)

## Story

As a **developer**, I want a unit test for the `BlueprintErrorBoundary` error state in `BlueprintTab.tsx`, so that the fallback UI (`data-testid="blueprint-tab-error"`) is verified to render on thrown errors.

## Acceptance Criteria

**AC-1:** A test renders a child component that throws during render, wrapped in `BlueprintErrorBoundary`, and verifies the `blueprint-tab-error` testid is shown with the expected fallback message.

**AC-2:** The test suppresses the expected React error boundary console output (via `vi.spyOn(console, 'error').mockImplementation(...)`) to keep test output clean.

**AC-3:** The test verifies the error state message contains "Could not load blueprints".

## Tasks / Subtasks

- [ ] 1. Export `BlueprintErrorBoundary` from `BlueprintTab.tsx` (or test via a re-export) — needed to instantiate it directly
- [ ] 2. Add test to `tests/unit/components/toolbox/BlueprintTab.test.tsx` covering the ErrorBoundary fallback
- [ ] 3. Run `npm run test:quick` — all tests pass

## Dev Notes

- Source story: [story-3-3.md](./story-3-3.md)
- Review finding: #7 (TDD guide, LOW severity)
- Files affected:
  - `src/components/toolbox/BlueprintTab.tsx` (minor: export `BlueprintErrorBoundary` if needed)
  - `tests/unit/components/toolbox/BlueprintTab.test.tsx` (add test)
- Pattern reference: React error boundary testing with a "ThrowOnRender" helper component — standard pattern in `@testing-library/react` ecosystem
- Note: React error boundaries cannot be tested as functional components; must render a class component (BlueprintErrorBoundary) wrapping a component that throws
- Suppress `console.error` during the test: React logs the caught error to console even when caught by the boundary
