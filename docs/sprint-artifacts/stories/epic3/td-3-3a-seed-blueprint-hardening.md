# Story: TD-3-3a Seed & Blueprint Hardening

## Status: ready-for-dev
## Epic: Epic 3 — YAML Workflow & Content Library
## Source: Hardening analysis during Epic 3 story creation (2026-02-15)

## Overview

Tech debt from Story 3-3 hardening analysis. Addresses robustness gaps in the seed script's blueprint processing and the blueprint loading path in componentLibrary.

Story 3-3 builds the blueprint seed pipeline and loading UI with basic error handling (Pattern 1, 2 BUILT-IN). This TD story adds **seed script validation depth** and **blueprint cache resilience testing** — ensuring the seed script fails clearly on malformed blueprints and the loading path handles stale, corrupted, or partial cache data gracefully.

## Functional Acceptance Criteria

**AC-1: Seed Script Blueprint Validation**
**Given** a blueprint YAML file with invalid content (referencing non-existent component IDs, malformed skeleton, missing required fields)
**When** the seed script processes it
**Then** the invalid blueprint is skipped with a clear error log (component ID X not found in seed data)
**And** other valid blueprints still seed successfully
**And** the exit code reflects partial failure

**AC-2: Seed Script Cross-Reference Check**
**Given** the seed script processes blueprint YAML files
**When** it encounters `component_id` or `config_variant_id` references in nodes
**Then** it validates each reference against the already-seeded component data
**And** reports any orphaned references as warnings (not silent failures)

**AC-3: Blueprint Cache Miss Resilience**
**Given** the componentLibrary cache has blueprint metadata but the referenced components are missing from the component cache
**When** a user loads that blueprint from the BlueprintTab
**Then** the hydration pipeline creates placeholder nodes for missing components (reusing Story 3-1 placeholder pattern)
**And** the user sees the architecture with placeholders, not a blank canvas or crash

**AC-4: Empty Blueprint Skeleton**
**Given** a blueprint with an empty skeleton (no nodes, no edges)
**When** it is loaded onto the canvas
**Then** the canvas is cleared (replacing any existing architecture) and shows an empty state
**And** the dashboard and heatmap reflect "no data" (not stale previous values)

**AC-5: Seed Script Idempotency**
**Given** the seed script runs twice in a row
**When** blueprint documents already exist in Firestore
**Then** documents are overwritten (upsert) without creating duplicates
**And** the second run completes successfully with no errors

## Tasks / Subtasks

### Task 1: Seed Script Blueprint Validation
- [ ] 1.1 Add cross-reference validation to seed script: after seeding components, validate each blueprint's `component_id` and `config_variant_id` references against the seeded component data
- [ ] 1.2 Log clear warnings for orphaned references: "Blueprint 'whatsapp-messaging' node 'node-1' references component 'unknown-comp' which is not in the component library"
- [ ] 1.3 Add seed script test: blueprint with valid component references → seeds successfully
- [ ] 1.4 Add seed script test: blueprint with invalid component_id → warning logged, blueprint still seeds (reference is a warning, not a blocker — the runtime handles it via placeholders)
- [ ] 1.5 Add seed script test: blueprint with missing required fields (no skeleton, no name) → skipped with error log
- [ ] 1.6 Verify idempotency: run seed twice in test → same result, no duplicates

### Task 2: Blueprint Loading Edge Cases
- [ ] 2.1 Add test in componentLibrary: `getBlueprint()` returns undefined for non-existent ID
- [ ] 2.2 Add test in componentLibrary: `getAllBlueprints()` returns empty array when no blueprints cached
- [ ] 2.3 Add integration test: load blueprint with a node referencing a component not in cache → placeholder node created (reuses Story 3-1 placeholder path)
- [ ] 2.4 Add integration test: load blueprint with empty skeleton → canvas clears, shows empty state
- [ ] 2.5 Add test: BlueprintTab renders empty state when `getAllBlueprints()` returns `[]`
- [ ] 2.6 Run `npx tsc --noEmit` — no type errors
- [ ] 2.7 Run `npm run test:quick` — all tests pass

## Dev Notes

- Task 1 focuses on the seed script as a development-time safety net — catching data quality issues before they reach production
- Task 2 focuses on runtime resilience — ensuring the app degrades gracefully when blueprint data is incomplete
- Cross-reference validation in the seed script is a WARNING, not a blocker — blueprints with unknown components are still valid (the runtime uses placeholders). But the warning catches accidental typos during content creation
- The idempotency test verifies Firestore `set()` (upsert) behavior, not `create()` — important for re-running seeds during development
- Blueprint loading through the hydration pipeline is already covered by Story 3-3 AC-3 (interactivity) — this TD focuses on the edge cases where data is missing or malformed

### Cross-Cutting Dependencies

**DEPENDS ON (inbound):**
- Story 3-3: seed-firestore.ts (blueprint seeding), componentLibrary.ts (blueprint caching), BlueprintTab.tsx (UI)
- Story 3-1: PlaceholderNode (reused for missing components in blueprints), hydration pipeline

**CONSUMED BY (outbound):**
- None — terminal hardening story

## ECC Analysis Summary
- Risk Level: LOW (adds validation and tests, minimal production code changes)
- Complexity: Low
- Sizing: SMALL (2 tasks, ~13 subtasks, ~4 files)
- Agents consulted: Architect, Security Reviewer
- Key patterns: Pattern 1 (seed script hardening, cross-reference validation), Pattern 5 (empty state handling for blueprints)
