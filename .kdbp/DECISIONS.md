# Architecture Decisions

| # | Date | Decision | Rationale | Alternatives Considered | Status | Review Trigger |
|---|------|----------|-----------|------------------------|--------|----------------|
| D1 | 2026-05-25 | Phase 1 tier: enterprise | Foundation phase — Phases 3/5 depend on scoped store + compatibility state | MVP (would create immediate tech debt for downstream phases) | active | When Phase 3 starts — verify compatibility state shape is reusable |
| D2 | 2026-05-25 | Phase 2 tier: enterprise | Core interaction primitive — needs proper state matrix + keyboard nav for game-quality feel | MVP (validate interaction first, upgrade later) | active | After first user testing — does radial feel natural? |
| D6 | 2026-05-27 | E12-P1 tier: mvp | Pure type definitions + Zod schemas, no user-facing code | enterprise (over-engineering for constants) | active | When port types need runtime validation beyond Zod |
| D7 | 2026-05-27 | E12-P2 tier: enterprise | Core visual component users see constantly — needs state matrix + edge testing | MVP (validate rendering first) | active | At 50+ nodes — Handle positioning performance |
| D8 | 2026-05-27 | E12-P3 tier: enterprise | Connection intelligence rewrite, hybrid warn/block, critical store logic | MVP (basic wiring only) | active | When challenge mode ships (Epic 16) — verify block mode |
| D9 | 2026-05-27 | E12-P4 tier: enterprise | Follows constraintEvaluator pattern, edge-case-rich engine | MVP (basic orphan detection only) | active | When graph complexity exceeds 30 nodes |
| D10 | 2026-05-27 | E12-P5 tier: mvp | Content authoring, schema validation only | enterprise (excessive for YAML data) | active | When community-contributed components arrive (Epic 17+) |
| D11 | 2026-05-27 | E12-P6 tier: enterprise | Schema migration is #1 data-loss risk, heuristic needs edge-case coverage | MVP (would risk user YAML data) | active | When schema v4 is needed (Epic 13+ economics fields) |
| D12 | 2026-05-27 | E12-P7 tier: mvp | Visual polish, straightforward CSS/rendering changes | enterprise (over-engineering for edge colors) | active | When simulation engine adds dynamic edge states (Epic 15) |
| D13 | 2026-06-02 | E13-P1 tier: enterprise | Edge case coverage — economics feeds E15/E16 downstream | MVP (safe for pure schema, but downstream risk) | active | When economics data sources diversify (real pricing APIs) |
| D14 | 2026-06-02 | E13-P2 tier: enterprise | Edge cases on cost computation, missing data, variant switch | MVP (additive to existing ent components) | active | When replicas ship (E14) — cost × replicaCount |
| D15 | 2026-06-02 | E13-P3 tier: enterprise | State matrix + a11y on HUD, graceful degradation on missing data | MVP (display-only widgets) | active | When challenge mode (E16) adds budget caps |
| D16 | 2026-06-02 | E13-P4 tier: enterprise | Delta edge cases, first-switch, missing economics, formatting | MVP (extends existing delta pattern) | active | When simulation adds live cost tracking (E15) |
| D3 | 2026-05-25 | Phase 3 tier: enterprise | Ghost suggestions must reactively update on canvas changes — stale recommendations destroy trust | MVP (manual refresh of suggestions) | active | When recommendation data grows — does engine performance hold? |
| D4 | 2026-05-25 | Phase 4 tier: enterprise | 5+ overlay types need shared interface to avoid inline spaghetti — keyboard shortcuts are table stakes | MVP (inline renderers per overlay type) | active | When 3rd overlay implemented — is the interface holding? |
| D5 | 2026-05-25 | Phase 5 tier: enterprise | Status dots must reactively reflect engine state, quick-replace needs auto-invalidation | MVP (CSS-only animation, manual state) | active | At 50+ nodes — does animation performance hold at 60fps? |
| D17 | 2026-05-29 | Remove cozempic context-pruning hooks from all gabe/KDBP projects | cozempic's live-transcript pruning model is unsupported by Claude Code: CC holds the conversation in memory and only appends to the `.jsonl`, so external rewrites can't help a live turn and only race the next resume. `save_messages` does a blind `open(w)` truncate-rewrite with no lock/atomic-rename/turn-awareness → messages CC appends during a prune are silently lost on resume. The `--threshold 50` guard is 50 MB of file size (not 50% context), so it rarely fires: all risk, ~zero benefit. | (a) Keep + harden cozempic (atomic write + flock + turn gate); (b) Boundary-only via `cozempic reload` between sessions; both rejected for full removal — native CC auto-compaction + KDBP `session-budget.py` (warn@3/block@5) cover the need | active | If CC ships a supported live-compaction hook API, or if context bloat becomes a measured pain point |

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

---

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

---

## D6 — E12-P1 tier: mvp (2026-05-27)

**Phase:** Port types & schema foundation
**Types:** [data-model, schema-migration]
**Tier chosen:** mvp
**Prototype:** no
**Reason:** default MVP pick per U2 — pure type definitions + Zod schemas + constants, no user-facing code

### Sections rendered
- Core (always)

### Dimensions suppressed (Layer 2 filter)
- None (Core only, always full)

### Per-dim tier overrides

```yaml
dim_overrides: []
```

### Δ deferred by tier choice
- L × 1 (edge testing), L × 1 (typed error handling), M × 1 (structured log), S × 1 (1 interface)

### Review trigger (when to escalate this phase)
- When port types need runtime validation beyond Zod parse (e.g., dynamic port registration)

### Status
- accepted

## D7 — E12-P2 tier: enterprise (2026-05-27)

**Phase:** Port-aware node rendering
**Types:** [user-facing, ui-kit, client-state]
**Tier chosen:** enterprise
**Prototype:** no
**Reason:** Core visual component users see constantly — port dots need proper state matrix (hover/focus/disabled), scoped Zustand store coupling, edge-case testing (1-7 ports per node, dynamic height). Matches tier pattern of Factorio-fy phases D1-D5.

### Sections rendered
- Core (always)
- UI/UX: 3 dims, 1 suppressed
- UI Kit: 3 dims, 1 suppressed
- Client State: 2 dims, 5 suppressed

### Dimensions suppressed (Layer 2 filter)
- UI/UX.Streaming — no AI/async processing in port rendering
- UI Kit.Platform variance — desktop-only app
- Client State.Cache invalidation — ports are derived from static component library
- Client State.Optimistic updates — no server mutations
- Client State.Cross-tab sync — single-tab canvas state
- Client State.Offline support — local component library
- Client State.Stale data — port definitions are static

### Per-dim tier overrides

```yaml
dim_overrides: []
```

### Δ deferred by tier choice
- Deferred from E→S: M × 3 (optimistic render, platform variant, subscribe/pubsub), L × 2 (ARIA+keyboard, ARIA+focus trap), S × 2 (circuit break, normalizer)

### Review trigger (when to escalate this phase)
- At 50+ nodes — Handle positioning performance budget
- When mobile-web support is needed — platform variance upgrade

### Status
- accepted

## D8 — E12-P3 tier: enterprise (2026-05-27)

**Phase:** Port-compatible edge creation
**Types:** [user-facing, client-state]
**Tier chosen:** enterprise
**Prototype:** no
**Reason:** Compatibility checker rewrite + hybrid warn/block mode is core connection intelligence. Edge-case testing critical (wrong port type, self-connections, mode switch). Store coupling needs scoping for addEdge reading port data from both component library and challenge store.

### Sections rendered
- Core (always)
- UI/UX: 2 dims, 2 suppressed
- Client State: 2 dims, 5 suppressed

### Dimensions suppressed (Layer 2 filter)
- UI/UX.Streaming — edge creation is instant
- UI/UX.Loading states — no async operation
- Client State.Cache invalidation — edge data is local store state
- Client State.Optimistic updates — local mutations, no server
- Client State.Cross-tab sync — single-tab
- Client State.Offline support — local engine
- Client State.Stale data — edges are user-created, not fetched

### Per-dim tier overrides

```yaml
dim_overrides: []
```

### Δ deferred by tier choice
- Deferred from E→S: M × 2 (retry UI, subscribe/pubsub), L × 1 (ARIA+keyboard), S × 2 (circuit break, normalizer)

### Review trigger (when to escalate this phase)
- When challenge mode (Epic 16) ships — verify block mode enforcement works correctly
- When connection count exceeds 100 — addEdge performance

### Status
- accepted

## D9 — E12-P4 tier: enterprise (2026-05-27)

**Phase:** Topology checker engine
**Types:** [engine, client-state]
**Tier chosen:** enterprise
**Prototype:** no
**Reason:** Follows constraintEvaluator pattern (already enterprise-tier). Edge-case testing matters: orphan nodes, cycles, partially connected graphs, nodes with only monitor ports. Engine feeds user-facing Issues panel.

### Sections rendered
- Core (always)
- Client State: 1 dim (Store coupling), 6 suppressed

### Dimensions suppressed (Layer 2 filter)
- Client State.Cache invalidation — topology is derived on every graph change
- Client State.Optimistic updates — read-only engine
- Client State.Cross-tab sync — single-tab
- Client State.Offline support — local engine
- Client State.Stale data — recalculated reactively
- Client State.Mutation propagation — topology checker is a consumer, not a mutator

### Per-dim tier overrides

```yaml
dim_overrides: []
```

### Δ deferred by tier choice
- Deferred from E→S: M × 1 (fuzz testing), S × 1 (normalizer), S × 1 (circuit break)

### Review trigger (when to escalate this phase)
- When graph complexity exceeds 30 nodes with 60+ edges — rule evaluation performance
- When custom topology rules are needed (challenge-specific rules in Epic 16)

### Status
- accepted

## D10 — E12-P5 tier: mvp (2026-05-27)

**Phase:** Component library port data
**Types:** [content, data-model]
**Tier chosen:** mvp
**Prototype:** no
**Reason:** default MVP pick per U2 — content authoring with schema validation, no behavioral complexity

### Sections rendered
- Core (always)

### Dimensions suppressed (Layer 2 filter)
- None (Core only)

### Per-dim tier overrides

```yaml
dim_overrides: []
```

### Δ deferred by tier choice
- L × 1 (edge testing), L × 1 (typed error handling), M × 1 (structured log), S × 1 (1 interface)

### Review trigger (when to escalate this phase)
- When community-contributed components arrive — need validation beyond schema parse

### Status
- accepted

## D11 — E12-P6 tier: enterprise (2026-05-27)

**Phase:** Schema v3 migration & YAML round-trip
**Types:** [schema-migration, data-model]
**Tier chosen:** enterprise
**Prototype:** no
**Reason:** Schema migration is the #1 data-loss risk in the epic. v2→v3 auto-mapping heuristic needs edge-case testing: components with multiple matching port types, zero matches, malformed YAML. Legacy edge type needs typed error handling. This is where users lose saved architectures if we get it wrong.

### Sections rendered
- Core (always)

### Dimensions suppressed (Layer 2 filter)
- None (Core only)

### Per-dim tier overrides

```yaml
dim_overrides: []
```

### Δ deferred by tier choice
- Deferred from E→S: M × 1 (fuzz + load eval), S × 1 (circuit break)

### Review trigger (when to escalate this phase)
- When schema v4 is needed (Epic 13 economics fields) — verify migration chain v2→v3→v4

### Status
- accepted

## D12 — E12-P7 tier: mvp (2026-05-27)

**Phase:** Edge visual upgrade
**Types:** [user-facing, ui-kit]
**Tier chosen:** mvp
**Prototype:** no
**Reason:** default MVP pick per U2 — visual polish, straightforward CSS/rendering. Edge coloring is a lookup from port type to color constant. Legacy dashed edges are a CSS class.

### Sections rendered
- Core (always)
- UI/UX: 2 dims, 2 suppressed
- UI Kit: 2 dims, 2 suppressed

### Dimensions suppressed (Layer 2 filter)
- UI/UX.Streaming — edge rendering is synchronous
- UI/UX.Loading states — no async
- UI Kit.Platform variance — desktop-only
- UI Kit.Atomic inventory — not adding new atoms

### Per-dim tier overrides

```yaml
dim_overrides: []
```

### Δ deferred by tier choice
- L × 2 (edge testing, error states), M × 2 (state matrix, a11y roles), L × 2 (semantic HTML, ARIA)

### Review trigger (when to escalate this phase)
- When simulation engine (Epic 15) adds dynamic edge state changes — edges need real-time color/width transitions

### Status
- accepted

---

## D13 — E13-P1 tier: enterprise (2026-06-02)

**Phase:** Economics schema & variant data
**Types:** [data-model, content]
**Tier chosen:** enterprise
**Prototype:** no
**Reason:** Edge case coverage — economics data feeds simulation engine (E15) and challenge mode (E16). Typed error handling and edge-case testing on schema extension prevents compound bugs downstream. 46 variants need validated economics; malformed/missing values must fail explicitly.

### Sections rendered
- Core (always)

### Dimensions suppressed (Layer 2 filter)
- None (Core only)

### Per-dim tier overrides

```yaml
dim_overrides: []
```

### Δ deferred by tier choice
- Deferred from E→S: M × 1 (fuzz + load eval), S × 1 (circuit break), S × 1 (strategy + DI)

### Review trigger (when to escalate this phase)
- When economics data sources diversify (real cloud pricing APIs vs static values)

### Status
- accepted

## D14 — E13-P2 tier: enterprise (2026-06-02)

**Phase:** Cost computation & inline node display
**Types:** [user-facing, client-state]
**Tier chosen:** enterprise
**Prototype:** no
**Reason:** Edge case coverage — cost computation must handle missing economics data, zero-cost variants, variant switch race conditions. Node cost badge needs proper error state (not blank/NaN). Store selector for totalArchitectureCost must update correctly across add/remove/swap/variant-switch.

### Sections rendered
- Core (always)
- UI/UX: 3 dims, 1 suppressed
- Client State: 2 dims, 5 suppressed

### Dimensions suppressed (Layer 2 filter)
- UI/UX.Streaming — no AI/async processing
- Client State.Cache invalidation — economics from local library
- Client State.Optimistic updates — no server mutations
- Client State.Stale data — local library always available
- Client State.Cross-tab sync — single-tab
- Client State.Offline support — local data

### Per-dim tier overrides

```yaml
dim_overrides: []
```

### Δ deferred by tier choice
- Deferred from E→S: M × 3 (optimistic render, subscribe/pubsub, retry UI + report), L × 1 (ARIA + keyboard), S × 2 (circuit break, normalizer)

### Review trigger (when to escalate this phase)
- When replicas ship (E14) — cost computation must multiply by replicaCount
- When simulation engine (E15) needs real-time cost tracking during ticks

### Status
- accepted

## D15 — E13-P3 tier: enterprise (2026-06-02)

**Phase:** Budget HUD & toolbox cost ranges
**Types:** [user-facing, ui-kit]
**Tier chosen:** enterprise
**Prototype:** no
**Reason:** Edge case coverage — HUD must handle zero-component state, components with missing economics (graceful degradation), cost range computation across variants with mixed presence. State matrix (focus/disabled/error) matters for the progress bar component. Semantic HTML on the progress bar (aria-valuenow) ensures accessibility from day one.

### Sections rendered
- Core (always)
- UI/UX: 3 dims, 1 suppressed
- UI Kit: 3 dims, 1 suppressed

### Dimensions suppressed (Layer 2 filter)
- UI/UX.Streaming — no async processing
- UI Kit.Platform variance — desktop-only app

### Per-dim tier overrides

```yaml
dim_overrides: []
```

### Δ deferred by tier choice
- Deferred from E→S: M × 4 (optimistic render, retry UI, full 14 atoms, platform variant), L × 2 (ARIA + keyboard, ARIA + focus trap), S × 1 (circuit break)

### Review trigger (when to escalate this phase)
- When challenge mode (E16) adds budget caps — HUD needs enforcement mode vs display mode
- When mobile-web support needed — platform variance upgrade

### Status
- accepted

## D16 — E13-P4 tier: enterprise (2026-06-02)

**Phase:** Inspector economics & delta indicators
**Types:** [user-facing]
**Tier chosen:** enterprise
**Prototype:** no
**Reason:** Edge case coverage — delta indicators must handle first-variant-switch (no previous), missing economics on either old or new variant, zero deltas, and negative/positive formatting. Inline error recovery when economics data absent (show "N/A" not crash). Existing FR34 delta pattern at enterprise tier — this phase should match.

### Sections rendered
- Core (always)
- UI/UX: 2 dims, 2 suppressed

### Dimensions suppressed (Layer 2 filter)
- UI/UX.Streaming — no async processing
- UI/UX.Loading states — inspector already loaded

### Per-dim tier overrides

```yaml
dim_overrides: []
```

### Δ deferred by tier choice
- Deferred from E→S: M × 2 (retry UI + report, fuzz + load eval), L × 1 (ARIA + keyboard), S × 1 (circuit break)

### Review trigger (when to escalate this phase)
- When simulation engine (E15) adds live cost tracking — inspector needs real-time economics during sim playback

### Status
- accepted

## D17 — E14-P1 tier: enterprise (2026-05-29)

**Phase:** Scaling-rules model + replicaCount schema foundation
**Types:** [data-migration, client-state]
**Tier chosen:** enterprise
**Prototype:** no
**Reason:** Schema version bump (3→4) with a migration is a persistence-format change — must be backward-compatible and exhaustively tested. v3 files must import cleanly (replicaCount defaults to 1), round-trip must be lossless, and the migration chain (v1→v2→v3→v4) must not regress. Enterprise edge coverage required: missing field, replicas=1 omitted, out-of-range clamp.

### Sections rendered
- Core (always)
- Data: migration, round-trip, defaults

### Per-dim tier overrides

```yaml
dim_overrides: []
```

### Δ deferred by tier choice
- Deferred from E→S: M × 1 (property-based round-trip fuzz over replica ranges)

### Review trigger (when to escalate this phase)
- When community sharing (Phase 4 future) lets users import untrusted architectures at scale — schema validation hardening + fuzz becomes load-bearing.

### Status
- accepted

## D18 — E14-P2 tier: enterprise (2026-05-29)

**Phase:** Replica-aware economics
**Types:** [client-state]
**Tier chosen:** enterprise
**Prototype:** no
**Reason:** Cost/capacity multiplication is load-bearing for Epic 15 simulation. Must be correct at every layer (per-node, total sum, display) and degrade gracefully when economics data is absent (undefined cost → skip, never NaN). replicaFactor differs by replicaType (none→1, full/read-only→linear) — boundary coverage required so the simulation engine inherits trustworthy capacity numbers.

### Sections rendered
- Core (always)

### Per-dim tier overrides

```yaml
dim_overrides: []
```

### Δ deferred by tier choice
- Deferred from E→S: M × 1 (memoized total-cost selector — only if perf shows recompute cost)

### Review trigger (when to escalate this phase)
- When Epic 15 simulation reads effective capacity per tick — capacity scaling correctness becomes real-time-critical.

### Status
- accepted

## D19 — E14-P3 tier: enterprise (2026-05-29)

**Phase:** Canvas replica control + badges + topology rule
**Types:** [user-facing, web, client-state]
**Tier chosen:** enterprise
**Prototype:** no
**Reason:** User-facing canvas interaction + new topology validation. Stepper must clamp at bounds, badges must not overflow the 140px node or collide with existing constraint/overlay/status badges, and the topology rule must be a pure function (scaling rules passed in) to keep graph functions clean. Runtime journey evidence mandated for user-facing/web phase type. WARN-mode topology (allow but warn) per project connection-rules invariant.

### Sections rendered
- Core (always)
- UI/UX: badge layout, interaction states, accessibility of stepper

### Per-dim tier overrides

```yaml
dim_overrides: []
```

### Δ deferred by tier choice
- Deferred from E→S: L × 1 (full keyboard/ARIA pass on stepper), M × 1 (badge virtualization — N/A at 50-node cap)

### Review trigger (when to escalate this phase)
- When WCAG accessibility pass (Phase 4 future) lands — stepper + badges need keyboard + screen-reader coverage.

### Status
- accepted

## D20 — E14-P4 tier: enterprise (2026-05-29)

**Phase:** YAML/topology integration + E2E journey
**Types:** [user-facing, web, file-media]
**Tier chosen:** enterprise
**Prototype:** no
**Reason:** Closes the epic with end-to-end proof: round-trip persistence + a full Playwright journey on the desktop project. file-media (YAML import/export) + user-facing both require runtime evidence; integration round-trip must cover migration and omit-when-default. Matches the Epic 13 closing-phase pattern (full economics E2E journey).

### Sections rendered
- Core (always)
- Data: round-trip, migration integration

### Per-dim tier overrides

```yaml
dim_overrides: []
```

### Δ deferred by tier choice
- Deferred from E→S: M × 1 (visual regression snapshots on badges)

### Review trigger (when to escalate this phase)
- When challenge mode (E16) adds shareable challenge files — round-trip fidelity becomes user-data-integrity-critical.

### Status
- accepted

## D21 — E15-P1 tier: enterprise + simulation architecture (2026-05-29)

**Phase:** Simulation core engine + types
**Types:** [client-state]
**Tier chosen:** enterprise
**Reason:** The simulation engine is the highest-impact Phase 3 feature and the foundation for challenge mode (E16). Correctness of routing + capacity + failed-request accounting is load-bearing; needs thorough edge coverage (overload shed, fan-out split, no-entry, multi-entry, branch/merge graphs).

### Resolved roadmap-open architecture decisions
- **Tick granularity (roadmap #7):** fixed 50 ticks over a curve-defined duration (default 90s). Engine is pure + synchronous — precomputes all TickState[] at start; playback (Phase 2) indexes frames. No per-tick recompute.
- **Routing at branches (roadmap #8):** directional BFS (source→target) along http/stream edges from entry nodes (http-in port, no upstream http edge). Even split at fan-out (round-robin LB model). Replica capacity aggregates via effective maxRPS = variant.maxRPS × replicaFactor (Epic 14).
- **Failure cascade (roadmap #9):** per-component shed (default) — incoming > effectiveMaxRPS drops excess (counted failed); latency = baseLatencyMs × (1 + max(0, load−1) × LATENCY_LOAD_K). crash/queue deferred. No global cascade in v1.
- **Charting (roadmap #10):** hand-rolled SVG timeline, NOT Recharts. Bundle already ~1.4MB (warning); Recharts adds ~150KB. Deviation from roadmap text — see D24. Revisit if E16 needs interactivity.
- **Users/entry source:** designated entry nodes (no synthetic component) for sandbox; E16 may add explicit entry.

### Status
- accepted

## D22 — E15-P2 tier: enterprise (2026-05-29)
**Phase:** simulationStore + playback state machine | **Types:** [client-state] | **Tier:** enterprise
**Reason:** Playback is a state machine (idle/running/paused/done) with interval lifecycle (no leaks), speed scaling, seek, and snapshot-at-start immutability. Race/lifecycle edges need enterprise coverage. Engine precompute keeps playback O(1) per frame.
### Status
- accepted

## D23 — E15-P3 tier: enterprise (2026-05-29)
**Phase:** Per-node live telemetry overlay | **Types:** [user-facing, web, client-state] | **Tier:** enterprise
**Reason:** User-facing canvas overlay; must not regress existing overlay modes, must fall back cleanly when idle, color thresholds correct. Runtime journey mandated.
### Status
- accepted

## D24 — E15-P4 tier: enterprise + charting decision (2026-05-29)
**Phase:** Stats panel + SVG timeline + playback controls | **Types:** [user-facing, web] | **Tier:** enterprise
**Reason:** Stats accuracy (p99, uptime, cost-vs-budget) + a custom SVG timeline. Charting decision: hand-rolled SVG (no Recharts) due to bundle pressure (1.4MB + warning) — deviates from roadmap line 126/136 which named Recharts; rationale is bundle size + the timeline is a simple stacked area. Runtime journey mandated.
### Status
- accepted

## D25 — E15-P5 tier: enterprise (2026-05-29)
**Phase:** Traffic curves + scenario integration | **Types:** [user-facing, web, data-migration] | **Tier:** enterprise
**Reason:** trafficCurve is a new optional schema field on scenario presets — backward-compat with existing constant-level demand presets is load-bearing (must not break sandbox). demandEngine stays pure (dual-mode coexistence).
### Status
- accepted

## D26 — E15-P6 tier: enterprise (2026-05-29)
**Phase:** Integration + E2E simulation journey | **Types:** [user-facing, web] | **Tier:** enterprise
**Reason:** Closes the epic with a full-pipeline integration test + Playwright journey on the desktop project. file/runtime evidence required.
### Status
- accepted

## D27 — E16-P1 tier: enterprise + scheduled-events architecture (2026-05-29)
**Phase:** Challenge schema + types + loader + scheduled-events engine | **Types:** [data-migration, client-state] | **Tier:** enterprise
**Reason:** Extends the shipped E15 engine — regression risk is high, so scheduledEvents is an optional param (absent = current behavior) and events apply as additive per-tick overrides (offlineNodeIds + latencyMultipliers). Component_failure → effectiveMaxRps 0 (all shed); az_outage → all nodes of target category offline; latency_spike → ×multiplier for durationS. Challenge content is a persistence format (schema + loader) needing exhaustive validation.
### Status
- accepted

## D28 — E16-P2 tier: enterprise + star rubric (2026-05-29)
**Phase:** Star rubric scorer + challengeStore | **Types:** [client-state] | **Tier:** enterprise
**Reason:** Rubric: 1★ if uptime≥target AND p99≤target; +1★ if cost≤budgetCap; +1★ if zero topology issues. Budget/topology stars require the base pass star (roadmap "pass → 1★ then +1/+1"). Thresholds are per-challenge data (targetMetrics/budgetCap), not hardcoded. Pure scorer + state-machine store, exhaustively unit-tested. Attempts in-memory (Firestore deferred to E17).
### Status
- accepted

## D29 — E16-P3 tier: enterprise (2026-05-29)
**Phase:** Challenge selector + checklist + budget/timer HUD | **Types:** [user-facing, web, client-state] | **Tier:** enterprise
**Reason:** User-facing modal + live checklist/budget/timer; reuse existing Dialog primitive + overlay portal; runtime journey mandated.
### Status
- accepted

## D30 — E16-P4 tier: enterprise (2026-05-29)
**Phase:** Results modal + Start button + challenge↔sim wiring | **Types:** [user-facing, web] | **Tier:** enterprise
**Reason:** The scoring payoff — auto-score on sim done, results modal accuracy (stars/uptime/budget/topology). Runtime journey mandated.
### Status
- accepted

## D31 — E16-P5 tier: enterprise (2026-05-29)
**Phase:** Challenge content (10 levels) | **Types:** [data-migration] | **Tier:** enterprise
**Reason:** 10 authored challenge YAMLs — persistence content that must schema-validate; a data-quality test asserts every file parses with sane bounds (mirrors componentDataQuality tests).
### Status
- accepted

## D32 — E16-P6 tier: enterprise (2026-05-29)
**Phase:** Integration + E2E challenge journey | **Types:** [user-facing, web] | **Tier:** enterprise
**Reason:** Full-pipeline integration (select→build→start→score) + Playwright journey to results modal. Runtime evidence required.
### Status
- accepted

## D33 — Epic 17 attempt persistence: Firestore + require auth (2026-05-29)

**Decision:** Challenge mode requires sign-in; all attempts persist to a Firestore `attempts` collection (owner-only rules). Resolves roadmap Open Decision #12.
**Context:** First time Archie writes user-generated state to Firestore (previously library data only). Auth existed but was optional.
**Rationale:** User direction (2026-05-29) chose the full retention loop over local-only/optional-auth. Simplest data model (always a userId), cross-device history, strongest retention. Trade-off: removes anonymous challenge play — accepted.
**Implications:** Auth gate on challenge-mode entry (P3); Firestore `attempts` collection + owner-only security rules + security-reviewer pass (P4). Sandbox (non-challenge) canvas stays anonymous-usable.
**Status:** accepted

## D34 — Epic 17 phase tiers: enterprise (2026-05-29)

**Decision:** All Epic 17 phases at enterprise tier (per standing user directive "enterprise default for plans").
**Rationale:** Production feature with a new backend write path + auth surface; enterprise tier warranted (coverage, security review, error handling).
**Status:** accepted

## D35 — Epic 17 P3: challenge-mode auth is satisfied by the global AuthGuard (2026-05-29)

**Finding:** The plan's P3 assumed auth was optional with an anonymous sandbox. In reality the entire app (route `/`) is wrapped in `AuthGuard`, which redirects unauthenticated users to `/login`. There is no anonymous path — every user reaching the canvas (and thus challenge mode) is already authenticated.
**Decision:** D33's "challenge mode requires auth" is satisfied transitively by the existing global gate. We do NOT build a redundant per-feature gate (would add complexity for zero behavior change; violates "plan light, build real").
**Evidence:** `AuthGuard` (App.tsx route `/`) + tests `AuthGuard.test.tsx` (redirect/authenticated/loading) + `auth-and-app-shell` E2E.
**P3 deliverable (non-redundant):** `useCurrentUserId()` — the clean auth→persistence seam P4 uses to stamp/scope attempts. Guaranteed non-null inside the gated shell, but persistence treats null defensively (pre-resolve / safety).
**Implication for P4:** attempts always carry a real `userId`; Firestore rules can assume `request.auth != null`.
**Status:** accepted

## D36 — Epic 17 P4: persisted attempt fields (2026-05-29)

**Decision:** The Firestore `attempts` doc persists `{ userId, challengeId, stars, uptimePercent, p99LatencyMs, totalCost, topologyIssueCount, createdAt }` — exactly the scored snapshot (lastResult + lastMeasured). The roadmap's `requestsTotal`/`requestsFailed` are omitted as redundant with `uptimePercent` (= served/total), avoiding churn to MeasuredAttempt + 4 test files.
**Rules deploy:** CI deploys hosting only (action-hosting-deploy). `attempts` rules live in firestore.rules but require a manual `firebase deploy --only firestore:rules` to enforce. Until then, writes are DENY-by-default — recordAttempt is best-effort (catches the denial), so the app works; attempts just won't save until rules deploy. Tracked as PENDING D9.
**Status:** accepted

## D37 — Epic 17 P6: defer optional brand-logo polish (2026-05-29)

**Decision:** Ship P6 as the integration coverage (score → persist → History loop + owner-scoping). Defer the roadmap's *optional* brand-logo polish (`brand`/`logoUrl` on ConfigVariant) rather than build it now.
**Rationale:** (1) Explicitly optional in the roadmap. (2) Renders nothing without curated per-variant logo assets, which don't exist — building the plumbing now is unused code. (3) Adds a URL-injection surface (logoUrl must be https-only validated, no javascript: URIs per .claude/rules/security.md) — a security cost for zero current value. Aligns with "plan light, build real" + security-first. (4) Epic 17's value (suggestions + history) is fully delivered.
**Implication:** Tracked as PENDING D10 (optional enhancement, do when brand assets are curated, with a URL-validation security pass).
**Status:** accepted

## D38 — Component icons: local PixelLab pixel-art assets (supersedes D37 brand-logo deferral) (2026-05-30)

**Decision:** Implement the Epic 17 "brand logo" polish as **our own pixel-art icons** generated with PixelLab (PixFlux, 64×64, Config C: black outline + detailed shading + transparent bg), one per component, stored in `public/icons/<component-id>.png`. Rendered via `<ComponentIcon>` (pixel `<img>` when an icon exists for the id, else the lucide category icon) in ArchieNode + ComponentCard.
**Why (over the roadmap's external `brand`/`logoUrl`):** (1) Cohesive with the factorify-archie aesthetic; (2) no licensing/trademark concerns (original art); (3) **local same-origin assets → zero URL-injection surface** (the exact security cost that deferred D37); (4) filename = component id → no per-component data/schema change. Gated on a known id set (`COMPONENT_ICON_IDS`) so a missing id falls back cleanly; a consistency test keeps the set ⟷ files ⟷ components in lockstep.
**Status:** accepted — resolves PENDING D10; D37 superseded.

## D39 — Single-player improvement plan from the Coding Ducks gap analysis (2026-05-30)

**Decision:** Adopt a 6-phase single-player improvement epic (PLAN.md) derived from the Claude-in-Chrome gap analysis vs Coding Ducks (docs/research/20260530). Sequence: P1 on-object delete/duplicate toolbars → P2 canvas authoring fixes → P3 information density → P4 solo progress loop → P5 component model (type→provider→tier) → P6 live guidance.
**Key sub-decisions:**
- **Adopt type → provider → tier** component model (P5): top-level = fundamental types (CDN, Cache, Relational DB…), provider chosen in-node with $·RPS·ms, existing config variants become the tier. Schema-additive: insert `provider_id` between type_id and variant_id; static YAML migration map keeps import/export lossless. Confirmed by the analysis as the highest-impact change + enabler of lighter UI + type-keyed validation.
- **Deletion is a functional gap, not polish** (P1): connectors cannot be removed from the UI at all today (Delete-key only, undiscoverable) — highest-leverage correctness fix.
- **Exclude community/benchmarking** (per user directive "before sharing features"): the analysis's "anonymized percentile / beats X% of builds" needs cross-user data → deferred. Only solo "vs your past attempts" is in scope (P4).
- **History error (P4)** flagged in the analysis ("Could not load…") — diagnose vs the deployed Firestore rules / auth before assuming a code bug (D9-adjacent).
**Status:** accepted — supersedes the community-first framing of the roadmap's "Phase 4 (Future)" for now; single-player track runs first.

## D40 — Mastery Tracks progression model (2026-06-02)

**Decision:** Pivot the Challenge system into a game-like progression/leveling system built on two intertwined layers:
1. **Tech tree (gating).** Challenges form a deterministic DAG. Each challenge declares `requires` (challenges + blocks) and `unlocks` (blocks + downstream challenges) → a Factorio-style "discover technologies from what you have." `first-service` is the single root.
2. **Mastery Tracks (identity).** 7 tracks — Foundations, Data, Edge & Delivery, Realtime, Reliability & Ops, Security & Identity, AI/ML. A challenge grants `rewards.xp` to its `track`; XP → per-track tier (Novice→Apprentice→Practitioner→Specialist→Architect) → unlockable title + PixelLab avatar.

**Key rules:**
- **Block availability is per-challenge** (`available_blocks` palette), hard-gated in challenge mode; the tree gates which challenges are reachable.
- **Challenge mode is login-only + hard-gated**; **free-build mode is unchanged** (all blocks, gated only by the experienceLevel density knob).
- **`experienceLevel` stays a separate UI-density layer** — NOT overloaded as a game tier (project rule: "player profile is a separate layer").
- **Progress is cloud-only** (owner-only Firestore `userProgress/{uid}`, D9 rules; no localStorage fallback — matches login-only challenge mode + the attempts precedent).
- **XP = delta-above-best per challenge** (re-attempts can't farm; deterministic).
- **WoW item-rarity coloring** by challenge tier relative to the player: grey→white→green→blue→purple→orange; ≥3 tiers above is **locked** (can't enter); **red** reserved for exaggerated/unresolved/theoretical challenges.
- **Challenge schema v2** extends the existing `ChallengeYamlSchema` additively (`schema_version`, `track`, `tier`, `requires`, `unlocks`, `available_blocks`, `rewards`) + a runtime "Load Challenge…" import mirroring the architecture YAML import. The 10 authored challenges become the tree spine (each assigned one primary track + reused as cross-track prereqs).
- **Content seeds:** Coding-Ducks archetypes (use as base, build deeper) — REST-API+caching, async jobs, search, chat, global API gateway already map to existing nodes; Static Site+CDN, E-Commerce flash-sale, IoT telemetry, Social feed are new.
- **Avatars:** PixelLab (PixFlux 64×64, "Config C", local PNGs + id-Set + lockstep test), per D38 — local same-origin only (no external URLs, D37 rationale).

**Alternatives considered:** flat 7-discipline XP tags with a single tier per discipline (rejected — user wanted multi-level Factorio-style branching); local-first progress with cloud sync (rejected — cloud-only is simpler + challenge mode is login-only anyway); soft block-gating with a free-build toggle (rejected — hard-gate only inside challenge mode, free-build untouched).

**Status:** active

**Review trigger:** revisit branch taxonomy + tier curve after Phase 4 content authoring reveals real difficulty pacing; revisit cloud-only if anonymous progression is later desired.

## D41 — Phase 1 tier: enterprise (2026-06-02)
**Phase:** Challenge schema v2 + tech-tree foundation · **Types:** data, schema, file-io · **Prototype:** no
**Reason:** The schema is load-bearing and user-loadable; deterministic round-trip + a tested techTree resolver justify enterprise rigor over an MVP sketch. **dim_overrides:** none. **Status:** accepted.

## D42 — Phase 2 tier: enterprise (2026-06-02)
**Phase:** Progress model + challenge-mode gating · **Types:** data, auth, user-facing · **Prototype:** no
**Reason:** Per-user cloud data + owner-only Firestore rules (D9) + XP integrity + login-gated correctness are security/correctness-critical. Runtime journey evidence required. **dim_overrides:** none. **Status:** accepted.

## D43 — Phase 3 tier: enterprise (2026-06-02)
**Phase:** Leveling UX — profile, tiers & avatars · **Types:** user-facing · **Prototype:** no
**Reason:** Core player identity/UX; needs polish + runtime journey evidence (tier-up/unlock flow). **dim_overrides:** none. **Status:** accepted.

## D44 — Phase 4 tier: mvp (2026-06-02)
**Phase:** Branch challenges (content) · **Types:** content, data · **Prototype:** no
**Reason:** Authoring challenge YAMLs against the v2 schema — iterate on content; no infra rigor needed beyond schema validation. **dim_overrides:** none. **Status:** accepted.

## D45 — Challenge Forge: user challenges play+share but grant ZERO progression (2026-06-02)

**Decision:** Users can create, export, import, and save challenges. User-authored/imported challenges are **playable** and **sharable** (via export-file only — no backend sharing) but grant **zero Mastery Tracks progression** (no XP, no block grants, no track advancement). Only curated built-in challenges (authored as YAML in src/data/challenges/ and loaded at build time) drive the tech tree.

**Key rules:**
1. **Runtime `origin` field** (not in the .strict() YAML schema): `builtin` stamped at the build-time glob (challengeLoader.ts), `user` stamped at loadChallengeFromYaml runtime import. Non-forgeable — only the glob path produces `builtin`.
2. **Zero-progression for user-origin:** Phase 2's reward path (scoreAttempt XP + grants) skips any challenge where `origin !== 'builtin'`. This is a **Phase 2 acceptance criterion** (D45-AC1).
3. **ID-namespace isolation:** User-authored challenge ids are prefixed (`user/`) on import so they CANNOT collide with built-in ids. `isKnownChallengeId` rejects collisions. The completed-set / resolveTechTree is keyed by id and would credit a built-in's grants if a user challenge had the same id.
4. **Palette hard-gate for user-origin:** For `origin: 'user'` challenges, `available_blocks` is intersected with the player's actually-unlocked blocks (resolveTechTree.unlockedBlocks), so a self-authored wide-palette challenge cannot bypass the Phase 2 hard-gate. This is a **Phase 2 acceptance criterion** (D45-AC2).
5. **Separate registry:** User-imported challenges live in a separate store (never merged into getAllChallenges / the built-in spine). The techTree resolver runs on the built-in set only.
6. **Visual editor (v1):** Fully scoped — no free-form string fields. All fields use constrained pickers (track, tier, difficulty, required blocks, available blocks, scheduled-event types from allowlists). Only budget, RPS, and latency accept numeric values (bounded). This is a security win (no XSS surface in-app), but imported YAML files remain fully untrusted and run through the complete Phase-1 validation chain.
7. **Persistence:** localStorage drafts + owner-only Firestore `userChallenges/{uid}` collection (mirrors attempts/userProgress, D9 rules pattern). Requires manual `firebase deploy --only firestore:rules` (CI deploys hosting only — D9 memory). Exported YAML file is the canonical share format.
8. **Export = reverse serializer:** `challengeExporter.ts` assembles camelCase → snake_case → re-validates against `ChallengeYamlSchema` (same schema, no hand-rolled inverse) → `js-yaml` dump. Mirrors `exportArchitecture` pattern.

**Sequencing:** Zero-progression invariant (rules 1-4) is a **Phase 2 acceptance criterion**. The authoring UX (visual editor, export/import UI, persistence) ships as **Phase 5 — Challenge Forge** after Phase 4 (which proves the schema is hand-authorable by content).

**Alternatives considered:**
- Cap rewards for user challenges at some fraction → rejected, still farmable.
- Signed/trusted challenges (server-verified authorship) → deferred to future community features (MVP 4+).
- File-based loop only (export template → edit YAML → import, no visual editor) → rejected by user — wants fully scoped in-app editor.

**Status:** active

**Review trigger:** revisit if community challenge sharing (MVP 4) is added — would need a trust/curation layer.

## D46 — Phase 5 tier: enterprise (2026-06-02)
**Phase:** Challenge Forge (authoring) · **Types:** user-facing, data, file-io, auth · **Prototype:** no
**Reason:** The visual editor surface touches the progression-integrity boundary (origin, separate registry, id namespacing, palette intersection). Imported YAML is untrusted. Cloud persistence needs Firestore rules (D9 pattern). Enterprise rigor justified. **dim_overrides:** none. **Status:** accepted.

## D47 — Phase 1 tier: enterprise — Cache hit ratio (2026-06-02)
**Phase:** Cache hit ratio (E1) · **Types:** engine, simulation, data · **Prototype:** no
**Reason:** The cache hit ratio changes the simulation engine's core traffic propagation logic. Cache nodes bifurcate traffic: hits served locally, misses forwarded downstream. This is load-bearing and affects every challenge with a cache node. Enterprise rigor for deterministic round-trip tests. **Status:** accepted.

## D48 — Phase 2 tier: enterprise — Write/read path split (2026-06-02)
**Phase:** Write/read path split (E2) · **Types:** engine, simulation, data · **Prototype:** no
**Reason:** Differentiates SQL and NoSQL at the simulation level. Write bottleneck on primary is a fundamental architectural concept that every architecture student needs to see in the simulation. Enterprise rigor for the capacity model change. **Status:** accepted.

## D49 — Phase 3 tier: mvp — CDN edge bifurcation (2026-06-02)
**Phase:** CDN edge bifurcation (E3) · **Types:** engine, simulation · **Prototype:** no
**Reason:** Reuses cache_hit_ratio logic from P1 with a miss_latency_penalty. Minimal new code. **Status:** accepted.

## D50 — Phase 4 tier: mvp — Serverless cold start (2026-06-02)
**Phase:** Serverless cold start (E4) · **Types:** engine, simulation · **Prototype:** no
**Reason:** ~15 lines. Simple latency addition on a subset of requests. **Status:** accepted.

## D51 — Phase 5 tier: enterprise — Queue backpressure (2026-06-02)
**Phase:** Queue backpressure (E5) · **Types:** engine, simulation, data · **Prototype:** no
**Reason:** Adds a buffer/queue-depth model. Significant refactor of the per-tick loop. Differentiates Kafka vs RabbitMQ. **Status:** accepted.

## D52 — Phase 6 tier: enterprise — Interaction rules affect capacity (2026-06-02)
**Phase:** Interaction rules affect capacity (E6) · **Types:** engine, simulation, integration · **Prototype:** no
**Reason:** Bridges the metric system and traffic simulation. Category-pair rules change effective capacity. **Status:** accepted.

## D53 — Phase 7 tier: mvp — Protocol overhead (2026-06-02)
**Phase:** Protocol overhead (E7) · **Types:** engine, simulation · **Prototype:** no
**Reason:** Read connection protocol from edge nodes, apply multiplier. **Status:** accepted.

## D54 — Phase 8 tier: mvp — Monitoring feedback (2026-06-02)
**Phase:** Monitoring feedback (E8) · **Types:** engine, simulation · **Prototype:** no
**Reason:** Monitoring presence shortens failure recovery duration. Makes monitoring non-decorative. **Status:** accepted.
