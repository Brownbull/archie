# Active Plan

<!-- status: active -->
<!-- project_type: code -->

## Goal

Epic 15: Simulation Engine — a time-stepped (50-tick) simulation that routes a traffic curve through the typed-port graph from entry nodes, applies per-component capacity models (shed-on-overload), and shows live per-node telemetry, a stats panel, an SVG timeline chart, and playback controls. Sandbox manual-trigger; foundation for challenge mode (E16).

## Context

- **Maturity:** enterprise
- **Domain:** Software architecture visualization and design tool
- **Created:** 2026-05-29
- **Last Updated:** 2026-05-29
- **Roadmap:** Phase 3, Epic 15 (docs/roadmap/phase-3-plan.md) — follows Epic 14 (replicas). Largest epic; resolves the roadmap's open decisions (tick granularity, routing, failure cascade, charting).

## Phases

| # | Phase | Description | Tier | Complexity | Exec | Review | Commit | Push |
|---|-------|-------------|------|------------|------|--------|--------|------|
| 1 | Simulation core engine + types | TrafficCurve types; pure simulationEngine.ts (50-tick loop, directional BFS routing from entry nodes, even-split fan-out, per-node shed capacity model, per-tick telemetry rps/latency/capacity%/failed); optional capacityModel on ConfigVariant | ent | high | ✅ | ✅ | ✅ | ✅ |
| 2 | simulationStore + playback state machine | Zustand simulationStore (currentTick, isPlaying, speed, tickHistory, requestsTimeline, replay); start/pause/resume/replay/setSpeed/seek; drives engine via interval; reads architectureStore snapshot + effective maxRPS | ent | high | ✅ | ✅ | ✅ | ✅ |
| 3 | Per-node live telemetry overlay | useNodeOverlay 'simulation' mode; ArchieNode renders live RPS/latency/capacity bar (green→yellow→red) during a run | ent | medium | ✅ | ✅ | ✅ | ⬜ |
| 4 | Stats panel + SVG timeline + playback controls | SimulationStatsPanel (uptime/p99/cost-vs-budget); hand-rolled SVG SimulationTimeline (success vs failed over time); PlaybackControls (play/pause/replay/1-10× /seek); mounted in AppLayout footer | ent | high | ⬜ | ⬜ | ⬜ | ⬜ |
| 5 | Traffic curves + scenario integration | trafficCurve {t,rps}[] optional on scenario presets (YAML, backward-compat); "Run Simulation" trigger wired to simulationStore; demandEngine stays pure (dual-mode coexistence) | ent | medium | ⬜ | ⬜ | ⬜ | ⬜ |
| 6 | Integration + E2E simulation journey | simulationFlow integration test (HTTP→App→DB chain); E2E simulation-engine journey (run → telemetry → timeline fills → playback) | ent | medium | ⬜ | ⬜ | ⬜ | ⬜ |

<!-- Exec: ⬜ not started, 🔄 in progress, ✅ complete. Review/Commit/Push auto-ticked. Phase complete when all 4 ✅. -->
<!-- Tier: read by /gabe-execute (cap) + /gabe-review (TIER_DRIFT). User-facing/web phases require runtime journey evidence. -->

## Phase Details

### Phase 1 — Simulation core engine + types

```yaml
phase: 1
types: [client-state]
phase_tier: ent
prototype: false
dim_overrides: []
sections_considered: [Core]
suppressed_dims_count: 0
decisions_entry: D21
```

- **Tier chosen:** `ent`
- **Architecture decisions (resolve roadmap opens — see D21):**
  - **Tick model:** fixed `SIM_TICKS = 50` over a curve-defined duration (default 90s). Engine is pure + synchronous: `runSimulation(graph, trafficCurve) → TickState[]`. Playback timing lives in the store (Phase 2), not the engine.
  - **Routing:** directional BFS, source→target only, following http/stream edges. **Entry nodes** = nodes with an `http-in` port and no upstream http edge; the curve's RPS is injected there (split evenly if multiple entries). At fan-out (one source → N targets), **split traffic evenly** (round-robin LB model). Replica capacity already aggregates via effective `maxRPS = variant.maxRPS × replicaFactor` (Epic 14).
  - **Capacity model:** per node, `effectiveMaxRPS` from `getNodeCost`. If `incomingRPS > effectiveMaxRPS` → **shed** excess (excess counted as failed requests); latency = `baseLatencyMs × (1 + max(0, load−1) × LATENCY_LOAD_K)`. `capacityPercent = incomingRPS / effectiveMaxRPS`. failureMode `'crash'|'queue'` deferred (default shed).
  - **capacityModel** optional on ConfigVariant: `{ failureMode?: 'shed'|'queue'|'crash', recoveryTimeMs?: number }` — most variants omit it (default shed).
- **Files:** new `src/engine/simulationEngine.ts`, `src/lib/simulationTypes.ts` (TrafficCurve, TickState, NodeTelemetry); extend `src/schemas/componentSchema.ts` (optional capacityModel); constants (SIM_TICKS, LATENCY_LOAD_K). No store/UI. Heavy unit tests.
- **See `DECISIONS.md` D21.**

### Phase 2 — simulationStore + playback state machine

```yaml
phase: 2
types: [client-state]
phase_tier: ent
prototype: false
dim_overrides: []
sections_considered: [Core]
suppressed_dims_count: 0
decisions_entry: D22
```

- **Tier chosen:** `ent`
- **Design:** new `src/stores/simulationStore.ts` (Zustand): `currentTick, isPlaying, speed (1|2|5|10), tickStates: TickState[], requestsTimeline, status: 'idle'|'running'|'paused'|'done'`. Actions: `start()` (snapshots architectureStore nodes/edges + getNodeCost capacities → runs engine → stores TickState[] → begins playback via setInterval at `BASE_TICK_MS/speed`), `pause/resume/replay/setSpeed/seek(tick)/reset`. Playback advances `currentTick`; UI reads current TickState. Interval cleared on pause/done/unmount (no leak). Snapshot-at-start (immutable) so canvas edits during playback don't corrupt the run.
- **See `DECISIONS.md` D22.**

### Phase 3 — Per-node live telemetry overlay

```yaml
phase: 3
types: [user-facing, web, client-state]
phase_tier: ent
prototype: false
dim_overrides: []
sections_considered: [Core, UI/UX]
suppressed_dims_count: 0
decisions_entry: D23
```

- **Tier chosen:** `ent`
- **Design:** `useNodeOverlay` gains a 'simulation' mode reading `simulationStore` current-tick telemetry per node; ArchieNode renders live RPS / latency(ms) / capacity bar (green <70% → yellow <100% → red ≥100%) during a run, falling back to existing overlays when idle. Conditional — only when sim running.
- **Runtime evidence:** Playwright — run a sim, assert a node shows a live capacity bar / RPS during playback. Artifacts → `test-results/simulation/`.
- **See `DECISIONS.md` D23.**

### Phase 4 — Stats panel + SVG timeline + playback controls

```yaml
phase: 4
types: [user-facing, web]
phase_tier: ent
prototype: false
dim_overrides: []
sections_considered: [Core, UI/UX]
suppressed_dims_count: 0
decisions_entry: D24
```

- **Tier chosen:** `ent`
- **Design:** `SimulationStatsPanel` (uptime %, avg + p99 latency, current/target RPS, cost-vs-budget); `SimulationTimeline` — **hand-rolled SVG** stacked area (successful vs failed requests per tick), ~100 LOC, Tailwind-styled, no charting dep (bundle pressure — D24); `PlaybackControls` (Play/Pause/Replay, 1/2/5/10×, seek scrubber). Mounted in AppLayout footer, visible only during a sim.
- **Runtime evidence:** Playwright — run a sim, assert timeline fills + playback controls work (pause freezes tick, replay resets). Artifacts → `test-results/simulation/`.
- **See `DECISIONS.md` D24.**

### Phase 5 — Traffic curves + scenario integration

```yaml
phase: 5
types: [user-facing, web, data-migration]
phase_tier: ent
prototype: false
dim_overrides: []
sections_considered: [Core, Data, UI/UX]
suppressed_dims_count: 0
decisions_entry: D25
```

- **Tier chosen:** `ent`
- **Design:** optional `trafficCurve: {t,rps}[]` on scenario presets (YAML `traffic_curve`, schema + loader, backward-compatible — absent = legacy constant-level demand). "Run Simulation" trigger (in ScenarioSelector or a sim control) starts the simulationStore with the active curve (or a default ramp). demandEngine stays pure + unchanged (dual-mode). Default curve when none selected (ramp 0→target→0).
- **See `DECISIONS.md` D25.**

### Phase 6 — Integration + E2E simulation journey

```yaml
phase: 6
types: [user-facing, web]
phase_tier: ent
prototype: false
dim_overrides: []
sections_considered: [Core]
suppressed_dims_count: 0
decisions_entry: D26
```

- **Tier chosen:** `ent`
- **Design:** integration test `tests/integration/simulationFlow.test.ts` (entry→app→db chain + cache: route traffic, assert telemetry + failed-request accounting + capacity shed). E2E `tests/e2e/simulation-engine.spec.ts` (place chain → run → telemetry overlay appears → timeline fills → pause/replay).
- **Runtime evidence:** full E2E on `desktop`. Artifacts → `test-results/simulation/`.
- **See `DECISIONS.md` D26.**

## Current Phase

Phase 3: Per-node live telemetry overlay

## Dependencies

- P2 depends on P1 (store drives the engine). P3+P4 depend on P2 (UI reads simulationStore). P5 depends on P1-P2 (curves feed the engine). P6 depends on all (E2E exercises the full pipeline).

## Risks

| Risk | Severity | Mitigation |
|------|----------|------------|
| Engine perf (50 ticks × N nodes) blocks UI | high | Engine runs once at start() (synchronous, pre-computes all TickState[]); playback just indexes precomputed frames — no per-tick recompute |
| Routing ambiguity at branches / no entry node | high | Even-split at fan-out; entry = http-in with no upstream http edge; if no entry, surface a clear "no traffic entry" state. Decisions logged D21 |
| Charting deviation from roadmap (Recharts) | medium | Hand-rolled SVG logged in D24 with bundle rationale; revisit if E16 needs interactivity |
| Dual-mode (demand vs sim) breaks existing scenarios | high | simulationEngine + simulationStore are NEW + separate; demandEngine stays pure/unchanged; trafficCurve optional + backward-compat |
| tickHistory memory growth | medium | 50 ticks fixed cap; precomputed array, not unbounded |

## Notes

- Each phase independently shippable. P1-P2 add no visible change (no trigger yet); P3-P4 are the visible simulation UI; P5 wires the trigger; P6 locks with E2E.
- Verify every push with `npm run build` (tsc -b), not `tsc --noEmit` (see memory project_ci-uses-tsc-b) — esp. when widening unions consumed elsewhere.
- **Tooling:** PLAN.md updated via Write/python (pre-edit churn guard); LEDGER/DECISIONS/DEPLOYMENTS via append.

## Runtime Evidence Checkpoints

- **Phase 3:** sim run → node live telemetry overlay (chromium). Artifacts: `test-results/simulation/`.
- **Phase 4:** sim run → timeline fills + playback controls (chromium). Artifacts: `test-results/simulation/`.
- **Phase 6:** full `tests/e2e/simulation-engine.spec.ts` on `desktop`. Artifacts: `test-results/simulation/`.
