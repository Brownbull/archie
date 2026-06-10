# Active Plan

<!-- status: completed -->
<!-- project_type: code -->

## Goal

Fluidity — UX consolidation: make Archie feel fluid by collapsing the "tune from multiple perspectives"
friction into one clear surface per job. The block becomes the single tuning surface, the right panel
becomes read-only learning, and the static-score footer declutters in place — so the app flows instead
of asking the player to reconcile knobs scattered across canvas, inspector, and footer.

## Context

- **Maturity:** enterprise
- **Domain:** Software architecture visualization and design tool (react, typescript, vite, react-flow)
- **Created:** 2026-06-07
- **Last Updated:** 2026-06-07 (P1 exec+commit)
- **Supersedes:** Learning-Fidelity Redesign (completed/shipped P135–P143) -> .kdbp/archive/completed_PLAN_2026-06-07_learning-fidelity-redesign.md

## Phases

| # | Phase | Description | Tier | Complexity | Exec | Review | Commit | Push |
|---|-------|-------------|------|------------|------|--------|--------|------|
| 1 | One tuning surface (block tunes, panel teaches) | Block is the complete control set (vendor + config-variant + replicas + traffic); the right-panel inspector becomes read-only learning. De-duplicate the canvas<->inspector tuners. | ent | high | ✅ | ✅ | ✅ | ✅ |
| 2 | Declutter the score footer in place | Footer keeps tier + budget + aggregate grade + the single weakest category + a "more" that opens the existing overlay; the 7 inline category bars move into the overlay. | ent | med | ✅ | ✅ | ✅ | ✅ |
| 3 | Knowledge propagation + progressive unlock journey | Shipped as 3a (inspector declutter) + 3b (Test Conditions = failures) + 3c (progression-driven disclosure tier: config/vendor/replicas gate in quests via useDisclosureTier, free shows all; D82/D84) + tooltip journeys retuned (read-only inspector + tune-on-block, tier-aware). Bottom performance stays ungated. Optional: a bespoke cross-region full-journey tour. | scale | high | ✅ | ✅ | ✅ | ✅ |

<!-- Exec is written by /gabe-execute: ⬜ not started, 🔄 in progress, ✅ complete -->
<!-- Review/Commit/Push auto-ticked by /gabe-review, /gabe-commit, /gabe-push -->
<!-- A phase is complete when all four status columns are ✅ -->

## Phase Details

### Phase 1 — One tuning surface (block tunes, panel teaches)
- **Types:** user-facing, client-state
- **Tier:** ent
- **Prototype:** no
- **Sections considered:** Core, Client-state
- **Trade-offs accepted:** See DECISIONS.md D79, D81
- **Scope:** add a compact config-variant (tier) picker to the canvas node (ArchieNode) next to the vendor switch so the block is the complete control set; remove ComponentSwapper + ConfigSelector + the inspector copy of TrafficNodeControls from ComponentDetail so the right panel is read-only learning (heading / concept / what-it-is / economics / gains-costs / recommendations / metrics / data-context); verify the economics cost-delta still shows when tuning on the canvas with the panel open (it reacts to store changes regardless of edit origin); the D20 traffic lock already lives on the canvas controls. Move the component-swapper / config-selector / inspector-traffic-config assertions onto the canvas-node tests; redirect inspector-driven E2E (component-swapping, inspector-and-config) to drive the block.
- **Exit:** exactly one tuning surface (canvas), inspector read-only, full unit+integration suite + E2E green, traffic lock holds, tidy compact node layout.

### Phase 2 — Declutter the score footer in place
- **Types:** user-facing
- **Tier:** ent
- **Prototype:** no
- **Trade-offs accepted:** See DECISIONS.md D80, D81
- **Scope:** DashboardPanel keeps tier + budget + aggregate grade + the single weakest category inline + a "more"/expand that opens the existing DashboardOverlay; the full 7-category breakdown moves into the overlay.
- **Exit:** footer fits without horizontal scroll, full breakdown one click away, tests updated.

### Phase 3 — Knowledge propagation + progressive unlock journey (SHIPPED as 3a/3b/3c)
- **Types:** user-facing
- **Tier:** scale
- **Prototype:** no
- **Trade-offs accepted:** See DECISIONS.md D81
- **Scope:** evolve the inspector's experience-level disclosure into a challenge-progression gate (keep a manual override), add the section-unlock narrative + tooltips across blocks -> right-panel sections -> bottom performance; right-panel depth tied to challenge progression, bottom performance stays ungated. Keep Phases 1-2 compatible. Initially deferred, then un-deferred and shipped as 3a (inspector declutter), 3b (Test Conditions = failures only, D83), 3c (progression-driven disclosure tier, D82/D84) + retuned tooltip journeys + the optional bespoke cross-region full tour (P3c-3).

## Current Phase

None — all 3 phases complete (archived).

## Dependencies

- Phase 2 is surface-independent of Phase 1 but sequenced after it to keep one UX-consolidation thread.
- Phase 3 depends on Phase 1 — it drives the right-panel section model Phase 1 establishes (read-only learning layer).

## Risks

| Risk | Severity | Mitigation |
|------|----------|------------|
| Node real-estate: vendor + config + replicas + traffic crowd the block | medium | Compact dropdown row under the vendor switch; verify layout at advanced experience level |
| Test/E2E churn moving tuners off the inspector | medium | Move assertions to canvas-node tests + redirect inspector E2E to the block in the same change |
| Cost-delta UX regressing when tuning moves to the canvas | low | Delta reads store changes regardless of edit origin — verify with the panel open |

## Notes

Locked design decisions (D79 block-tunes-panel-teaches, D80 declutter-footer-in-place) were chosen with the user. Phase 3 was initially deferred, then shipped in full (3a/3b/3c + optional full tour). Connectors are already read-only, so the end state is consistent: panel = read/understand, block = tune.

## Review Artifacts

- HTML review artifact: none — proceeding directly to Phase 1 execution
- Canonical source: `.kdbp/PLAN.md`, `.kdbp/DECISIONS.md`, `.kdbp/LEDGER.md`

## Runtime Evidence Checkpoints

- Phase 1 (user-facing): a desktop-unlocked / canvas E2E that tunes vendor + config-variant on the block and asserts the inspector exposes no editable controls; artifacts to test-results/.

## Archived

- **Resolution:** completed
- **Date:** 2026-06-09
- **Reason:** Fluidity — UX consolidation feature-complete and shipped (deployments P144–P154, all phases
  Exec/Review/Commit/Push ✅, including the optional cross-region full-journey tour in P3c-3/P154). The
  follow-on desktop-E2E rehab it surfaced (D23/D24) is also fully resolved; the rehab commits ship as P157.
