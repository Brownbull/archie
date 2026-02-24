# Story: TD-CROSS-1 Shared Test Infrastructure

## Status: done
## Epic: Cross-cutting (assigned to Epic 3 backlog — first epic to benefit)
## Source: Cross-epic hardening analysis during Epic 3 story creation (2026-02-15)

## Overview

Cross-cutting tech debt identified during cross-epic analysis. Addresses duplicated test factory functions (makeComponent, makeMetric, makeNode, makeEdge) across 8+ test files and inconsistent componentLibrary mock patterns across 6+ files.

Every epic adds 3-5+ test files that each independently define the same factory functions with slightly different signatures and defaults. Epic 3 will add yamlImporter, yamlExporter, round-trip integration, blueprint loading, and adversarial test files — all needing these patterns. Extracting shared test infrastructure NOW prevents compounding duplication.

## Functional Acceptance Criteria

**AC-1: Shared Factory Functions**
**Given** a test file needs test component, metric, node, or edge data
**When** it imports from `tests/helpers/factories.ts`
**Then** it gets well-typed factory functions with sensible defaults and override patterns
**And** all existing test files that use inline factories can migrate to the shared factories

**AC-2: Shared componentLibrary Mock**
**Given** a test file needs to mock the componentLibrary service
**When** it imports from `tests/helpers/mockComponentLibrary.ts`
**Then** it gets a pre-configured mock with standard test components (postgresql, redis, nginx, kafka, etc.)
**And** the mock supports adding custom components for test-specific scenarios

**AC-3: Shared Architecture State Fixtures**
**Given** a test file needs pre-built architecture scenarios
**When** it imports from `tests/helpers/fixtures.ts`
**Then** it gets reusable scenarios: empty architecture, single node, connected pair, full 5+ node architecture
**And** each scenario returns typed nodes and edges compatible with architectureStore

**AC-4: Existing Tests Unaffected**
**Given** existing tests use inline factory functions
**When** the shared factories are created
**Then** existing tests continue to pass without modification (migration is incremental, not forced)

## Tasks / Subtasks

### Task 1: Create Shared Test Helpers
- [x] 1.1 Create `tests/helpers/factories.ts` with:
  - `makeComponent(overrides?)` — returns a valid Component with defaults
  - `makeConfigVariant(overrides?)` — returns a valid ConfigVariant with defaults
  - `makeMetric(overrides?)` — returns a valid MetricValue with defaults
  - `makeNode(overrides?)` — returns a valid ArchieNode with defaults (position, data, type)
  - `makeEdge(overrides?)` — returns a valid ArchieEdge with defaults (source, target, data)
  - All factories use `Partial<T>` overrides pattern for flexibility
- [x] 1.2 Create `tests/helpers/mockComponentLibrary.ts` with:
  - `createMockComponentLibrary(components?)` — returns a mocked componentLibrary with standard test components
  - Standard test component set: postgresql, redis, nginx, kafka, mongodb (matching seed data IDs)
  - Each test component has 2 config variants with different metrics
  - Auto-wires `vi.mock()` for the componentLibrary module
- [x] 1.3 Create `tests/helpers/fixtures.ts` with:
  - `emptyArchitecture()` — `{ nodes: [], edges: [] }`
  - `singleNodeArchitecture()` — one postgresql node at default position
  - `connectedPairArchitecture()` — two nodes with one edge
  - `fullArchitecture()` — 5+ nodes, 4+ edges, mixed categories
- [x] 1.4 Add a `tests/helpers/index.ts` barrel export for convenience
- [x] 1.5 Verify all factory output passes Zod schema validation (factories produce valid data)

### Task 2: Migrate Sample Test Files & Verify
- [x] 2.1 Migrate `tests/unit/engine/recalculator.test.ts` to use shared factories (highest duplication)
- [x] 2.2 Migrate `tests/unit/services/recalculationService.test.ts` to use shared factories
- [x] 2.3 Migrate `tests/unit/stores/architectureStore.test.ts` to use shared mockComponentLibrary
- [x] 2.4 Run `npm run test:quick` — all tests pass after migration
- [x] 2.5 Run `npx tsc --noEmit` — no type errors

## Dev Notes

- Factory functions should use `crypto.randomUUID()` for default IDs to prevent collision between tests
- The override pattern should be shallow merge: `{ ...defaults, ...overrides }` — not deep merge (keeps it simple)
- Standard test components should match actual seed data component IDs where possible (postgresql, redis, nginx) to avoid confusion
- Migrating ALL existing test files is NOT required — migrate 3-4 to prove the pattern, then new Epic 3 tests use shared factories from the start
- This story should be done BEFORE Story 3-1 development begins (or as the first task of Story 3-1)
- The `tests/helpers/` directory pattern aligns with AR22 (test structure mirrors src/)

### Cross-Cutting Dependencies

**DEPENDS ON (inbound):**
- Epic 1: existing test files with duplicated factories (the source of duplication)
- Epic 2: additional duplicated factories in engine/dashboard test files

**CONSUMED BY (outbound):**
- Story 3-1, 3-2, 3-3: new test files use shared factories and mocks
- TD-3-1a: adversarial tests use shared factories
- TD-3-3a: blueprint loading tests use shared factories
- Epic 4: all future test files

## ECC Analysis Summary
- Risk Level: LOW (adds test infrastructure, no production code changes)
- Complexity: Low
- Sizing: SMALL (2 tasks, ~10 subtasks, ~6 files)
- Source: Cross-epic hardening analysis (Finding 1, Finding 3)
- Key patterns: Pattern 4 (E2E/test infrastructure), shared mock patterns

## Senior Developer Review (ECC)

**Date:** 2026-02-15
**Classification:** COMPLEX (11 files)
**Agents:** code-reviewer (9/10), security-reviewer (10/10), architect (9/10), tdd-guide (9/10, TEA 91/100)
**Overall Score:** 9/10 — APPROVED

**Findings (8 total, all QUICK — fixed in session):**
1. (LOW) Added `searchComponents` test coverage (4 tests)
2. (LOW) Added immutability comment to `STANDARD_TEST_COMPONENTS`
3. (LOW) Added type assertion comment to `makeNode`
4. (INFO) Improved `vi.hoisted` drift warning comment in architectureStore.test.ts
5. (INFO) Removed unused `_metricsAfterGen1`/`_metricsAfterGen2` variables
6. (INFO) Exported `ArchitectureFixture` interface from fixtures.ts + barrel
7. (INFO) Added incompatible edge assertion to fullArchitecture tests
8. (INFO) Boundary coverage noted (no action — outside factory scope)

**Tests:** 857 passed (60 files) — 5 new tests added during review
**TD Stories:** 0 (all items fixed in session)
