# Active Plan

<!-- status: active -->
<!-- project_type: code -->

## Goal

Learning-Fidelity Redesign — make Archie's simulation, scoring, and lesson-loop teach real,
transferable system design instead of rewarding harness-gaming. Full A→D epic from the 3-perspective
roast (`docs/quality-reports/learning-fidelity-roast.md`, 22 gaps): tie scoring to behavior not
block-presence (A), make the engine physics honest — additive latency, queueing curves, concurrency
(B), make resilience a real, rewarded subject — AZ fault isolation, cascading failure, observability
that earns its keep (C), and add the missing dimensions — consistency/CAP, elasticity/autoscaling,
usage-based cost, multi-region replication lag (D).

## Context

- **Maturity:** enterprise
- **Domain:** Software architecture visualization and design tool (react, typescript, vite, react-flow)
- **Created:** 2026-06-05
- **Last Updated:** 2026-06-05
- **Source of truth:** `docs/quality-reports/learning-fidelity-roast.md` (gap IDs ED*/EN*/LX*)

## Phases

| # | Phase | Description | Tier | Complexity | Exec | Review | Commit | Push |
|---|-------|-------------|------|------------|------|--------|--------|------|
| 1 | Behavior-tied scoring + lesson-loop quick wins (Option A) | Score on behavior not presence + fix the learner loop. ED3 required_types must be ON the served path (removing it changes the score; model rate-limiter/auth effects); ED7 cost_per_request → $/million-req at peak rps + re-tune 2 cost challenges; LX1 free first hint per challenge; LX2 name the top overloaded node in iterate-coach + results modal; LX3 show reference "par" cost/nodes after 3★. NO engine re-calibration ripple. | ent | med | ⬜ | ⬜ | ⬜ | ⬜ |
| 2 | Core engine fidelity — latency, utilization, concurrency (Option B) | Honest physics. ED1/EN1 end-to-end latency = SUM along the served path (+ inter-node RTT), cache hits short-circuit; ED4/LX4 replace flat-then-linear latencyUnderLoad with a queueing curve (latency → ∞ as ρ→1) so headroom is real + the gauge teaches; EN2 add a concurrency/queue model (per-variant concurrency limit; latency↔queue-depth via Little's law) so saturation = latency AND connection rejection. | ent | high | ⬜ | ⬜ | ⬜ | ⬜ |
| 3 | Resilience as a real subject (Option C) | Make resilience possible + rewarded. ED2 AZ attribute per node; az_outage removes a FRACTION (1/AZ) of a category so spreading survives; EN3 cascading failure — shed propagates upstream as timeouts + retry amplification; EN7 observability earns its keep (faster detect → earlier circuit-break → smaller blast radius, replacing the magic 33%); restore no-SPOF redundancy to scoring (topology-star contributor or resilience metric, reversing the D72 demotion now that it's mechanically meaningful). Needs EN6 (cyclic-flow solve) first. | ent | high | ⬜ | ⬜ | ⬜ | ⬜ |
| 4 | New dimensions — consistency, elasticity, usage-cost (Option D) | The 10x-breadth tier, à-la-carte sub-slices. ED5 dynamic cache hit-ratio (variant ceiling × cacheable-fraction × (1−write-pressure)); ED9 autoscaling (replicas track load, cost integrates over the curve); EN5 usage-based cost (per-request + per-GB cross-region transfer); ED6/EN4/ED8 multi-region latency + replication lag/staleness + a NEW consistency/CAP scoring dimension + challenge family; EN6 fixed-point cyclic-flow solve (closes PENDING D7, unblocks EN3). | scale | high | ⬜ | ⬜ | ⬜ | ⬜ |

<!-- Exec: ⬜ not started, 🔄 in progress, ✅ complete. Review/Commit/Push auto-ticked by the gates. -->
<!-- A phase is complete when all four columns are ✅. /gabe-next routes by column state. -->

## Phase Details

### Phase 1 — Behavior-tied scoring + lesson-loop quick wins (Option A)

```yaml
phase: 1
types: [user-facing, scoring]
phase_tier: ent
prototype: false
dim_overrides: []
sections_considered: [Core, UserFacing]
suppressed_dims_count: 0
decisions_entry: D75
```

- **Gaps:** ED3, ED7, LX1, LX2, LX3.
- **Why first:** highest learning-value per effort, zero engine re-calibration, directly closes the
  "gaming the harness" hole + the onboarding cliff. Shippable standalone (Part A).
- **Key files:** `src/engine/rubricScorer.ts`, `src/hooks/useChallengeCoach.ts`,
  `src/components/challenges/{ChallengeResultsModal,HintPanel}.tsx`, `src/stores/userProgressStore.ts`,
  `src/data/challenges/{56-unit-economics,57-lean-at-scale}.yaml`.
- **Exit:** harness still 3★ all 57; cost-challenge targets re-expressed in the real unit; a stuck
  beginner can reach the first hint for free; a failed run names the culprit tier.

### Phase 2 — Core engine fidelity (Option B)

```yaml
phase: 2
types: [engine, simulation]
phase_tier: ent
prototype: false
dim_overrides: []
sections_considered: [Core, Performance]
suppressed_dims_count: 0
decisions_entry: D75
```

- **Gaps:** ED1/EN1, ED4/LX4, EN2.
- **Key files:** `src/engine/simulationEngine.ts`, `src/lib/simulationStats.ts`,
  `src/lib/constants.ts` (LATENCY_LOAD_K + concurrency consts), `referenceSolution.ts` (concurrency-aware
  sizing), the golden snapshot + capstone fixtures.
- **Exit (re-calibration tax — see D75):** re-tune all 57 p99 targets, regenerate golden + fixtures,
  harness 3★ all 57, capstone E2E green.

### Phase 3 — Resilience as a real subject (Option C)

```yaml
phase: 3
types: [engine, simulation, scoring]
phase_tier: ent
prototype: false
dim_overrides: []
sections_considered: [Core, Reliability]
suppressed_dims_count: 0
decisions_entry: D75
```

- **Gaps:** ED2, EN3, EN7 (+ restore redundancy to scoring). Do the three together — they reinforce.
- **Sequence note:** land EN6 (cyclic-flow solve, Phase 4) BEFORE EN3 retries, or pull EN6 forward into
  this phase.
- **Key files:** `src/engine/{simulationEngine,topologyChecker,rubricScorer}.ts`,
  `src/lib/challengeTypes.ts`.
- **Exit:** re-tune outage challenges (chaos-day, async-backbone, heat-death, fortress, zone-*),
  regenerate golden + fixtures, harness 3★ all 57.

### Phase 4 — New dimensions (Option D)

```yaml
phase: 4
types: [engine, scoring, data, architecture]
phase_tier: scale
prototype: false
dim_overrides: []
sections_considered: [Core, Data, Architecture]
suppressed_dims_count: 0
decisions_entry: D75
```

- **Gaps:** ED5/EN-cache, ED9, EN5, ED6/EN4/ED8, EN6. Treat each as an independent sub-slice.
- **Biggest single lift:** ED8 consistency/CAP dimension (new scoring axis + challenge family).
- **Key files:** `src/schemas/challengeSchema.ts`, `src/lib/challengeTypes.ts`,
  `src/engine/{simulationEngine,rubricScorer}.ts`, `src/lib/simulationStats.ts`,
  `src/stores/architectureStoreHelpers.ts`, `src/components/challenges/ChallengeResultsModal.tsx`,
  new challenge YAMLs.
- **Exit per sub-slice:** new metric wired schema→sim→rubric→results modal, additive/defaulted so
  existing challenges score identically, re-tune + regenerate as needed.

## Current Phase

Phase 1: Behavior-tied scoring + lesson-loop quick wins (Option A)

## Dependencies

- Phase 3 (EN3 cascading retries) depends on Phase 4's EN6 (cyclic-flow solve) — either pull EN6 into
  Phase 3 or do EN6 first.
- Phases 2, 3, 4 each depend on the shared re-calibration loop (D75): the solvability harness + lean
  builder must stay green (all 57 @ 3★) as the exit gate.
- Phase 1 has no engine dependency — ship it first, standalone.

## Risks

| Risk | Severity | Mitigation |
|------|----------|------------|
| Engine changes (P2/3/4) ripple into re-tuning all 57 challenges + golden + fixtures | high | D75: the solvability harness + cost-aware lean builder automate re-tuning; "harness 3★ all 57 + golden + fixtures regenerated" is the standard phase exit. Re-roast to confirm exploits shrink. |
| Latency/utilization rewrite (P2) silently changes every challenge's difficulty | high | Re-tune p99 targets from the harness; golden snapshot catches unintended scoring drift; capstone E2E is the real-app backstop. |
| Restoring redundancy to the star (P3) re-opens the budget-vs-redundancy tension (the D72 problem) | med | Only restore it AFTER ED2 makes redundancy mechanically meaningful + cheap (fractional AZ outage); re-verify tight-budget challenges stay 3★-able. |
| Phase 4 consistency/CAP is XL + a brand-new scoring axis | med | Sub-slice it; ship dynamic-cache / autoscaling / usage-cost first; gate the consistency dimension behind its own challenge family so existing challenges are untouched. |
| Scope creep — "full redesign" is large | med | Three review gates (Part A = P1, Part B = P2+3, Part C = P4); stop + re-roast between parts; each phase independently shippable. |

## Notes

- **Guiding principle (D74):** score on behavior, not block-presence. The reference builder's own
  exploits are the canary — re-roast after each phase to confirm they shrink.
- **Re-calibration strategy (D75):** standard exit for engine phases = re-tune all 57 + regenerate
  golden + regenerate capstone fixtures + harness 3★, driven by the existing solvability harness.
- **Recommended split:** Part A = Phase 1 (standalone, low-risk). Part B = Phases 2+3 (fidelity core).
  Part C = Phase 4 (new dimensions). Review between parts.
- **Out of scope / deferred lever:** the capstone scale-buff (restore original 4–10M rps) is unrelated
  to learning fidelity and stays deferred unless explicitly revived.

## Review Artifacts

- HTML review artifact: `docs/gabe/plans/2026-06-05-learning-fidelity-redesign/index.html`
- Canonical source: `.kdbp/PLAN.md`, `.kdbp/DECISIONS.md`, `.kdbp/LEDGER.md`; gap detail in
  `docs/quality-reports/learning-fidelity-roast.md`

## Runtime Evidence Checkpoints

- **Phase 1 (LX1/LX2/LX3, user-facing):** run the app, fail a challenge, confirm the results modal +
  iterate-coach name the culprit node + show "par"; confirm a 0-star account can reveal the first hint
  free. Capture screenshots to `test-results/learning-fidelity-p1/`.
- **Phases 2–4 (engine):** the capstone replay E2E (`desktop-unlocked` project) is the real-app gate —
  must stay green after each engine change; add targeted specs per new metric (latency-sum,
  queueing-curve, AZ-fraction survival, consistency).
