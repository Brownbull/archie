# Tech Debt Story TD-6-4b: Constraint schema DRY + deterministic import IDs

## Status: review
## Epic: Epic 6 -- Constraint Guardrails

> **Source:** KDBP Code Review (2026-03-10) on story TD-6-4a
> **Priority:** LOW | **Estimated Effort:** 1 pt (TRIVIAL — 2 localized changes)

## Story
As a **developer**, I want **constraint schema fields deduplicated and constraint ID assignment moved to the store layer**, so that **schema evolution requires updating one place and round-trip imports produce stable constraint identities**.

## Acceptance Criteria

**AC-1:** `ConstraintSchema` and `ConstraintYamlSchema` share a single field definition for `operator`, `threshold`, and `label` (e.g., via spread of a shared base object or `z.merge`)
**AC-2:** `crypto.randomUUID()` for constraint IDs is assigned in the store action that receives import results, not inside `hydrateArchitectureSkeleton` — making hydration deterministic for equal inputs

## Tasks / Subtasks

- [x] Task 1: Extract shared constraint field base
  - [x] 1.1 Create `constraintBaseFields` object with `operator`, `threshold`, `label` (including sanitize transform)
  - [x] 1.2 Refactor `ConstraintSchema` to spread `constraintBaseFields`
  - [x] 1.3 Refactor `ConstraintYamlSchema` to spread `constraintBaseFields`
  - [x] 1.4 Verify existing constraint tests still pass

- [x] Task 2: Move constraint ID assignment to store
  - [x] 2.1 Remove `crypto.randomUUID()` mapping from `hydrateArchitectureSkeleton` return
  - [x] 2.2 Add ID assignment in the store action that receives `HydratedArchitecture`
  - [x] 2.3 Update any tests that rely on constraint IDs being present after import

## Dev Notes
- Source story: [TD-6-4a](./TD-6-4a.md)
- Review findings: #1, #2
- Files changed:
  - `src/schemas/architectureFileSchema.ts` — added `constraintBaseFields`, spread into both schemas
  - `src/services/yamlImporter.ts` — `HydratedArchitecture.constraints` → `ParsedConstraint[]`, removed UUID mapping
  - `src/services/yamlExporter.ts` — updated signature to accept `ParsedConstraint[]`
  - `src/stores/architectureStore.ts` — `loadArchitecture` now assigns `crypto.randomUUID()` to constraints
