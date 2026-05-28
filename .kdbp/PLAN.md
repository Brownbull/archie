# Active Plan

<!-- status: active -->
<!-- project_type: code -->

## Goal

Epic 13: Concrete Variant Economics — Add monthlyCost, maxRPS, and baseLatencyMs to every config variant. Budget HUD on canvas, inline cost per node, cost ranges in toolbox, economics in inspector with delta indicators. Foundation for replicas (E14) and simulation engine (E15).

## Context

- **Maturity:** enterprise
- **Domain:** Software architecture visualization and design tool
- **Created:** 2026-06-02
- **Last Updated:** 2026-06-02

## Phases

| # | Phase | Description | Tier | Complexity | Exec | Review | Commit | Push |
|---|-------|-------------|------|------------|------|--------|--------|------|
| 1 | Economics schema & variant data | Extend ConfigVariant with monthlyCost/maxRPS/baseLatencyMs, author values for all 46 variants | ent | medium | ✅ | ✅ | ✅ | ✅ |
| 2 | Cost computation & inline node display | totalArchitectureCost selector, cost badge on ArchieNode, recalculate on variant switch | ent | medium | ✅ | ✅ | ✅ | ✅ |
| 3 | Budget HUD & toolbox cost ranges | Budget HUD progress bar in dashboard, cost range on toolbox cards | ent | medium | ✅ | ✅ | ✅ | ✅ |
| 4 | Inspector economics & delta indicators | Cost/RPS/latency in inspector, delta indicators on variant switch | ent | low | ✅ | ⬜ | ✅ | ⬜ |

<!-- Exec is written by /gabe-execute: ⬜ not started, 🔄 in progress, ✅ complete -->
<!-- Review/Commit/Push auto-ticked by /gabe-review, /gabe-commit, /gabe-push -->
<!-- A phase is complete when all four status columns are ✅ -->
<!-- /gabe-next routes to the next command based on column state (Exec → Review → Commit → Push → advance phase) -->
<!-- Tier column values: mvp | ent | scale. Read by /gabe-execute (tier-cap) and /gabe-review (TIER_DRIFT finding). -->
<!-- User-facing/runtime phase types require journey evidence artifacts before Exec can be ✅. -->
<!-- Manual override is fine — edit cells by hand any time -->

## Phase Details

### Phase 1 — Economics schema & variant data

```yaml
phase: 1
types: [data-model, content]
phase_tier: ent
prototype: false
dim_overrides: []
sections_considered: [Core]
suppressed_dims_count: 0
decisions_entry: D13
```

- **Tier chosen:** `ent`
- **Prototype:** no
- **Sections considered:** Core
- **Suppressed dims:** 0
- **Trade-offs accepted:** See DECISIONS.md D13
- **Key files:** `src/schemas/componentSchema.ts`, `src/data/components/*.yaml` (18 files), `src/types/index.ts`

### Phase 2 — Cost computation & inline node display

```yaml
phase: 2
types: [user-facing, client-state]
phase_tier: ent
prototype: false
dim_overrides: []
sections_considered: [Core, UI/UX, Client State]
suppressed_dims_count: 6
decisions_entry: D14
```

- **Tier chosen:** `ent`
- **Prototype:** no
- **Sections considered:** Core, UI/UX (3 dims, 1 suppressed), Client State (2 dims, 5 suppressed)
- **Suppressed dims:** 6 (Streaming, Cache invalidation, Optimistic updates, Stale data, Cross-tab sync, Offline support)
- **Trade-offs accepted:** See DECISIONS.md D14
- **Key files:** `src/stores/architectureStore.ts`, `src/components/canvas/ArchieNode.tsx`
- **Runtime evidence:** Browser verification of cost badge on nodes, updates on variant switch/add/remove

### Phase 3 — Budget HUD & toolbox cost ranges

```yaml
phase: 3
types: [user-facing, ui-kit]
phase_tier: ent
prototype: false
dim_overrides: []
sections_considered: [Core, UI/UX, UI Kit]
suppressed_dims_count: 2
decisions_entry: D15
```

- **Tier chosen:** `ent`
- **Prototype:** no
- **Sections considered:** Core, UI/UX (3 dims, 1 suppressed), UI Kit (3 dims, 1 suppressed)
- **Suppressed dims:** 2 (Streaming, Platform variance)
- **Trade-offs accepted:** See DECISIONS.md D15
- **Key files:** `src/components/dashboard/DashboardPanel.tsx`, new `src/components/dashboard/BudgetHud.tsx`, toolbox component cards
- **Runtime evidence:** Browser verification of HUD total updates, toolbox cost ranges display, zero-component empty state

### Phase 4 — Inspector economics & delta indicators

```yaml
phase: 4
types: [user-facing]
phase_tier: ent
prototype: false
dim_overrides: []
sections_considered: [Core, UI/UX]
suppressed_dims_count: 2
decisions_entry: D16
```

- **Tier chosen:** `ent`
- **Prototype:** no
- **Sections considered:** Core, UI/UX (2 dims, 2 suppressed)
- **Suppressed dims:** 2 (Streaming, Loading states)
- **Trade-offs accepted:** See DECISIONS.md D16
- **Key files:** `src/components/inspector/ComponentDetail.tsx`, `src/components/inspector/ConfigSelector.tsx`
- **Runtime evidence:** Browser verification of economics display, delta indicators on variant switch, missing-data graceful degradation

## Current Phase

Phase 4: Inspector economics & delta indicators

## Dependencies

- Phase 2 depends on Phase 1 (schema + economics data must exist before cost computation)
- Phase 3 depends on Phase 2 (Budget HUD needs totalArchitectureCost selector)
- Phase 4 depends on Phase 1 (inspector needs economics fields in schema); can parallel with Phase 3

## Risks

| Risk | Severity | Mitigation |
|------|----------|------------|
| 46 variants need economics data — content volume | medium | AI-generate all values in one batch, validate ranges per category |
| Cost data accuracy — users may treat approximations as real pricing | medium | Prominent "approximate" disclaimer constant; values are order-of-magnitude |
| ConfigVariant schema change breaks existing YAML import | low | Fields are optional with defaults — existing YAML without economics imports cleanly |
| Budget HUD placement competes with dashboard space | low | Compact single-line widget, expandable for breakdown |
| Economics fields absent on some variants during migration | medium | Typed fallback (0 or undefined) with explicit "N/A" display, never NaN |

## Notes

- Economics are component library data — NOT exported in architecture YAML skeleton (FR25: derived data is re-hydrated on import)
- Cost data source decision (from phase-3-plan.md): AI-generated approximations with "approximate — not real pricing" disclaimer
- Existing abstract metrics (1-10 scale) coexist — they serve different purposes (abstract for trade-off, concrete for simulation)
- Schema v3 is NOT bumped — economics fields are optional additions to ConfigVariant, backward-compatible
- 18 component files, 46 total variants need economics values authored

## Runtime Evidence Checkpoints

- **Phase 2:** Browser — load a blueprint, verify cost badges on all nodes, switch variant and confirm cost updates
- **Phase 3:** Browser — verify Budget HUD shows total, add/remove components and watch total change, check toolbox cards show cost ranges
- **Phase 4:** Browser — click component, verify economics section in inspector, switch variant and verify delta indicators (+$X, -Yms, +Z RPS)
