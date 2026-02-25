# Tech Debt Story TD-4-3c: ConnectionDetail useShallow Restoration

Status: ready-for-dev

> **Source:** ECC Code Review (2026-02-24) on story td-4-3b
> **Priority:** LOW | **Estimated Effort:** Small (1-2 tasks)

## Story
As a **developer**, I want **the `ConnectionDetail` component's `edges.find()` Zustand selector to use `useShallow` for reference stability**, so that **unrelated store updates do not trigger unnecessary re-renders of the connection inspector panel**.

## Acceptance Criteria

**AC-1 (useShallow restoration):**
Given `ConnectionDetail` reads `s.edges.find((e) => e.id === edgeId)` via `useArchitectureStore`
When the architecture store updates fields unrelated to the selected edge (e.g., node positions, other edges)
Then the `ConnectionDetail` component should NOT re-render
Solution: wrap the selector with `useShallow` from `zustand/react/shallow` (per Story 4-3 Dev Notes line 200)

**AC-2 (consistency audit):**
Given `useShallow` is the project pattern for selectors returning objects (see `InspectorPanel.tsx`)
When reviewing all `useArchitectureStore` selectors that return objects or arrays via `.find()` / `.filter()`
Then any selector returning a derived object should use `useShallow` for shallow comparison

## Tasks / Subtasks
- [ ] 1.1 Restore `useShallow` import and wrapping on `edges.find()` selector in `ConnectionDetail.tsx`
- [ ] 1.2 Update or add unit test verifying no re-render on unrelated store change
- [ ] 2.1 Audit other `useArchitectureStore` selectors for missing `useShallow` on object-returning selectors
- [ ] 2.2 Run `npm run test:quick` — all tests pass

## Dev Notes
- Source story: [td-4-3b-library-data-rendering-hardening](./td-4-3b-library-data-rendering-hardening.md)
- Review findings: #1 (useShallow removal causes potential re-render regression)
- Files affected: `src/components/inspector/ConnectionDetail.tsx`
- Reference pattern: Story 4-3 Dev Notes recommends `useShallow` for `edges.find()` selector
