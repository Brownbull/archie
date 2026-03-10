# Tech Debt Story TD-6-3a: Constraint UI Performance & Structure Refinement

## Status: done
## Epic: Epic 6 -- Constraint Guardrails

> **Source:** ECC Code Review (2026-03-10) on story 6-3
> **Priority:** MEDIUM | **Estimated Effort:** 2 pts (SMALL)

## Story
As a **developer**, I want **the constraint UI components to use optimized store subscriptions and cleaner component structure**, so that **canvas re-renders stay O(1) per node and the ConstraintPanel remains maintainable as it grows**.

## Acceptance Criteria

**AC-1: Extract ConstraintForm component**
Given the ConstraintPanel has an inline `renderForm` function defined after `return`,
When this TD is complete,
Then the form is extracted to a separate `<ConstraintForm>` component (or inlined as JSX at call sites),
And the form is NOT re-created on every render cycle.

**AC-2: Per-node violation selector**
Given ArchieNode subscribes to full `constraintViolations` and `constraints` arrays,
When this TD is complete,
Then each ArchieNode subscribes to only its own violations (via derived store selector or prop from parent),
And a constraint violation update for node A does NOT trigger re-render of node B.

## Tasks / Subtasks

- [x] Task 1: Extract renderForm from ConstraintPanel
  - [x] 1.1 Create ConstraintForm as a separate component or inline JSX block
  - [x] 1.2 Pass form state and handlers as props
  - [x] 1.3 Verify existing ConstraintPanel tests pass unchanged

- [x] Task 2: Optimize ArchieNode constraint subscription
  - [x] 2.1 Add `violationsByNodeId` derived Map to architectureStore (updated when constraintViolations changes)
  - [x] 2.2 ArchieNode subscribes to `(s) => s.violationsByNodeId.get(id)` instead of full arrays
  - [x] 2.3 Verify existing ArchieNode tests pass unchanged
  - [x] 2.4 Run test:quick — all pass

## Deferred Items (from code review 2026-03-10)

| TD Story | Description | Priority | Action |
|----------|-------------|----------|--------|
| TD-6-3b | ConstraintPanel polish (grouped form props) + constraint store test coverage | LOW | CREATED |

## Senior Developer Review (ECC)
- **Date:** 2026-03-10
- **Classification:** SIMPLE
- **Agents:** code-reviewer (8.5/10), tdd-guide (8/10)
- **Overall:** APPROVE 8.3/10
- **Quick fixes applied:** 4 (immutable spread, memoization comment, test reset, fallback tooltip test)
- **TD stories created:** 1 (TD-6-3b)

<!-- CITED: none -->

## Dev Notes
- Source story: [6-3](./6-3.md)
- Review findings: #1 (renderForm extraction), #2 (store subscription fan-out)
- Files affected: `src/components/dashboard/ConstraintPanel.tsx`, `src/components/canvas/ArchieNode.tsx`, `src/stores/architectureStore.ts`
