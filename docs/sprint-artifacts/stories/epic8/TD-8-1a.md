# Tech Debt Story TD-8-1a: Stack Schema & Library Hardening

Status: done

> **Source:** KDBP Code Review (2026-03-10) on story 8-1
> **Priority:** LOW | **Estimated Effort:** Small (3 tasks, 2 files)

## Story
As a **developer**, I want **defense-in-depth limits on stack schema string lengths, position bounds, ID format constraints, and consistent type alignment with the dashboard engine**, so that **malformed Firestore data cannot exhaust client memory and type drift between StackCategoryScore and CategoryScore is prevented**.

## Acceptance Criteria

- [x] `componentId` and `variantId` fields have `.max(200)` and `.regex(/^[\w-]+$/)` format constraints
- [x] `relativePosition` x/y fields have `.min(POSITION_MIN).max(POSITION_MAX)` bounds (consistent with architectureFileSchema PositionSchema)
- [x] `StackCategoryScore` and `CategoryScore` (engine/dashboardCalculator.ts) share a single source-of-truth type or a static assertion guards against drift
- [x] Repository invalid-document drop behavior is documented (pre-existing cross-cutting pattern)
- [x] Existing tests pass; new tests cover the new limits

## Tasks / Subtasks

- [x] **Task 1:** Add string length + format constraints to stack schema IDs
  - [x] 1a. Add `.max(200)` to `componentId` and `variantId` in StackComponentSchema
  - [x] 1b. Add `.regex(/^[\w-]+$/)` to `componentId` and `variantId` for format safety
  - [x] 1c. Apply same constraints to YAML variant schemas
  - [x] 1d. Add tests for oversized and malformed IDs being rejected

- [x] **Task 2:** Add position bounds to stack schema
  - [x] 2a. Add `.min(POSITION_MIN).max(POSITION_MAX)` to relativePosition x/y
  - [x] 2b. Apply same bounds to YAML variant schema
  - [x] 2c. Add tests for out-of-bounds positions being rejected

- [x] **Task 3:** Address type drift between StackCategoryScore and CategoryScore
  - [x] 3a. Evaluate: extract shared base type to `src/types/scores.ts` OR add static assertion
  - [x] 3b. Implement chosen approach (static assertion in `src/types/scoreAlignment.ts`)
  - [x] 3c. Document repository silent-drop pattern as intentional (add JSDoc to stackRepository.ts)

## Dev Notes
- Source story: [8-1](./8-1.md)
- Review findings: #3 (type divergence), #8 (ID constraints), #9 (position bounds), #10 (silent drop)
- Files affected: `src/schemas/stackSchema.ts`, `src/lib/constants.ts`, `src/repositories/stackRepository.ts`, `src/types/scoreAlignment.ts` (new)
- Prior art: TD-5-1a and TD-5-1b applied similar hardening to architectureFileSchema
- Self-review: APPROVE 8/10 — stack `id` field hardened (review fix), variantId boundary test added
- Code review (2026-03-12): 8 quick fixes applied, 1 deferred to backlog

### Deferred Findings

| # | Finding | Stage | Destination | Tracking |
|---|---------|-------|-------------|----------|
| 8 | Repository test for schema-triggered silent drop (201-char componentId) | PROD | Backlog | `deferred-findings.md` |

<!-- CITED: none -->
<!-- ORDERING: clean -->
