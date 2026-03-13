# Alignment Check — Epic 6: Constraint Guardrails

---
date: 2026-03-10
altitude: Epic
behavior: archie-clarity v1.1.0 (seedling)
scope: "Epic 6 — Constraint Guardrails"
status: COMPLETE
decision: Accept (V4 drift intentional)
---

## Step 0: Cold Tier Loaded

- **Behavior:** archie-clarity v1.1.0 (seedling)
- **Values:** 5 full blocks loaded (V1-V5)
- **Project Intent:** Factorio-inspired visual architecture simulator
- **Active stories:** 0 in active/ (Epic 6 fully completed)
- **Unresolved drift signals:** 1 — V4 pathway guidance (deferred to Epic 7.5, per Epic 5 check)
- **DEPENDENCY-MAP.md:** Not yet created (expected at seedling maturity)
- **Note:** VALUES.md exists as separate file; value content also embedded in BEHAVIOR.md

## Step 1: Output Captured

- **Altitude:** Epic
- **Scope:** Epic 6 — Constraint Guardrails ("Your red lines, visible on the canvas")
- **Stories:** 5 core + 7 TD stories = 12 total, all status: done, 19 pts
- **Artifacts:**
  - **6-1:** Constraint types, ConstraintSchema (Zod), label sanitization, ParsedConstraint alias
  - **6-2:** constraintEvaluator.ts (pure function), store CRUD, pipeline integration
  - **6-3:** ConstraintPanel, ConstraintViolationBadge, click-to-navigate, dashboard integration
  - **6-4:** Export/import round-trip, snake_case transform, conditional omission
  - **6-5:** constraint-guardrails.spec.ts (E2E), 3 screenshots
  - **7 TD stories:** Hardening, test cleanup, perf optimization, DRY refactors, deterministic IDs
- **Intent handle:** "Your red lines, visible on the canvas"
- **FRs covered:** FR51-FR57, FR71-FR72
- **NFRs covered:** NFR14, NFR17, NFR18
- **Reviews:** All stories 8.3-8.75/10, all APPROVE, ~1700 tests passing

## Step 2: Intent Stated

- **Person served:** Developer at architecture decision point — decider/explorer/learner
- **What they need:** Define hard threshold constraints on architecture metrics and immediately see which components violate them. Violations visible on the canvas as badges, clickable to navigate to offending components. Constraints survive YAML export/import for portability.
- **V8 check: HUMAN-GROUNDED** — The epic intent "Your red lines, visible on the canvas" describes the person's experience: their limits, visible where they work. Stories 6-1 through 6-4 are person-serving. Story 6-5 (E2E) is appropriately process-serving — it protects the person's experience.

## Step 3: Value Alignment Results

| Value | Handle | Rating | Notes |
|-------|--------|--------|-------|
| V1 | "Show the trade-off, not just the winner" | **ALIGNED** | Constraints deepen trade-off comprehension — users define their own thresholds and see where they break. Violation badge -> click -> navigate gives a clear "here's what failed and by how much" path. Constraint panel shows category + operator + threshold + actual score. |
| V2 | "Show what you don't know, not just what you do" | **ALIGNED** | Neutral — constraints are user-defined thresholds, so their "confidence" is inherently known (the user set them). No regression on uncertainty visibility. Epic 6 doesn't claim precision it doesn't have. |
| V3 | "Show the ripple, not just the piece" | **ALIGNED** | Constraint evaluation wired into recalculation pipeline: config change -> BFS -> weighted scores -> constraint re-evaluation -> violation badges update. Dashboard shows aggregate "N constraints, M violations" for system-level visibility. |
| V4 | "Show the roads, not just the dot" | **DRIFTING** | Same drift as Epic 5. Constraints show WHERE you violate (actual 3.2 vs threshold 7.0) but not WHAT TO CHANGE to fix it. No suggestions, no pathway guidance. Known deferral — Epic 7.5 created in Epic 5 check. Epic 6 adds second of three foundation layers (constraint-aware filtering). Drift hasn't worsened; remedy one step closer. |
| V5 | "Prove it works, don't trust it reads" | **ALIGNED** | E2E spec exists and was executed — 3 screenshots in test-results/constraint-guardrails/ prove runtime behavior. The V5 origin failure (6-5 initially reviewed without running tests) was caught and corrected. Minor process observation: step-08 skipped via O-007 trivial exemption. |

**Summary: 4 ALIGNED | 1 DRIFTING | 0 MISALIGNED**

## Step 4: Failure Trace Results

| Value | Rating | Gap Type | Detail |
|-------|--------|----------|--------|
| V4 | DRIFTING | **Linkage Gap (Type 3 orphan)** | Same finding as Epic 5. V4 has no linked skills or workflow steps (DEPENDENCY-MAP empty at seedling maturity). The value is correct — users should see growth paths. But no implementation skill connects scoring/constraint systems to pathway guidance. Epic 6 adds constraint-aware filtering (second foundation layer). |

**Evolution recommendation:** Type D (Fill Gap) — same as Epic 5, deferred.

**Foundation layer progress:**

| Foundation Layer | Status | Needed for V4 |
|-----------------|--------|---------------|
| Weights (Epic 5) | Done | Rank suggestions by user priorities |
| Constraints (Epic 6) | Done | Filter suggestions that violate red lines |
| Data context (Epic 7) | Not built | Fit suggestions to data patterns |
| Pathway guidance (Epic 7.5) | Not built | The actual V4 implementation |

**Cross-value impact:** No conflict. Fixing V4 via Epic 7.5 strengthens V1, V3, and uses V5. No value harmed.

### Secondary Observation (V5 process)

Story 6-5 review skipped step-08 (value-aligned E2E coverage check) via O-007 trivial exemption. E2E was executed (screenshot evidence confirms), but the exemption path could allow future stories to skip V5 enforcement. Consider tightening O-007 criteria: E2E stories should not qualify for trivial exemption on step-08.

## Step 5: Human Decision — ACCEPT

**Decision:** [A] Accept — acknowledge V4 drift as intentional

**Rationale:** V4 drift is a deliberate architectural sequencing choice, not an oversight:

1. **Build order is correct.** Pathway guidance (V4) needs weights (Epic 5), constraints (Epic 6), and data context (Epic 7) as inputs. Building it before all inputs exist means guaranteed rework.

2. **Progress is measurable.** At Epic 5 check: 1/3 foundation layers. Now at Epic 6 check: 2/3 foundation layers. The drift isn't growing — the remedy is converging.

3. **Epic 7.5 is already planned.** Stories are drafted (7.5-0 through 7.5-4) in sprint-status.yaml. The brainstorming + ADR prerequisite is documented. This isn't "we'll get to it someday" — it's "we'll get to it after Epic 7."

4. **Premature delivery would harm V1.** Building pathway guidance with only weights+constraints (no data context) would show incomplete roads — violating V1 (comprehension) by presenting partial guidance as complete.

**Acceptance scope:** V4 drift accepted through Epic 7. Re-evaluate at Epic 7 alignment check. If Epic 7.5 is not in progress after Epic 7 completes, escalate to MISALIGNED.

## Outcome

| Field | Value |
|-------|-------|
| Status | COMPLETE |
| Decision | Accept (V4 drift intentional) |
| Values tested | 5 (V1-V5) |
| Aligned | 4 (V1, V2, V3, V5) |
| Drifting | 1 (V4 — accepted, re-evaluate at Epic 7) |
| Misaligned | 0 |
| Next action | Proceed to Epic 8 (Stack Browsing), then Epic 7 (Data Context), then Epic 7.5 (V4 delivery) |
| Escalation trigger | If Epic 7.5 not in-progress after Epic 7 completes |
