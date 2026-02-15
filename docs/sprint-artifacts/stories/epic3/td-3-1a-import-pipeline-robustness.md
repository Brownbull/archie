# Story: TD-3-1a Import Pipeline Robustness

## Status: ready-for-dev
## Epic: Epic 3 — YAML Workflow & Content Library
## Source: Hardening analysis during Epic 3 story creation (2026-02-15)

## Overview

Tech debt from Story 3-1 hardening analysis. Addresses adversarial test coverage gaps and edge case resilience in the YAML import pipeline — the primary attack surface where untrusted user files enter the application.

Story 3-1 builds the core import pipeline with schema validation, sanitization, and error handling (Pattern 1, 2, 3 BUILT-IN). This TD story adds **adversarial test coverage** that probes the pipeline with malicious and pathological inputs: deeply nested YAML, massive arrays, Unicode homoglyphs, concurrent imports, and edge cases in schema version handling.

## Functional Acceptance Criteria

**AC-1: Deeply Nested YAML Rejection**
**Given** an imported YAML file with excessively nested objects (e.g., 50+ levels of nesting)
**When** the import pipeline processes it
**Then** parsing either completes without stack overflow or the pipeline rejects it with a clear error
**And** the application does not crash or hang

**AC-2: Oversized Array Handling**
**Given** an imported YAML file with an extremely large `nodes` array (e.g., 1000+ nodes, still under 1MB)
**When** the import pipeline processes it
**Then** the pipeline validates and either imports (if under MAX_CANVAS_NODES) or rejects with a "too many components" error
**And** hydration does not degrade UX responsiveness (no blocking >2s on main thread)

**AC-3: Unicode Homoglyph Resilience**
**Given** an imported YAML with component IDs or field values containing Unicode homoglyphs (e.g., Cyrillic "а" vs Latin "a")
**When** the import pipeline processes it
**Then** NFC normalization is applied before lookup, preventing ID mismatch due to visually identical but byte-different strings
**And** a test validates that homoglyph IDs do not bypass validation

**AC-4: Concurrent Import Guard**
**Given** the user triggers two imports in rapid succession (double-click or drop two files)
**When** both imports attempt to run
**Then** only one import executes — the second is rejected or queued
**And** the canvas is not left in a partially-loaded state

**AC-5: Schema Version Edge Cases**
**Given** YAML files with edge-case version strings (empty string, non-semver, "0.0.0", "999.0.0", missing field)
**When** the version check runs
**Then** each case produces a specific, clear error message
**And** no version string causes an unhandled exception

**AC-6: Empty/Minimal YAML Edge Cases**
**Given** valid YAML files with minimal content (empty nodes array, empty edges array, single node with no edges, nodes with positions at 0,0)
**When** the import pipeline processes them
**Then** each case imports successfully without errors
**And** the canvas reflects the correct state (empty canvas for empty arrays, single node at origin)

**AC-7: URL Field Validation (when URL fields are added to schema)**
**Given** the YAML schema is extended with URL fields (e.g., `docs_url`, `icon_url`)
**When** a YAML file contains URL values
**Then** only `https://` URLs are accepted — `javascript:`, `data:`, and `http://` URIs are rejected
**And** Zod schema uses `.url().refine()` or custom validator to enforce this at the schema layer
**Note:** No URL fields exist in v1.0.0 schema. This AC activates when URL fields are added (security rule: `.claude/rules/security.md`).

## Tasks / Subtasks

### Task 1: Adversarial Input Test Suite
- [ ] 1.1 Create `tests/unit/services/yamlImporter-adversarial.test.ts` (separate file to keep test suite organized)
- [ ] 1.2 Test: deeply nested YAML object (50+ levels) — verify no stack overflow, graceful handling
- [ ] 1.3 Test: nodes array with MAX_CANVAS_NODES+1 entries — verify rejection with clear error
- [ ] 1.4 Test: nodes array with 500 entries (under file size limit) — verify pipeline performance (should complete <2s)
- [ ] 1.5 Test: Unicode homoglyph in component_id (Cyrillic "а" vs Latin "a") — verify NFC normalization prevents mismatch
- [ ] 1.6 Test: schema_version edge cases — empty string, "not-semver", "0.0.0", "999.0.0", null, undefined, number instead of string
- [ ] 1.7 Test: empty nodes/edges arrays — verify successful import to empty canvas
- [ ] 1.8 Test: single node at position {x: 0, y: 0} — verify placement at origin works
- [ ] 1.9 Test: node with negative position values — verify grid-snap handles negatives
- [ ] 1.10 Test: duplicate node IDs in the YAML — verify detection and rejection (or dedup behavior)
- [ ] 1.11 Test: edge referencing non-existent node IDs — verify graceful handling (skip edge, not crash)
- [ ] 1.12 Test: YAML with only whitespace/comments — verify clean rejection

### Task 2: Concurrent Import Guard & Integration
- [ ] 2.1 Add import-in-progress guard to `yamlImporter.ts` or `ImportDialog.tsx` — prevent concurrent imports
- [ ] 2.2 Disable Import button while import is processing (loading state)
- [ ] 2.3 Test: rapid double-import attempt — verify only one executes
- [ ] 2.4 Test: import while previous import is still hydrating — verify rejection message
- [ ] 2.5 Run `npx tsc --noEmit` — no type errors
- [ ] 2.6 Run `npm run test:quick` — all tests pass

## Dev Notes

- Task 1 is the primary deliverable — comprehensive adversarial test coverage for the security boundary
- Task 2 adds a practical UX guard that prevents race conditions during import
- The MAX_CANVAS_NODES constant (50) from `src/lib/constants.ts` should be checked during import, not just relied on at the canvas level
- Unicode normalization: `sanitizeDisplayString()` already applies NFC normalization — the test validates that IDs (not just display strings) also get normalized before library lookup
- Concurrent import: simplest approach is a `let importInProgress = false` module-level flag in yamlImporter.ts (reset on success or failure)
- All adversarial tests should use inline YAML strings (not fixture files) for clarity and maintainability

### Cross-Cutting Dependencies

**DEPENDS ON (inbound):**
- Story 3-1: yamlImporter.ts (the pipeline being hardened), architectureFileSchema.ts (schema being tested)

**CONSUMED BY (outbound):**
- None — terminal hardening story

## ECC Analysis Summary
- Risk Level: LOW (adds tests and one guard, no structural changes)
- Complexity: Low-Medium
- Sizing: SMALL (2 tasks, ~14 subtasks, ~3 files)
- Agents consulted: Architect, Security Reviewer
- Key patterns: Pattern 1 (data pipeline edge cases), Pattern 3 (input sanitization adversarial testing)
