# ADR: Pathway Guidance Engine

**Status:** Accepted
**Date:** 2026-03-18
**Epic:** 7.5 — Weighted Pathway Guidance
**Context:** V4 drift resolution — "Show the roads, not just the dot"
**Deciders:** Gabe

---

## Context

The tier system (`tierEvaluator.ts`) computes `nextTierGaps: TierGap[]` — abstract descriptions of what's missing for the next tier (e.g., "Add 2 more components," "Improve Performance to 5+"). The `TierBadge` popover displays these as text bullets.

After Epics 5 (weights), 6 (constraints), and 7 (data context), three personalization layers exist. Pathway guidance connects them to produce actionable, personalized suggestions: which components to add, ranked by the user's priorities, filtered by their constraints, and scored against their data patterns.

### Existing Engine Landscape

| Engine | File | Responsibility |
|--------|------|---------------|
| `recalculator` + `propagator` | `src/engine/` | BFS metric propagation |
| `constraintEvaluator` | `src/engine/constraintEvaluator.ts` | Constraint violation detection |
| `fitEvaluator` | `src/engine/fitEvaluator.ts` | Data context fit scoring |
| `tierEvaluator` | `src/engine/tierEvaluator.ts` | Tier qualification + gap computation |
| `recommendationEngine` | `src/engine/recommendationEngine.ts` | Variant-level recommendations within a component |
| `dashboardCalculator` | `src/engine/dashboardCalculator.ts` | Category breakdowns, score colors |

The pathway engine is a NEW engine — it does NOT extend `tierEvaluator` or `recommendationEngine`. It consumes their outputs.

---

## Decisions

### Decision 1: UI Placement — A+B Hybrid (Badge Hint + Overlay Detail)

**Chosen:** Tier badge popover gets a brief "N suggestions" link. Clicking it opens `DashboardOverlay` scrolled to a new "Pathway Guidance" collapsible section. This combines ambient discoverability with full space for rich suggestion cards.

**Rejected:**
- A only (tier badge extension): too cramped for ranked lists with metadata
- B only (overlay only): not ambient — users must discover the third section
- C (canvas panel): competes with React Flow interactions, no precedent
- D (inspector idle): fundamental discoverability problem

**Consequences:**
- `TierBadge.tsx`: Add suggestion count + link that triggers overlay open
- `DashboardOverlay.tsx`: Add third `Collapsible` section for Pathway Guidance
- New component: `PathwayGuidancePanel.tsx` (content of the collapsible section)
- `DashboardPanel.tsx`: Wire the tier badge link to overlay open state
- No new panels, no canvas overlays, no z-index changes

**Source:** [05-pathway-guidance-options.md](../brainstorming/05-pathway-guidance-options.md)

### Decision 2: Pathway Engine — New Pure Function Module

**Chosen:** Create `src/engine/pathwayEngine.ts` as a new pure function module. It takes tier gaps, component library data, weight profile, constraints, and data context items as inputs. Returns ranked suggestions.

**Rejected:** Extending `tierEvaluator.ts` — bloats a focused module. Extending `recommendationEngine.ts` — different concern (variant-level vs. component-addition).

**Signature:**

```typescript
// src/engine/pathwayEngine.ts

export interface PathwaySuggestion {
  componentId: string
  componentName: string
  category: string
  gapClosed: string           // Which TierGap this addresses
  weightedScore: number       // Score using active WeightProfile
  isConstraintSafe: boolean   // Heuristic pre-filter result
  constraintWarning?: string  // Which constraint would be violated
  fitLevel?: FitLevel         // Data context fit (if data context items exist)
  fitExplanation?: string     // Brief fit reason
  reason: string              // Human-readable explanation
}

export function computePathwaySuggestions(
  gaps: TierGap[],
  tierRequirements: TierRequirement[],   // From next tier definition
  allComponents: Component[],
  existingNodeCategories: Set<string>,    // Categories already on canvas
  existingNodeComponentIds: Set<string>,  // Components already placed
  weightProfile: WeightProfile,
  constraints: Constraint[],
  dataContextItems: DataContextItem[],    // From selected/all nodes
  categoryScores: Map<string, number>,    // Current weighted scores
): PathwaySuggestion[]
```

**Pure function rules:**
- No store imports, no service imports, no side effects
- Deterministic: same inputs = same output
- No componentLibrary service calls inside — caller passes component data in

### Decision 3: Gap-to-Suggestion Mapping Algorithm

For each `TierGap`, the algorithm identifies candidate components:

**`required_categories` gap:** (e.g., "Add a Monitoring component")
- Fetch all components in the missing category from the passed component list
- Exclude components already on the canvas (`existingNodeComponentIds`)
- Score each candidate using its default variant's metrics × weight profile
- Result: ranked list of components in that category

**`min_distinct_categories` gap:** (e.g., "Use components from 2 more categories")
- Identify unrepresented categories (`allCategories - existingNodeCategories`)
- For each unrepresented category, find the best component (highest weighted score)
- Result: one suggestion per unrepresented category, ranked by weighted score

**`min_category_score` gap:** (e.g., "Improve Performance to 6+")
- Find all components in the deficient category
- For each, compute: how much would adding this component improve the category average?
- Improvement delta = (candidate score - current average) / (nodeCount + 1) — approximate
- Result: ranked by improvement delta

**`min_component_count` gap:** (e.g., "Add 2 more components")
- This is addressed indirectly by the other gap types — adding any component helps
- Show the top N suggestions from other gap types
- If no other gaps exist (only count is missing), suggest the component with the highest overall weighted score from any unrepresented category

**Deduplication:** If multiple gaps suggest the same component, keep the one with the best reason (most specific gap). Show "Also closes: [other gap]" as secondary text.

**Sorting:** Within each gap type, sort by `weightedScore` descending. Across gap types, interleave by priority: `required_categories` first (hard requirement), then `min_category_score` (score improvement), then `min_distinct_categories` (structural diversity), then `min_component_count` (generic).

### Decision 4: Constraint Safety — Heuristic Pre-Filter

**Chosen:** Simplified heuristic. For each candidate component, check if its default variant's metrics in constrained categories would violate any active constraint.

**How it works:**
1. For each active constraint: `{ categoryId, operator, threshold }`
2. Look up the candidate's default variant metrics in that category
3. If the metric violates the threshold → `isConstraintSafe: false`, set `constraintWarning`
4. This is a heuristic — the actual violation depends on BFS recalculation after placement

**Rejected:** Full simulation (clone architecture + add component + run BFS + evaluate constraints). Too expensive for a suggestion list. The heuristic is appropriate for Archie's directional nature — it shows "this might violate your cost constraint" as a warning, not a block.

**UI treatment:** Constraint-unsafe suggestions still appear but with a warning badge (WARN mode, consistent with Archie's connection rules).

### Decision 5: Data Context Relevance Scoring

**Chosen:** For each candidate suggestion, run the existing `evaluateFit()` function against the data context items from the architecture.

**How it works:**
1. Collect all `DataContextItem[]` from the architecture store (across all nodes)
2. For each candidate component, get its default variant's `dataFitProfile`
3. If `dataFitProfile` exists: run `evaluateFit(item, dataFitProfile)` for each data context item
4. Aggregate: take the worst fit level as the component's `fitLevel`
5. If no data context items exist on the architecture: `fitLevel` is `undefined` (omit from card)

**Sorting integration:** `fitLevel` is a secondary sort key — primary is `weightedScore`. Within the same weighted score band (delta < 0.5), prefer better fit. This avoids a poor-fit component with a high weighted score being buried.

---

## Data Flow

```
                                    ┌─────────────────┐
                                    │ componentLibrary │
                                    │ .getAllComponents │
                                    └────────┬────────┘
                                             │
┌──────────────────┐                         │
│ architectureStore│                         │
│  .currentTier    │─── nextTierGaps ──┐     │
│  .weightProfile  │─── weights ───────┤     │
│  .constraints    │─── constraints ───┤     │
│  .dataContextItems── dataContext ────┤     │
│  .nodes          │─── categories ────┤     │
│  .computedMetrics│─── scores ────────┤     │
└──────────────────┘                   │     │
                                       ▼     ▼
                            ┌──────────────────────┐
                            │   pathwayEngine       │
                            │ .computePathway       │
                            │  Suggestions()        │
                            └──────────┬───────────┘
                                       │
                                       ▼
                            PathwaySuggestion[]
                                       │
                      ┌────────────────┼───────────────────┐
                      ▼                                    ▼
              ┌──────────────┐                    ┌──────────────────┐
              │  TierBadge   │                    │ DashboardOverlay │
              │  "N suggest" │──── opens ────────▶│  Pathway section │
              │  link        │                    │  (suggestion     │
              └──────────────┘                    │   cards)         │
                                                  └──────────────────┘
```

**Computation trigger:** Via `useMemo` in a custom hook (`usePathwaySuggestions`). Recomputes when tier gaps, weight profile, constraints, or data context items change. No new store state — derived data only.

**Performance:** Component library has ~20-30 components. `computePathwaySuggestions` iterates candidates per gap × 7 categories. Upper bound: ~200 operations, well under 1ms. Standard `useMemo` is sufficient; no debounce or worker needed.

---

## Integration Points

| Existing Module | Change Type | What Changes |
|-----------------|-------------|-------------|
| `TierBadge.tsx` | MODIFY | Add suggestion count + link to open overlay |
| `DashboardOverlay.tsx` | MODIFY | Add third Collapsible section |
| `DashboardPanel.tsx` | MODIFY | Wire tier badge link to overlay open state |
| `pathwayEngine.ts` | CREATE | New pure function module |
| `PathwayGuidancePanel.tsx` | CREATE | Dashboard overlay section content |
| `usePathwaySuggestions.ts` | CREATE | Custom hook (useMemo over pathwayEngine) |

No changes to: `architectureStore.ts`, `tierEvaluator.ts`, `recalculator.ts`, `constraintEvaluator.ts`, `fitEvaluator.ts`, `recommendationEngine.ts`.

---

## Scope Boundaries

This ADR specifies data contracts and integration points. It does NOT specify:
- Suggestion card visual design (story 7.5-3)
- Test file layouts (stories 7.5-1, 7.5-2)
- YAML persistence of suggestions (suggestions are re-derived, not stored)
- Toolbox interaction on suggestion click (future enhancement)
