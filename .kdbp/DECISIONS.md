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

## D55 — Traffic origin graded as architecture, not deep sim (2026-06-03)
**Decision:** A traffic source's `origin` (one-region | multi-region) affects a challenge by being graded in the rubric as an ARCHITECTURE requirement — multi-region traffic requires the right components (CDN / multi-region-capable DB / DNS) on the canvas to pass — NOT via deep per-region simulation latency/capacity.
**Rationale:** Challenge scoring is sim-stats-only (uptime/p99/cost/topology) and never reads the demand/heatmap/tier layer; that layer is also off in challenge mode. So the "reuse geographic-spread demand multipliers" path would give origin ZERO effect on a challenge score (verified, workflow w9vlphjd8). Rubric-grading is meaningful and avoids a large new sim surface.
**Alternatives:** (a) full per-region sim latency/capacity (deferred — large engine effort); (b) cosmetic-only (rejected — owner wants it to matter).
**Status:** active

## D56 — Add a read/write/mixed workload axis distinct from the shape `kind` (2026-06-03)
**Decision:** Traffic sources carry BOTH a shape `kind` (steady|realistic|periodic|search) and a separate `workload` (read|write|mixed). They are different axes and cannot share `kind`.
**Rationale:** The owner specified kind = traffic shape. The lever that actually makes challenges hard (exercising the dormant write/read split, cache, queue mechanics) is the read/write workload, which biases which tier a source's RPS stresses. Keeping them separate keeps both expressive.
**Status:** active

## D57 — Per-source routing lands in this effort (Phase 2) (2026-06-03)
**Decision:** Add per-source routing in simulateTick now (Phase 2), replacing the flat even-split, so the kind/workload mix reaches specific tiers (write→DB primary, read→cache path). Even-split fallback retained for non-challenge runs.
**Rationale:** Without routing, multi-source only changes the aggregate curve shape; the workload axis (D56) and write-bottleneck difficulty cannot bite. Owner chose to include it in this effort rather than defer.
**Risk:** simulateTick is load-bearing for all sim runs — mitigated by the fallback + deterministic routing tests.
**Status:** active

## D58 — Phase 0 tier: ent (2026-06-03)
**Phase:** Schema + types foundation · **Types:** data, schema, engine · **Tier:** ent · **Prototype:** no
**Reason:** Load-bearing schema (Challenge type + YAML loader) + the trafficPattern→trafficKind rename across ~10 files; back-compat for 42 challenge YAMLs + saved canvases needs deterministic normalizer tests.
**Review trigger:** n/a (foundation). **Status:** accepted

## D59 — Phase 1 tier: ent (2026-06-03)
**Phase:** Traffic config UX · **Types:** user-facing, web, client-state · **Tier:** ent · **Prototype:** no
**Reason:** Replaces the just-stabilized replicaCount-RPS mechanism (P105/P107); canvas layout is sensitive; one-per-type enforcement spans free-play + challenge modes; needs runtime journey evidence.
**Status:** accepted

## D60 — Phase 2 tier: ent (2026-06-03)
**Phase:** Per-source routing (engine) · **Types:** engine, simulation · **Tier:** ent · **Prototype:** no
**Reason:** simulateTick is load-bearing for every run; changing routing risks regressing free-build/scenario runs. Even-split fallback + deterministic routing tests mandatory.
**Status:** accepted

## D61 — Phase 3 tier: ent (2026-06-03)
**Phase:** Richer targets + rubric · **Types:** engine, scoring · **Tier:** ent · **Prototype:** no
**Reason:** Scoring changes affect pass/fail for all challenges; required_topology DAG assertions are easy to get subtly wrong (adversarial tests). New fields optional/defaulted to preserve the 42 existing challenges' scores.
**Status:** accepted

## D62 — Phase 4 tier: ent (2026-06-03)
**Phase:** Author the hard challenges · **Types:** data, content · **Tier:** ent · **Prototype:** no
**Reason:** New content must be solvable AND hard; a solvability smoke test (reference solution clears each) prevents unwinnable challenges. Ship as new ids to protect returning players' progress.
**Status:** accepted

## D63 — ISAPivot Phase 1 traffic-config UX decisions (2026-06-04)

**Status:** active

Locked with the product owner before Phase 1 implementation:

1. **rps = PEAK / maximum.** A traffic source's `rps` is the maximum load it reaches (the number the architecture must survive). The `kind` defines the duty cycle BELOW the peak (steady=flat at peak; realistic≈0.6×peak floor; periodic/search sit low and spike to peak). The min/avg are DERIVED and displayed. Curve derivation: baseRps = peakRps / kindPeakMultiplier(kind) {steady 1, realistic ~1.4, periodic 3, search 4}, then clamp max to peakRps.
2. **RPS input = ± stepper everywhere** (snap through TRAFFIC_RPS_STEPS 3k→10M) on both canvas block and inspector. No free-text numeric. "Arbitrary RPS" = the 20 discrete steps.
3. **All 4 fields editable on block + inspector.** RPS stepper + kind + workload + origin selects on the canvas block AND mirrored in the inspector. (Supersedes the badge-only block idea.)
4. **Hard-block one-per-type / max-4 in BOTH modes.** Free play enforces the same limit as challenge mode (toast explains the block). No WARN split.
5. **trafficSources overrides trafficCurve.** When a challenge has both, derive the curve from sources (ignore trafficCurve); 42 legacy curve-only challenges unaffected (fallback). Direction: migrate ALL challenges to sources, then retire trafficCurve (Phase 4). Dev-time author WARN when both present.
6. **Surface the envelope.** Show derived min/avg/peak (from rps + kind) on the block, inspector, and challenge brief — author/player always see the real load range.

**Source:** Phase 1 design workflow (whgxzrg8j) + product-owner Q&A. Supersedes the Phase 0 doc note that called `rps` the "average".

## D64 — Challenge-authoring parity + full built-in retrofit (2026-06-04)

**Status:** active

Follow-up to D63 (closes two scope gaps the product owner surfaced):

1. **ChallengeEditor gains trafficSources config (new Phase 1 slice 8).** The in-app create/clone editor today has NO traffic configuration — `trafficCurve` is hardcoded (ChallengeEditor.tsx:45) and there is no trafficSources field. Add a "Traffic sources" section: add/remove ≤4 typed sources (one per type), each with the rps stepper + kind + workload + origin selects (reuse the canvas-block controls) + the derived min/avg/peak envelope. Brings GUI authoring to parity with the new model; until then, trafficSources is YAML-import-only.
2. **Phase 4 recasts ALL 41 built-in challenges to trafficSources** (not just new ids). Per-challenge solvability smoke test (a reference solution must clear each). Author new trafficSources-based hard challenges alongside. Once every built-in is recast, retire the legacy `trafficCurve` field. ("Quests" = the same challenge data rendered as the journey tree — no separate retrofit.)

**Source:** product-owner Q&A. Extends Phase 1 (adds slice 8) + Phase 4 (recast-all + retire trafficCurve).

## D65 — Hint Economy: spendable stars + progressive hints + full reset (2026-06-04)

**Status:** active

A second currency + progressive hint system layered on the existing star scoring:

1. **Spendable stars (earned−spent pool).** Spendable balance = Σ(bestStarsCloud) − Σ(hintsUnlocked). Per-challenge star RATINGS stay permanent; spending only draws down the global pool. New `hintsUnlocked: Record<challengeId, number>` on the `userProgress/{uid}` Firestore doc.
2. **Progressive hints.** 1–5 per challenge (schema min1/max5 — safe: all 41 currently have 1–3), ordered, revealed ONE AT A TIME, each costs 1★, permanent once unlocked (no re-pay, no refund), the FINAL hint = the full solution. Hints must cover everything needed to solve the challenge.
3. **Unlock anytime** on any unlocked challenge while the player has ≥1 spendable star and unspent hints remain.
4. **Full progress reset (one-time).** A `PROGRESS_GENERATION` constant; on loadProgress a stale generation wipes trackXp + completedChallenges + bestStarsCloud + hintsUnlocked → ground zero, so every user restarts earning XP AND stars. Ships LAST (after retrofit + hint economy). Tree re-locks via existing requires/min_xp gates.

**Plan impact:** extends Phase 1 slice 8 (creator configures hints) + Phase 4 (author progressive hints during recast); adds Phase 5 (hint economy) + Phase 6 (reset migration). **Source:** product-owner Q&A (follow-up to D63/D64).

## D66 — Phase 3 rubric/scoring decisions (2026-06-04)

**Status:** active

Resolved before implementing the scoring layer (design workflow w25nfaeyv):

1. **Fixed 3-star model** (defer a configurable weighted rubric). All new criteria fold into the existing base/budget/topology stars — the UI hard-codes 3 stars + XP-per-star = xp/3; a weighted/variable-max rubric would force a modal redesign + break the XP math + risk the byte-identical invariant. A configurable rubric is a later follow-up.
2. **Origin grading: always grade when a source is multi-region** (NOT opt-in). A challenge with any `trafficSources[].origin === "multi-region"` requires CDN + DNS + a DB type in the rubric (architecture check, D55 — not a demand multiplier). SAFE because no built-in declares trafficSources/multi-region yet (verified), so the 41 score identically; Phase 4 authors will design multi-region challenges with the required architecture.
3. **required_topology: author-specified source+target types, undirected adjacency.** Each assertion names its types (e.g. CACHE_BETWEEN {source, target}); passes when a node of the rule's pivot type is adjacent (either edge direction) to both a source-type and a target-type node. Robust to the source→target edge convention + matches read-aside wiring.
4. **chaos_intensity: z.number().min(0).max(10).default(1)** (recommended default taken) — multiplies the latency-spike multiplier in computeOverrides; never read in evaluateAttempt (scoring stays deterministic). 0 = inert, 1 = as-authored, >1 = harsher.

**Invariant (all sub-slices):** every new field optional/defaulted → identity element in its scoring combinator → the 41 existing challenges score byte-identically; proved by a golden-snapshot regression test (sub-slice 3f, built first). **Source:** design workflow w25nfaeyv + product-owner Q&A.

## D67 — Phase 4 strategy: harden in-place + solvability harness + progressive hints (2026-06-04)

**Context:** Phase 4 recasts all 41 built-in challenges onto typed trafficSources (D64) and is the
epic's "make challenges genuinely harder" deliverable. Two consequential branches were the user's call.

**Decisions (user-selected):**
1. **Difficulty = Harden + solvability harness.** Recast sources preserving the load peak, then apply
   the Phase 3 levers (forbidden_types, required_topology, multi-region origin, chaos_intensity, p95)
   thematically to make challenges genuinely harder. A CI solvability harness builds a reference
   solution per challenge and asserts it still clears — the safety net that catches over-hardening
   (mirrors 3f's golden-snapshot role for scoring).
2. **Hints = author 1-5 progressive ladders now.** Rewrite all 41 hint sets into a progressive ladder
   where the LAST hint spells out the reference solution. Phase 5 then wires the spending economy on top.

**Reconciliation (supersedes the PLAN "ship as NEW ids" note):** recast IN PLACE (same challenge ids),
NOT as new ids. New ids would orphan the tech-tree requires/unlocks edges and every returning player's
completedChallenges. Because Phase 6 performs a full all-user progress reset (D65), re-tuning difficulty
in place is fair — everyone restarts anyway — so there is no "don't break returning players" cost.

**Sub-slices (harness-first, like Phase 3):**
- 4a — solvability harness + reference solutions (baseline lock, BEFORE any recast).
- 4b — recast trafficSources (preserve load peak/shape per theme), verified by 4a.
- 4c — hardening pass (apply Phase 3 levers thematically; re-tune references), verified by 4a.
- 4d — author 1-5 progressive hint ladders (last = full solution).

**Status:** active.

## D68 — Phase 5 Hint Economy model (2026-06-04)

**Context:** D65 set the hint economy (spendable stars, progressive hints, full reset). This pins the
concrete model now that Phase 4 authored the 1-5 hint ladders.

**Decisions:**
1. **Spendable balance = Σ(bestStarsCloud) − starsSpent.** Ratings (per-challenge best stars) stay as
   achievements (unchanged); a derived spendable pool = total earned stars minus stars spent on hints.
   `starsSpent` is a new monotonic counter on userProgress.
2. **hintsUnlocked: Record<challengeId, count>.** Hints unlock sequentially (one at a time); count =
   how many of the challenge's ladder are revealed. Unlocking the next costs 1 spendable star.
3. **unlockHint is an atomic guarded spend:** no-op when all hints already unlocked OR spendable < 1;
   otherwise increment hintsUnlocked[ch] + starsSpent and persist. Hints accessible anytime, any
   challenge (D65). The last ladder hint is the full reference solution.
4. **Firestore:** add `starsSpent` (int ≥0) + `hintsUnlocked` (map) to userProgress/{uid}; rules
   `hasOnly` allowlist + type checks extended (HARD GATE — manual `firebase deploy --only firestore:rules`).
   Backward compatible: existing docs without the fields still pass hasOnly (subset).

**Sub-slices:** 5a model + spend + rules (gated) · 5b HintPanel UI · 5c tests/E2E.
**Status:** active.

## D69 — New challenge expansion: lever set + absurd capstones, all barely-solvable (2026-06-04)

**Context:** Post-ISAPivot, the new levers (forbidden_types, required_topology, multi-region origin,
chaos_intensity, p95/cost_per_request, typed trafficSources + workload) enable challenge shapes the old
engine couldn't express. User asked for more challenges + absurd theoretical tier-5 capstones.

**Decisions (user-selected):**
1. Author BOTH a lever-driven set (~9, slot into existing tiers, one per new lever) AND ~6 absurd
   tier-5 capstones (10M rps, max chaos, multi-region, sequential outages, AGI-infra, etc.).
2. Everything is TUNED TO BARELY-SOLVABLE — no `theoretical`/harness-exempt flag. Every new built-in
   must clear the 4a solvability harness with a reference solution (even Computeless-style ones get a
   clearable target or are dropped). The harness stays the universal gate.

**Prerequisite:** the harness reference-solution builder must satisfy required_topology assertions
(deferred in 4c) — CACHE_BETWEEN (cache adjacent to both endpoints), LB_UPSTREAM (LB adjacent to each
target), FAN_OUT_GTE (source given ≥N neighbors). Build that first, then author + harness-validate +
tune + weave into the tech tree (requires/unlocks/tier/track) so the Quest Log shows them.

**Status:** active.

## D70 — Absurd capstones get a new Tier 6 (2026-06-04)

Addendum to D69. The absurd/theoretical capstones (Planet Scale, Thundering Herd, Heat Death, Zero-Budget
Hero, The Singularity, …) land in a NEW **Tier 6** — bump `MAX_CHALLENGE_TIER` 5→6, add the "VI" tier
label (ChallengeTreeView TIER_LABELS + editor tier select), and verify the tier evaluator / relative-level
/ rank thresholds tolerate it. The Quest Log gains a bottom band for the endgame. Still barely-solvable
(D69) — harness-gated. (Lever batch 1 already shipped in existing tiers; this is for batch 2.)

## D71 — Challenge buildability ceiling: enforce in creator + cap the harness (2026-06-05)

A challenge's peak RPS is bounded by what a player can BUILD, not by the sim. The canvas allows
MAX_CANVAS_NODES=50 nodes × MAX_REPLICAS=20 replicas; the front tier (DNS/CDN) ingests the full peak at
~100k rps/replica, so a single front-tier node tops out at ~2M rps. Discovered that 5 of 6 absurd Tier-6
capstones (authored 4–9M rps) cleared the *uncapped* solvability harness only with 1,250–2,203 replicas —
unbuildable; a player could never finish them.

**Decisions:**
1. The solvability harness now scores every reference solution **capped at MAX_REPLICAS** — a challenge
   is "clearable" only if buildable within the canvas budget, not just theoretically solvable.
2. New constant `MAX_BUILDABLE_PEAK_RPS = 2_000_000`. The challenge creator (ChallengeEditor) gates the
   summed traffic-source peak against it (filters the RPS dropdown + blocks Save/Export over budget), and
   `ChallengeYamlSchema.superRefine` rejects over-budget imported YAML. Logic in `src/lib/challengeBudget.ts`.
3. The 5 over-scale capstones were re-tuned to 1.2–1.8M peaks (absurd framing kept; brief/hint numbers updated).

**Status:** active.

## D72 — Rethink the star model: well-formed (not redundant) 3★ + Resilient badge (2026-06-05)

Requirement: every challenge must be 3★-completable. 3★ = base-pass (SLA) + budget star + topology star.
The topology star previously required ZERO topology issues, and `missing-hop` flags any node behind an
articulation point — so it effectively demanded a no-single-point-of-failure (redundant) architecture,
which ~doubles cost and made tight-budget challenges un-3★-able (budget vs redundancy tension).

**Decisions:**
1. The topology star ("Well-formed") now requires only zero **blocking** issues — `orphan` + `unreachable`
   (a structurally broken graph). `missing-hop` (SPOF) + `replicas-without-lb` are **advisory**: they coach
   toward resilience but do NOT gate a star. `countTopologyIssues()` (topologyChecker) is the split authority.
2. New non-star `resilient` flag (zero issues of ANY kind) → a "Resilient — no single point of failure"
   bonus badge in the results modal. Recognizes redundancy without gating the top star.
3. The reference-solution builder (referenceSolution.ts) was upgraded: wire aux tiers as traffic-free leaves
   (no orphans, no shed on their outage), cost-aware replicaType-aware variant sizing (2-pass: build big →
   measure load → lean-resize), and try-both (lean ∪ max-capacity) — every one of the 55 challenges now
   clears 3★ within the UI budget (harness + capstone proof assert `=3`). Golden snapshot preserved
   (scorer takes a blocking-count; synthetic-stats golden unaffected).

**Status:** active.

## D73 — cost_per_request challenges + unlocked-E2E CI workflow (2026-06-05)

Two follow-ups unblocked by earlier work.

**cost_per_request challenges (closes the D69 deferral).** The cost-aware lean reference builder (D72)
makes cost-per-request challenges harness-verifiable, so two ship: `unit-economics` (data T4, 800k
read, off read-aside) and `lean-at-scale` (data T5, 1M read, off unit-economics), each with a
`cost_per_request` target between the lean build's value and the over-provisioned build's. The
lean/cost-efficient solution clears 3★; an over-provisioned build fails the cost gate (the lesson).
Steady traffic + moderate uptime targets (95%) keep the cost metric the binding constraint. Counts
55→57 + golden snapshot additively extended (existing 55 byte-identical).

**Unlocked-E2E CI (`.github/workflows/e2e-unlocked.yml`).** Runs the `desktop-unlocked` replay project
against real Firebase on push to dev/main + manual dispatch. Deliberately a SEPARATE workflow from the
deploy gate and from ci.yml — does NOT contradict D11 (full E2E stays out of the deploy gate due to
environmental flakiness); this is a focused, deterministic capstone-replay signal. Skips gracefully if
VITE_TEST_UNLOCKED_EMAIL isn't a repo secret.

**Status:** active.

## D74 — Learning-Fidelity Redesign epic: score on behavior, not presence (2026-06-05)

**Decision.** Open a full A→D epic (PLAN.md "Learning-Fidelity Redesign") to make the sim + scoring +
lesson-loop teach real, transferable system design. The guiding principle: **score on BEHAVIOR, not
block-presence.** The recurring disease across the 3-perspective roast
(`docs/quality-reports/learning-fidelity-roast.md`, 22 gaps) is the rubric rewarding "the right blocks
on the canvas" over "the blocks doing their job under load" (ED2/ED3/ED6/EN4). The reference builder's
own exploits (traffic-free aux leaves, "add cache always wins", over-provision one tier) are the canary
— re-roast after each phase and confirm they shrink.

**Scope:** Part A = Phase 1 (behavior-tied scoring + lesson-loop quick wins; standalone, low risk).
Part B = Phases 2+3 (engine fidelity: additive latency + queueing curve + concurrency, then resilience
as a real, rewarded subject). Part C = Phase 4 (new dimensions: dynamic cache, autoscaling, usage-cost,
multi-region replication lag + a consistency/CAP axis). Each phase independently shippable.

**Status:** active.

## D75 — Per-phase tiers + the engine re-calibration exit gate (2026-06-05)

**Tiers (with escalation reasons — enterprise/scale require justification per /gabe-plan):**
- Phase 1 — **enterprise**: behavior-tied scoring + learner-loop correctness on an enterprise-maturity
  teaching product; load-bearing for credibility, not throwaway.
- Phase 2 — **enterprise**: core engine physics (latency/utilization/concurrency); every challenge's
  difficulty depends on it.
- Phase 3 — **enterprise**: resilience modeling + a scoring change; load-bearing engine work that
  reverses the D72 redundancy demotion once redundancy is mechanically meaningful.
- Phase 4 — **scale**: net-new scoring dimensions (consistency/CAP, elasticity, usage-cost,
  multi-region lag) = the 10x-breadth tier.

**Re-calibration exit gate (cross-cutting risk + mitigation).** Every engine-changing phase (2/3/4)
ripples into re-tuning all 57 challenge targets, regenerating the golden snapshot, and regenerating the
E2E capstone fixtures. The standard phase EXIT criterion is therefore: **re-tune + regenerate golden +
regenerate fixtures + solvability harness 3★ for all 57 + capstone replay E2E green.** Mitigation: the
solvability harness (`referenceSolution.ts` buildClearingSolution + scoreSolution, capped at
MAX_REPLICAS) + the cost-aware lean builder already exist to drive this fast.

**Status:** accepted.

## D76 — ED3 (required-types on-path) rescoped from Phase 1 to Phase 3 (2026-06-05)

**Decision.** Move ED3 (required_types must be ON the served path, not merely present) out of Phase 1
into Phase 3. Phase 1 ships its other four tasks (LX1 free-first-hint, LX2 culprit-node, ED7 cost unit,
LX3 reference par); ED3 is deferred.

**Why.** A safe sync/async split is impossible without the builder's exact on-path classification:
`worker` and `stream-processor` are component-category `compute` yet are functionally async and the
reference builder wires them OFF the synchronous spine (only `messaging`/`real-time` are explicitly
routed off-path). A category-based exemption would mis-classify them and could break the harness 3★ for
several challenges (worker+message-queue, stream-processor+event-stream, realtime+stream-processor). The
correct fix shares the SAME on-path/async classification the builder uses — which Phase 3 reworks anyway
(ED2 fractional-AZ outage removes the very reason async tiers are wired traffic-free). Doing ED3 there is
both safe and natural; rushing it in Phase 1 risks destabilizing all 57 challenges.

**Status:** accepted. ED3 now lives in Phase 3's gap set (tracked as PENDING D15).

## D77 — Phases 2-4 implementation playbook + adversarial corrections (2026-06-05)

A 27-agent design workflow produced `docs/quality-reports/learning-fidelity-playbook.md` — code-grounded,
adversarially-verified specs for all 13 remaining gaps. Key corrections the adversarial pass surfaced
(these OVERRIDE the original PLAN phase notes):

- **Dependency directions were inverted.** ED2 (fractional AZ outage) and EN6 (cyclic-flow solve) have
  NO upstream gap dependency — they are PRECONDITIONS. Order: EN6 → EN3; ED2 → {EN7, restore-redundancy}.
- **ED5 (dynamic cache hit-ratio) is INFEASIBLE as originally specified** — the reference builder never
  sets trafficWorkload, so writePressure=0.5 derates EVERY cache in all 57 builds; trafficKind never
  reaches the harness. Needs a workload-plumbing fix + a 3-step bisectable rollout first. (PENDING D16.)
- **EN6 must NOT change the `totalServedRps` formula** — keep `max(0, targetRps − totalFailedRps)`;
  the proposed `Σ(served−forwarded)` breaks queue-buffering builds. The fixed-point fixes forwarding;
  the existing formula then stays correct. Zero re-calibration (no cyclic topologies in the 57).
- **`40-observe-to-recover` becomes structurally unclearable** once EN7 deletes MONITORING_RECOVERY_FACTOR
  (max uptime 66.7% < target 80%, no fronting tier in its palette). REDESIGN it before landing EN3/EN7.
  Its `component_failure` target is a category string that matches no node id (a mechanical no-op). (PENDING D17.)
- **restore-redundancy: use the separate-metric route** (a `resilienceEarned` boolean, zero star-math
  change), NOT a gated-3rd-star modifier — the modifier re-opens the D72 budget-vs-redundancy tension.
- **ED3 breaks 3 challenges (28/29/38) via the non-exempt `security` type** unless the builder's on-path
  pass is category-agnostic (link ANY non-exempt orphan required type into the spine, not just compute).
- **Standard re-calibration loop = D75 exit gate**, applied per engine change: re-tune 57 targets from
  the harness's measured values → golden is a no-op tripwire (meetingStats meets any target) → regenerate
  capstone fixtures for flipped candidates → harness 3★ all 57 + capstone E2E green.

**Recommended implementation order:** Phase 2 (ED1/EN1 + ED4/LX4 atomic, then EN2) → EN6 → Phase 3
(ED2 → EN7 → restore-redundancy → ED3) → Phase 4 (ED9, EN5, then ED5 once unblocked, then ED6/EN4/ED8).

**Status:** accepted. Playbook is the implementation source of truth; PLAN.md stays canonical for phase state.

## D78 — Phase 2 ED1/EN1 + ED4/LX4 landed: path-sum latency + queueing curve (2026-06-06)

Shipped as one atomic commit (214a2d3) per the playbook's hard rule. End-to-end latency is now the
SUM along the served path (+ per-edge RTT), traffic-weighted over completion points so cache hits
short-circuit; latencyUnderLoad is an M/M/1 queueing curve (base below ρ=0.5, base/(1−u) above, capped
at 50× — no Infinity). pathLatencyMs/worstHopLatencyMs added to TickState; systemLatency reads the sum.

**Re-calibration was far smaller than feared** (the lean builder's short cache-fronted paths stay under
most targets): only 2 p99 targets moved — planet-scale 400→1030, thundering-herd 350→1050 (their
only uptime-meeting build is the over-provisioned one, whose long multi-hop path measures ~890/913ms;
capacity is those challenges' lesson, not tight latency). 4 challenges' lean-par flipped as a CORRECT
consequence of ED4: high-ρ cost-optimized builds now pay a latency penalty (checkout-flow/api-gateway
need headroom → costlier par) while over-provisioned long paths over-sum (production-ai/rag-retrieval →
cheaper lean wins) — all still 3★. Harness 3★ all 57, golden no-op, capstones green, suite 4775.

**EN2 (concurrency/Little's law) still pending** — XL, needs concurrency_limit authored on ~114
component YAMLs; its own focused pass (the playbook's strict (1)→(4) authoring order).

**Status:** ED1/EN1 + ED4/LX4 accepted + shipped. Phase 2 is 2/3 (EN2 remains).

## D79 — Fluidity: block tunes, panel teaches (2026-06-07)

**Decision:** The canvas block is the SINGLE tuning surface (vendor + config-variant + replicas + traffic). The right-panel inspector becomes read-only learning/inspection.
**Rationale:** Today vendor + traffic are editable in BOTH the block AND the inspector, while config-variant is inspector-only and replicas are canvas-only — so neither surface is a complete control set and the player must bounce between them to fully tune one node. The user prefers configuring on the blocks; connectors are already read-only, so this makes blocks consistent (panel = read/understand, block = tune).
**Alternatives considered:** (a) panel-tunes-block-glances — rejected, user prefers the block; (b) de-dup-but-keep-both — rejected, still two tuning surfaces (the friction we're removing).
**Status:** accepted

## D80 — Fluidity: declutter the static-score footer in place (2026-06-07)

**Decision:** Keep the dashboard footer always-visible but slim it — tier + budget + aggregate grade + the single WEAKEST category inline + a "more" affordance that opens the existing full overlay; the 7 inline category bars (horizontal-scroll cram in a 100px strip) move into the overlay.
**Rationale:** The score is design-coaching that should stay glanceable, but the 7-bar cram is the clutter the user feels. Slimming in place keeps the score present without hiding it behind a button.
**Alternative considered:** demote-to-Scores-button (collapse footer to a pill + button) — rejected for now; the user wanted the score to stay visible, just decluttered.
**Status:** accepted

## D81 — Fluidity per-phase tiers + supersede Learning-Fidelity (2026-06-07)

**Decision:** Phase 1 (one tuning surface) = enterprise; Phase 2 (declutter footer) = enterprise; Phase 3 (knowledge propagation + progressive unlock journey) = scale, DEFERRED. The prior "Learning-Fidelity Redesign" plan is archived as completed (shipped P135–P143).
**Reason:** P1/P2 are user-facing refactors touching shared, tested components (enterprise: full coverage + careful migration, not throwaway). P3 is a cross-cutting progression/onboarding system (scale) and is explicitly deferred per the user ("later").
**Review trigger:** revisit P3 once P1/P2 land and the read-only inspector + decluttered footer are validated in use.
**Status:** accepted

## D82 — Fluidity P3: one shared "disclosure tier" (progression-driven in quests, manual in free mode) (2026-06-07)

**Decision:** Unify on a single "disclosure tier" that gates block configs + inspector sections. In QUEST mode the tier is driven by quest progression (reveal controls/sections in stages — essentials early, config tier + trade-offs + metrics later / at 3★). In FREE mode the manual Beginner/Intermediate/Expert control sets the tier and everything for that level is shown. Both feed the SAME gating logic (the existing showTradeoffs/showTechnical + new on-node gates), so there's one code path, not two.
**Rationale:** The user wants quests to disclose configs "little by little" like they already do for blocks, while free mode stays fully open. Today quest disclosure is binary (traffic locks until 3★; blocks via tech-tree) and the experience level only gates the inspector/toolbox/dashboard — NOT the on-node controls. One shared tier avoids a second parallel gating system.
**Alternatives considered:** (a) quest difficulty fixes the tier for its duration — simpler but no within-quest growth; (b) keep manual level everywhere + only add tooltip journeys — smallest, but quests wouldn't progressively reveal configs. Both rejected per the user.
**Status:** accepted — implement in Phase 3c (after 3b).

## D83 — Fluidity P3: Test Conditions = failures only (drop demand scenarios) (2026-06-07)

**Decision:** Remove the demand-scenario presets (Startup MVP, Cost-Optimized, Enterprise Production, High Availability, Security First, Traffic Peak) from the Test Conditions panel — they're now covered by the traffic-source tier + pattern + workload + origin controls (+ the dashboard weight sliders for scoring focus). Keep the 6 failure injections (single-node, database, data-corruption, network-partition, region-outage, traffic-spike) and re-verify each still works after the simulation changes. The `activeScenarioId` field/plumbing stays inert for round-trip compat of saved canvases (avoids a destructive YAML-schema migration); only the UI selector + the demand preset data are retired.
**Rationale:** The demand scenarios duplicate the on-block traffic controls; the failures test resilience the traffic source can't. "Leave only what adds value."
**Alternatives considered:** keep 1-2 curated load profiles (rejected — fully redundant); keep all + just fix (rejected — keeps the redundancy). 
**Status:** accepted — implement in Phase 3b.

## D84 — Fluidity P3c-1: disclosure tier = experienceLevel; on-node config discloses in quests (UI-only) (2026-06-07)

**Decision:** The "disclosure tier" IS `experienceLevel` — manual in free mode, auto-set to the challenge's difficulty in quest mode (already wired: selecting a quest calls setExperienceLevel(c.difficulty)). A new `useDisclosureTier()` hook centralizes the policy and exposes `showOnNodeConfig = !isQuest || levelRank(tier) >= intermediate`. NodeConfigSelect (the on-node config-tier picker) is gated by it: hidden in beginner-difficulty quests, shown at intermediate+; ALWAYS shown in free mode ("all options available").
**Rationale:** "Disclose the configurations little by little throughout the quests" like blocks already disclose, while free mode stays fully open (D82). Reusing experienceLevel (already difficulty-driven in quests) avoids a parallel tier system.
**Safety:** The gate is UI-only — it never touches the simulation or the reference-solution harness, so the 3★ solvability check is unaffected. Only what a player can manually tune is gated, and beginner challenges 3★ on default configs.
**Scope:** 3c-1 gated the config-tier picker; 3c-1b extends the SAME gate to the vendor swap (NodeProviderSelect falls back to its static vendor label when gated) and the replica stepper (ArchieNode). The replica gate is verified solvability-safe: all 6 beginner-difficulty challenges peak at ≤600 RPS, well under a single default compute's 1000 maxRPS, so 1 replica suffices — no beginner quest needs manual scaling. Deferred to 3c-2: rebuild the STALE inspector panelGuide (still references the removed component-swapper/config-selector) + the progression-aware tooltip journey. Optionally hide the manual level control in quests for a hard gate (currently a soft default the player can raise).
**Status:** accepted — 3c-1 implemented.

## D85 — Desktop E2E CI is informational-first; @smoke promotion gated on green runs (2026-06-09) [operational]

**Decision:** The full `desktop` Playwright project runs in CI as a push-only, NON-GATING workflow (e2e-desktop.yml, added c88d649): push to dev/main + manual dispatch, --workers=4, 30-min cap, artifacts on failure, graceful skip without secrets. It is deliberately NOT a required check and NOT a deploy gate. Promotion path: once informational runs are reliably green, curate an @smoke subset and promote ONLY that subset to a required status check.
**Rationale:** ~522 desktop test cases silently rotted (~23 dormant failures, D23/D24) because nothing ran them. A full-suite required gate would block merges on E2E flake and train ignore-and-rerun behavior; informational-first stops the silent rot at zero merge risk, and the later @smoke gate adds teeth only where stability is proven.
**Alternatives considered:** (a) full suite as required check — rejected: flake-blocking on 522 cases; (b) no CI at all — rejected: that's how the rot happened.
**Review trigger:** after the first few informational runs — if reliably green, schedule the @smoke curation + required-check promotion.
**Status:** active,operational

## D86 — Feedback-overhaul roadmap: phasing + per-phase tiers (2026-06-09)

**Decision:** The verified 2026-06-09 playtest feedback ships as a 5-phase plan in this order: (1) Trust & friction fixes [ent/med], (2) Progression & grading integrity [ent/high], (3) Teaching quality [ent/high], (4) Break-it loop & expert currency [scale/high], (5) New challenge formats [scale/high].
**Rationale:** Fix what misleads players first (config traps, forced mismatches, dead UI), make grading honest, raise content quality — THEN build the flagship break-it/currency mechanic on a foundation that deserves it. Phases 1–3 are enterprise (shared, tested, user-facing surfaces); 4–5 are scale (new progression systems + schema-level challenge formats).
**Tier digest:** P1 ent (touches tested shared UI + 61-challenge data, full coverage required); P2 ent (scoring + tech-tree are load-bearing; validator must be CI-gated); P3 ent (240-variant data migration with the strict-schema re-seed trap); P4 scale (new persisted currency + cross-cutting progression UX); P5 scale (challenge-schema evolution + new sim semantics).
**Alternatives considered:** break-it loop earlier (before content quality) — rejected by user; merged single integrity phase — rejected by user.
**Source:** docs/gabe/tests/20260609/feedback20260609.md; 14 claims verified by workflow wf_efd61e6d (verdicts: 3 confirmed bugs, 5 design-gaps, 2 data-gaps, 3 partially-true, 1 by-design).
**Status:** accepted

## D87 — Port compatibility: challenge-mode star gate; sandbox keeps WARN (2026-06-09)

**Decision:** Enforce port compatibility ONLY in challenge mode, as a star gate: count edges with `data.isPortMismatch` at attempt-snapshot time (ChallengeStartButton → AttemptSnapshot), and gate the well-formed-topology star via an optional, defaulted rubricScorer parameter. Sandbox/free mode keeps WARN (allow + warn), honoring the original AC-ARCH-NO-1/FR7 decision.
**Rationale:** Today the mismatch signal dies at edge.data — buildSimGraph strips it, SimEdge can't carry it, the scorer never sees it — so players earn 3★ through architectures the UI itself flags as wrong (verified). A challenge-mode star gate is small (S code), pedagogically clear (mismatch = structural error, same family as orphan/unreachable), and harness-safe: reference solutions carry no handle ids, so the checker's null-handle escape keeps them mismatch-free and 3★.
**Hard prerequisite:** the Phase-1 port-coverage fixes (compute stream-out etc.) — enforcing first would punish canonical builds that are currently FORCED into mismatches.
**Alternatives considered:** (b) sim-level degradation (mismatched edges shed traffic) — pedagogically strongest but M-L effort, ripples through tuned sim invariants and sandbox; revisit later as an optional Phase-5+ enhancement. (c) keep WARN-only everywhere — rejected: keeps grading dishonest.
**Status:** accepted — implement in Phase 2

## D88 — Polyglot-persistence honors its brief: drop the object-storage ban (2026-06-09)

**Decision:** Remove `object-storage` from polyglot-persistence's `forbidden_types`, re-tune the challenge, and re-verify solvability. The brief ("blobs to object storage") is the quest's educational point; the config contradicted it (a Phase-4c agent-hardening regression, commit 9bc7069, that the solvability harness couldn't catch because it never reads prose).
**Guard:** Phase 1 adds the challenge-config validation test (forbidden ∩ available_blocks = ∅, forbidden ∩ required_types = ∅ across all 61) so this class of contradiction can't ship again.
**Alternatives considered:** keep the ban and rewrite the brief as a "do it WITHOUT object storage" constraint quest — rejected: fights the quest's own theme.
**Status:** accepted — implement in Phase 1

## D89 — Phase 2 (Progression & grading integrity) design lock + 8-slice decomposition (2026-06-10)

**Context:** Phase 2 design workflow (wf_eef42647-9ae — 7 architect surface-maps + synthesis) consolidated
the phase into two load-bearing seams (port-enforcement snapshot→rubric gate; techTree closure validator
as the regression guard for the unlock-ordering data fixes) and surfaced four product forks, all locked
with the owner.

**Owner decisions (2026-06-10 Q&A):**
1. **Port gate (D87) = GLOBAL-ON.** Every challenge costs the well-formed star when start-time
   port-mismatched edges exist. NOT per-challenge opt-in: the defaulted-0 `portMismatchCount` param IS
   the byte-identity safety (golden + harness untouched), reference RefEdges have no port handles so the
   all-3★ harness is intact, and a mismatch is objectively wrong everywhere — a per-challenge flag would
   add a 61-challenge migration surface for zero grading benefit.
2. **Pathway locked suggestions = DROP.** Locked-block pathway suggestions are pre-filtered out (engine
   stays pure → pathwayEngine golden snapshot protected). Legacy no-typeId components pass through the
   filter `(!c.typeId) || unlockedBlocks.has(c.typeId)`. Badge+CTA panels are a deferred fast-follow.
3. **Banned-block display = THREE DISTINCT lock treatments** keyed by a `BlockLockReason` enum: banned
   (forbiddenTypes → hard 0★) = red lock; not-in-palette = gray lock; not-mastered = existing amber lock.
   Teaches the constraint; banned reads as a deliberate rule, not mere unavailability. Reserve grayscale
   for not-mastered (no strikethrough — avoids a new visual idiom).
4. **Observe-to-Recover = IN PHASE 2 with the scheduled_events retarget folded in.** The retarget
   (component_failure/latency_spike match by node-id against crypto.randomUUID → never fire live on 8 of 9
   chaos challenges; only az_outage matches by category) is the deferred latent LEDGER "D25" finding. It is
   itself a grading-integrity fix (events fire HARDER live than authored once retargeted → mandatory chaos
   re-tune to restore all-3★), so it is squarely on-theme and a HARD prereq for the observe-markers UI.

**8-slice decomposition (split along dependency seams; each independently shippable behind a green harness):**
- S1 — Port-mismatch grading signal (snapshot plumbing + rubric gate). No deps. [IN PROGRESS 2026-06-10]
- S2 — Pathway tech-tree filter (drop locked; engine pure). No deps.
- S3 — techTree closure-reachability validator + 2 new issue kinds (seeded RED). Coupled with S4/S5.
- S4 — Unlock-ordering content batch A (edge/foundations capstone prereq edges). Dep: S3.
- S5 — Unlock-ordering content batch B (reliability + foundations/realtime/security). Dep: S3, S4.
  At the 12-file ceiling → split to B1/B2 if a fixture regen adds files.
- S6 — Quest-mode footer CTA gating + budget dedupe + locked-block toolbox display (three-distinct). No deps.
- S7 — PREREQ: scheduled_events retarget-by-type + chaos re-tune (promotes latent LEDGER D25). Dep of S8.
- S8 — Observe-to-Recover visibility (engine event emission + timeline markers + free coach). Dep: S7.

**Sequencing:** Wave 1 (parallel, de-risk): S1, S2, S6. Wave 2 (coupled, ordered): S3→S4→S5. Wave 3
(gated, ordered): S7→S8. Harness safety: every scoring/engine change is an additive identity-element
field (defaulted-0 param, optional booleans) so the D66 golden + D87 all-3★ stay byte-identical; content
changes run `test:story` per-file behind the seeded-RED validator; S7 is the one genuine sim-math change
and carries a mandatory re-tune.

**Status:** active
**Review trigger:** revisit the drop-vs-badge pathway decision once the toolbox lock-reason panel (S6)
exposes a lock-flagged list; revisit per-challenge port opt-out only if a challenge is found that forces an
unavoidable mismatch (Phase 1 port-coverage work makes this unlikely).

## D90 — Palette-gap (ungrantable-available-block) policy: hard-gate REQ, accept+track palette gaps (2026-06-10)

**Context:** S3's closure validator surfaced — alongside the 21 hard `unreachable-required-type` violations (all fixed in S4 batch A + S5 batch B via added prerequisite edges) — 53 `ungrantable-available-block` gaps: built-in challenges whose `available_blocks` palette offers a block their requires-closure doesn't grant.

**Decision:**
1. **`unreachable-required-type` (REQ) is a HARD gate** — folded into `validateTechTree` (S5), so `challengeLoader.test`'s `validateTechTree(getAllChallenges()) === []` is now the permanent regression net. A required type the closure never grants is a genuine dead-end: free-build can't place it (after S2's unlocked-block filter) and the rubric demands an architecture referencing an un-introduced block.
2. **`ungrantable-available-block` (PAL) gaps are ACCEPTED for built-ins** and tracked softly (a snapshot drift-net in `unlockOrdering.baseline.test`), NOT gated.

**Rationale (PAL):** For a BUILT-IN challenge, `available_blocks` IS the palette regardless of the player's unlocked set — `ComponentTab` intersects available_blocks with unlocked ONLY for `origin: 'user'` challenges (D45-AC2). So offering a not-yet-grantable block in a built-in palette is the intended teach-by-using mechanic (the challenge introduces the block by letting you build with it); it does NOT break built-in play. The gap only bites user-CLONED challenges (the intersection drops the ungrantable block, possibly making the clone unsolvable) — an edge case acceptable for now.

**Note:** burst-absorber was bumped tier 2→4 in S5 — it requires `worker` (a T4 worker-fleet unlock), so its T2 label was an inversion. It's a tech-tree leaf (nothing requires it), so the bump is contained.

**Review trigger:** if user-clone palette coherence matters (community sharing / MVP 4), trim built-in palettes to grantable-only OR add prereq edges so every offered block is grantable. The 53-gap snapshot is the worklist.

**Status:** active

## D91 — scheduled_events retarget: match by id ∪ category ∪ type; component_failure fails ALL matching nodes (2026-06-10)

**Context (the latent LEDGER "D25" finding, promoted):** `component_failure` and `latency_spike` matched event targets against NODE IDS only. Authored targets name categories/types (`compute`, `auth-security`, `data-storage`, `relational-db`), live canvas ids are crypto UUIDs, and harness RefNode ids are `n-*`-prefixed — so these 9 events across 8 challenges fired NOWHERE. Only `az_outage` (category-matched) was live.

**Decision:**
1. **Matching = id ∪ category ∪ typeId.** `SimNode` gains optional `typeId` (populated by buildSimGraph from the component library) so `target: relational-db` (a type, not a category) resolves. Id-equality kept for literal-id back-compat.
2. **`component_failure` applies to EVERY matching node**, with monitoring judged PER NODE (a monitor-adjacent copy mitigates to the residual blast; an unmonitored one dies). Rationale: the authored targets are tier-level ("the data-storage layer fails") — and `az_outage` is already the partial/zonal event that rewards redundancy (resilienceEarned). Duplicating a tier does NOT dodge a category-targeted failure; observability is the counter-tool.
3. **`latency_spike` multiplies every matching node** (concurrent spikes still stack).

**Chaos re-tune (harness named the list — 3 of 8 spike challenges fell below 3★):**
- data-pipeline: multiplier 4→1.5 (chaos 2 ⇒ effective ×2; was ×7 ⇒ p99 1161/400). Now p99 236/400, p95 236/260. Hint grader-claims updated (120→235 ms; $400→$500 — lean par 380→490).
- defense-in-depth: multiplier 3→1.25 (effective ×1.5; was ×5 ⇒ p99 868/300). Now p99 261/300, p95 187/200. Hint "3x"→"1.5x".
- rag-retrieval: uptime target 98→78 — a 30s full storage outage on a 150s run caps uptime ≈79.5%; the authored 98 was NEVER achievable (the event was inert when authored). Now 79.5/78, barely-solvable (D69 ethos). Lean par 250→555.
- The other 5 (stream-processor, write-storm-brownout, edge-resilience, fortress, maxwells-demon) absorb their now-live events at 3★ unchanged.

**Live==harness restored:** events fire identically in live play and the harness; challengePar regenerated.

**Status:** active
**Review trigger:** Phase 4's break-it loop (per-condition resilience targets) and Phase 5's per-block failure conditions build on this targeting; revisit ALL-matching vs single-node kill if a challenge wants "one replica dies" semantics (that's az_outage's lane today).

## D92 — Phase 3 (Teaching quality) design lock + 10-slice decomposition (2026-06-10)

**Context:** Phase 3 design workflow (wf_d7a83f1f-dd8 — 6 architect surface maps + synthesis) consolidated the phase; owner locked 3 forks (2026-06-10 Q&A).

**Verified load-bearing findings:**
1. **The reseed trap is the NESTED schema:** top-level ComponentSchema is non-strict (D14) but `ConfigVariantSchema` is `.strict()` (componentSchema.ts:68) — reseeding Firestore with new variant fields makes every deployed OLD reader drop EVERY component (empty library in prod). MANDATORY ordering: deploy the tolerant reader FIRST, then ONE combined reseed (calibration + tier descriptions together — never two reseeds).
2. **Brief count correction (supersedes PLAN's "39"):** 18 pure-instruction + 17 mixed + 26 already context-style. PLAN exit ("0 instruction-style") is satisfied by the 18 alone.
3. **Prose is harness-inert by construction** (rubricScorer/referenceSolution never read brief/hint text) — so brief/hint edits can't regress D66/3★, AND the harness can't catch a wrong brief: prose-vs-config consistency is a per-file review obligation (+ a narrow forbidden-types keyword guard).
4. **Hint numeric pass must FOLLOW calibration** (gold-standard hints quote harness-measured par numbers; calibration moves them — author numbers exactly once).

**Owner decisions:**
1. **Brief scope = MAXIMAL:** all 35 non-context briefs reworked to a uniform context style (zero-budget-hero as template). S3 (18 binding) + S4 (17 mixed) both in scope; S3 still ships first so the exit criterion never depends on S4.
2. **Calibration = all three as recommended:** Aurora serverless-v2 ceiling ~9000→~6000 keep $90 (provisioned-vs-serverless trade-off); firestore/dynamo same-price gap 6.7×→~1.7× (raise firestore ~8000/~20000, trim dynamo on-demand ~14000, DynamoDB stays leader); TSDB internal ordering fixed (timescale ≥ influx) + relational single-node floor 500→~1500, cross-family spread KEPT (the teaching point). Plus postgres Citus inversion fix (citus ~16000 leads, sync-replica ~9000). Acceptance bar: solvability 62/62 3★ + par regen + D71 ceiling.
3. **Discipline ladder = uniform 4-tier/track,** thresholds scaled to quest counts (foundations 11, data 15, edge 8, realtime 7, reliability 10, security 5, aiml 5); reconciles to exactly 12 new PNGs + aiml-4→5 rename; the table (authored at S0) is the single source of truth; S6 adds the missing lockstep test.

**10 slices, 6 waves:** S0 contracts (DECISIONS tables: brief classification, ladder table, calibration table) → Wave 1 parallel: S1 schema+UI+tolerant-reader (deploy = the reseed gate), S2 calibration (local YAML, solvability-gated), S3 binding briefs, S5 ladder surgery (no-RPS-dependency fixes), S6 icons+toast → Wave 2: S4 mixed briefs, S7 numeric hint pass (AFTER S2 par regen), S8 tier-description authoring (240 variants, <12-file batches) → Wave 3: S9 the ONE combined reseed (BOTH Firebase projects — prod + test, per the vendor-links seed-drift lesson) + runtime evidence (tier dropdown/inspector screenshots; reader reads reseeded data) + DOCS drift.

**Status:** active
**Review trigger:** if S2's calibration can't hold 62/62 3★ within the D71 ceiling, revisit the relational-floor lift (the one change that moves harness builds); if S8's authoring quality drifts, sample-review per batch before the reseed.

## D93 — Phase 3 S0 contracts: brief classification, discipline ladder, calibration table (2026-06-10)

The three pinned tables everything in D92's Wave 1+ builds on. Sources: design workflow wf_d7a83f1f-dd8 surface maps, verified against src; owner forks locked in D92.

### Table 1 — Brief classification (supersedes PLAN's "39"; owner scope = ALL 35 uniform)

61 briefs: **18 pure-instruction** (full rewrite, binding for the exit criterion) + **17 mixed** (light pass) + **26 already context-style** (untouched). Template: 53-zero-budget-hero. Cap 600 chars; the hook must land in the first ~130 chars (ChallengeSelector line-clamp-2); ChallengeHud shows the full brief.

- **S3 batch A (pure, foundations/early-data, 8):** 01-first-service, 02-add-a-database, 03-cache-the-hot-path, 05-scale-out, 06-async-pipeline, 16-dns-routing, 17-edge-balance, 24-observe-baseline
- **S3 batch B (pure, edge/security/gateway, 10):** 04-edge-delivery, 18-api-gateway, 25-zone-replica, 26-auth-101, 27-rate-limit, 28-siem-audit, 30-llm-service, 41-checkout-flow, 42-read-aside, 47-fan-it-out
- **S4 batch C (mixed, 17):** 07, 09, 11, 12, 13, 14, 15, 19, 20, 21, 22, 23, 31, 32, 33, 38, 45
- Per-file gate: brief nouns consistent with required_types/forbidden_types/required_topology/target_metrics (no machine guard exists — manual checklist; 9 forbidden_types files are the hot spots: 13,15,31,32,35,38,41,43,44). Optional narrow keyword guard in challengeConfigConsistency.test for those 9.

### Table 2 — Discipline-level ladder (uniform 4-tier/track; top tier = full track clear)

Threshold basis: per-track tech-tree completedCount (the SAME basis MasteryProfilePanel's DisciplineRow uses — the S6 unlock toast must compute it identically, NOT from global XP).

| Track | Quests | Ladder | Existing PNGs | New PNGs |
|-------|--------|--------|---------------|----------|
| foundations | 11 | 3/5/7/11 | 3,5,7 | **11** |
| data | 15 | 3/5/7/15 | 3,5,7 | **15** |
| edge | 8 | 2/4/6/8 | 4,6 | **2, 8** |
| realtime | 7 | 2/4/6/7 | 4,6 | **2, 7** |
| reliability | 10 | 2/4/6/10 | 4,6 | **2, 10** |
| security | 5 | 2/3/4/5 | 3,5 | **2, 4** |
| aiml | 5 | 2/3/4/5 | 2 (+4→**renamed 5**) | **3, 4** |

= 28 slots − 16 existing (incl. the aiml-4→aiml-5 rename) = **exactly 12 new PNGs** — the PLAN contract reconciles. Style: PixelLab Config C (64×64, black outline, detailed shading, transparent bg, D38); T8's deterministic-recolor fallback applies if the API is flaky. S6 adds the missing ladder⟷glob lockstep test.

### Table 3 — RPS calibration targets (relative realism; acceptance = solvability 62/62 3★ + par regen + D71 ceiling)

| Variant | max_rps before → after | $/mo | Rationale |
|---------|------------------------|------|-----------|
| postgresql.single-node | 500 → 1500 | 45 | implausible floor vs every other family |
| mysql.single-node | 600 → 1500 | 40 | same floor lift |
| postgresql.synchronous-replica | 12000 → 9000 | 380 | strong-consistency single-writer must not out-throughput sharded |
| postgresql.citus-distributed | 10000 → 16000 | 350 | sharded variant leads (horizontal-scalability=8) — fixes the inversion |
| aws-aurora.serverless-v2 | 9000 → 6000 | 90 | breaks cheapest-per-rps + near-top-ceiling dominance; serverless wins economics on spiky load, pays in peak |
| firestore.standard | 3000 → 8000 | 40 | same-price 6.7× gap vs dynamo reads as a data error |
| firestore.scaled | 10000 → 20000 | 100 | scaled tier tracks the same compression |
| dynamodb.on-demand | 20000 → 14000 | 40 | gap lands ~1.7×; DynamoDB stays the throughput leader |
| timescaledb.single-node | 25000 → 55000 | 45 | TSDB internal ordering: timescale ≥ influx (50k/$30); victoria stays family leader |
| timescaledb.clustered | 70000 → 130000 | — | clustered tracks the same ordering (influx 120k, victoria 200k) |

Cross-family TSDB-over-relational spread KEPT (the teaching point). Harness exposure: relational-db default=postgresql → **postgres/mysql edits move harness builds** (the S2 gates are the acceptance bar); TSDB default=influxdb and nosql default=mongodb are untouched → those rows are harness-inert. Live app reads Firestore → values reach prod only via the SINGLE combined S9 reseed (after the S1 tolerant reader deploys), both Firebase projects.

**Status:** active

### D93 amendment (S2 outcome, 2026-06-10)
Calibration landed with ONE deviation from Table 3: **postgresql.synchronous-replica stays 12000** (not →9000). The citus lift to 16000 alone fixes the inversion (sharded leads); nerfing sync below the DB-tier load broke strong-or-stale (the only consistency_target_ms challenge). Root cause found during S2: strong-or-stale passed PRE-calibration by accident — nothing fit its >12k DB load, and the max-throughput FALLBACK happened to be the low-lag sync variant. Fix: the reference builder's fallback is now consistency-aware (preferLowLag → lowest-replication-lag variant when nothing covers the load — what a freshness-challenge player does). Harness 62/62 3★; par regenerated (9 rows moved incl. strong-or-stale, data-pipeline, rag-retrieval).

## D94 — Phase 4 (Break-it loop & expert currency) design lock + 7-slice decomposition (2026-06-10)

**Source of truth:** feedback20260609.md lines 19 (the post-3★ invitation), 33-55 (single-attribute breaks, popup + reset flow, per-attribute tracking, resilience extras, quest-log surfacing), 95-99 (toolbox realism + the REVISED currency: break-stars do NOT join the hint pool — they earn the same EXPERT CURRENCY as resilience extras, spent on the required-blocks filter). PLAN Phase 4 row + D86. Tier: scale.

**Core definitions (defaults chosen for momentum — tunable data, revisit before P4-S7):**
1. **A "break"** = a post-3★ run on the SAME quest where basePass FAILS (uptime or latency targets missed) AND exactly ONE traffic attribute differs from the challenge's authored spec. The four attributes: `rps` (peak), `kind` (shape), `workload` (read/write/mixed), `origin` (one/multi-region). Multi-source challenges: across ALL sources combined, exactly one attribute on exactly one source differs.
2. **Detection seam:** canvas traffic nodes carry trafficRps/Kind/Workload/Origin; the challenge's trafficSources spec is the default. Pure helper `detectSingleAttributeBreak(nodes, challenge, breakdown)` → `"rps" | "kind" | "workload" | "origin" | null`.
3. **Earning:** 1 expert-currency unit per attribute-break per challenge (max 4/challenge) + 1 per cleared resilience condition on the curated extras. NOT stars; never feeds the hint pool.
4. **Spending:** "Show required blocks" filter = 1 unit, per-quest unlock, persistent.
5. **Persistence:** userProgress doc gains `expertCurrency: number`, `breaksByChallenge: Record<challengeId, {rps?, kind?, workload?, origin?: true}>`, `requiredFilterUnlocked: Record<challengeId, true>`. Firestore rules allowlist must extend → rules deploy (try the authenticated firebase CLI; else owner-manual per D9).

**7 slices (scale tier, ≤12 files each):**
- **P4-S1 — Break-detection engine:** the pure detector + per-attribute dedup + challenge-default comparison; attempt-flow integration point (post-3★ replays only); unit-heavy. No UI.
- **P4-S2 — Expert currency + persistence:** userProgressStore fields + award/spend actions (atomic, idempotent per attribute) + Firestore rules extension + deploy; tests incl. the generation-reset interaction (currency wipes with generation like everything else).
- **P4-S3 — The loop UX:** results-modal "Now break it" invitation at 3★ (quest mode) · break popup ("Broke it with RPS — try another attribute?" → [try it] resets traffic to the authored default / [keep playing]) · coach narration; E2E journey (3★ → raise rps → break popup → reset → break via origin).
- **P4-S4 — Test-conditions gating + highlighting:** FailureSelector locked until 3★ on the active quest; post-3★, precompute which conditions break the current build (sim per condition off the live graph) and glow them.
- **P4-S5 — Toolbox realism:** quest palettes show ALL unlocked blocks (feeds the S6b `not-in-palette` gray lock already built into TypeBlockCard — the enum slot was reserved for exactly this) + the required-blocks filter toggle, purchasable (P4-S2 spend) and persistent per quest.
- **P4-S6 — Quest-log surfacing:** extra-challenge corner indicator · break-currency count with a distinct icon/color (NOT a star) · discipline color legend under the Quest Log title · extra-challenge details in the right panel.
- **P4-S7 — Resilience extra-challenges:** curate 2-3 quests with per-condition resilience targets (`resilience_conditions` schema field, additive) → currency on clear; harness extension proves each curated extra is clearable; evidence.

**Sequencing:** S1 → S2 → S3 (the flagship loop, pilot-ready) · S4, S5, S6 parallel after S2 · S7 last (schema + content + harness). Invariants: golden + 62/62 3★ untouched (the loop runs POST-scoring on replays; detection reads, never writes, the rubric); the S6b lock vocabulary is reused, not duplicated.

**Status:** active
**Review trigger:** earn/spend rates after the first owner playtest of the loop; the resilience-extra catalog before P4-S7 authoring.
