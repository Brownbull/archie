---
status: complete
date: 2026-03-06
author: Gabe
phase: 2
inputDocuments:
  - '_kdbp-output/planning-artifacts/prd.md'
  - '_bmad-output/planning-artifacts/architecture.md'
hardeningAnalysis:
  epic5:
    date: '2026-03-06'
    userStories: 4
    hardeningStories: 1
    totalStories: 5
    patternsApplied: ['data-pipeline', 'error-resilience', 'input-sanitization', 'pure-component', 'cross-store', 'e2e-testing']
    separateStoriesNeeded: 1
    builtInSubtasks: 28
  epic6:
    date: '2026-03-06'
    userStories: 4
    hardeningStories: 1
    totalStories: 5
    patternsApplied: ['data-pipeline', 'error-resilience', 'input-sanitization', 'pure-component', 'cross-store', 'e2e-testing']
    separateStoriesNeeded: 1
    builtInSubtasks: 22
  epic8:
    date: '2026-03-06'
    userStories: 3
    hardeningStories: 1
    totalStories: 4
    patternsApplied: ['data-pipeline', 'error-resilience', 'pure-component', 'cross-store', 'e2e-testing']
    separateStoriesNeeded: 1
    builtInSubtasks: 18
  epic7:
    date: '2026-03-06'
    userStories: 3
    hardeningStories: 1
    totalStories: 4
    patternsApplied: ['data-pipeline', 'error-resilience', 'input-sanitization', 'pure-component', 'cross-store', 'e2e-testing']
    separateStoriesNeeded: 1
    builtInSubtasks: 20
---

# Archie Phase 2 - Epic Breakdown

## Overview

Phase 2 adds personalization to Archie: priority sliders, constraint guardrails, data context items, and stacks browsing. 4 epics covering FR44-FR72, NFR12-NFR19.

**Build Order:** Epic 5 -> Epic 6 -> Epic 8 -> Epic 7

## Requirements Inventory

### Functional Requirements (FR44-FR72)

**Priority & Scoring Personalization (FR44-FR50):**
- FR44: Priority weight sliders per 7 metric categories
- FR45: Dashboard recalculates with weight profile
- FR46: Heatmap updates reflect weighted category scores
- FR47: Tier system adjusts for weighted scoring
- FR48: Reset all sliders to equal weight
- FR49: Weighted/unweighted scores side by side
- FR50: Priority sliders in YAML export/import

**Constraint Management (FR51-FR57):**
- FR51: Define hard threshold constraints per metric category
- FR52: Evaluate constraints after every recalculation
- FR53: Visual violation indicators on canvas (WARN, not BLOCK)
- FR54: Dashboard aggregate constraint status
- FR55: Click violation to navigate to offending component
- FR56: Add/edit/remove constraints without affecting architecture
- FR57: Constraints in YAML export/import

**Data Context & Fit Analysis (FR58-FR63):**
- FR58: Define data context items (name, access pattern, size, structure type)
- FR59: Fit indicator per data item (great/good/trade-off/poor/risky)
- FR60: Expandable fit explanation with contributing factors
- FR61: Fit indicators update on variant switch
- FR62: Add/edit/remove data context items (separate analysis layer)
- FR63: Data context items in YAML export/import

**Stack Browsing & Placement (FR64-FR68):**
- FR64: Browse stacks in Stacks tab
- FR65: Stack cards show components, connections, trade-off profile
- FR66: Drag stack onto canvas as single action
- FR67: Stack components individually editable after placement
- FR68: Stack definitions loaded from component library

**Extended Data Import/Export (FR69-FR72):**
- FR69: YAML schema v2 (weights + constraints + data context)
- FR70: v1 backward compatibility with defaults
- FR71: Validate Phase 2 YAML extensions
- FR72: Conditional export (only include Phase 2 sections if used)

### NonFunctional Requirements (NFR12-NFR19)

- NFR12: Weighted recalculation <200ms
- NFR13: Fit indicator calc <200ms for 10 items/component
- NFR14: Constraint evaluation synchronous with recalculation
- NFR15: Stack placement <500ms for 6-component stacks
- NFR16: Sanitize data context item strings before DOM rendering
- NFR17: Validate constraint thresholds as numeric within range
- NFR18: Validate v2 YAML extensions before applying
- NFR19: Weight profile values between 0 and 1

---

## Epic 5: Priority Scoring -- "Your priorities reshape the scoreboard"

**User Outcome:** Adjust 7 category weight sliders and see architecture re-scored, re-heatmapped, and re-tiered instantly.

**Analogy:** Audio mixing board -- same tracks, different mix depending on the producer.

**FRs:** FR44-FR50, FR69-FR72 | **NFRs:** NFR12, NFR18, NFR19

| Story | Title | Size | Points | Type |
|-------|-------|------|--------|------|
| 5-1 | YAML Schema v2 -- Weight Profile Foundation | MEDIUM | 4 | User |
| 5-2 | Weighted Recalculation Pipeline -- Engine & Propagation | MEDIUM | 5 | User |
| 5-3 | Priority Slider UI -- Controls & Dashboard Integration | MEDIUM | 4 | User |
| 5-4 | YAML Weight Profile Export/Import Round-Trip | SMALL | 3 | User |
| 5-5 | E2E: Priority Scoring Flow | SMALL | 2 | Hardening |

**Total:** 5 stories, 18 points

---

## Epic 6: Constraint Guardrails -- "Your red lines, visible on the canvas"

**User Outcome:** Define hard threshold constraints on metric categories and see violations flagged on the canvas in real time.

**Analogy:** Safety guardrails on a highway -- they don't stop you from driving, but they warn you when you're drifting over the edge.

**FRs:** FR51-FR57, FR71-FR72 | **NFRs:** NFR14, NFR17, NFR18

| Story | Title | Size | Points | Type |
|-------|-------|------|--------|------|
| 6-1 | Constraint Schema & Types Foundation | MEDIUM | 4 | User |
| 6-2 | Constraint Evaluation Engine & Store Integration | MEDIUM | 5 | User |
| 6-3 | Constraint Management UI & Canvas Violation Indicators | MEDIUM | 5 | User |
| 6-4 | YAML Constraint Export/Import Round-Trip | SMALL | 3 | User |
| 6-5 | E2E: Constraint Guardrails Flow | SMALL | 2 | Hardening |

**Total:** 5 stories, 19 points

---

## Epic 8: Stack Browsing -- "Pre-wired building blocks, one drag away"

**User Outcome:** Browse pre-composed stacks, drag onto canvas as a single action, then edit individual components.

**Analogy:** IKEA flat-pack -- buy the whole kitchen set, place it once, then swap individual appliances as needed.

**FRs:** FR64-FR68 | **NFRs:** NFR15

| Story | Title | Size | Points | Type |
|-------|-------|------|--------|------|
| 8-1 | Stack Data Model & Library Integration | MEDIUM | 4 | User |
| 8-2 | Stacks Tab UI -- Browse & Preview | MEDIUM | 4 | User |
| 8-3 | Stack Canvas Placement & Post-Placement Editing | MEDIUM | 5 | User |
| 8-4 | E2E: Stack Browsing & Placement Flow | SMALL | 2 | Hardening |

**Total:** 4 stories, 15 points

---

## Epic 7: Data Context Items -- "Your data, scored against every component"

**User Outcome:** Define your actual data shapes on components and see fit indicators showing how well each variant handles your data.

**Analogy:** Shoe fitting -- same foot (your data), different shoes (component variants), the fit meter tells you which one works.

**FRs:** FR58-FR63, FR71-FR72 | **NFRs:** NFR13, NFR16

| Story | Title | Size | Points | Type |
|-------|-------|------|--------|------|
| 7-1 | Data Context Types, Schema & Fit Engine | MEDIUM | 5 | User |
| 7-2 | Data Context UI -- Inspector Integration & Fit Display | MEDIUM | 5 | User |
| 7-3 | YAML Data Context Export/Import Round-Trip | SMALL | 3 | User |
| 7-4 | E2E: Data Context & Fit Analysis Flow | SMALL | 2 | Hardening |

**Total:** 4 stories, 15 points

---

## Phase 2 Summary

| Epic | Stories | Points | Build Order |
|------|---------|--------|-------------|
| Epic 5: Priority Scoring | 5 (4 user + 1 hardening) | 18 | 1st |
| Epic 6: Constraint Guardrails | 5 (4 user + 1 hardening) | 19 | 2nd |
| Epic 8: Stack Browsing | 4 (3 user + 1 hardening) | 15 | 3rd |
| Epic 7: Data Context Items | 4 (3 user + 1 hardening) | 15 | 4th |
| **Total** | **18 stories** | **67 points** | |

### Cross-Epic Hardening Analysis

No additional cross-cutting hardening stories required:
- **Schema evolution:** All three schema extensions (weight_profile, constraints, data_context) are additive optional fields on v2. No migration conflicts.
- **Shared infrastructure:** Sanitization helper shared between Epic 6 and Epic 7 (addressed in first implementing story).
- **Performance accumulation:** Combined pipeline well within budget at MVP scale (20 nodes, 7 categories, 10 constraints, 10 data items).
- **Security surface:** All user inputs Zod-validated with sanitization built into individual stories.
- **Production logging:** Consistent across epics, enforced by hooks.

### Story File Index

All story files at `docs/sprint-artifacts/stories/`:

| File | Story | Epic |
|------|-------|------|
| epic5/5-1.md | Schema v2 Weight Profile Foundation | Epic 5 |
| epic5/5-2.md | Weighted Recalculation Pipeline | Epic 5 |
| epic5/5-3.md | Priority Slider UI | Epic 5 |
| epic5/5-4.md | YAML Weight Export/Import Round-Trip | Epic 5 |
| epic5/5-5.md | E2E: Priority Scoring Flow | Epic 5 |
| epic6/6-1.md | Constraint Schema & Types Foundation | Epic 6 |
| epic6/6-2.md | Constraint Evaluation Engine & Store | Epic 6 |
| epic6/6-3.md | Constraint Management UI & Canvas Indicators | Epic 6 |
| epic6/6-4.md | YAML Constraint Export/Import Round-Trip | Epic 6 |
| epic6/6-5.md | E2E: Constraint Guardrails Flow | Epic 6 |
| epic7/7-1.md | Data Context Types, Schema & Fit Engine | Epic 7 |
| epic7/7-2.md | Data Context UI & Fit Display | Epic 7 |
| epic7/7-3.md | YAML Data Context Export/Import Round-Trip | Epic 7 |
| epic7/7-4.md | E2E: Data Context & Fit Flow | Epic 7 |
| epic8/8-1.md | Stack Data Model & Library Integration | Epic 8 |
| epic8/8-2.md | Stacks Tab UI -- Browse & Preview | Epic 8 |
| epic8/8-3.md | Stack Canvas Placement & Editing | Epic 8 |
| epic8/8-4.md | E2E: Stack Browsing & Placement Flow | Epic 8 |
