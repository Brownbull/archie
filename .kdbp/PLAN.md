# Active Plan

<!-- status: active -->
<!-- project_type: code -->

## Goal

Quest Integrity & Break-It Loop — feedback-driven overhaul: act on the verified 2026-06-09 playtest
feedback. Fix everything that misleads the player (config traps, forced port mismatches, dead UI,
unlock-order violations), make grading honest (port enforcement in quests), raise teaching quality
(context-style briefs, tier descriptions), then build the flagship post-3★ break-it loop with an
expert currency, and open new challenge formats (brownfield, progressive chains).

## Context

- **Maturity:** enterprise
- **Domain:** Software architecture visualization and design tool (react, typescript, vite, react-flow)
- **Created:** 2026-06-09
- **Last Updated:** 2026-06-10
- **Source:** docs/gabe/tests/20260609/feedback20260609.md — 14 claims verified against the codebase
  (workflow wf_efd61e6d, 14 parallel verifiers; verdicts + evidence in LEDGER 2026-06-09)
- **Supersedes:** none (Fluidity — UX consolidation archived completed 2026-06-09)

## Phases

| # | Phase | Description | Tier | Complexity | Exec | Review | Commit | Push |
|---|-------|-------------|------|------------|------|--------|--------|------|
| 1 | Trust & friction fixes | Fix everything that lies to the player: polyglot config contradiction (D88) + challenge-config validation, compute stream-out ports, save-default traffic leak, CategoryBar dead onClick, data-pipeline hints, Rerun button, gating discoverability, web-users icon. | ent | med | ✅ | ✅ | ✅ | ✅ |
| 2 | Progression & grading integrity | Unlock-ordering restructure (21 hard violations) + tech-tree validator, pathway tech-tree filter, port enforcement star gate (D87), explicit banned-block display, Observe-to-Recover visibility, quest-mode CTA gating. | ent | high | ✅ | ✅ | ✅ | ✅ |
| 3 | Teaching quality | 39 context-style brief rewrites + hint-ladder pass, per-tier descriptions + docs links (schema + 240 variants + reseed), RPS calibration (4 outliers), discipline icons + unlock toasts. | ent | high | ✅ | ✅ | ✅ | ✅ |
| 4 | Break-it loop & expert currency | Post-3★ "now break it": single-attribute break detection + tracking, expert currency (earn: traffic-breaks + resilience; spend: required-blocks filter), test-conditions lock/highlight, resilience extra-challenges, quest-log surfacing, toolbox realism. | scale | high | ✅ | ✅ | ✅ | ⬜ |
| 5 | New challenge formats | Brownfield starts (initial_architecture), progressive/forking chains, per-block failure conditions, team-expertise vendor restrictions, link-visualization dimensions, data-type traffic divergence. | scale | high | ⬜ | ⬜ | ⬜ | ⬜ |

<!-- Exec is written by /gabe-execute: ⬜ not started, 🔄 in progress, ✅ complete -->
<!-- Review/Commit/Push auto-ticked by /gabe-review, /gabe-commit, /gabe-push -->
<!-- A phase is complete when all four status columns are ✅ -->
<!-- /gabe-next routes to the next command based on column state (Exec → Review → Commit → Push → advance phase) -->
<!-- Tier column values: mvp | ent | scale. Read by /gabe-execute (tier-cap) and /gabe-review (TIER_DRIFT finding). -->
<!-- User-facing/runtime phase types require journey evidence artifacts before Exec can be ✅. -->

## Phase Details

### Phase 1 — Trust & friction fixes

```yaml
phase: 1
types: [user-facing, content, client-state]
phase_tier: ent
prototype: false
dim_overrides: []
sections_considered: [Core, Client-state, Content]
suppressed_dims_count: 0
decisions_entry: D86
```

- **Trade-offs accepted:** See DECISIONS.md D86 (phasing + tiers), D88 (polyglot direction)
- **Scope:** (a) polyglot-persistence per D88 — drop the object-storage `forbidden_types` ban, re-tune,
  re-verify solvability; NEW validation test: `forbidden ∩ available_blocks = ∅` and
  `forbidden ∩ required_types = ∅` across all 61 challenge YAMLs (also removes data-pipeline's
  relational-db palette trap). (b) Add `stream-out` to the 9 compute component YAMLs; add `worker` to
  async-pipeline `available_blocks` + update its hints; audit challenges 20/31/39 against the port
  matrix — canonical builds become warning-free. (c) save-default-traffic: hide SaveBlockDefaultButton
  on traffic nodes (ArchieNode.tsx is CHURN-GUARDED → Bash edit) + `addNode` skips saved defaults for
  traffic providers (also fixes the D63 one-per-type override bug). (d) CategoryBar dead `onClick` fix +
  footer deep-link into DashboardOverlay (`initialCategory`, mirroring `initialSection="pathway"`).
  (e) data-pipeline hint rewrite — hint 3 references the dead queueBufferSize mechanic; hint 5 must name
  the variant knob (Streaming gateway + Micro-Batch ETL) and drop fictional numbers. (f) "Rerun
  simulation" button — re-sim + re-grade from the live canvas via a shared start helper; relabel
  Replay → "Watch again". (g) disclosure-gating discoverability: locked-hint placeholder on gated
  on-node controls ("Tuning unlocks in intermediate quests — or switch to Free mode"). (h) regenerate
  web-users.png with a lighter palette (the dark-on-dark "placeholder square").
- **Exit:** challenge-config validation test green over all 61; async-pipeline canonical build renders
  zero mismatch warnings; rerun-and-grade works end-to-end; footer category popup opens; full unit +
  affected E2E green; solvability harness still all-3★.
- **Key files:** src/data/challenges/{14-polyglot-persistence,06-async-pipeline,20,31,39}.yaml, 9 compute
  component YAMLs, src/components/canvas/ArchieNode.tsx (guarded), src/stores/architectureStore.ts,
  src/components/dashboard/{CategoryBar,DashboardPanel,DashboardOverlay}.tsx, src/stores/simulationStore.ts,
  src/components/simulation/{SimulationBar,PlaybackControls}.tsx,
  src/components/canvas/{NodeConfigSelect,NodeProviderSelect}.tsx, public/icons/web-users.png,
  new tests/unit challenge-config validation.

### Phase 2 — Progression & grading integrity

```yaml
phase: 2
types: [user-facing, scoring-engine, content]
phase_tier: ent
prototype: false
dim_overrides: []
sections_considered: [Core, Engine, Content]
suppressed_dims_count: 0
decisions_entry: D87
```

- **Trade-offs accepted:** See DECISIONS.md D86, D87 (port enforcement = challenge-mode star gate)
- **Scope:** fix the 21 hard `required_types` unlock-ordering violations + palette (PAL) list via
  tier/level restructuring (more rows per tier allowed); extend techTree `validateTechTree` to
  cross-check required_types/available_blocks against grants reachable via the requires closure (CI
  unit test so the class can't regress); pathwayEngine tech-tree filter (design call: badge-locked with
  unlock CTA vs drop; handle legacy no-typeId components); port enforcement per D87 (snapshot
  isPortMismatch count → AttemptSnapshot → optional defaulted rubricScorer gate on the well-formed
  star; sandbox keeps WARN); explicit banned-block display in quest palettes (show blocked, don't hide
  — e.g. No Cache No Mercy shows CDN/cache locked); Observe-to-Recover visibility (SimulationTimeline
  detection markers "detected at t+5s, blast 100→60%", monitored-node badges, free coach line);
  quest-mode CTA gating in the footer (hide TierBadge/pathway CTAs during quests; dedupe the double
  budget readout vs ChallengeHud).
- **Exit:** zero ordering violations + validator green; mismatched edges cost the topology star in
  quests while the solvability harness stays all-3★; the observe mechanic is visible without paid
  hints; footer is quiet during quests.
- **Key files:** src/data/challenges/*.yaml (ordering), src/engine/techTree.ts, src/engine/pathwayEngine.ts,
  src/hooks/usePathwaySuggestions.ts, src/engine/rubricScorer.ts,
  src/components/challenges/ChallengeStartButton.tsx, src/stores/challengeStore.ts,
  src/components/toolbox/ComponentTab.tsx, src/components/simulation/{SimulationTimeline,SimulationStatsPanel}.tsx,
  src/components/dashboard/{DashboardPanel,TierBadge}.tsx.

### Phase 3 — Teaching quality

```yaml
phase: 3
types: [content, user-facing, data-migration]
phase_tier: ent
prototype: false
dim_overrides: []
sections_considered: [Core, Content, Data]
suppressed_dims_count: 0
decisions_entry: D86
```

- **Trade-offs accepted:** See DECISIONS.md D86
- **Scope:** rewrite the 39 instruction-style briefs to context-style (zero-budget-hero as the
  template; the "how" moves into hints; keep the 600-char brief cap — no schema change; optional
  `story` field decision deferred); per-difficulty hint-ladder quality pass (counts already variable
  2–5); tier descriptions — add optional `description` + `docs_url` to ConfigVariantSchema (both Zod
  schemas + transform), author ~240 variants (https-only links per security rules), render in
  NodeConfigSelect dropdown + ComponentDetail Tier row, and DEPLOY THE READER BEFORE RE-SEEDING
  (P5 strict-schema trap); RPS calibration story — fix the 4 verified outliers (postgres Citus
  inversion, Aurora-serverless dominance, firestore/dynamo same-price 6.7× gap, time-series vs
  relational spread) + a calibration table in DECISIONS (ripples: D71 buildability ceiling, full
  solvability re-run); discipline icons — 12 new PixelLab PNGs + aiml-4→5 rename + unlock toasts in
  useProgressPersistence.
- **Exit:** 0 instruction-style briefs (all context or mixed); tier picker shows meaning + link;
  calibration documented in DECISIONS; harness all-3★ maintained; icons render at the documented
  allocation levels.
- **Key files:** src/data/challenges/*.yaml (39 briefs + hints), src/schemas/componentSchema.ts,
  src/data/components/*.yaml (240 variants), scripts/seed-firestore.ts,
  src/components/canvas/NodeConfigSelect.tsx, src/components/inspector/ComponentDetail.tsx,
  src/hooks/useProgressPersistence.ts, src/lib/masteryAvatars.ts,
  docs/gabe/plans/2026-06-02-mastery-tracks/avatars/disciplines/ (PNGs).

### Phase 4 — Break-it loop & expert currency

```yaml
phase: 4
types: [user-facing, client-state, progression]
phase_tier: scale
prototype: false
dim_overrides: []
sections_considered: [Core, Client-state, Progression]
suppressed_dims_count: 0
decisions_entry: D86
```

- **Trade-offs accepted:** See DECISIONS.md D86
- **Scope:** post-3★ results-modal invitation ("now break it"); single-attribute break detection —
  RPS / pattern / workload / origin, exactly ONE attribute changed from the challenge default,
  validated; per-attribute break tracking per challenge; popup on break + reset-to-default flow to try
  the next attribute; expert-currency model (earned by traffic-breaks + resilience achievements — per
  the user's revised design these do NOT feed the hint-star pool); test conditions (failure
  injections) locked until 3★ + highlight which conditions break the current build; curated resilience
  extra-challenges (subset of quests with per-condition resilience targets → expert currency);
  quest-log surfacing (extra-challenge corner indicators, different-color star counts, discipline
  color legend under the Quest Log title, extra-challenge details in the right panel); toolbox realism
  in quests (show ALL unlocked blocks; "show required blocks" filter purchasable with expert currency).
- **Exit:** full post-3★ loop live on a pilot set of challenges; currency earn + spend functional and
  persisted (Firestore, owner-only rules); quest log surfaces extra stars/currency; solvability +
  challenge E2E green.
- **Key files:** src/components/challenges/{ChallengeResultsModal,ChallengeHud,ChallengeTreeView}.tsx,
  src/stores/{challengeStore,userProgressStore}.ts (+ new currency store), src/engine (break detection),
  src/components/canvas/{TestConditionsPanel,FailureSelector}.tsx, src/components/toolbox/ComponentTab.tsx,
  src/data/challenges/*.yaml (break-condition + resilience metadata), firestore.rules.

### Phase 5 — New challenge formats

```yaml
phase: 5
types: [user-facing, content, architecture]
phase_tier: scale
prototype: false
dim_overrides: []
sections_considered: [Core, Content, Architecture]
suppressed_dims_count: 0
decisions_entry: D86
```

- **Trade-offs accepted:** See DECISIONS.md D86
- **Scope:** brownfield challenges (`initial_architecture` seeded from challenge YAML — "Stream the
  Data" style starts); progressive/forking challenge chains (grow one architecture across successive
  requirement stages); per-block failure conditions (`component_failure` targeting specific
  nodes/types instead of only general conditions); team-expertise vendor/config restrictions per
  challenge (explicitly blocked vendors shown, not hidden); link-visualization dimensions (throughput
  as dot density/speed, protocol label, line style, glow) design + implementation; polyglot data-type
  traffic divergence exploration (relational vs NoSQL vs blob request kinds).
- **Exit:** ≥2 brownfield challenges + 1 progressive chain shipped and 3★-verified through the
  harness; link-viz shipped or consciously descoped with a design doc; per-block failure conditions
  used by at least one challenge (Observe-to-Recover candidate).
- **Key files:** src/schemas/challengeSchema.ts (initial_architecture, restrictions, chain metadata),
  src/data/challenges/*.yaml, src/services/trafficSourceInjection.ts + challenge loaders,
  src/components/canvas/{ArchieEdge,EdgeParticles}.tsx, src/engine/simulationEngine.ts (per-block failure),
  tests/integration/challenges/referenceSolution.ts.

## Current Phase

Phase 4: Break-it loop & expert currency

## Dependencies

- Phase 2's port enforcement (D87) has a HARD PREREQ in Phase 1's port-coverage fixes — enforcing
  before the audit would punish canonical builds that are forced into mismatches today.
- Phase 4's toolbox realism (show all unlocked) presumes Phase 2's unlock-ordering fixes — showing
  "all unlocked" is only coherent once unlock order is consistent.
- Phase 4's expert currency precedes its own consumers (required-blocks filter, resilience rewards).
- Phase 3's RPS calibration requires a full solvability re-run (it moves maxRPS values that the D71
  buildability ceiling and reference solutions depend on).
- Phase 5's per-block failure conditions build on Phase 4's test-conditions surfacing.

## Risks

| Risk | Severity | Mitigation |
|------|----------|------------|
| Solvability regressions from data changes (ports, calibration, polyglot retune, ordering) | high | Re-run the reference-solution harness after every data batch; 3★ invariant is the gate |
| Brief rewrites drift from machine config (the polyglot failure mode at scale) | medium | Phase 1's forbidden∩palette/required validation + review briefs against required_types per rewrite |
| Expert-currency scope creep (future unlocks undefined) | medium | Pilot subset; currency spends limited to the required-blocks filter initially; design doc before expanding |
| Firestore strict-schema re-seed trap (P5/D14) | high | Deploy the tolerant reader BEFORE re-seeding new variant fields |
| Churn-guarded files (ArchieNode.tsx, constants.ts, PLAN.md) | low | Bash/python edits per established protocol |
| Phase 4 store/persistence surface (new currency) touches auth'd writes | medium | Owner-only Firestore rules + manual rules deploy (D9 precedent) |

## Notes

- Open PENDING items related to this plan: D11 (component-swapping connectNodes flake — Phase 2's E2E
  touchpoints may absorb it), D18 (EN2 pool-exhaustion authoring — separate focused pass, not in this
  plan), D12 (parked, scale-conditional).
- The 2026-06-09 feedback file is the canonical source for Phase 4/5 design intent — re-read it before
  designing the break-detection and currency UX (lines 19, 33-55, 97-99 for the loop; 69-89 for formats).
- Maiden desktop-CI run (informational): 196 passed / 60 failed — CI-greening + @smoke promotion (D85)
  runs on the engineering track in parallel, not as a plan phase.

## Review Artifacts

- HTML review artifact: docs/gabe/plans/2026-06-09-quest-integrity-break-it-loop/index.html
- Canonical source: `.kdbp/PLAN.md`, `.kdbp/DECISIONS.md`, `.kdbp/LEDGER.md`

## Runtime Evidence Checkpoints

- Phase 1 (user-facing): desktop E2E — async-pipeline canonical build renders zero mismatch warnings;
  rerun-and-grade journey; footer category popup opens. Artifacts → test-results/.
- Phase 2 (user-facing): desktop E2E — a quest attempt with a mismatched edge loses the topology star;
  Observe-to-Recover timeline shows the detection marker. Artifacts → test-results/.
- Phase 3 (user-facing): tier dropdown + inspector show description/link for a sampled component set
  (screenshot evidence); re-seeded Firestore read by the deployed reader.
- Phase 4 (user-facing): full post-3★ break-it journey on a pilot challenge (break via RPS → popup →
  reset → break via origin) captured as E2E + screenshots.
- Phase 5 (user-facing): brownfield challenge loads its seeded architecture; chain advances. E2E.
