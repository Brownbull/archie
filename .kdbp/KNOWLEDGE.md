# Human Knowledge Map

<!-- Tracks what the human (operator/architect) understands about decisions made. -->
<!-- Populated and updated by /gabe-teach. -->
<!-- Goal: the human knows WHY/WHEN/WHERE, not HOW. Architect-level, not coder-level. -->

## Gravity Wells

<!-- Architectural sections of the app. Topics anchor to a primary well. -->
<!-- Soft cap: 7 wells (Miller's number). -->
<!-- A topic that spans wells gets one primary Well + `cross` in the Tags column. -->
<!-- G0 Uncategorized is a reserved fallback for orphan topics; /gabe-teach flags it. -->

<!-- Analogy column: one-liner (5-15 words) from gabe-lens. Makes each well graspable at a glance. -->
<!-- Paths column: comma-separated globs where this well's code lives (e.g., `app/api/**, tests/api/**`). Used by brief mode for health/last-commit signals. -->
<!-- Docs column: single path to this well's docs file (e.g., `docs/wells/3-api.md`). Empty = opt-out (no docs tracked for this well). Used by brief mode to surface doc links, by /gabe-teach topics to auto-append verified summaries, by /gabe-commit CHECK 7 Layer 3 for drift detection. -->
<!-- All three columns generated at init-wells time; regenerable via /gabe-teach wells. -->

| # | Name | Description | Analogy | Paths | Docs | Topics (verified / pending / total) |
|---|------|-------------|---------|-------|------|--------------------------------------|
| G1 | Canvas | XyFlow visual surface: nodes, connections, drag-drop, selection | The factory floor where machines get placed and belts connect them | src/components/canvas/**, src/hooks/** | docs/wells/1-canvas.md | 0 / 0 / 0 |
| G2 | Engine | Deterministic calculation core: propagation, recalculation, constraints, heatmap | The physics simulation running behind every placed belt and inserter | src/engine/** | docs/wells/2-engine.md | 0 / 0 / 0 |
| G3 | Data Layer | Schemas (Zod), stores (Zustand), repositories, types, YAML import/export | The blueprint string — everything the factory IS, encoded for sharing | src/schemas/**, src/stores/**, src/repositories/**, src/types/**, src/components/import-export/** | docs/wells/3-data-layer.md | 0 / 0 / 0 |
| G4 | UI Panels | Inspector, dashboard, heatmap viz, toolbox, toolbar | The production statistics screen and item tooltips | src/components/inspector/**, src/components/dashboard/**, src/components/heatmap/**, src/components/toolbox/**, src/components/toolbar/** | docs/wells/4-ui-panels.md | 0 / 0 / 0 |
| G5 | Personalization | Player profile, demand engine, fit evaluation, pathways, recommendations | The research tree showing what to unlock next based on your factory goals | src/services/**, src/engine/demandEngine.ts, src/engine/fitEvaluator.ts, src/engine/pathwayEngine.ts, src/engine/recommendationEngine.ts, src/engine/tierEvaluator.ts | docs/wells/5-personalization.md | 0 / 0 / 0 |
| G6 | Blueprints & Stacks | Pre-built architectures, stack browsing, component catalog | The blueprint library — proven designs ready to stamp down | src/data/** | docs/wells/6-blueprints-stacks.md | 0 / 0 / 0 |

## Topic Classes

| Class | Question it answers | Source |
|-------|--------------------|--------|
| **WHY** | Why did we choose this approach? | commits, PLAN.md, DECISIONS.md |
| **WHEN** | When to apply / not apply this pattern? | repeated patterns across commits |
| **WHERE** | Why does this file live here? (static gravity well) | new files + project structure conventions |

## Status Lifecycle

| Status | Meaning | Re-surfaces? |
|--------|---------|--------------|
| `pending` | Detected from changes, not yet discussed | Yes, next /gabe-teach |
| `verified` | Human answered quiz correctly (score recorded) | No, unless stale |
| `skipped` | Human deferred this session | Yes, next /gabe-teach |
| `already-known` | Human claimed prior knowledge | No |
| `stale` | Verified >90 days ago | Yes, for refresh |

## Topics

<!-- ArchConcepts column: comma-separated architecture concept IDs from the gabe-arch skill -->
<!-- (e.g., "retry-with-exponential-backoff, idempotency-keys"). Empty = no tags. -->
<!-- Populated by /gabe-teach Step 4b.5 (deterministic match + LLM fallback + human confirm). -->
<!-- Cross-project concept verification lives in ~/.claude/gabe-arch/STATE.md. -->

| # | Well | Class | Topic | Status | Tags | ArchConcepts | Last Touched | Verified Date | Score | Source |
|---|------|-------|-------|--------|------|--------------|--------------|---------------|-------|--------|
| T1 | G2 | WHEN | Solvability harness — reference solution per challenge → real sim+scorer → asserts ≥1★ clearable; guarded the recast + hardening | pending |  |  | 2026-06-04 | — | — | e750247 |
| T2 | G2 | WHY | Golden-snapshot invariant — locks the 41 built-ins' StarBreakdown so additive rubric changes are provably non-regressing | pending |  |  | 2026-06-04 | — | — | 43ef152 |
| T3 | G2 | WHY | Cache/CDN fronting — cache hits served terminally (only misses forward); stacked cdn+cache ~99% absorption survives a full compute az_outage | pending |  |  | 2026-06-04 | — | — | e750247 |
| T4 | G3 | WHY | PROGRESS_GENERATION idempotent reset — per-user generation stamp; below-gen wiped once on load then re-stamped (full-replace setDoc, not merge) | pending |  |  | 2026-06-04 | — | — | 48b7ec9 |
| T5 | G2 | WHEN | Adversarial-verify workflow — parallel refutation lenses returning isReal findings; caught 3 real HIGH bugs across the epic | pending | cross |  | 2026-06-04 | — | — | 5750c3f |

<!-- Example rows:
| T1 | G1 | WHY | Why guardrails run before the LLM | verified |  | input-guardrails, input-validation-at-boundary | 2026-04-17 | 2026-04-17 | 2/2 | a4c9e2f |
| T2 | G3 | WHY | Why 202 Accepted + BackgroundTask | pending |  | async-background-processing | 2026-04-17 | — | — | b1d8e3a |
| T3 | G5 | WHY | Structured logging format choice | pending | cross |  | 2026-04-17 | — | — | c7f2a91 |
-->

## Sessions

<!-- Append-only log of /gabe-teach runs. Enriched with wells active + plan/phase reference. -->

### 2026-06-04 — /gabe-teach topics (ISAPivot epic consolidation)
- Wells active: G2 Engine, G3 Data Layer
- Plan reference: .kdbp/PLAN.md — "Traffic Realism + Challenge Difficulty (ISAPivot)" (Phases 0-6 all shipped, P120-P127)
- Recorded: T1 solvability harness, T2 golden-snapshot invariant, T3 cache/CDN fronting mechanic, T4 PROGRESS_GENERATION reset, T5 adversarial-verify workflow
- Status: all pending (knowledge captured from the build; verify interactively in a future /gabe-teach topics run)
- Commits covered: 43ef152, 5750c3f, e750247, 48b7ec9 (+ the full Phase 0-6 chain)


<!-- Example:
### 2026-04-17 — /gabe-teach topics (post-commit)
- Wells active: G1 Guardrails, G2 LLM Pipeline, G3 API Layer, G4 Frontend, G5 Observability
- Commits covered: a4c9e2f, b1d8e3a, c7f2a91
- Plan reference: .kdbp/PLAN.md — "Phase 1 Level 2a" (current phase 3 of 5)
- Presented: T1, T2, T3
- Verified: T1 (score 2/2)
- Skipped: T2
- Already-known: T3 (sanity-checked)
-->

## Storyline

<!-- Generated on demand by /gabe-teach story. Lossy analogy of what's been built and why. -->
<!-- Auto-refresh trigger: 3 new archived plans since last generation. Manual: /gabe-teach story refresh. -->

No storyline generated yet. Run `/gabe-teach story` after a few completed phases to generate one.
