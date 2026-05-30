# Active Plan

<!-- status: active -->
<!-- project_type: code -->

## Goal

Tech-debt cleanup — burn down the open PENDING items (D1–D7) accumulated across Phase 3. Behavior-preserving refactors (file splits, render-safe hooks) + restoring test/UX signal. No new product scope. Each phase verified by the full suite (3218 baseline) staying green.

## Context

- **Maturity:** enterprise
- **Domain:** Software architecture visualization and design tool
- **Created:** 2026-05-30
- **Last Updated:** 2026-05-30
- **Source:** `.kdbp/PENDING.md` D1–D7 (Phase 3 deferred debt). Epic 17 + roadmap complete (archived).

## Phases

| # | Phase | Description | Tier | Complexity | Exec | Review | Commit | Push |
|---|-------|-------------|------|------------|------|--------|--------|------|
| 1 | D4 — ComponentDetail render-safe previous-variant | Replace the render-phase `previousVariantIdRef.current` read with React's "adjust state during render" previous-value pattern; clears the 6 react-hooks/refs errors. Behavior-preserving (variant-change cost delta unchanged). | ent | medium | ✅ | ✅ | ✅ | ⬜ |
| 2 | D3 — split architectureStore.ts (<800) | Extract action groups (nodes / edges / constraints / data-context) into composed slice creators; keep the `useArchitectureStore` public API identical. Store test suite is the safety net. | ent | high | ✅ | ✅ | ✅ | ⬜ |
| 3 | D2 + D6 — split oversized test files | Split architectureStore.test.ts (1455) + ArchieNode.test.tsx (834) into per-feature files mirroring the existing convention; shared fixtures extracted. | ent | medium | ✅ | ✅ | ✅ | ⬜ |
| 4 | D5 — refresh stale Epic-12 E2E specs | Update specs asserting the old generic `archie-node-handle-*` testids to the typed `port-handle-*` model; re-green the e2e run. | ent | medium | ⬜ | ⬜ | ⬜ | ⬜ |
| 5 | D1 — port-handle hover tooltips | Tooltip on port dots communicating port type/direction (e.g. "HTTP Out", "Database In"). | ent | medium | ⬜ | ⬜ | ⬜ | ⬜ |
| 6 | D7 — cycle-topology flow accounting | Refine simulationEngine flow accounting for DAG-feeds-into-cycle topologies (overcount on cycle members). | ent | low | ⬜ | ⬜ | ⬜ | ⬜ |

<!-- Exec: ⬜/🔄/✅. Review/Commit/Push auto-ticked. User-facing/web phases require runtime journey evidence. -->

## Current Phase

Phase 1: D4 — ComponentDetail render-safe previous-variant

## Dependencies

- Independent items; ordered by value/risk. P3 (test splits) preserves the store/component public APIs, so it's unaffected by P1/P2. Push in logical batches to limit deploy churn (refactors are not user-facing except D1/D5).

## Risks

| Risk | Severity | Mitigation |
|------|----------|------------|
| Store split (D3) breaks internal get/set wiring | high | Slice creators receive (get,set); cross-slice calls via get(); full store test suite (1455 lines) must stay green |
| Test-file split drops coverage or breaks hoisted mocks | medium | Move whole describe blocks verbatim; each file keeps its own vi.mock + fixtures; assert total test count is preserved |
| D4 previous-variant timing changes the delta UX | medium | Adjust-state-during-render reproduces persist-until-next-change behavior; ComponentDetail tests cover the delta |
