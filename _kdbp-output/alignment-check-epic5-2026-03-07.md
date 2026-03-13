# Alignment Check — Epic 5: Priority Scoring

---
date: 2026-03-07
altitude: Epic
behavior: archie-clarity v1.0.0 (seedling)
scope: "Epic 5 — Priority Scoring"
status: COMPLETE
decision: Defer to Epic 7.5
---

## Step 0: Cold Tier Loaded

- **Behavior:** archie-clarity v1.0.0 (seedling)
- **Values:** 4 full blocks loaded (V1-V4)
- **Project Intent:** Factorio-inspired visual architecture simulator
- **Active stories:** 0 in active/ (Epic 5 fully completed per ledger)
- **Unresolved drift signals:** 1 — Fit indicator trust (V2) flagged for Epic 7
- **DEPENDENCY-MAP.md:** Empty (expected at seedling maturity)

## Step 1: Output Captured

- **Altitude:** Epic
- **Scope:** Epic 5 — Priority Scoring ("Your priorities reshape the scoreboard")
- **Stories:** 5 core + 8 TD stories = 13 total, all status: done
- **Artifacts:** 43 files changed (+3,769 / -189 lines)
  - **Source (21 files):** schema v2, weighted engine, dashboard UI, sliders, export/import, hooks, utils
  - **Tests (22 files):** unit, integration, E2E (priority-scoring.spec.ts, yaml-weight-roundtrip, etc.)
- **Intent handle:** "Your priorities reshape the scoreboard"
- **FRs covered:** FR44-FR50, FR69-FR72
- **NFRs covered:** NFR12, NFR18, NFR19
- **Ledger:** 14 entries, all marked done

### Git History (Epic 5)

```
8494351 Merge pull request #15 from Brownbull/feature/epic-5
3c4bf30 Review td-5-5c: APPROVE 8/10 — quick fixes applied, Epic 5 done
08cbc21 Review td-5-5b: APPROVE 7.5/10 — quick fixes + create td-5-5c
5b03a5b TD-5-5a: E2E test hardening — js-yaml fixtures, multi-slider reset, library wait
46be214 Review 5-5: APPROVE 8/10 — quick fixes + create td-5-5a
0f14574 Story 5-5: E2E priority scoring flow
f2519d6 TD-5-4a: Weight pipeline type safety & hardening
6edc9e4 Story 5-4: YAML weight profile export/import round-trip
df4d79c Review td-5-3b: APPROVE 8/10 — add categoryLookup test, mark done
1054a91 Review td-5-3b: add categoryLookup unit test + empty profile edge case
620330b Epic 5: Priority Scoring — stories 5-1, 5-2, 5-3, td-5-1a, td-5-3a, td-5-3b
d701bab Review 5-3: APPROVE 8/10 — stale closure fix, edge case tests, create td-5-3a
df0f542 Review td-5-1b: APPROVE 8.5/10 — position bounds to constants, test coverage hardening
```

## Step 2: Intent Stated

- **Person served:** Developers at architecture decision points — evaluating trade-offs between different software architectures, needing to weight priorities differently depending on project context.
- **What they need:** The ability to say "reliability matters more to me than cost" and have the entire architecture evaluation reshape itself around that statement. Before Epic 5, every developer saw the same scores regardless of what mattered to them. After Epic 5, the scoreboard responds to *their* priorities — sliders adjust weights, scores recalculate, heatmaps shift, tiers re-evaluate, and the whole mix persists through YAML export/import.
- **V8 check: HUMAN-GROUNDED** — The epic intent describes what changes for the person: they move from passive consumers of fixed scores to active participants who shape the evaluation. Capability gain for the human, not protocol compliance.

## Step 3: Value Alignment Results

| Value | Handle | Rating | Notes |
|-------|--------|--------|-------|
| V1 | "Show the trade-off, not just the winner" | **ALIGNED** | Sliders inherently show *how* priorities change scores. Weighted vs. Balanced dual display (AggregateScore line 35-53) lets users see the effect of their choices. CategoryInfoPopup provides drill-down explanation per category. A user can explain "I prioritized scalability, so this architecture scores higher" — comprehension, not just a verdict. |
| V2 | "Show what you don't know, not just what you do" | **ALIGNED** | Epic 5 doesn't introduce new uncertainty claims. Weighted scores are explicitly user-driven (sliders are visible inputs, not black-box adjustments). The "Weighted \| Balanced" label honestly separates personalized from objective. No regression — weights don't pretend to add precision, they add perspective. |
| V3 | "Show the ripple, not just the piece" | **ALIGNED** | Weight changes propagate through the entire system — heatmapCalculator applies weights to all nodes (FR46), tier evaluates on weighted scores (architectureStore line 141), dashboard updates globally. Moving one slider changes every component's relative standing. The ripple is visible. |
| V4 | "Show the roads, not just the dot" | **DRIFTING** | Tier system now evaluates on weighted scores (good — tier changes when priorities change). But the *pathway* isn't explicitly shown under weighted context. A user who sets scalability to 0.3 and reliability to 1.0 doesn't see "under your priorities, adding a cache would move you from Tier 2 to Tier 3." The tier recalculates, but the growth path doesn't adapt to explain what changed. Pre-existing gap widened by Epic 5 making scoring dynamic while guidance remains fixed. |

**Summary: 3 ALIGNED | 1 DRIFTING | 0 MISALIGNED**

## Step 4: Failure Trace Results

| Value | Rating | Gap Type | Detail |
|-------|--------|----------|--------|
| V4 | DRIFTING | **Linkage Gap** (Type 3 orphan) | V4 has no linked skills or workflow steps in DEPENDENCY-MAP.md (empty at seedling maturity). The value is correct — users *should* see how to grow their architecture under their chosen priorities. But no implementation skill connects weighted scoring to pathway guidance. The tier system recalculates with weights, yet the "what's next" guidance (component suggestions, tier progression explanation) remains static and unaware of the weight context. |

**Evolution recommendation:** **Type D — Fill Gap**

The gap isn't a broken link or outdated skill — it's a missing one. V4 needs a skill that connects "your priorities" to "your growth path." This would manifest as:
- Tier progression hints that account for weight profile (e.g., "under your priorities, scalability is your bottleneck for Tier 3")
- Component suggestions weighted by the user's priority profile

**Not an Epic 5 defect.** Epic 5's scope was FR44-FR50 (priority scoring). Pathway guidance under weighted context would fall under future work (likely Phase 3 or a separate story). The drift is *structural* — Epic 5 made the scoring dynamic while the pathway system remained static, widening a pre-existing gap.

### Cross-Value Impact
**No cross-value conflict.** Fixing V4 (adding weighted pathway guidance) would strengthen V1 (comprehension — users understand *why* the next tier matters under *their* priorities) and V3 (ripple — pathway shows system-level growth). No value would be harmed.

## Step 5: Human Decision — DEFER

**Decision:** [D] Defer — log findings, address after Epic 7 as Epic 7.5

**Rationale:** Pathway guidance needs all three personalization layers (weights + constraints + data context) to be built properly. Building now means building with 1/3 of the inputs and guaranteed rework after Epics 6 and 7.

- Weights (Epic 5) = done — pathways could respond to priorities
- Constraints (Epic 6) = not built — pathways can't warn about violations
- Data context (Epic 7) = not built — pathways can't account for data patterns

Building after Epic 7 means one build, full awareness, no rework. V4 stays DRIFTING for 3 epics but gets fixed properly as Epic 7.5.

**What Epic 7.5 would deliver:**
- Tier gap analysis engine (what's missing to reach next tier)
- Component suggestion logic (which additions close gaps)
- Weight-aware ranking (reorder suggestions by user priorities)
- Constraint-aware filtering (don't suggest what violates red lines)
- Data-context-aware relevance (suggestions fit your data patterns)
- UI for displaying pathway guidance (tier overlay or dashboard)

**Cross-value impact:** Fixing V4 later strengthens V1 (comprehension — users understand *why* the next tier matters under *their* priorities) and V3 (ripple — pathway shows system-level growth). No value harmed by deferring.

## Step 6: Verification — N/A (Defer)

No evolution performed. Verification skipped. Findings logged for Epic 7.5.

## Outcome

| Field | Value |
|-------|-------|
| Status | COMPLETE |
| Decision | Defer to Epic 7.5 |
| Values tested | 4 (V1-V4) |
| Aligned | 3 (V1, V2, V3) |
| Drifting | 1 (V4 — deferred) |
| Misaligned | 0 |
| Next action | Create Epic 7.5 stories after Epic 7 completes |
