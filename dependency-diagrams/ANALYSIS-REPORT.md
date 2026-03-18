# Archie Dependency Analysis Report

**Generated:** 2026-03-15 | **Branch:** feature/epic7

## Summary

| Metric | Value |
|--------|-------|
| Total modules | 114 |
| Total edges | 365 |
| Circular dependencies | 0 |
| Orphaned modules | 1 |
| Layer violations | 23 |
| Entry points | 5 |
| Cross-feature imports | 0 |

## Output Files

| File | Path |
|------|------|
| SVG graph | `dependency-diagrams/dependency-graph.svg` |
| DOT source | `dependency-diagrams/dependency-graph.dot` |
| HTML report | `dependency-diagrams/dependency-graph.html` |
| JSON data | `dependency-diagrams/dependency-graph.json` |

## Top 15 Fan-Out (Most Dependencies)

| Module | Outgoing |
|--------|----------|
| src/types/index.ts | 17 |
| src/components/inspector/ComponentDetail.tsx | 14 |
| src/components/layout/AppLayout.tsx | 14 |
| src/components/dashboard/DashboardOverlay.tsx | 12 |
| src/components/inspector/index.ts | 12 |
| src/components/canvas/CanvasView.tsx | 11 |
| src/components/dashboard/DashboardPanel.tsx | 11 |
| src/components/toolbox/BlueprintTab.tsx | 9 |
| src/stores/architectureStore.ts | 9 |
| src/components/layout/Toolbar.tsx | 8 |
| src/services/componentLibrary.ts | 8 |
| src/services/stackPlacement.ts | 8 |
| src/stores/architectureStoreHelpers.ts | 8 |
| src/components/dashboard/ConstraintPanel.tsx | 7 |
| src/components/inspector/InspectorPanel.tsx | 7 |

## Top 15 Fan-In (Most Depended On)

| Module | Incoming |
|--------|----------|
| src/lib/constants.ts | 50 |
| src/stores/architectureStore.ts | 24 |
| src/stores/uiStore.ts | 16 |
| src/components/ui/button.tsx | 14 |
| src/lib/utils.ts | 14 |
| src/services/componentLibrary.ts | 12 |
| src/schemas/componentSchema.ts | 9 |
| src/hooks/useLibrary.ts | 8 |
| src/lib/categoryIcons.ts | 8 |
| src/engine/dashboardCalculator.ts | 8 |
| src/lib/sanitize.ts | 7 |
| src/schemas/stackSchema.ts | 7 |
| src/components/ui/scroll-area.tsx | 6 |
| src/types/index.ts | 6 |
| src/schemas/metricCategorySchema.ts | 5 |

## Circular Dependencies

**None.** The codebase has zero circular dependencies.

## Layer Violations (23)

Layer order (high to low): pages > components > hooks > stores/services > engine > schemas > lib > types

| Direction | Count | Examples |
|-----------|-------|---------|
| types -> engine | 8 | types/index.ts -> engine/compatibilityChecker.ts, engine/constraintEvaluator.ts, engine/dashboardCalculator.ts |
| types -> schemas | 6 | types/index.ts -> schemas/architectureFileSchema.ts, schemas/blueprintSchema.ts, schemas/componentSchema.ts |
| services -> stores | 3 | services/stackPlacement.ts -> stores/architectureStore.ts, services/yamlExporter.ts -> stores/architectureStore.ts |
| types -> lib | 3 | types/index.ts -> lib/constants.ts, lib/tierDefinitions.ts |
| lib -> schemas | 1 | lib/componentUtils.ts -> schemas/componentSchema.ts |
| types -> services | 1 | types/index.ts -> services/recalculationService.ts |
| types -> stores | 1 | types/index.ts -> stores/architectureStore.ts |

### Violation Analysis

**types/index.ts (17 of 23 violations):** This is the barrel re-export file. It imports from engine, schemas, lib, services, and stores purely to re-export types. This is by design: the barrel file aggregates type exports for consumer convenience. These are `type` imports only (no runtime code), so they create no actual coupling risk. **Not actionable — intentional pattern.**

**services -> stores (3 violations):** `stackPlacement.ts`, `yamlExporter.ts`, and `yamlImporter.ts` import from `architectureStore.ts`. These import the store's type exports (`ArchieNode`, `ArchieEdge`, `ArchieEdgeData`), not the store hook itself. yamlExporter also imports `getArchitectureSkeleton` (a pure function). **Low risk — type imports across service/store boundary.**

**lib -> schemas (1 violation):** `componentUtils.ts` imports from `componentSchema.ts` for the `Component` type. **Low risk — single type import.**

## Entry Points

| Module | Status |
|--------|--------|
| src/main.tsx | Expected (app entry) |
| src/components/inspector/index.ts | Expected (barrel export) |
| src/components/ui/card.tsx | Verify usage (UI component) |
| src/engine/fitEvaluator.ts | Expected (new in 7-1, not yet consumed) |
| src/types/scoreAlignment.ts | Verify usage |

**fitEvaluator.ts** appears as an entry point because it was just created in Story 7-1 and has no consumers yet. Story 7-2 (UI) will import it. **Expected — will resolve naturally.**

## Orphaned Modules (1)

| Module | Notes |
|--------|-------|
| src/declarations.d.ts | TypeScript ambient declarations — not a dependency target. Expected. |

## Cross-Layer Dependency Matrix

| FROM / TO | components | engine | hooks | lib | schemas | services | stores | types |
|-----------|-----------|--------|-------|-----|---------|----------|--------|-------|
| components | 105 | 6 | 13 | 56 | 6 | 11 | 35 | 6 |
| engine | 0 | 2 | 0 | 10 | 3 | 0 | 0 | 0 |
| hooks | 0 | 1 | 0 | 3 | 0 | 2 | 2 | 0 |
| lib | 0 | 0 | 0 | 5 | 1 | 0 | 0 | 0 |
| schemas | 0 | 0 | 0 | 3 | 2 | 0 | 0 | 0 |
| services | 0 | 5 | 0 | 7 | 9 | 3 | 3 | 0 |
| stores | 0 | 7 | 0 | 7 | 0 | 2 | 2 | 0 |
| types | 0 | 8 | 0 | 3 | 6 | 1 | 1 | 0 |

**Key observation:** Components layer has 105 intra-layer edges (components importing other components). This is expected for a React app with composed UI.

## Architectural Observations

### God Modules
- **constants.ts (50 fan-in):** Central constants/types hub. Expected for a project that co-locates types with constants. No runtime coupling risk since consumers import named exports.
- **architectureStore.ts (24 fan-in):** Primary state store. Expected — most UI components subscribe to architecture state.
- **uiStore.ts (16 fan-in):** UI state store. Healthy separation from architecture state.

### Coupling Hotspots
- **ComponentDetail.tsx (14 fan-out):** Largest component by dependency count. Renders code snippets, metric explanations, recommendations, variant selector — touches many domains. Monitor for growth; may benefit from extraction if it continues to accumulate dependencies.
- **AppLayout.tsx (14 fan-out):** Composes all major regions (toolbar, toolbox, canvas, inspector, dashboard). Expected for a layout root.

### Layer Discipline
- **Engine layer is clean:** 0 incoming from components/hooks/stores directly (they go through services or store). Engine only imports from lib and schemas. No store or React imports.
- **Schema layer is clean:** Only imports from lib. No upward dependencies.
- **Stores import from engine (7 edges):** architectureStore and architectureStoreHelpers import engine functions for recalculation/tier/constraint evaluation. This is the intended service-layer pattern (store orchestrates engine pure functions).

### Store Extraction Health (Story 7-1 Phase 0)
- architectureStore.ts: 9 fan-out (down from pre-extraction)
- architectureStoreHelpers.ts: 8 fan-out
- No circular dependency between them
- Helpers file imports from engine/lib only — clean separation

### New fitEvaluator Module
- 0 fan-in (expected — no consumers yet until Story 7-2)
- 0 fan-out to stores/components (pure function — AC-ARCH-NO-2 verified)
- Only imports from lib/constants (types)

## Recommendations

1. **No action needed on circular dependencies** — zero found.
2. **types/index.ts violations are intentional** — barrel file re-exports. No structural change needed.
3. **Monitor ComponentDetail.tsx** — at 14 dependencies, approaching complexity threshold. If it grows past 16-18, consider extracting tab-specific content into subcomponents.
4. **card.tsx entry point** — verify it's used in templates/stories. If unused, consider removing.
5. **scoreAlignment.ts entry point** — verify it's consumed. If it's a utility type file that nothing imports, it may be dead code.
6. **fitEvaluator.ts** will gain consumers in Story 7-2. Expected to move from "entry point" to normal module.
