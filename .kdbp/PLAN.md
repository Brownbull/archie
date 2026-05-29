# Active Plan

<!-- status: active -->
<!-- project_type: code -->

## Goal

Epic 16: Challenge Mode — a challenge selector with progressive architecture-design levels; each has a brief, budget cap, traffic curve, required components, target metrics, and scheduled failure events. Users build, hit Start, watch the (Epic 15) simulation, and earn a 0–3 star rating from a rubric. Builds on Epic 15 (simulation) + Epic 13/14 (economics/topology).

## Context

- **Maturity:** enterprise
- **Domain:** Software architecture visualization and design tool
- **Created:** 2026-05-29
- **Last Updated:** 2026-05-29
- **Roadmap:** Phase 3, Epic 16 (docs/roadmap/phase-3-plan.md) — follows Epic 15 (simulation, complete).

## Phases

| # | Phase | Description | Tier | Complexity | Exec | Review | Commit | Push |
|---|-------|-------------|------|------------|------|--------|--------|------|
| 1 | Challenge schema + types + loader + scheduled-events engine | challengeTypes + ChallengeSchema + challengeLoader; extend simulationEngine/store with scheduledEvents (component_failure→offline, latency_spike→×latency, az_outage→category offline) applied as per-tick overrides | ent | high | ✅ | ✅ | ✅ | ✅ |
| 2 | Star rubric scorer + challengeStore | evaluateAttempt(simStats, challenge, topologyIssues, totalCost) → {stars 0-3, breakdown}; challengeStore (activeChallenge, attemptState, budget, required-checklist, timer, attempts) wired to simulationStore + architectureStore | ent | high | ✅ | ✅ | ✅ | ✅ |
| 3 | Challenge selector + checklist + budget/timer HUD | ChallengeSelector level cards (difficulty/best-stars); RequiredComponentsChecklist + hints; BudgetBar (cap line) + countdown timer | ent | medium | ✅ | ✅ | ✅ | ✅ |
| 4 | Results modal + Start button + challenge↔sim wiring | ChallengeStartButton (replaces RunSimulationButton in challenge mode); ResultsModal (stars/uptime/latency/budget/topology); auto-score on sim done | ent | high | ✅ | ✅ | ✅ | ⬜ |
| 5 | Challenge content — 10 levels | src/data/challenges/*.yaml (10 levels per roadmap catalog), validated against schema | ent | medium | ⬜ | ⬜ | ⬜ | ⬜ |
| 6 | Integration + E2E challenge journey | integration (select→build→start→score) + E2E (select level → place → Start → results modal with stars) | ent | medium | ⬜ | ⬜ | ⬜ | ⬜ |

<!-- Exec: ⬜/🔄/✅. Review/Commit/Push auto-ticked. User-facing/web phases require runtime journey evidence. -->

## Phase Details

### Phase 1 — Challenge schema + types + loader + scheduled-events engine

```yaml
phase: 1
types: [data-migration, client-state]
phase_tier: ent
prototype: false
dim_overrides: []
sections_considered: [Core, Data]
suppressed_dims_count: 0
decisions_entry: D27
```

- **Tier chosen:** `ent`
- **Design (D27):** `src/lib/challengeTypes.ts` (Challenge, ScheduledEvent `{t, type:'component_failure'|'latency_spike'|'az_outage', target, durationS?}`, StarBreakdown). `ChallengeSchema` + YAML variant (new `src/schemas/challengeSchema.ts`) + `challengeLoader.ts` (import.meta.glob `src/data/challenges/*.yaml`, mirrors scenarioLoader). Engine: `runSimulation(graph, curve, ticks, durationS, scheduledEvents?)` computes per-tick **overrides** `{ offlineNodeIds: Set, latencyMultipliers: Map }` from active events (component_failure → target offline = effectiveMaxRps 0 ⇒ all shed; az_outage → all nodes of target category offline; latency_spike → ×multiplier on target for durationS); `simulateTick(graph, tick, targetRps, overrides?)` applies them. simulationStore.start accepts scheduledEvents. Pure + heavily tested; no UI/content yet.
- **See `DECISIONS.md` D27.**

### Phase 2 — Star rubric scorer + challengeStore

```yaml
phase: 2
types: [client-state]
phase_tier: ent
prototype: false
dim_overrides: []
sections_considered: [Core]
suppressed_dims_count: 0
decisions_entry: D28
```

- **Tier chosen:** `ent`
- **Design (D28):** `evaluateAttempt(stats: SimulationStats, challenge, topologyIssueCount, totalCost) → { stars, passedMetrics, underBudget, cleanTopology }` — 1★ if `uptimePercent ≥ targetMetrics.uptimePercent && p99LatencyMs ≤ targetMetrics.p99LatencyMs`; +1★ if `totalCost ≤ budgetCap`; +1★ if `topologyIssueCount === 0`. Star only awarded if base pass (no budget/topology star without the pass star? — decided: budget/topology stars require the pass star, matching roadmap "pass → 1★ then +1/+1"). `challengeStore`: activeChallenge, attemptState `idle|building|running|scored`, lastResult, selectChallenge/startAttempt/scoreAttempt/reset, attempts history (in-memory; Firestore deferred to E17). Reads simulationStore (final ticks → computeSimStats) + architectureStore (cost, topology, placed categories for required-checklist).
- **See `DECISIONS.md` D28.**

### Phase 3 — Challenge selector + checklist + budget/timer HUD

```yaml
phase: 3
types: [user-facing, web, client-state]
phase_tier: ent
prototype: false
dim_overrides: []
sections_considered: [Core, UI/UX]
suppressed_dims_count: 0
decisions_entry: D29
```

- **Tier chosen:** `ent`
- **Design (D29):** `ChallengeSelector` (Dialog) — level cards w/ difficulty badge, brief, budget, duration, best-stars. `RequiredComponentsChecklist` (✓/✗ per required category, derived from architectureStore placed categories) + collapsible hints. `BudgetBar` (cost vs cap, green→yellow→red) + countdown timer. Wired to challengeStore.
- **Runtime evidence:** Playwright — open selector, select a challenge, assert checklist + budget HUD render. Artifacts → `test-results/challenge/`.
- **See `DECISIONS.md` D29.**

### Phase 4 — Results modal + Start button + challenge↔sim wiring

```yaml
phase: 4
types: [user-facing, web]
phase_tier: ent
prototype: false
dim_overrides: []
sections_considered: [Core, UI/UX]
suppressed_dims_count: 0
decisions_entry: D30
```

- **Tier chosen:** `ent`
- **Design (D30):** `ChallengeStartButton` (shown in challenge mode instead of RunSimulationButton) → startAttempt → simulationStore.start(buildSimGraph, challenge.trafficCurve, challenge.scheduledEvents). On sim `done`, challengeStore scores via evaluateAttempt → `ResultsModal` (Dialog) shows stars, uptime/p99 vs target, cost vs budget, topology issues, requests chart, retry/next. Timeline shows scheduled-event markers.
- **Runtime evidence:** Playwright — run a challenge to completion, assert results modal with a star rating. Artifacts → `test-results/challenge/`.
- **See `DECISIONS.md` D30.**

### Phase 5 — Challenge content (10 levels)

```yaml
phase: 5
types: [data-migration]
phase_tier: ent
prototype: false
dim_overrides: []
sections_considered: [Core, Data]
suppressed_dims_count: 0
decisions_entry: D31
```

- **Tier chosen:** `ent`
- **Design (D31):** Author `src/data/challenges/*.yaml` for the 10 roadmap levels (Static+CDN → Global API Gateway), each with brief/budget/duration/trafficCurve/requiredComponents/targetMetrics/scheduledEvents/hints. Validate all against ChallengeSchema (a data-quality test asserts every file parses + has sane bounds).
- **See `DECISIONS.md` D31.**

### Phase 6 — Integration + E2E challenge journey

```yaml
phase: 6
types: [user-facing, web]
phase_tier: ent
prototype: false
dim_overrides: []
sections_considered: [Core]
suppressed_dims_count: 0
decisions_entry: D32
```

- **Tier chosen:** `ent`
- **Design (D32):** integration (selectChallenge → build arch → startAttempt → sim runs → scoreAttempt yields expected stars for a known-good + known-bad build); E2E `challenge-mode.spec.ts` (open selector → select → place → Start → results modal with stars).
- **Runtime evidence:** full E2E on `desktop`. Artifacts → `test-results/challenge/`.
- **See `DECISIONS.md` D32.**

## Current Phase

Phase 4: Results modal + Start button + challenge↔sim wiring

## Dependencies

- P2 depends on P1 (rubric reads sim stats; store starts sim with events). P3+P4 depend on P2 (UI reads challengeStore). P4 depends on P3 (Start replaces selector flow). P5 independent (content) but validated by P1 schema. P6 depends on all.

## Risks

| Risk | Severity | Mitigation |
|------|----------|------------|
| Scheduled-events break the shipped E15 sim (regression) | high | scheduledEvents optional param (absent = current behavior); per-tick overrides are additive; full E15 sim suite must stay green |
| Rubric thresholds educationally wrong | medium | thresholds come from each challenge's targetMetrics (data), not hardcoded; rubric is pure + unit-tested across pass/fail/budget/topology combos |
| Challenge content authoring (10 levels) is domain work | medium | schema-validate all levels (data-quality test); start from roadmap catalog; AI-drafted + bounds-checked |
| Firestore attempt persistence (roadmap E17 open decision) | low | attempts kept in-memory this epic; Firestore/auth deferred to E17 |
| Dialog z-index / portal collisions | medium | reuse existing Dialog primitive + InspectorOverlay portal pattern; single active modal |

## Notes

- Builds entirely on shipped Epic 15 (simulation) + Epic 13/14 (economics/topology) — no new external deps.
- Verify every push with `npm run build` (tsc -b), not `tsc --noEmit` (memory project_ci-uses-tsc-b).
- PLAN.md updated via Write/python (churn guard); LEDGER/DECISIONS/DEPLOYMENTS via append.

## Runtime Evidence Checkpoints

- **Phase 3:** open selector → select → checklist + budget HUD (chromium). `test-results/challenge/`.
- **Phase 4:** run challenge → results modal w/ stars (chromium). `test-results/challenge/`.
- **Phase 6:** full `tests/e2e/challenge-mode.spec.ts` on `desktop`. `test-results/challenge/`.
