# Tech Debt Story TD-6-3b: ConstraintPanel Polish & Constraint Test Coverage

## Status: ready-for-dev
## Epic: Epic 6 -- Constraint Guardrails

> **Source:** ECC Code Review (2026-03-10) on story TD-6-3a
> **Priority:** LOW | **Estimated Effort:** 2 pts (SMALL)

## Story
As a **developer**, I want **the ConstraintPanel to use grouped form state props and the constraint store to have direct test coverage for violationsByNodeId**, so that **the form component is easier to extend and the derived Map has regression safety**.

## Acceptance Criteria

**AC-1: Group ConstraintFormProps**
Given ConstraintForm has 11 individual props (each state atom + setter),
When this TD is complete,
Then props are grouped into `formState` + `onFormChange` (or similar pattern),
And each call site passes fewer than 6 props.

**AC-2: Store-level violationsByNodeId tests**
Given `buildViolationsByNodeId` is tested only indirectly via ArchieNode mock,
When this TD is complete,
Then `architectureStore-constraints.test.ts` asserts `violationsByNodeId` is correctly populated after `addConstraint`, `updateConstraint`, and `setConstraints`.

## Tasks / Subtasks

- [ ] Task 1: Group ConstraintForm props
  - [ ] 1.1 Create `ConstraintFormState` type and `onFormChange` handler
  - [ ] 1.2 Update ConstraintForm component and call sites
  - [ ] 1.3 Verify existing ConstraintPanel tests pass unchanged

- [ ] Task 2: Store-level violationsByNodeId tests
  - [ ] 2.1 Add test asserting violationsByNodeId populated after addConstraint
  - [ ] 2.2 Add test asserting violationsByNodeId updated after updateConstraint
  - [ ] 2.3 Add test asserting violationsByNodeId cleared when constraints removed

## Dev Notes
- Source story: [TD-6-3a](./TD-6-3a.md)
- Review findings: #1 (panel subscription), #3 (wide props), #4 (silent clamp), #6 (native select), #7 (untested helper), #10 (store coverage)
- Items #1 (panel subscription optimization), #4 (threshold validation UX), #6 (shadcn select) are pre-existing issues noted during review — address opportunistically if touching these areas
- Files affected: `src/components/dashboard/ConstraintPanel.tsx`, `tests/unit/stores/architectureStore-constraints.test.ts`
