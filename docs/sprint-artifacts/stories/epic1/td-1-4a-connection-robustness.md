# Story: TD-1-4a Connection Robustness & Test Infrastructure

## Status: done
## Epic: Epic 1 — Architecture Canvas & Component Library
## Source: Code review of Story 1-4 (2026-02-12)

## Overview

Tech debt items deferred from Story 1-4 code review. Six COMPLEX findings grouped into three themes: store robustness, compatibility logic, and test infrastructure.

## Items

### 1. Batch Node Deletion (Finding #4 — MEDIUM)

**Problem:** `CanvasView.onNodesDelete` iterates `removeNode(id)` per node in a loop. Each call triggers a separate Zustand `set()` and cascade-edge-filter. For multi-node selection + Delete, this produces N store updates instead of 1 batch.

**Fix:** Add a `removeNodes(nodeIds: string[])` batch action to `architectureStore` that filters nodes and edges in a single `set()` call. Update `CanvasView.onNodesDelete` to call the batch version.

**Files:** `src/stores/architectureStore.ts`, `src/components/canvas/CanvasView.tsx`, `tests/unit/stores/architectureStore.test.ts`

### 2. Cross-Store Coupling in removeNode (Finding #5 — LOW)

**Problem:** `architectureStore.removeNode` directly reads and writes `uiStore` state (selectedNodeId and selectedEdgeId). This creates tight coupling between stores that will compound as more stores are added.

**Fix:** Consider an event-based decoupling pattern (e.g., a `subscribe` listener in `uiStore` that reacts to node removal) or a thin coordination layer. At minimum, document the coupling pattern with a code comment. Note: TD-1-3a Item 3 tracks this same pattern — consolidate the fix.

**Files:** `src/stores/architectureStore.ts`, `src/stores/uiStore.ts`

### 3. Bidirectional Compatibility Check (Finding #6 — MEDIUM)

**Problem:** `checkCompatibility()` only checks `source.compatibility[target.category]`. If `target.compatibility[source.category]` also has a warning, it is silently ignored. Some connections may appear compatible in one direction but not the other.

**Fix:** Check both directions and merge warnings. Return the first found (or concatenate both reasons). This ensures a CDN→DB connection is flagged regardless of which node is the source.

**Files:** `src/engine/compatibilityChecker.ts`, `tests/unit/engine/compatibilityChecker.test.ts`

### 4. YAML String Sanitization (Finding #10 — MEDIUM)

**Problem:** When Epic 3 adds YAML import, user-provided component names, descriptions, and compatibility reasons will flow into the DOM. Currently no sanitization layer exists between YAML parse and render.

**Fix:** Create a `sanitizeDisplayString(input: string): string` utility that strips HTML tags and trims length. Wire it into the YAML import pipeline. This is a future-facing guard — the risk is low today since all data comes from componentLibrary (trusted), but should be in place before Epic 3.

**Files:** New `src/lib/sanitize.ts`, tests for it, integration point TBD in Epic 3 YAML import

### 5. E2E Helpers Deduplication (Finding #16 — LOW)

**Problem:** `canvas-and-placement.spec.ts` and `connection-wiring.spec.ts` both define identical helpers (`waitForComponentLibrary`, `dragComponentToCanvas`). This will proliferate as more specs are added.

**Fix:** Extract shared E2E helpers into `tests/e2e/helpers/` (e.g., `tests/e2e/helpers/canvas-helpers.ts`). Import from both specs.

**Files:** New `tests/e2e/helpers/canvas-helpers.ts`, `tests/e2e/canvas-and-placement.spec.ts`, `tests/e2e/connection-wiring.spec.ts`

### 6. Float Equality in findNextAvailablePosition (Finding #24 — LOW)

**Problem:** `findNextAvailablePosition` in `architectureStore` compares positions with strict equality (`===`). Floating-point imprecision from React Flow's zoom/pan could cause nodes to overlap if positions differ by tiny fractions.

**Fix:** Use an epsilon-based comparison (e.g., `Math.abs(a - b) < 1`) for position collision detection.

**Files:** `src/stores/architectureStore.ts`, `tests/unit/stores/architectureStore.test.ts`

## E2E Coverage Gap

**AC-5 (Incompatible Connection WARN Badge):** No E2E test covers connecting incompatible components and verifying the WARN badge appears. This requires seeded component data with `compatibility` records in Firestore. Add when test infrastructure supports incompatible component pairs.

## Acceptance Criteria

- AC-1: Multi-node deletion produces a single Zustand batch update (not N updates)
- AC-2: Cross-store coupling is documented or decoupled (consolidate with TD-1-3a Item 3)
- AC-3: Bidirectional compatibility check flags warnings from either direction
- AC-4: Sanitization utility exists and is tested (integration deferred to Epic 3)
- AC-5: E2E helpers extracted to shared module, imported by all canvas specs
- AC-6: Position collision detection uses epsilon comparison
- AC-7: AC-5 WARN badge E2E test added (when test data supports it)

## Priority

LOW-MEDIUM — Items 1 and 3 improve correctness. Items 2, 5, 6 are defense-in-depth. Item 4 is a forward-looking guard for Epic 3. None are functional bugs in current MVP.

## Senior Developer Review (ECC)

**Date:** 2026-02-13
**Classification:** COMPLEX (4 agents)
**Score:** 8.5/10 — APPROVED

### Agent Scores

| Agent | Score | Status |
|-------|-------|--------|
| Code Quality | 8/10 | APPROVED (after dismissing 4 inapplicable findings) |
| Security | 9/10 | APPROVED |
| Architecture | 9/10 | APPROVED (7/7 file location compliance, no violations) |
| Testing | 8/10 | APPROVED |

### Findings Summary

| # | Sev | Finding | Disposition |
|---|-----|---------|-------------|
| 1 | CRITICAL | 3 new files untracked in git | QUICK — noted in commit commands |
| 2 | LOW | POSITION_EPSILON not in constants.ts | DEFERRED → td-1-4b |
| 3 | LOW | ReDoS potential in sanitizer regex | DEFERRED → td-1-4b |
| 4 | LOW | Unicode normalization missing in sanitizer | DEFERRED → td-1-4b |

### Dismissed Findings
- Missing barrel export — no `src/lib/index.ts` exists in project
- Cross-store coupling — AC-2 satisfied (documented with detailed comment)
- Sanitization not integrated — AC-4 satisfied (integration explicitly deferred to Epic 3)
- E2E helpers lack JSDoc — already have JSDoc comments

### Tech Debt Created
- **td-1-4b-sanitizer-hardening** (ready-for-dev): ReDoS guard, Unicode normalization, constant consolidation
