# Active Plan

<!-- status: active -->
<!-- project_type: code -->

## Goal

Single-Player UX & Component Model — improve Archie as a solo tool, driven by the Coding Ducks competitive gap analysis (docs/research/20260530). Fix the editing-correctness + information-density gaps, repair the solo progress loop, and re-model the component palette to **fundamental type → provider → tier**. Strictly single-player — community/sharing/benchmarking features are out of scope (deferred until after this epic).

## Context

- **Maturity:** enterprise
- **Domain:** Software architecture visualization and design tool
- **Created:** 2026-05-30
- **Last Updated:** 2026-05-30
- **Source:** docs/research/20260530/response1-3 (gap analysis vs Coding Ducks). Single-player only; precedes any Phase-4 community features.
- **Excluded (deferred — needs cross-user data / sharing):** anonymized percentile / "beats X% of builds" benchmarking. Only solo "vs your past attempts" is in scope (P4).

## Phases

| # | Phase | Description | Tier | Complexity | Exec | Review | Commit | Push |
|---|-------|-------------|------|------------|------|--------|--------|------|
| 1 | On-object Remove/Duplicate toolbars (node + edge) | Floating toolbar on node AND edge selection with Remove + Duplicate. Fixes the functional gap: connectors can't be deleted from the UI today, and node delete is hidden keyboard-only. Keep the Delete-key accelerator. | ent | medium | ✅ | ✅ | ✅ | ✅ |
| 2 | Canvas authoring fixes | Auto-fit/frame on load + import (Fit View leaves an empty viewport with nodes only in the minimap); forgiving wiring (larger port hit-targets, hover-highlight ports, click-source→click-target fallback); fix the budget label glitch ("$260/$80/mo"). | ent | medium | ✅ | ✅ | ✅ | ✅ |
| 3 | Information density: palette + inspector | Compact palette rows (icon + name + price range; collapsible categories; IS/GAIN/COST detail moved to hover/inspector). Inspector collapse-by-default into a hierarchy (header: name, provider/variant, $·throughput·latency, Remove; YAML/Gains/Costs/Recommendations/Metrics behind disclosures). Per-node utilization % overlay. | ent | high | ✅ | ✅ | ✅ | ⬜ |
| 4 | Solo progress loop reliability | Diagnose + fix the History "Could not load your attempt history" error (verify vs deployed Firestore rules + auth state); clean empty state; confirm lossless YAML round-trip; add "vs your past attempts" deltas on the results modal (solo only — no cross-user percentile). | ent | medium | ⬜ | ⬜ | ⬜ | ⬜ |
| 5 | Component model: type → provider → tier | Schema gains a provider layer (type_id / provider_id / variant_id). Migrate the 18 provider-components to fundamental types + seed 1–3 providers each (migration map in response1 §3). Toolbox organized by TYPE; in-node provider + tier picker showing $·RPS·ms with deltas. Lossless YAML migration map (cloudflare-cdn → cdn/cloudflare, …). The strategic bet — enables lighter UI + type-keyed validation. | ent | high | ⬜ | ⬜ | ⬜ | ⬜ |
| 6 | Live guidance: topology validation + tour | Live graph nudges ("X placed but not connected to traffic", "missing required type"); a live Required checklist beyond challenge mode; a restartable first-run guided tour replacing static hint bullets. Builds on P5's type-first model. | ent | high | ⬜ | ⬜ | ⬜ | ⬜ |

<!-- Exec: ⬜/🔄/✅. Review/Commit/Push auto-ticked. User-facing/web phases require runtime journey evidence. -->

## Current Phase

Phase 3: Information density: palette + inspector

## Dependencies

- P1, P2, P4 are independent (correctness + reliability). P3 (density) ships on the current model; P5 deepens it (deferring tradeoffs to the provider dropdown). P6 depends on P5 (type-keyed validation). Recommended order is P1→P6 (correctness + density quick wins first, then the strategic component-model refactor, then guidance) — P5 can be pulled earlier if the component model is the priority. Every phase is user-facing → requires a browser runtime-journey check (E2E + screenshots).

## Risks

| Risk | Severity | Mitigation |
|------|----------|------------|
| P5 component-model refactor is large + touches Firestore-seeded component data + YAML import/export | high | Schema-additive (insert provider_id; keep variant tiers); static migration map keeps YAML round-trip lossless; full suite + import/export round-trip tests are the net; land behind the existing variant machinery |
| Density redesign (P3) regresses the rich data Archie already has | medium | Move detail to hover/disclosures, don't delete it; keep the scoring/economics data intact |
| History error (P4) may be the un-deployed/contended Firestore rules rather than code | medium | Diagnose first (rules deployed? auth resolved? owner-scoped query) before changing code; D9-adjacent |
| On-object edge toolbar positioning over SVG edges (P1) is finicky | low | Anchor to edge midpoint; reuse the node-toolbar pattern |
