# Tech Debt Story TD-7-1b: Store-Level Tests for Data Context CRUD

Status: ready-for-dev

> **Source:** KDBP Code Review (2026-03-15) on story 7-1
> **Priority:** MEDIUM | **Estimated Effort:** Small (1 file, ~80 lines)
> **Stage:** MVP

## Story
As a **developer**, I want **unit tests covering the data context CRUD actions in architectureStore**, so that **limit enforcement, sanitization, cleanup on node removal, and edge cases are verified**.

## Acceptance Criteria

**AC-1:** `addDataContextItem` — add item, verify stored; add up to limit, verify toast on overflow.

**AC-2:** `updateDataContextItem` — update name triggers sanitization; update non-existent itemId is no-op (no re-render).

**AC-3:** `removeDataContextItem` — remove last item cleans up Map key; remove from non-existent nodeId is no-op.

**AC-4:** `removeNode` / `removeNodes` — verify dataContextItems for removed node(s) are cleaned up.

**AC-5:** `loadArchitecture` — verify dataContextItems reset to empty Map.

## Tasks / Subtasks

- [ ] Task 1: Create test file
  - [ ] 1.1 Create `tests/unit/stores/architectureStore-dataContext.test.ts`
  - [ ] 1.2 Test addDataContextItem: add item, verify in store
  - [ ] 1.3 Test addDataContextItem: limit enforcement (MAX_DATA_CONTEXT_ITEMS_PER_NODE)
  - [ ] 1.4 Test updateDataContextItem: name sanitization on update
  - [ ] 1.5 Test updateDataContextItem: non-existent itemId no-op
  - [ ] 1.6 Test removeDataContextItem: last item removes key from Map
  - [ ] 1.7 Test removeNode: cleanup of dataContextItems
  - [ ] 1.8 Test loadArchitecture: resets dataContextItems

## Dev Notes
- Source story: [7-1](./7-1.md)
- Review findings: #5 (code-reviewer W3)
- Files affected: `tests/unit/stores/architectureStore-dataContext.test.ts`
