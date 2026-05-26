# Active Plan

<!-- status: active -->
<!-- project_type: code -->
<!-- created: 2026-05-25 -->
<!-- last_updated: 2026-05-26T14:30 -->
<!-- phase_advanced: 1→2 on 2026-05-26 -->
<!-- goal: Factorio-fy Archie — transform from plain design platform to game-like interactive experience -->

## Goal

Transform archie from a plain design platform into a game-like interactive experience with Factorio-inspired intelligence, contextual actions, and visual feedback systems. Prioritize compatibility intelligence, radial context menus, ghost placement suggestions, ALT-mode overlays, and connection flow animations.

## Phases

| # | Phase | Description | Tier | Complexity | Exec | Review | Commit | Push |
|---|-------|-------------|------|------------|------|--------|--------|------|
| 1 | Compatibility Intelligence UI | Dim incompatible components during drag, highlight valid targets, "why not" tooltips, context-filtered palette | ent | high | ✅ | ✅ | ✅ | ✅ |
| 2 | Radial Context Menu | Right-click/hold → 6-8 item radial with contextual actions (connect, inspect, swap tier, duplicate, delete, trade-offs) | ent | med | ✅ | ⬜ | ⬜ | ⬜ |
| 3 | Ghost Placement & Suggestions | Semi-transparent ghost outlines of recommended next components near open connections, powered by recommendationEngine | ent | high | ⬜ | ⬜ | ⬜ | ⬜ |
| 4 | ALT-Mode Overlay System | Toggle between information layers (Compatibility, Performance, Cost, Tier, Flow) — each transforms visuals without changing layout | ent | med | ⬜ | ⬜ | ⬜ | ⬜ |
| 5 | Connection Flow Animation + Status Dots | Animated traveling dots on connections, colored status indicators on components, quick-replace gesture | ent | med | ⬜ | ⬜ | ⬜ | ⬜ |

## Dependencies

- Phase 1 → Phase 3 (ghost suggestions need compatibility logic)
- Phase 1 → Phase 5 (flow animation reuses connection type knowledge)
- Phase 2 is independent (can parallel with 1)
- Phase 4 is independent (can parallel with 3 or 5)

## Risks

- **XyFlow extension API** — radial menu and ghost overlays need custom node/edge rendering. May require React Flow Pro features or workarounds.
- **Performance** — overlay re-renders on 50+ nodes with animations could cause jank. Need requestAnimationFrame/CSS-only animations.
- **recommendationEngine maturity** — ghost suggestions quality depends on how rich the current recommendation data is.

## Current Phase

Phase 2 — Radial Context Menu

## Phase Details

### Phase 1 Details

```yaml
phase: 1
types: [user-facing, client-state]
phase_tier: ent
prototype: false
dim_overrides: []
sections_considered: [Core, UI/UX, Client State]
suppressed_dims_count: 5
decisions_entry: D1
```

- **Tier chosen:** `ent`
- **Prototype:** no
- **Sections considered:** Core, UI/UX, Client State
- **Suppressed dims:** 5 (Streaming from UI/UX; Cache invalidation, Optimistic updates, Cross-tab sync, Offline from Client State)
- **See `DECISIONS.md` D1 for accepted trade-offs.**

### Phase 2 Details

```yaml
phase: 2
types: [user-facing, ui-kit]
phase_tier: ent
prototype: false
dim_overrides: []
sections_considered: [Core, UI/UX, UI Kit]
suppressed_dims_count: 1
decisions_entry: D2
```

- **Tier chosen:** `ent`
- **Prototype:** no
- **Sections considered:** Core, UI/UX, UI Kit
- **Suppressed dims:** 1 (Streaming from UI/UX)
- **See `DECISIONS.md` D2 for accepted trade-offs.**

### Phase 3 Details

```yaml
phase: 3
types: [user-facing, client-state]
phase_tier: ent
prototype: false
dim_overrides: []
sections_considered: [Core, UI/UX, Client State]
suppressed_dims_count: 4
decisions_entry: D3
```

- **Tier chosen:** `ent`
- **Prototype:** no
- **Sections considered:** Core, UI/UX, Client State
- **Suppressed dims:** 4 (Streaming from UI/UX; Cache invalidation, Cross-tab sync, Offline from Client State)
- **See `DECISIONS.md` D3 for accepted trade-offs.**

### Phase 4 Details

```yaml
phase: 4
types: [user-facing, client-state]
phase_tier: ent
prototype: false
dim_overrides: []
sections_considered: [Core, UI/UX, Client State]
suppressed_dims_count: 5
decisions_entry: D4
```

- **Tier chosen:** `ent`
- **Prototype:** no
- **Sections considered:** Core, UI/UX, Client State
- **Suppressed dims:** 5 (Streaming from UI/UX; Stale data, Cache invalidation, Cross-tab sync, Offline from Client State)
- **See `DECISIONS.md` D4 for accepted trade-offs.**

### Phase 5 Details

```yaml
phase: 5
types: [user-facing, client-state]
phase_tier: ent
prototype: false
dim_overrides: []
sections_considered: [Core, UI/UX, Client State]
suppressed_dims_count: 5
decisions_entry: D5
```

- **Tier chosen:** `ent`
- **Prototype:** no
- **Sections considered:** Core, UI/UX, Client State
- **Suppressed dims:** 5 (Streaming from UI/UX; Stale data, Cache invalidation, Cross-tab sync, Offline from Client State)
- **See `DECISIONS.md` D5 for accepted trade-offs.**
