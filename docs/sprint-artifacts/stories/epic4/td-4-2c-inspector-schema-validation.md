# Tech Debt Story TD-4-2c: Inspector Schema Validation Hardening

Status: ready-for-dev

> **Source:** ECC Code Review (2026-02-24) on story 4-2a
> **Priority:** LOW | **Estimated Effort:** Small (1 task, 2 subtasks, 2 files)

## Story
As a **developer**, I want **length and charset validation on Firestore-sourced metric fields at the Zod schema layer**, so that **overly long or malformed strings from corrupted data cannot overflow inspector UI layouts**.

## Acceptance Criteria

- AC-1: `MetricValue.name` field in metric schema has `z.string().max(100)` validation
- AC-2: `MetricExplanation.reason` field has `z.string().max(500)` validation
- AC-3: `MetricExplanation.contributingFactors` items have `z.string().max(200)` validation
- AC-4: Existing tests still pass after schema tightening
- AC-5: At least one test verifies rejection of over-length metric name

## Tasks / Subtasks

- [ ] **Task 1: Add length constraints to Zod schemas**
  - [ ] 1.1 Add `.max()` constraints to `metricSchema.ts` for `name` field
  - [ ] 1.2 Add `.max()` constraints to `componentSchema.ts` for `MetricExplanation.reason` and `contributingFactors` items

## Dev Notes
- Source story: [4-2a](./story-4-2a.md)
- Review findings: #8 (metric name length), #9 (explanation length caps)
- Files affected: `src/schemas/metricSchema.ts`, `src/schemas/componentSchema.ts`
- React JSX escaping already prevents XSS — this is a defense-in-depth measure for UI layout overflow
