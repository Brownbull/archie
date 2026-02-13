# Tech Debt: TD-1-2B Seed Script Hardening & Schema Test Coverage

## Status: ready-for-dev
## Epic: Epic 1 — Architecture Canvas & Component Library
## Source: TD-1-2A Code Review (findings #2, #3, #6, #7)

## Overview

Deferred items from TD-1-2A code review. Two themes:

1. **Seed script robustness** — Firestore batch writes have a 500-operation limit. The current seed script writes all components in a single batch, which will fail silently or error when the component library grows beyond 500 items.

2. **Schema test coverage gaps** — YAML transform schemas lack round-trip tests (load, transform, serialize, reload = identical). Required fields don't test null/empty-string rejection. Seed script has 0% automated test coverage.

## Tasks

### Task 1: Firestore Batch Chunking
- [ ] 1.1 Implement batch chunking in `scripts/seed-firestore.ts` (500-op limit per batch)
- [ ] 1.2 Include metadata write in chunk accounting
- [ ] 1.3 Log chunk progress (`Batch 1/3 committed...`)

### Task 2: Seed Script Integration Tests
- [ ] 2.1 Create `tests/unit/scripts/seed-firestore.test.ts`
- [ ] 2.2 Mock Firebase Admin SDK (initializeApp, getFirestore, batch)
- [ ] 2.3 Test `--dry-run` flag (validates but skips writes)
- [ ] 2.4 Test missing `GOOGLE_APPLICATION_CREDENTIALS` error path
- [ ] 2.5 Test malformed YAML rejection via seed pipeline

### Task 3: Schema Edge Case Tests
- [ ] 3.1 Add round-trip tests for StackYamlSchema and BlueprintYamlSchema (snake_case in, camelCase out, matches base schema)
- [ ] 3.2 Add empty string rejection tests for required `id`, `name`, `description` fields across all schemas
- [ ] 3.3 Add null value rejection tests for required fields

## Acceptance Criteria

- Seed script handles >500 components without error
- Seed script has integration tests covering happy path, dry-run, error paths
- All YAML schemas have round-trip identity tests
- All required string fields reject empty strings and null values
