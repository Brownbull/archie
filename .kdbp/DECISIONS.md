# Architecture Decisions

| # | Date | Decision | Rationale | Alternatives Considered | Status | Review Trigger |
|---|------|----------|-----------|------------------------|--------|----------------|
| D1 | 2026-05-25 | Phase 1 tier: enterprise | Foundation phase — Phases 3/5 depend on scoped store + compatibility state | MVP (would create immediate tech debt for downstream phases) | active | When Phase 3 starts — verify compatibility state shape is reusable |
| D2 | 2026-05-25 | Phase 2 tier: enterprise | Core interaction primitive — needs proper state matrix + keyboard nav for game-quality feel | MVP (validate interaction first, upgrade later) | active | After first user testing — does radial feel natural? |
| D3 | 2026-05-25 | Phase 3 tier: enterprise | Ghost suggestions must reactively update on canvas changes — stale recommendations destroy trust | MVP (manual refresh of suggestions) | active | When recommendation data grows — does engine performance hold? |
| D4 | 2026-05-25 | Phase 4 tier: enterprise | 5+ overlay types need shared interface to avoid inline spaghetti — keyboard shortcuts are table stakes | MVP (inline renderers per overlay type) | active | When 3rd overlay implemented — is the interface holding? |
| D5 | 2026-05-25 | Phase 5 tier: enterprise | Status dots must reactively reflect engine state, quick-replace needs auto-invalidation | MVP (CSS-only animation, manual state) | active | At 50+ nodes — does animation performance hold at 60fps? |

<!-- Status: active / superseded / revisit -->
<!-- BEHAVIOR.md constraints reference decision IDs: "All integrations mocked (ref D1)" -->

## D1 — Phase 1 tier: enterprise (2026-05-25)

**Phase:** Compatibility Intelligence UI
**Types:** [user-facing, client-state]
**Tier chosen:** enterprise
**Prototype:** no
**Reason:** Foundation phase — Phases 3/5 depend on scoped store + compatibility state; MVP would create immediate tech debt.

### Sections rendered
- Core (always)
- UI/UX: 3 dims, 1 suppressed (Streaming — no AI/LLM processing)
- Client State: 2 dims, 5 suppressed (Cache invalidation, Optimistic updates, Cross-tab sync, Offline support, Stale data — single-user local state)

### Dimensions suppressed (Layer 2 filter)
- UI/UX.Streaming — no AI/LLM processing in this phase
- Client State.Cache invalidation — single-user local state, no server sync
- Client State.Optimistic updates — no server mutations
- Client State.Cross-tab sync — single-tab interaction
- Client State.Offline support — not relevant for canvas interactions
- Client State.Stale data — compatibility data is local/synchronous

### Per-dim tier overrides

```yaml
dim_overrides: []
```

### Δ deferred by tier choice
- L × 0, XL × 0 (enterprise selected, no M→E delta deferred)
- Deferred from E→S: M × 3 (optimistic render, retry UI, SWR), L × 1 (ARIA+keyboard), S × 2 (circuit break, normalizer)

### Review trigger (when to escalate this phase)
- When Phase 3 needs compatibility state: verify the store shape is reusable
- When canvas hits 100+ components: performance testing needed

### Status
- accepted

## D2 — Phase 2 tier: enterprise (2026-05-25)

**Phase:** Radial Context Menu
**Types:** [user-facing, ui-kit]
**Tier chosen:** enterprise
**Prototype:** no
**Reason:** Core interaction primitive — needs proper state matrix + keyboard nav from the start to feel game-quality.

### Sections rendered
- Core (always)
- UI/UX: 3 dims, 1 suppressed (Streaming — no async processing in radial menu)
- UI Kit: 4 dims, 0 suppressed

### Dimensions suppressed (Layer 2 filter)
- UI/UX.Streaming — no async processing in radial menu interactions

### Per-dim tier overrides

```yaml
dim_overrides: []
```

### Δ deferred by tier choice
- Deferred from E→S: M × 4 (optimistic render, platform variant, full 14 atoms, platform variant), L × 2 (ARIA+keyboard, ARIA+focus trap), S × 1 (circuit break)

### Review trigger (when to escalate this phase)
- After first user testing session — does the radial feel natural?
- When mobile-web support is needed — upgrade Platform variance to Scale

### Status
- accepted

## D3 — Phase 3 tier: enterprise (2026-05-25)

**Phase:** Ghost Placement & Suggestions
**Types:** [user-facing, client-state]
**Tier chosen:** enterprise
**Prototype:** no
**Reason:** Ghost suggestions must reactively update on canvas changes — stale recommendations destroy trust in the intelligence layer.

### Sections rendered
- Core (always)
- UI/UX: 3 dims, 1 suppressed (Streaming — recommendation engine is synchronous local computation)
- Client State: 3 dims, 4 suppressed (Cache invalidation, Cross-tab sync, Offline, Optimistic updates — ghosts are derived state from local engine)

### Dimensions suppressed (Layer 2 filter)
- UI/UX.Streaming — recommendation engine is synchronous/local
- Client State.Cache invalidation — ghosts are derived, not cached
- Client State.Cross-tab sync — single-tab derived state
- Client State.Offline support — local engine, always available
- Client State.Optimistic updates — no server mutations

### Per-dim tier overrides

```yaml
dim_overrides: []
```

### Δ deferred by tier choice
- Deferred from E→S: M × 4 (optimistic render, SWR+bg poll, retry UI, subscribe/pubsub), L × 1 (ARIA+keyboard), S × 1 (circuit break)

### Review trigger (when to escalate this phase)
- When recommendation data catalog exceeds 100 components — engine performance
- When user feedback indicates suggestions feel wrong — eval set needed

### Status
- accepted

## D4 — Phase 4 tier: enterprise (2026-05-25)

**Phase:** ALT-Mode Overlay System
**Types:** [user-facing, client-state]
**Tier chosen:** enterprise
**Prototype:** no
**Reason:** 5+ overlay types need a shared interface to avoid inline spaghetti — plus keyboard shortcuts (Alt+N) are table stakes for game-feel.

### Sections rendered
- Core (always)
- UI/UX: 3 dims, 1 suppressed (Streaming — overlays render from local engine state)
- Client State: 2 dims, 5 suppressed (Stale data, Cache invalidation, Cross-tab, Offline, Optimistic — overlays are pure derived views)

### Dimensions suppressed (Layer 2 filter)
- UI/UX.Streaming — overlays render from local engine state
- Client State.Stale data — overlays are derived on-demand
- Client State.Cache invalidation — no cached overlay data
- Client State.Cross-tab sync — per-tab view preference
- Client State.Offline support — local engine data
- Client State.Optimistic updates — read-only views

### Per-dim tier overrides

```yaml
dim_overrides: []
```

### Δ deferred by tier choice
- Deferred from E→S: M × 3 (optimistic render, retry UI, subscribe/pubsub), L × 1 (ARIA+keyboard), S × 2 (circuit break, normalizer)

### Review trigger (when to escalate this phase)
- When overlay count exceeds 7 — interface pattern strain
- When overlays need compositing (showing 2+ simultaneously) — Scale abstractions

### Status
- accepted

## D5 — Phase 5 tier: enterprise (2026-05-25)

**Phase:** Connection Flow Animation + Status Dots
**Types:** [user-facing, client-state]
**Tier chosen:** enterprise
**Prototype:** no
**Reason:** Status dots must reactively reflect engine state, and quick-replace mutation propagation needs auto-invalidation to avoid stale canvas.

### Sections rendered
- Core (always)
- UI/UX: 3 dims, 1 suppressed (Streaming — animations are CSS/rAF)
- Client State: 2 dims, 5 suppressed (Stale data, Cache invalidation, Cross-tab, Offline, Optimistic — animations are visual layer on existing state)

### Dimensions suppressed (Layer 2 filter)
- UI/UX.Streaming — animations are CSS/requestAnimationFrame
- Client State.Stale data — animation driven by live store subscription
- Client State.Cache invalidation — no cached animation state
- Client State.Cross-tab sync — per-tab visual
- Client State.Offline support — local rendering
- Client State.Optimistic updates — no server mutation

### Per-dim tier overrides

```yaml
dim_overrides: []
```

### Δ deferred by tier choice
- Deferred from E→S: M × 3 (optimistic render, retry UI, subscribe/pubsub), L × 1 (ARIA+keyboard), S × 2 (circuit break, normalizer)

### Review trigger (when to escalate this phase)
- At 50+ nodes with 80+ connections — animation frame budget (16ms)
- When quick-replace touches more than component swap (e.g., config migration between types)

### Status
- accepted
