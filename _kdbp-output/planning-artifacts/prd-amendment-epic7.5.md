# PRD Amendment — Epic 7.5: Weighted Pathway Guidance

**Date:** 2026-03-18
**Amends:** Phase 2 PRD (`_kdbp-output/planning-artifacts/prd.md`)
**New FRs:** FR73-FR79
**Origin:** V4 alignment drift identified 2026-03-07, resolved via Epic 7.5
**ADR:** `docs/decisions/ADR-pathway-guidance-engine.md`

---

## Context

Phase 2 PRD covers FR44-FR72 across Priority Scoring (Epic 5), Constraint Guardrails (Epic 6), Data Context & Fit (Epic 7), Stack Browsing (Epic 8), and Extended Import/Export. This amendment adds FR73-FR79 for Pathway Guidance — the feature that resolves the V4 ("Show the roads, not just the dot") alignment drift by turning passive tier gap descriptions into actionable, personalized component suggestions.

**Capability area:** Pathway Guidance (new)

---

## Functional Requirements

### Pathway Guidance

- **FR73 — Tier Gap Analysis Access:** Given a current architecture with a tier evaluation result, the system shall expose the computed tier gaps (requirements unmet for the next tier) as structured data available to the pathway engine — consuming the existing `evaluateTier()` output without duplicating the computation.

- **FR74 — Component Suggestion Engine:** Given tier gaps and the component library, the system shall produce a ranked list of candidate components that would close each gap. Candidates are concrete components from the library, not abstract descriptions. Components already on the canvas are excluded.

- **FR75 — Weight-Aware Ranking:** Candidate components shall be ranked using the active weight profile, computing a weighted score equivalent to the scoring algorithm used in the heatmap and dashboard. A user with scalability set to high sees scalability-strong components ranked first.

- **FR76 — Constraint-Aware Filtering:** Candidates whose default variant metrics would violate active constraints shall be flagged with a warning indicator and the constraint name. Flagged candidates remain visible (WARN mode, not BLOCK) but are visually distinguished from safe candidates.

- **FR77 — Data-Context-Aware Relevance:** When the architecture has active data context items, each candidate component shall be scored for data context fit using the existing fit evaluation logic. The fit level (great fit through risky) is surfaced alongside the weighted score. When no data context items exist, fit scoring is omitted.

- **FR78 — Pathway Guidance UI (Dashboard Overlay):** The ranked suggestion list shall be surfaced as a collapsible section in the Dashboard Overlay, following the same pattern as Priority Weights and Constraint Guardrails. Each suggestion card displays: component name, which gap it addresses, weighted score, constraint safety indicator, and data context fit level (when available). A badge on the collapsible trigger indicates the number of active suggestions.

- **FR79 — Pathway Guidance Discovery (Tier Badge Link):** The tier badge popover shall display a brief "N suggestions" link below the gap list when pathway suggestions exist. Clicking this link opens the Dashboard Overlay scrolled to the Pathway Guidance section, combining ambient discoverability with full detail.

---

## Non-Functional Requirements (Additions)

- **NFR20 — Pathway Engine Performance:** Given up to 30 candidate components and 6 tier gaps, the pathway engine shall produce ranked suggestions within 50ms, enabling synchronous computation via `useMemo` without perceptible delay.

---

## Notes

- Pathway suggestions are **re-derived** on every relevant state change (tier gaps, weights, constraints, data context). They are NOT persisted in YAML — the YAML skeleton does not need a pathway section.
- The pathway engine is a **pure function** — no store imports, no service imports, deterministic computation. Follows the pattern established by `tierEvaluator`, `constraintEvaluator`, and `fitEvaluator`.
- This amendment does not modify existing FRs. All Phase 2 FRs (FR44-FR72) remain unchanged.
