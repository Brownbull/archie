# Tech Debt: TD-1-2A Schema Alignment & Seed Script Consolidation

## Status: done
## Epic: Epic 1 — Architecture Canvas & Component Library
## Source: Story 1-2 Code Review (findings #5, #17)

## Overview

Two related schema alignment issues discovered during Story 1-2 code review:

1. **Seed script duplicates Zod schemas** — `scripts/seed-firestore.ts` defines its own validation schemas instead of importing from `src/schemas/`. This means schema changes must be applied in two places, creating drift risk.

2. **StackSchema and BlueprintSchema lack YAML transform variants** — `ComponentSchema` has a `ComponentYamlSchema` that handles `snake_case` to `camelCase` transforms for YAML import. `StackSchema` and `BlueprintSchema` have no equivalent, so YAML import of stacks/blueprints would fail on snake_case fields like `component_ids` or `config_overrides`.

## Tasks

### Task 1: Consolidate Seed Script Schemas
- [x] 1.1 Refactor `scripts/seed-firestore.ts` to import schemas from `src/schemas/` instead of duplicating them
- [x] 1.2 If Firebase Admin SDK environment prevents direct import, create a shared schema package or use path aliases
- [x] 1.3 Remove duplicated schema definitions from the seed script
- [x] 1.4 Verify `npm run seed:firestore -- --dry-run` still works after refactor

### Task 2: Add YAML Transform Variants for Stack & Blueprint Schemas
- [x] 2.1 Create `StackYamlSchema` in `src/schemas/stackSchema.ts` with snake_case→camelCase transforms (e.g., `component_ids` → `componentIds`)
- [x] 2.2 Create `BlueprintYamlSchema` in `src/schemas/blueprintSchema.ts` with snake_case→camelCase transforms
- [x] 2.3 Export the new YAML schemas and their inferred types
- [x] 2.4 Write unit tests for each YAML schema variant (valid transform, reject camelCase input, reject invalid data)

## Acceptance Criteria

- Seed script uses single source of truth schemas from `src/schemas/`
- All three entity types (component, stack, blueprint) have YAML transform variants
- No schema duplication across codebase
- All existing tests continue to pass

## Senior Developer Review (ECC)

**Date:** 2026-02-13
**Classification:** SIMPLE | **Agents:** code-reviewer, tdd-guide
**Score:** 7/10 | **Status:** APPROVED (with deferred items)

### Quick Fixes Applied
1. Added try/catch around `load()` in seed script (prevents crash on malformed YAML)
2. Updated credential error message to mention Firebase emulator option
3. Consistent `ERROR:` prefix format across all error messages

### Deferred to TD-1-2B
- Firestore batch chunking (500-op limit)
- Seed script integration tests (0% coverage)
- Schema round-trip and edge case tests (empty string, null)

**TD Story Created:** [td-1-2b-seed-hardening](td-1-2b-seed-hardening.md)
