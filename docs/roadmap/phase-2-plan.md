# Archie — Phase 2 Plan

## Where We Are

Epics 1–4 are done. All 43 functional requirements from the PRD are implemented. The MVP is feature-complete.

### What's still open in this session

| Step | What | Command / Action |
|------|------|------------------|
| 1 | Commit Epic 4 responsiveness fixes + E2E tests | `feature/epic-4-hotfix` branch, PR to `dev` |
| 2 | Deploy to production | PR `dev` → `main` |
| 3 | Mark `epic-4: done` in sprint-status.yaml | Manual edit after deploy |
| 4 | (Optional) Epic 4 retrospective | `/bmad-bmm-retrospective` |

After step 3, all four epics show `done` and the MVP is shipped.

---

## Phase 2 — Overview

Phase 2 adds personalization and refinement on top of the objective architecture simulator built in Phase 1. Three features were explicitly deferred in the PRD:

| Feature | What it does | Complexity |
|---------|--------------|------------|
| **Priority Sliders** | Users weight the 7 metric categories to rerank scoring | Moderate |
| **Constraint Guardrails** | Hard thresholds that flag violations (e.g., "latency < 50ms") | Moderate |
| **Data Context Items** | Users define data shapes and see per-variant fit indicators | High |

Additionally, the **Stacks tab** is still a "Coming in Phase 2" placeholder.

### Dependency order

```
Priority Sliders (standalone — only touches dashboard + scoring)
  → Constraint Guardrails (builds on sliders — thresholds per weighted category)
    → Data Context Items (new domain model — biggest change)

Stacks tab is independent of all three — can be done anytime.
```

---

## Feature Breakdown

### Epic 5: Priority Sliders & Scoring Personalization

**What changes:** Users drag 7 sliders (one per metric category) to say "I care more about reliability than cost." The dashboard recalculates weighted scores. The tier system adjusts. YAML export includes the weight profile.

**Why it matters:** The PRD's personas (Gabe, Sarah) both hit the moment where the "best" architecture depends on what you prioritize. Without sliders, scoring is balanced — fine for exploring, insufficient for deciding.

**Architecture impact:**
- New `WeightProfile` type in Zod schema
- Zustand store slice for weights (default: all equal)
- Dashboard aggregation modified to apply weights
- Tier system evaluation adjusted for weighted scoring
- YAML skeleton extended to include weight profile
- New slider UI component (likely in a settings panel or dashboard sidebar)
- Firestore: optional per-user weight storage (or local-only for now)

**Key decision needed:** Where do weights live — Firestore per user, or local-only (YAML export carries them)? Local-only is simpler and aligns with "no backend complexity in early phases." Firestore allows persistence across devices.

**Estimated stories:** 3 user stories + TD stories from code review

---

### Epic 6: Constraint Guardrails

**What changes:** Users define hard rules like "latency must stay under X" or "cost category must be at least medium." The system flags violations with visual indicators on the canvas and dashboard.

**Why it matters:** WARN mode on connections covers compatibility, but doesn't cover "this architecture violates my requirements." Guardrails make the tool useful for real project constraints, not just exploration.

**Architecture impact:**
- New `Constraint` type (category, operator, threshold)
- Constraint evaluation engine (runs after recalculation)
- Visual violation indicators (badge on canvas nodes, dashboard alerts)
- Constraint editor UI (panel or dialog)
- YAML skeleton extended to include constraints
- Interaction with priority sliders: constraints operate on weighted scores

**Dependency:** Builds on Epic 5 (priority sliders) — constraints should respect weighted scoring.

**Estimated stories:** 2–3 user stories + TD stories

---

### Epic 7: Data Context Items

**What changes:** Users define their actual data shapes (e.g., "User Sessions: read-heavy, 50KB average, 10M records") and the inspector shows per-variant fit indicators (great / good / trade-off / poor / risky). This is the bridge between "objective architecture metrics" and "does this work for MY specific project."

**Why it matters:** This is Archie's differentiator. Static metrics tell you "PostgreSQL is good at consistency." Data context tells you "PostgreSQL is a great fit for YOUR read-heavy 50KB session data." It's the personalization layer the PRD envisions for Phase 2–3.

**Architecture impact — this needs architect review:**
- New domain model: `DataContextItem` (shape, access pattern, volume, size)
- New scoring dimension: variant-to-data-context fit calculation
- Inspector UI extension: fit indicators per variant per data item
- The boundary between objective metrics (existing) and contextual fit (new) must be clean
- Firestore schema likely needs extension
- Zod schemas need new types
- YAML export/import extended

**This is the feature most likely to need architecture revision.** The current architecture was designed around static, objective metrics. Data context introduces user-specific, subjective scoring. The architect session should specifically address how these two layers coexist without contaminating each other.

**Estimated stories:** 4–5 user stories + TD stories

---

### Stacks Tab (can be any epic or standalone)

**What changes:** The Stacks tab (currently placeholder) becomes functional. Users browse pre-composed component groups (e.g., "MEAN Stack" = MongoDB + Express + Angular + Node.js) and place them as a unit.

**Architecture impact:** Moderate. The component library already supports the concept — it's mostly UI and a new Firestore collection for stack definitions. A stack is essentially a blueprint with fewer components and a specific "these go together" framing.

**Key question:** Is a "Stack" different enough from a "Blueprint" to justify a separate tab, or should stacks just be a tagged subset of blueprints? This is a UX/product decision, not an architecture one.

**Estimated stories:** 1–2 user stories

---

## Architect Session — What to Cover

Before creating Epic 5–7 stories, run an architect alignment session. The existing [architecture.md](/_bmad-output/planning-artifacts/architecture.md) was designed for Epics 1–4. Phase 2 introduces new concerns:

### Must-resolve questions

1. **Weight persistence:** Local-only vs. Firestore per user? If Firestore, does the auth model need changes?
2. **Data Context domain model:** Where does `DataContextItem` live in the type hierarchy? How does it relate to `Component` and `ConfigVariant`?
3. **Fit scoring boundary:** Objective metrics (current) vs. contextual fit (new) — are they separate scoring tracks in the dashboard, or blended into the existing categories?
4. **YAML schema version bump:** Adding weights, constraints, and data context to the skeleton means a schema version migration. Plan the migration path.
5. **Stacks vs. Blueprints:** Are they the same entity with different tags, or structurally different?

### Nice-to-resolve

6. **Community groundwork:** Phase 3 (MVP 4) introduces community sharing. Should Phase 2 schema decisions pre-account for public/private flags, user attribution, etc.?
7. **Accessibility:** The PRD defers it but mentions revisiting post-MVP. Any quick wins worth including in Phase 2?

### How to run it

```
Session 1: Architecture update
  Command: /bmad-bmm-create-architecture (or update existing architecture.md)
  Input:   Current architecture.md + PRD Phase 2 section + this plan
  Output:  Updated architecture.md with Phase 2 extensions

Session 2: Epic & story creation
  Command: /ecc-create-epics-and-stories
  Input:   Updated architecture.md + PRD + this plan
  Output:  Epic 5, 6, 7 stories in sprint-status.yaml
```

---

## Execution Order

```
┌─────────────────────────────────────────────────────┐
│ NOW — Close Epic 4                                  │
│  1. Commit + deploy responsiveness fixes            │
│  2. Mark epic-4: done                               │
│  3. (Optional) Epic 4 retrospective                 │
└──────────────────────┬──────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────┐
│ DOGFOOD GATE (recommended)                          │
│  Use Archie on 2–3 real projects                    │
│  Note what's missing, what friction points exist    │
│  This informs priority order for Phase 2 features   │
└──────────────────────┬──────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────┐
│ ARCHITECT SESSION                                   │
│  Update architecture.md for Phase 2 extensions      │
│  Resolve the 5 must-resolve questions above         │
└──────────────────────┬──────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────┐
│ Epic 5: Priority Sliders (~3 stories)               │
│  Standalone — no dependencies on other Phase 2 work │
│  Can start immediately after architect session      │
└──────────────────────┬──────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────┐
│ Epic 6: Constraint Guardrails (~2–3 stories)        │
│  Depends on Epic 5 (constraints use weighted scores)│
└──────────────────────┬──────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────┐
│ Epic 7: Data Context Items (~4–5 stories)           │
│  Biggest change — new domain model                  │
│  Can start after Epic 5 if architect session        │
│  resolved the boundary questions                    │
└──────────────────────┬──────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────┐
│ Stacks Tab (~1–2 stories)                           │
│  Independent — can slot in anywhere                 │
└─────────────────────────────────────────────────────┘
```

---

## Phase 3 (Future — Community & Personalization)

For context only — not planned in detail yet:

- **Player profile & gap analysis** — separate overlay layer on top of architecture metrics
- **Community sharing** — post, browse, fork architectures
- **Community component library** — user-contributed components with voting
- **Accessibility improvements** — WCAG compliance pass

Phase 3 requires its own planning cycle. The key constraint: Phase 2 schema and persistence decisions should not block community features (e.g., don't bake user-specific data into shared schemas).

---

## Decision Log

| # | Decision | Status | Notes |
|---|----------|--------|-------|
| 1 | Weight persistence model | **Open** | Needs architect session |
| 2 | Data Context domain model | **Open** | Needs architect session |
| 3 | Fit scoring boundary | **Open** | Needs architect session |
| 4 | YAML schema v2 migration path | **Open** | Needs architect session |
| 5 | Stacks vs. Blueprints entity model | **Open** | UX + architecture decision |
| 6 | Execution order after dogfooding | **Open** | Dogfood results may reprioritize |
