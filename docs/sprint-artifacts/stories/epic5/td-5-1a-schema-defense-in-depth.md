# Tech Debt Story TD-5-1a: Schema Defense-in-Depth Hardening

Status: done

> **Source:** KDBP Code Review (2026-03-06) on story 5-1
> **Priority:** LOW | **Estimated Effort:** Small (3 tasks, 2 files)

## Story
As a **developer**, I want **defense-in-depth limits on schema array sizes, string lengths, and a static assertion on METRIC_CATEGORIES count**, so that **malicious or malformed YAML cannot exhaust client-side memory and schema construction bugs are caught at module load**.

## Acceptance Criteria

- [x] `z.array()` for nodes and edges in `ArchitectureFileSchema` has `.max(N)` limits (align with `MAX_CANVAS_NODES` for nodes, reasonable limit for edges)
- [x] String fields (id, name, componentId, etc.) have `.max(256)` or similar length caps
- [x] `architectureFileSchema.ts` has a static assertion that `METRIC_CATEGORIES.length === 7` at module level, throwing if violated
- [x] Existing tests still pass; new tests cover the new limits

## Tasks / Subtasks

- [x] **Task 1:** Add array size limits to schema
  - [x] 1a. Add `.max(MAX_CANVAS_NODES)` to nodes array
  - [x] 1b. Add `.max(200)` (or similar) to edges array
  - [x] 1c. Add tests for oversized arrays being rejected

- [x] **Task 2:** Add string length limits to schema fields
  - [x] 2a. Add `.max(256)` to id, componentId, sourceNodeId, targetNodeId fields
  - [x] 2b. Add `.max(256)` to name, libraryVersion fields
  - [x] 2c. Apply same limits to YAML variant schemas
  - [x] 2d. Add tests for oversized strings being rejected

- [x] **Task 3:** Add static assertion for METRIC_CATEGORIES count
  - [x] 3a. Add `if (METRIC_CATEGORIES.length !== 7) throw` at module level in architectureFileSchema.ts
  - [x] 3b. Add test verifying the assertion exists (or test the schema behavior with correct count)

## Deferred Items (from code review)

| TD Story | Description | Priority | Action |
|----------|-------------|----------|--------|
| td-5-1b | PositionSchema unbounded x/y + static assertion throw-path test | LOW | CREATED |

## Senior Developer Review (KDBP)
- **Date:** 2026-03-06
- **Agents:** code-reviewer, tdd-guide (SIMPLE classification)
- **Outcome:** APPROVE (8/10) — 7 quick fixes applied, 2 deferred to td-5-1b
- **Action items:** 0 remaining (all quick fixes applied, tests green)
<!-- CITED: none -->

## Dev Notes
- Source story: [5-1](./5-1.md)
- Review findings: #3, #6, #7
- Files affected: `src/schemas/architectureFileSchema.ts`
