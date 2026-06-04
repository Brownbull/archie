# Active Plan

<!-- status: active -->
<!-- project_type: code -->

## Goal

Traffic Realism + Challenge Difficulty (ISAPivot) — make traffic sources first-class configurable objects ({ type, rps, kind, workload, origin }, ≤4 per challenge, one per type) editable in the inspector and on the canvas block and authorable on challenges, then use that plus the dormant simulation levers (write/read split, cache, queue, cold-start) to make challenges genuinely hard via per-source routing, richer targets, topology assertions, forbidden types, and origin-graded architecture.

## Context

- **Maturity:** enterprise
- **Domain:** Software architecture visualization and design tool
- **Created:** 2026-06-03
- **Last Updated:** 2026-06-03
- **Predecessor:** Supersedes the engine-complete "Simulation Realism (E1–E8)" epic (archived 2026-06-03). That epic built the type-specific sim mechanics; this one makes them player-facing and testable.
- **Source:** Investigation + design + adversarial-verify workflow (w9vlphjd8). Key finding: challenge scoring is sim-stats-only (uptime/p99/cost/topology); origin must be graded via the rubric (architecture requirement), not the demand layer. Per-source routing in `simulateTick` is net-new engine work.

## Phases

| # | Phase | Description | Tier | Complexity | Exec | Review | Commit | Push |
|---|-------|-------------|------|------------|------|--------|--------|------|
| 0 | Schema + types foundation | Add ChallengeTrafficSource + optional trafficSources[] (≤4, one-per-type) to Challenge type + ChallengeYamlSchema (additive, schema_version stays 2, traffic_curve optional + at-least-one rule); rename trafficPattern→trafficKind with back-compat shim (wobble→realistic, surge kept internal) + saved-canvas normalizer; add `search` curve shape; add workload+origin enums + RPS bounds. Parse-all-42-YAMLs guard test. | ent | med | ✅ | ⬜ | ✅ | ⬜ |
| 1 | Traffic config UX | Inspector + canvas block expose arbitrary RPS + kind + workload + origin; show origin on the block; replace the replicaCount-as-RPS-index hack with real RPS (audit getNodeCost on traffic nodes); enforce one-per-type/max-4 (hard in challenge mode, WARN in free play); derive combined challenge trafficCurve at load (sum per-source buildPatternCurve) + combined-peak clamp. | ent | high | ⬜ | ⬜ | ⬜ | ⬜ |
| 2 | Per-source routing (engine) | Thread an options object (sourceRouting, chaosIntensity) through simulationStore.start → runSimulation → simulateTick, replacing flat even-split with per-source inflow seeding (even-split fallback kept); workload biases the source's RPS toward the write/DB path vs cacheable/read path. | ent | high | ⬜ | ⬜ | ⬜ | ⬜ |
| 3 | Richer targets + rubric | Add p95LatencyMs + costPerRequest targets (compute in SimulationStats); required_topology assertions (cache BETWEEN compute/db, LB UPSTREAM, fan-out ≥N — thread edges into evaluateAttempt); forbidden_types (hard 0★ gate); origin-as-architecture grading; chaos_intensity scalar; optional bounded scoring rubric; update results modal. All optional/defaulted so the 42 existing challenges score identically. | ent | high | ⬜ | ⬜ | ⬜ | ⬜ |
| 4 | Author the hard challenges | Recast/author challenges using multi-source typed traffic + the new levers; ship as NEW ids (don't break returning players); solvability smoke test per challenge (a reference solution must clear it). | ent | med | ⬜ | ⬜ | ⬜ | ⬜ |

<!-- Exec ⬜/🔄/✅. Review/Commit/Push auto-ticked. A phase is complete when all four are ✅. -->

## Phase Details

### Phase 0 — Schema + types foundation
```yaml
phase: 0
types: [data, schema, engine]
phase_tier: ent
prototype: false
dim_overrides: []
sections_considered: [Core, Data]
suppressed_dims_count: 0
decisions_entry: D58
```
- **Tier:** ent — load-bearing schema touching the Challenge type + YAML loader + the trafficPattern rename across ~10 files; back-compat for 42 challenge YAMLs + saved canvases requires deterministic normalizer tests.
- **Key files:** `src/lib/challengeTypes.ts`, `src/schemas/challengeSchema.ts`, `src/services/challengeLoader.ts`, `src/engine/trafficPatterns.ts`, `src/stores/architectureStore.ts`, `src/lib/constants.ts`
- **Guard:** parse-all-42-challenge-YAMLs test; trafficKind back-compat shim test.

### Phase 1 — Traffic config UX
```yaml
phase: 1
types: [user-facing, web, client-state]
phase_tier: ent
prototype: false
dim_overrides: []
sections_considered: [Core, Frontend]
suppressed_dims_count: 0
decisions_entry: D59
```
- **Tier:** ent — replaces the just-stabilized replicaCount RPS mechanism (P105/P107); canvas layout is a sensitive area; one-per-type enforcement spans free-play + challenge modes.
- **Key files:** `src/components/inspector/ComponentDetail.tsx`, `src/components/canvas/ArchieNode.tsx`, `src/components/canvas/TrafficPatternSelect.tsx`, `src/services/trafficSourceInjection.ts`, `src/stores/architectureStoreHelpers.ts`
- **Runtime evidence:** E2E — configure RPS/kind/workload/origin on a traffic node; confirm block shows origin; one-per-type WARN/block.

### Phase 2 — Per-source routing (engine)
```yaml
phase: 2
types: [engine, simulation]
phase_tier: ent
prototype: false
dim_overrides: []
sections_considered: [Core]
suppressed_dims_count: 0
decisions_entry: D60
```
- **Tier:** ent — simulateTick is load-bearing for every run (free-build, scenario, challenge); changing the even-split routing risks regressing non-challenge runs. Even-split fallback + deterministic routing tests mandatory.
- **Key files:** `src/stores/simulationStore.ts`, `src/engine/simulationEngine.ts`, `src/lib/simulationTypes.ts`, `src/stores/architectureStoreHelpers.ts`

### Phase 3 — Richer targets + rubric
```yaml
phase: 3
types: [engine, scoring]
phase_tier: ent
prototype: false
dim_overrides: []
sections_considered: [Core]
suppressed_dims_count: 0
decisions_entry: D61
```
- **Tier:** ent — scoring changes affect pass/fail for all challenges; required_topology graph assertions on a DAG (with possible cycles) are easy to get subtly wrong → adversarial unit tests. All new fields optional/defaulted to preserve the 42 existing challenges' scores.
- **Key files:** `src/engine/rubricScorer.ts`, `src/lib/simulationStats.ts`, `src/stores/challengeStore.ts`, `src/hooks/useChallengeAutoScore.ts`, `src/components/challenges/ChallengeResultsModal.tsx`, `src/schemas/challengeSchema.ts`, `src/lib/challengeTypes.ts`

### Phase 4 — Author the hard challenges
```yaml
phase: 4
types: [data, content]
phase_tier: ent
prototype: false
dim_overrides: []
sections_considered: [Core, Data]
suppressed_dims_count: 0
decisions_entry: D62
```
- **Tier:** ent — new challenge content must be solvable AND hard; a solvability smoke test (reference solution clears each) prevents unwinnable challenges. Ship as new ids so returning players' progress is unaffected.
- **Key files:** `src/data/challenges/*.yaml`, new solvability test.

## Current Phase

Phase 0: Schema + types foundation

## Dependencies

- Phase 1 depends on Phase 0 (types/schema must exist).
- Phase 2 (routing) is the prerequisite for the `workload` axis actually biting and for Phase 3's per-source-aware scoring.
- Phase 3 depends on Phase 2 for topology/origin grading to be meaningful; targets/rubric can partially land earlier.
- Phase 4 depends on Phases 0–3 (authoring uses the full lever set).
- Recommended split: Part A = Phases 0–2 (one effort), Part B = Phases 3–4 (second).

## Risks

| Risk | Severity | Mitigation |
|------|----------|------------|
| trafficPattern→trafficKind rename touches persisted node data, exported YAML, canvas select, store setter, tests (~10 files) | high | Single kindToPattern shim + read-time normalizer covering all legacy values (wobble/surge); rename audited with a grep sweep + tests |
| Dropping replicaCount-as-RPS-index hack (stabilized days ago, P105/P107) regresses the canvas RPS | high | Audit every getNodeCost call on traffic-category nodes; keep TRAFFIC_RPS_STEPS only for migration seeding |
| Per-source routing is load-bearing for ALL sim runs | high | Even-split fallback when sourceRouting absent; cover with existing engine tests + new routing test |
| origin has ZERO effect on challenge score via demand layer (scoring is sim-stats-only) | high | Decided: grade origin in the rubric as an architecture requirement (multi-region ⇒ requires CDN/multi-region DB/DNS), not via demand multipliers |
| required_topology BETWEEN/FAN_OUT graph assertions on a DAG-with-cycles get subtly wrong → zero-star valid solutions | medium | Adversarial unit tests with cyclic/edge-case graphs; clear "all paths vs any path" semantics |
| Multi-source summed curves exceed engine ceiling / make challenges unwinnable | medium | Combined-peak clamp + per-challenge solvability smoke test (reference solution must clear) |
| Schema change breaks the 42 existing challenge YAMLs | medium | All new fields optional/defaulted; schema_version stays 2 (lenient); parse-all-42 guard test; make traffic_curve optional + at-least-one superRefine |

## Notes

Decisions locked with the product owner (logged D55–D57): origin graded as architecture (not deep sim); add read/write/mixed workload axis distinct from the shape `kind`; per-source routing lands in this effort (Phase 2). The `kind` axis = traffic SHAPE (steady/realistic/periodic/search); `workload` = read/write/mixed (the lever that exercises the DB write path / cache). `realistic` reuses the existing `wobble` curve; `surge` kept internal/hidden for migration; `search` is a new sharp-narrow-repeated-spike shape.

## Review Artifacts

- HTML review artifact: docs/gabe/plans/2026-06-03-traffic-challenge-pivot/index.html
- Canonical source: `.kdbp/PLAN.md`, `.kdbp/DECISIONS.md`, `.kdbp/LEDGER.md`

## Runtime Evidence Checkpoints

- Phase 1 (user-facing): E2E configuring a traffic source's RPS/kind/workload/origin in the inspector + on the canvas block; one-per-type enforcement; screenshots to `test-results/`.
- Phase 4 (content): solvability smoke test per new challenge (reference solution clears it) + an E2E playing one hard challenge end-to-end.
