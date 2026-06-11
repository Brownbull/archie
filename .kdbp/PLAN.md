# Active Plan

<!-- status: active -->
<!-- project_type: code -->

## Goal

Progression Legibility & Explainability — close the gaps the 2026-06-11 playtest + feedback re-audit
surfaced: make the tech tree honest at the PALETTE level (no block offered before its unlock quest —
the D90 reversal), make shipped-but-invisible features legible (chains in the tree, extras before
completion), de-escalate the coach from step-by-step instruction to compiler-style diagnostics, and
make the architectural scores explain themselves. Then polish the catalog (icons, explainers,
the pool-exhaustion quest) and research vendor-unlock progression.

## Context

- **Maturity:** enterprise
- **Domain:** Software architecture visualization and design tool (react, typescript, vite, react-flow)
- **Created:** 2026-06-11
- **Source:** 2026-06-11 owner playtest (async-pipeline palette complaint + chain invisibility) +
  full re-audit of docs/gabe/tests/20260609/feedback20260609.md against the shipped roadmap
  (9 open/partial items identified; lines 1-8 of the original feedback were never scoped).
- **Supersedes:** Quest Integrity & Break-It Loop (completed 2026-06-10, archived; P158–P170).

## Phases

| # | Phase | Description | Tier | Complexity | Exec | Review | Commit | Push |
|---|-------|-------------|------|------------|------|--------|--------|------|
| 1 | Unlock-ordering true-up | Close the 53 ungrantable-available-block palette gaps (D90 reversal): per gap add a prereq edge, re-tier via dependency sub-rows, or trim the palette; fix async-pipeline (palette + worker-naming hints); promote the palette check to a HARD gate at zero; solvability re-verified per batch. | ent | high | ✅ | ✅ | ✅ | ✅ |
| 2 | Chain & extras legibility | Make shipped features visible: tree-level chain visualization (chain-styled member edges + stage badges), pre-completion extra-challenge indicators (resilience/breakable markers on available quests), retrofit 1–2 more chains from existing progressions. | ent | med | ✅ | ✅ | ✅ | ✅ |
| 3 | Coach de-escalation | Replace build-state step-by-step tackle instructions ("Add a Compute block") with compiler-style diagnostics only (wiring, orphans, ports, missing-required as validation); keep run/watch/scored coaching; owner fork: difficulty-gated vs global. | ent | med | ✅ | ✅ | ✅ | ⬜ |
| 4 | Score explainability & CTA consolidation | Architectural scores become clickable → per-metric trace (which components/factors feed performance, reliability, scalability…); surface complexity as a visible stat; audit + consolidate the duplicate call-to-action surfaces (foundation suggestions vs pathway vs coach). | scale | high | ⬜ | ⬜ | ⬜ | ⬜ |
| 5 | Catalog polish & explainers | Icon coverage sweep (both icon modes, all blocks/variants); observability "why monitoring fixes it" explainer (feedback line 75); D18 pool-exhaustion challenge (concurrency_limit authoring); vendor-unlock progression design doc (research only). | ent | med | ⬜ | ⬜ | ⬜ | ⬜ |

<!-- Exec is written by /gabe-execute: ⬜ not started, 🔄 in progress, ✅ complete -->
<!-- Review/Commit/Push auto-ticked by /gabe-review, /gabe-commit, /gabe-push -->
<!-- A phase is complete when all four status columns are ✅ -->
<!-- /gabe-next routes to the next command based on column state (Exec → Review → Commit → Push → advance phase) -->
<!-- Tier column values: mvp | ent | scale. Read by /gabe-execute (tier-cap) and /gabe-review (TIER_DRIFT finding). -->
<!-- User-facing/runtime phase types require journey evidence artifacts before Exec can be ✅. -->

## Phase Details

### Phase 1 — Unlock-ordering true-up

```yaml
phase: 1
types: [content, user-facing]
phase_tier: ent
prototype: false
dim_overrides: []
sections_considered: [Core, Content]
suppressed_dims_count: 0
decisions_entry: TBD (phase design lock at exec start — D90 reversal rationale + per-gap dispositions)
```

- **Scope:** The 53-gap snapshot in `tests/unit/engine/unlockOrdering.baseline.test.ts` is the
  worklist. Per gap, one of three dispositions: (a) add a `requires` edge so the granting quest
  precedes (the tree layout already supports dependency sub-rows within a tier — feedback line 59's
  "more rows per tier"); (b) re-tier the offending quest (burst-absorber precedent); (c) trim the
  palette entry (P4-S5 toolbox realism shows all unlocked blocks gray-locked, so trimming no longer
  hides blocks from view — the original D90 pressure is gone). async-pipeline is the poster child:
  palette offers worker/cache/load-balancer at tier 1, and hints 3–4 literally instruct a worker
  route (granted at tier 4 by worker-fleet, which REQUIRES async-pipeline). Fix palette + rewrite
  those hints vs harness ground truth. End state: gap count 0 and `ungrantable-available-block`
  folded into `validateTechTree` as a hard gate (the D90 migration clause).
- **Exit:** palette-gap count = 0, hard-gated; async-pipeline hints worker-free and harness-true;
  62/62 solvability + golden held; tree renders without tier-height regressions.
- **Key files:** src/data/challenges/*.yaml (requires/available_blocks/hints), src/engine/techTree.ts
  (gate promotion), tests/unit/engine/unlockOrdering.baseline.test.ts (snapshot → hard assert),
  tests/integration/challenges/referenceSolution.ts (re-verify per batch).
- **Risk/decision:** adding requires-edges changes availability for mid-progress players. Unlike the
  Phase-2 re-tiering (which forced the D28/D65 generation reset), edges only RESTRICT future
  availability — completed quests stay completed. Expected: NO progress reset; verify at exec start
  against the owner's live account before committing to that.

### Phase 2 — Chain & extras legibility

```yaml
phase: 2
types: [user-facing]
phase_tier: ent
prototype: false
dim_overrides: []
sections_considered: [Core, Client-state]
suppressed_dims_count: 0
decisions_entry: TBD
```

- **Scope:** (a) Tree-level chain visualization: chain-member edges drawn distinctly (e.g., doubled/
  link-styled stroke), a stage badge on member nodes (1/3, 2/3…), and fork-point affordance — the
  Data Backbone must be discoverable without clicking event-stream. (b) Pre-completion extras
  indicators: quests authoring resilience_conditions or trafficSources (breakable) carry a corner
  marker on AVAILABLE nodes too (today the hammer badge is completed-only; feedback line 51 wanted
  "there is an additional challenge here" before you start). (c) Retrofit 1–2 more chains from
  existing requires-progressions (candidates: foundations first-service → add-a-database →
  cache-the-hot-path → scale-out; edge track edge-delivery line) — chain coherence harness already
  gates parent/child correctness.
- **Exit:** a player opening the Quest Log can SEE every chain and every extras-bearing quest at a
  glance; ≥2 chains shipped; E2E evidence artifact of the tree with chain + extras markers.
- **Key files:** src/components/challenges/ChallengeTreeView.tsx, src/data/challenges/*.yaml (chain
  blocks), tests/integration/challenges/chains.test.ts, tests/e2e/feedback-phase*.unlocked.spec.ts.

### Phase 3 — Coach de-escalation

```yaml
phase: 3
types: [user-facing]
phase_tier: ent
prototype: false
dim_overrides: []
sections_considered: [Core]
suppressed_dims_count: 0
decisions_entry: TBD (owner fork at design: difficulty-gated vs global removal)
```

- **Scope:** The original feedback's lines 6–8 — never scoped until now. Build-state coach today
  issues ordered instructions ("Add a traffic source" → "Add a Compute block" → "Wire it together").
  Replace with compiler-style DIAGNOSTICS: report structural blockers (orphans, port mismatches,
  unreachable subgraphs, missing required categories phrased as validation-failure, not as a to-do),
  and otherwise stay quiet until run/scored states (those keep their current coaching — measured-vs-
  target iterate lines are results explanation, which the feedback explicitly endorsed). Owner fork:
  remove tackle-steps globally, or keep them for `difficulty: beginner` quests only (first-quest UI
  onboarding value). Break-loop narration (P4-S3) unchanged.
- **Exit:** no step-by-step build instructions in non-beginner quests (or globally, per fork); coach
  tests updated to pin the diagnostic contract; HUD checklist (the overview surface) untouched.
- **Key files:** src/hooks/useChallengeCoach.ts, tests/unit/hooks/useChallengeCoach.test.ts.

### Phase 4 — Score explainability & CTA consolidation

```yaml
phase: 4
types: [user-facing]
phase_tier: scale
prototype: false
dim_overrides: []
sections_considered: [Core, Client-state]
suppressed_dims_count: 0
decisions_entry: TBD (design doc before exec — the trace surface needs UX exploration)
```

- **Scope:** Feedback lines 1–4, never scoped. (a) The bottom-bar architectural scores (performance,
  reliability, scalability…) become clickable → a trace panel: which components and which metric
  values feed this score, and what would move it (read-only over the existing recalculation output —
  metrics are already per-node directional values; this is presentation, engine-inert). (b) Promote
  complexity (operational-complexity already exists as a metric) into the visible stat bar (feedback
  line 93). (c) CTA consolidation audit: foundation suggestion counts, pathway guidance, and coach
  all compete for attention — map every adjustment CTA, kill or merge duplicates, one design doc +
  implementation. Design-first phase: a short UX doc precedes implementation (the trace panel shape
  is genuinely open).
- **Exit:** every bottom-bar score answers "why this number, what moves it" on click; complexity
  visible; CTA inventory documented with duplicates resolved; no scoring/engine change (golden inert).
- **Key files:** src/components/dashboard/**, src/components/toolbar/**, src/services/
  recalculationService.ts (read-only consumers), docs/gabe/design/score-trace.md (new).

### Phase 5 — Catalog polish & explainers

```yaml
phase: 5
types: [content, user-facing]
phase_tier: ent
prototype: false
dim_overrides: []
sections_considered: [Content, Core]
suppressed_dims_count: 0
decisions_entry: TBD
```

- **Scope:** (a) Icon coverage sweep: every block + traffic option has icons in BOTH modes (pixel +
  official); placeholder-square audit; deterministic recolor fallback per T8 precedent where
  generation is unavailable. (b) Observe-to-Recover explainer (feedback line 75): the results/coach
  surface explains WHY monitoring shrinks the blast (detection delay → residual blast mechanics
  already exist in the engine — surface them). (c) D18: the pool-exhaustion challenge —
  concurrency_limit authoring at the calibrated knife-edge (engine landed d82baee; this is the
  delicate content pass). (d) Vendor-unlock progression design doc (feedback lines 89/104: "instead
  of blocking, unlock them") — research only, no implementation.
- **Exit:** zero placeholder icons; observability mechanics explained in-surface; pool-exhaustion
  quest shipped 3★-verified + non-trivial; vendor-unlock doc with a revisit trigger; D18 closed.
- **Key files:** public/icons/**, src/lib/typeIcons.ts, src/hooks/useChallengeCoach.ts or results
  modal, src/data/challenges/ (new quest), src/data/components/ (concurrency_limit),
  docs/gabe/design/vendor-unlock-progression.md (new).

## Current Phase

Phase 3: Coach de-escalation

## Dependencies

- Phase 2's chain visualization renders chain metadata shipped in P5-S5 — no new mechanics needed.
- Phase 3 is independent but should land BEFORE Phase 4's CTA consolidation (the coach is one of the
  CTAs being consolidated — de-escalate first, then audit what remains).
- Phase 5(c) pool-exhaustion depends on nothing in this plan (engine landed in d82baee).
- Phase 1 must precede Phase 2's new chains (chain members must be palette-clean first).

## Risks

| Risk | Severity | Mitigation |
|------|----------|------------|
| Requires-edge additions strand mid-progress players (availability shrink) | medium | Completed-stays-completed by construction; verify against the live owner account at Phase-1 exec start; D28-style generation reset is the documented fallback, NOT the default |
| Solvability regressions from palette trims (reference solver uses default providers per type) | high | Re-run the 62/62 harness per batch; the solver only uses type defaults, so trims of non-default vendors are inert — pin per batch anyway |
| Coach de-escalation breaks E2E/unit specs that assert tackle text | medium | Grep-driven spec inventory before the change; the contract tests get updated WITH the change, never after |
| Score-trace panel scope creep (Phase 4 is design-open) | medium | Design doc gate before implementation; read-only over existing recalculation output — any engine change is out of scope by definition |
| Tree layout height/width regressions from chain badges + sub-row additions | low | The layout already supports dependency sub-rows (Phase-2 precedent); visual E2E artifact per phase |

## Notes

- The 2026-06-09 feedback file remains the canonical source; this plan covers its re-audit residue
  (items 1–9 in the 2026-06-11 audit) — primarily lines 1-8 (never scoped), 20/59 (D90 deferral),
  51 (pre-completion indicators), 75/93/104 (explainers/complexity/vendor-unlock).
- Open deferred items NOT pulled into this plan (correctly parked): D11 (env-flaky E2E cluster),
  D12 (attempts pagination), D26/D27/D30/D31/D32 (latent micro-debt with documented triggers).
