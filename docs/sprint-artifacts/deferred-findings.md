# Deferred Findings Backlog

> Items identified during code review but deferred beyond the current epic.
> Grouped by product stage. Review during epic planning for future epics.

## PROD Backlog

### [PROD] Repository integration test for schema-triggered silent drop

- **Source:** TD-8-1a review (2026-03-12)
- **Finding:** No repository test confirms that a structurally plausible but schema-invalid document (e.g., 201-char `componentId`) triggers the silent-drop path in `stackRepository.getAll()`. Current tests only use missing-field rejection. A test passing a document with a 201-char `componentId` and confirming it is silently filtered would close the loop between the new schema constraints and the drop behavior.
- **Files:** `tests/unit/repositories/stackRepository.test.ts`
- **Stage:** PROD — integration coverage for defense-in-depth validation; not blocking functionality
- **Estimated effort:** Small (1 test case addition)

### [PROD] StacksErrorBoundary export is implementation detail leak

- **Source:** 8-2 review (2026-03-12)
- **Finding:** `StacksErrorBoundary` is exported from `StacksTab.tsx` but only consumed by the unit test (direct import for error boundary testing). This exposes an implementation detail. Consider keeping it unexported and testing error state via `StacksTab` directly, or accepting the export as a deliberate test seam.
- **Files:** `src/components/toolbox/StacksTab.tsx`
- **Stage:** PROD — code hygiene, not functional
- **Estimated effort:** Small (1-line change + test refactor)

### [PROD] useLibrary hook has no reactive subscription for initialization state

- **Source:** 8-2 review (2026-03-12)
- **Finding:** `useLibrary()` reads `componentLibrary.isInitialized()` synchronously — a plain boolean return, not a reactive subscription. If library initialization completes asynchronously after first render, nothing triggers a re-render, and StacksTab/ComponentTab/BlueprintTab may show a perpetual loading skeleton. Pre-existing pattern (not introduced by 8-2) but propagated. Confirm whether the parent component or initialization flow forces a re-render after `componentLibrary.initialize()` completes.
- **Files:** `src/hooks/useLibrary.ts`, all tabs consuming `useLibrary`
- **Stage:** PROD — correctness risk in async initialization path
- **Estimated effort:** Medium (may require adding an event emitter or state sync to componentLibrary)

### [PROD] Accessibility (a11y) warnings from aislop scan

- **Source:** TD-cross-2 review (2026-03-17)
- **Finding:** First aislop scan identified 5 a11y warnings. These require UX review for correct ARIA patterns — not mechanical fixes. Needs a dedicated a11y story with design input.
- **Files:** Multiple UI components (exact files in aislop scan output)
- **Stage:** PROD — accessibility is required for production readiness, not feature-blocking
- **Estimated effort:** Medium (5 issues, requires UX/design review for correct ARIA roles)

### [PROD] Duplicated drag-to-canvas helper bodies

- **Source:** 8-4 review (2026-03-13)
- **Finding:** `dragStackToCanvas` and `dragComponentToCanvas` share ~30 identical lines of `page.evaluate` body — only the MIME type (`application/archie-stack` vs `application/archie-component`) and variable name differ. Extract a shared `dispatchDragToCanvas(page, mimeType, payload, x, y)` primitive and have both functions delegate to it.
- **Files:** `tests/e2e/helpers/canvas-helpers.ts`
- **Stage:** PROD — DRY/maintainability, not blocking functionality
- **Estimated effort:** Small (extract shared function, update two callers)

### [PROD] MIME type check uses reject-list instead of accept-list

- **Source:** 7-3 review (2026-03-17)
- **Finding:** `importYaml()` uses a reject-list (`REJECTED_MIME_PREFIXES`) for MIME type validation. Files with MIME types like `application/x-executable` or `text/html` pass if extension is `.yaml`. Converting to an accept-list (e.g., `text/yaml`, `text/plain`, empty string) would close a defense-in-depth gap in the drag-and-drop import path. Extension check and Zod schema validation provide existing safety layers.
- **Files:** `src/services/yamlImporter.ts`
- **Stage:** PROD — defense-in-depth enhancement, not feature-blocking. Existing layers prevent exploitation.
- **Estimated effort:** Small (add accept-list alongside reject-list, test browser MIME behaviors)

### [PROD] Duplicated export-then-import preamble in data context round-trip tests

- **Source:** TD-7-3a review (2026-03-17)
- **Finding:** The affirmative AC-6 tests duplicate a 10-line export-then-import preamble (build Map, exportArchitecture, importYamlString, assert success, extract items) verbatim across both test cases. Pre-existing pattern in the file — other describe blocks inline the same setup too. A shared `beforeEach` with `let importedItems` within the new describe block would eliminate the duplication.
- **Files:** `tests/integration/yaml-dataContext-roundtrip.test.ts`
- **Stage:** PROD — DRY/maintainability, not functional
- **Estimated effort:** Small (extract shared setup within describe block)

### [PROD] Two-Map pattern in checkConstraintSafety could be single-pass

- **Source:** 7.5-1 review (2026-03-18)
- **Finding:** `checkConstraintSafety` in `pathwayEngine.ts` allocates both `categoryCounts` and `categoryAvgs` Maps when a single-pass approach (computing averages inline) would suffice. The sibling function `computeCandidateWeightedScore` uses a single Map. Minor DRY/consistency cleanup, no correctness impact.
- **Files:** `src/engine/pathwayEngine.ts`
- **Stage:** PROD — code hygiene, not functional
- **Estimated effort:** Small (refactor two Maps into one, ~10 lines)

### [PROD] Triple usePathwaySuggestions hook invocation — redundant engine recomputation

- **Source:** 7.5-3 review (2026-03-18)
- **Finding:** `usePathwaySuggestions` is called independently in TierBadge, DashboardOverlay, and PathwayGuidancePanel. Each call runs `computePathwaySuggestions` (non-trivial engine call) inside `useMemo`. DashboardOverlay and PathwayGuidancePanel always mount together, causing redundant recomputation. Fix: call hook once in DashboardPanel and pass count/suggestions as props, or lift to a shared context.
- **Files:** `src/components/dashboard/TierBadge.tsx`, `src/components/dashboard/DashboardOverlay.tsx`, `src/components/dashboard/PathwayGuidancePanel.tsx`
- **Stage:** PROD — performance optimization, not feature-blocking. useMemo prevents expensive re-renders but three independent memos still triple the work on dependency changes.
- **Estimated effort:** Medium (multi-file prop threading or context extraction)

### [PROD] AC-4 max-tier E2E test may perpetually skip due to blueprint recalc no-op

- **Source:** 7.5-4 review (2026-03-18)
- **Finding:** `triggerRecalcViaConfigChange(page, 0)` on a blueprint-loaded canvas may silently no-op if the first node has no unchecked config options. This causes `computedMetrics` to remain empty, tier evaluation to not trigger, and the AC-4 max-tier test to always hit `test.skip`. The test technically passes (skips) but never validates the max-tier empty state in practice.
- **Files:** `tests/e2e/pathway-guidance.spec.ts`
- **Stage:** PROD — test reliability in CI environments; feature itself works correctly
- **Estimated effort:** Medium (need alternative recalc trigger for blueprint-loaded architectures, or fixture with pre-computed metrics)

### [PROD] AggregateScore color-sync duplication with getScoreColor

- **Source:** 9-0 review (2026-03-20)
- **Finding:** `SCORE_TEXT_COLORS` in `AggregateScore.tsx` duplicates the three Tailwind class strings (`bg-green-500`, `bg-yellow-500`, `bg-red-500`) alongside threshold comparisons that mirror `getScoreColor()`. The "Must stay in sync with getScoreColor()" comment acknowledges drift risk but does not eliminate it. Consolidating by deriving colors from `getScoreColor()` or a shared color map would close the SSoT gap.
- **Files:** `src/components/dashboard/AggregateScore.tsx`
- **Stage:** PROD — SSoT/maintainability, not feature-blocking. Colors are correct today.
- **Estimated effort:** Small (derive from getScoreColor or shared color map, ~10 lines)

### [PROD] Split import style in architectureStore (types direct, functions barrel)

- **Source:** 9-0 review (2026-03-20)
- **Finding:** Story 9-0 broke the type re-export chain by importing types directly from source modules (constraintEvaluator, recalculator, etc.) but left function imports going through the `architectureStoreHelpers` barrel. The split style (direct for types, barrel for functions) is inconsistent and could confuse future readers. Low priority — functions are defined in helpers, not re-exported from elsewhere.
- **Files:** `src/stores/architectureStore.ts`, `src/stores/architectureStoreHelpers.ts`
- **Stage:** PROD — code hygiene/consistency, not functional
- **Estimated effort:** Small (move function imports to direct or document the pattern)

### [PROD] Demand Zod schemas not barrel-exported

- **Source:** 9-1 review (2026-03-24)
- **Finding:** `DemandResponseSchema`, `DemandProfileSchema`, `ScenarioPresetSchema`, `ScenarioPresetYamlSchema` are not re-exported from any barrel file. `src/types/index.ts` only re-exports TypeScript types, not Zod schemas. Consumers (story 9-2+) must import directly from `@/schemas/demandSchema`. Consistent with other schema files but breaks the barrel pattern for types.
- **Files:** `src/schemas/demandSchema.ts`, `src/types/index.ts`
- **Stage:** PROD — API consistency, not feature-blocking
- **Estimated effort:** Small (add schema barrel or document the direct-import convention)

### [PROD] Scenario ID max length uses generic MAX_SCHEMA_STRING_LENGTH (256)

- **Source:** 9-1 review (2026-03-24)
- **Finding:** `ScenarioPresetSchema.id` field uses `MAX_SCHEMA_STRING_LENGTH` (256 chars) instead of a tighter constant. Scenario IDs are 10-20 chars in practice. A dedicated `SCENARIO_ID_MAX_LENGTH` (e.g., 64) would make the intent explicit and prevent unreasonably long IDs from passing validation.
- **Files:** `src/schemas/demandSchema.ts`, `src/lib/constants.ts`
- **Stage:** PROD — defense-in-depth tightening, not feature-blocking
- **Estimated effort:** Small (add constant, update schema, add boundary test)

### ~~[PROD] AC-2 default-1.0 behavior untested in engine~~ RESOLVED

- **Source:** 9-2 review (2026-03-26)
- **Resolved:** 9-3 review (2026-03-26) — test "defaults missing modifier to 1.0 (AC-2)" in `demandEngine.test.ts` confirms 1.0 default behavior

### [PROD] DemandResponseSchema accepts any string as metric key

- **Source:** 9-2 review (2026-03-26)
- **Finding:** `DemandResponseSchema` validates demand variable names against an allowlist and levels against per-variable valid levels, but the metric key in multiplier maps (`z.record(z.string(), MultiplierSchema)`) accepts any string. A typo like `read-latencyy` silently passes validation and produces a multiplier that never matches any component metric. This is inherited from story 9-1. Fixing requires cross-referencing metric keys against per-component declared metrics, which is architecturally complex (schema doesn't know about components).
- **Files:** `src/schemas/demandSchema.ts`
- **Stage:** PROD — input hardening beyond basic validation; feature works without it (wrong keys have no effect, default 1.0)
- **Estimated effort:** Medium (schema redesign to validate metric keys, or a post-validation lint step)

### [PROD] No test for metric key typos in YAML demand_responses data

- **Source:** 9-2 review (2026-03-26)
- **Finding:** No smoke test asserts that all metric keys in each component's `demand_responses` section are a subset of that component's declared base metric IDs. A future data authoring error (e.g., adding `throughput` instead of `write-throughput`) would silently pass schema validation. A cross-referencing test would catch this at CI time.
- **Files:** `tests/unit/schemas/componentSchema.test.ts`, `src/data/components/*.yaml`
- **Stage:** PROD — data integrity guard for CI; feature works without it
- **Estimated effort:** Small (1 test case iterating components, checking metric key membership)

### [PROD] DEMAND_MULTIPLIER_MIN/MAX constants unused by demand engine

- **Source:** 9-3 review (2026-03-26)
- **Finding:** `DEMAND_MULTIPLIER_MIN` (0.1) and `DEMAND_MULTIPLIER_MAX` (1.0) in constants.ts are declared but unused by `demandEngine.ts`. The engine clamps to `DEMAND_METRIC_FLOOR`/`CEILING` (1-10), not multiplier bounds. These constants belong to the schema/validation layer (used by `demandSchema.ts` for input validation). The naming suggests engine-level clamping that doesn't happen, which is misleading.
- **Files:** `src/lib/constants.ts`, `src/engine/demandEngine.ts`
- **Stage:** PROD — naming clarity for developer comprehension; no functional impact
- **Estimated effort:** Small (rename to `DEMAND_SCHEMA_MULTIPLIER_MIN/MAX` or add clarifying comment)

### [PROD] Double-undefined ambiguity in computeDemandAdjustedMetrics Map parameter

- **Source:** 9-3 review (2026-03-26)
- **Finding:** `nodeDemandResponses: Map<string, DemandResponse | undefined>` means `undefined` from a missing key (`.get()` on absent key) and `undefined` as an explicit "no demand data" value are indistinguishable. Using `Map<string, DemandResponse>` and relying on `.get()` returning `undefined` for absent keys would be cleaner. No behavioral difference today.
- **Files:** `src/engine/demandEngine.ts`
- **Stage:** PROD — API hygiene, not functional
- **Estimated effort:** Small (remove `| undefined` from Map value type, update callers)

### [PROD] Megamonolithic E2E test — AC-1/2/3/4 in single test block (230+ lines)

- **Source:** 9-5 review (2026-03-27)
- **Finding:** The demand simulation E2E spec packs AC-1, AC-2, AC-3, and AC-4 into a single `test()` block (~230 lines). If any early AC fails, subsequent ACs never execute, making failure triage harder. Splitting into separate tests per AC (or at least AC-1/2 + AC-3/4) would improve isolation and diagnostics. The pathway-guidance.spec.ts reference pattern uses separate tests.
- **Files:** `tests/e2e/demand-simulation.spec.ts`
- **Stage:** PROD — test reliability/maintainability, not feature-blocking
- **Estimated effort:** Medium (requires extracting shared setup into beforeEach, splitting assertions)

### [PROD] ArchieNode directly calls componentLibrary.getComponent() in render path

- **Source:** 10-1 review (2026-03-27)
- **Finding:** `ArchieNode.tsx` calls `componentLibrary.getComponent(data.archieComponentId)` inside a `useMemo` to resolve the variant name. This couples the render component directly to the service layer. Same pattern as TD-4-3b (ArchieEdge). Consolidating variant name resolution into a store selector or a `getVariantName()` helper on componentLibrary would decouple render from service.
- **Files:** `src/components/canvas/ArchieNode.tsx`
- **Stage:** PROD — coupling concern, not feature-blocking. componentLibrary is a synchronous cached singleton.
- **Estimated effort:** Small (extract helper or derived selector)

### [PROD] Document color source invariant on METRIC_CATEGORIES

- **Source:** 10-1 review (2026-03-27)
- **Finding:** `InlineMetricBar` and `useTopMetrics` inject `color` values from `METRIC_CATEGORIES` (static constants) directly into `style={{ backgroundColor: color }}`. Safe today because colors are CSS variables (`var(--color-metric-*)`), not user-controlled. If `METRIC_CATEGORIES` ever gains a YAML/DB source, colors must be validated against an allowlist. A single-line invariant comment would protect future maintainers.
- **Files:** `src/hooks/useTopMetrics.ts`, `src/components/canvas/InlineMetricBar.tsx`
- **Stage:** PROD — defense-in-depth documentation, not feature-blocking
- **Estimated effort:** Small (add invariant comment at CATEGORY_LOOKUP definition)

### [PROD] Unconditional useConnectionHealth hook in ArchieEdge

- **Source:** 9-6 review (2026-03-27)
- **Finding:** `useConnectionHealth(source, target)` is called unconditionally in ArchieEdge but its result is only used when `heatmapEnabled && animationsEnabled`. This runs store subscriptions and useMemo on every edge render regardless of particle visibility. At 20 edges, this means 20 unnecessary subscriptions. Extract to a conditional child component (`EdgeParticlesLayer`) that only mounts when particles are visible.
- **Files:** `src/components/canvas/ArchieEdge.tsx`
- **Stage:** PROD — performance optimization, not feature-blocking. useMemo prevents expensive recomputation but subscription overhead remains.
- **Estimated effort:** Medium (extract child component, move hook + EdgeParticles render into it)

### [PROD] DEFAULT_SCORE inflates health for uncomputed nodes

- **Source:** 9-6 review (2026-03-27)
- **Finding:** `useConnectionHealth` uses `CONNECTION_DEFAULT_HEALTH_SCORE` (5.0) as fallback when a node has no computed metrics. A node that is genuinely bottlenecking but hasn't had metrics computed yet shows medium density rather than low. Consider returning a `dataReady: boolean` flag so the caller can suppress particles entirely when metrics are absent.
- **Files:** `src/hooks/useConnectionHealth.ts`
- **Stage:** PROD — directional accuracy concern, not feature-breaking. Default is reasonable for MVP.
- **Estimated effort:** Small (add flag, update ArchieEdge guard condition)

### [PROD] Health status divergence between edge heatmap and particle color

- **Source:** 9-6 review (2026-03-27)
- **Finding:** `edgeHeatmapStatus` (from heatmap engine per-edge) and `healthStatus` (from useConnectionHealth averaging source+target node overallScore) can diverge. The edge stroke color comes from the heatmap engine; particle color comes from the hook. If heatmap says "warning" but node average says "healthy," particle color disagrees with edge color. Document the intentional divergence or unify the source of truth.
- **Files:** `src/components/canvas/ArchieEdge.tsx`, `src/hooks/useConnectionHealth.ts`
- **Stage:** PROD — visual consistency concern, not feature-breaking. Both values are directionally correct.
- **Estimated effort:** Medium (unify requires refactoring heatmap engine to expose per-edge health, or hook to consume heatmap status)

### [PROD] Per-frame getPointAtLength DOM calls — AC-6 frame budget risk

- **Source:** 9-6 review (2026-03-27)
- **Finding:** `EdgeParticles` calls `path.getPointAtLength()` for every particle on every animation frame. At max density (12 particles x 20 edges = 240 calls/frame at 60fps), this is the primary risk to the AC-6 <16ms frame budget. `getPointAtLength` is a synchronous layout-triggering SVG DOM call. Pre-computing waypoints as a `Float32Array` at effect setup time and interpolating in `animate` would eliminate all per-frame DOM calls.
- **Files:** `src/components/canvas/EdgeParticles.tsx`
- **Stage:** PROD — performance optimization for AC-6 compliance under load. Works correctly at current scale.
- **Estimated effort:** Medium (pre-compute path waypoints array at fixed intervals, lerp in RAF loop)

### [PROD] No pipeline Level 4 sequencing integration test

- **Source:** 9-7 review (2026-03-27)
- **Finding:** `recalculationService.run()` applies failure modifiers at Level 4 (after demand at Level 3), but no integration test verifies the pipeline ordering with both demand and failure active simultaneously. Unit tests cover `applyFailureModifiers` in isolation; the pipeline wiring in recalculationService is tested only via E2E.
- **Files:** `tests/unit/services/recalculationService.test.ts` (new or extend)
- **Stage:** PROD — test coverage for pipeline integration; feature works correctly
- **Estimated effort:** Medium (requires mocking componentLibrary + propagator for integration test)

### [PROD] No FailureSelector component tests

- **Source:** 9-7 review (2026-03-27)
- **Finding:** `FailureSelector.tsx` has no unit/component tests. AC-2 (dropdown render, "No Failure" default, 6 presets visible, disabled when no nodes) is covered only by E2E. A component test with React Testing Library would catch regressions faster.
- **Files:** `tests/unit/components/canvas/FailureSelector.test.tsx` (new)
- **Stage:** PROD — component test coverage, not feature-blocking
- **Estimated effort:** Medium (requires mocking store + failureLoader for component render tests)

### [PROD] No performance benchmark test for combined demand + failure computation

- **Source:** 9-7 review (2026-03-27)
- **Finding:** AC-5 specifies 15 components with both demand and failure scenarios active completing within 20ms. No benchmark or perf-marked test enforces this budget. A vitest bench entry or `performance.now()` guard would catch regressions.
- **Files:** `tests/unit/engine/demandEngine-failure.test.ts` or `tests/bench/` (new)
- **Stage:** PROD — performance enforcement, not feature-blocking. Current implementation is synchronous and fast.
- **Estimated effort:** Small (add performance.now() timing test with 15 mock components)

## SCALE Backlog

### [SCALE] Extract shared blueprint-load-and-add-data-item helper for E2E specs

- **Source:** 7-4 review (2026-03-17)
- **Finding:** AC-1 and AC-2 in `data-context.spec.ts` perform identical setup sequences: goto → waitForBlueprints → blueprint-load → selectNode → navigateToDataSection → addDataContextItem with the same arguments. Extracting a `loadBlueprintAndAddDataItem` helper into `canvas-helpers.ts` would reduce maintenance surface and make divergence points obvious. Currently 2 callers.
- **Files:** `tests/e2e/data-context.spec.ts`, `tests/e2e/helpers/canvas-helpers.ts`
- **Stage:** SCALE — DRY improvement for test infrastructure; no functional impact
- **Estimated effort:** Small (extract helper, update 2 callers)

### [SCALE] YAML shape validation in E2E round-trip assertion

- **Source:** 7-4 review (2026-03-17)
- **Finding:** AC-4 round-trip test casts `load(rawYaml)` to `Record<string, unknown>` and accesses `nodes` via a second cast. A Zod partial check or manual shape guard would produce more informative assertion failure messages ("nodes is undefined" vs a clear shape description). Low priority for test files.
- **Files:** `tests/e2e/data-context.spec.ts`
- **Stage:** SCALE — developer experience improvement for test diagnostics; no correctness impact
- **Estimated effort:** Small (add 5-line shape guard or Zod partial parse)

### [SCALE] Flat DemandLevel union is a leaky type-level abstraction

- **Source:** 9-1 review (2026-03-24)
- **Finding:** `DemandLevel` is a flat union of all 10 level strings across 3 variable-specific scales. TypeScript allows `DemandProfile` to assign any level to any variable (e.g., `"traffic-volume": "single-region"`) — only the Zod `superRefine` catches this at runtime. A discriminated union or per-variable level types would close the gap at the type level, but adds significant complexity for 5 variables. Acceptable trade-off for MVP; revisit if demand variables expand.
- **Files:** `src/lib/constants.ts`, `src/lib/demandTypes.ts`
- **Stage:** SCALE — type-level precision improvement, not feature-blocking. Runtime validation is correct.
- **Estimated effort:** Medium (per-variable level types, schema refactor, test updates)

### [SCALE] Extract shared clamp utility from engine files

- **Source:** 9-3 review (2026-03-26)
- **Finding:** `demandEngine.ts` defines a private `clamp(value, min, max)` helper. If similar helpers exist in other engine files (pathwayEngine, recalculator), extracting to a shared `src/lib/mathUtils.ts` would reduce duplication. Currently only one caller.
- **Files:** `src/engine/demandEngine.ts`, potentially `src/engine/pathwayEngine.ts`
- **Stage:** SCALE — future DRY concern; only one caller today
- **Estimated effort:** Small (extract function, update imports)

### [SCALE] Particle speed is path-length-relative — visual speed varies with edge length

- **Source:** 9-6 review (2026-03-27)
- **Finding:** `PARTICLE_SPEED = 0.3` is a fraction of path length per second. A 100px edge and a 500px edge show the same fractional travel per second, meaning particles appear 5x slower on the longer edge. If consistent perceived speed is desired, normalize by `totalLength` (e.g., `elapsed * PARTICLE_SPEED / totalLength * referenceLength`). If the current behavior is intentional (short connections = fast, long = slow), document the design choice.
- **Files:** `src/components/canvas/EdgeParticles.tsx`, `src/lib/constants.ts`
- **Stage:** SCALE — visual polish, not feature-blocking. Current behavior is directionally correct.
- **Estimated effort:** Small (normalize speed calculation or add design rationale comment)

### [SCALE] FailureSelector dropdown order driven by alphabet, not severity progression

- **Source:** 9-7 review (2026-03-27)
- **Finding:** `failureLoader.ts` sorts presets alphabetically by name. The natural educational progression (Single Node → Network Partition → Database → Traffic Spike → Region Outage → Data Corruption) is lost. A `sortOrder` field in the YAML schema or an explicit ordered ID list would let the author control pedagogical sequence.
- **Files:** `src/services/failureLoader.ts`, `src/data/scenarios/failure-*.yaml`
- **Stage:** SCALE — UX improvement for educational sequencing, not feature-blocking
- **Estimated effort:** Small (add sortOrder field to schema + YAML files, update sort logic)

### [SCALE] FailureSelector coupled to demand scenario state for layout positioning

- **Source:** 9-7 review (2026-03-27)
- **Finding:** `FailureSelector` reads `activeScenarioId` from the store solely to compute CSS offset strings (`topOffset`, `bannerTopOffset`). This couples the failure component to the demand scenario state for a layout concern. If a third overlay is added later, this positioning logic needs updating in multiple components. Consider a shared `useOverlayStackOffset` hook or CSS variable approach.
- **Files:** `src/components/canvas/FailureSelector.tsx`
- **Stage:** SCALE — architectural coupling concern for future overlay expansion
- **Estimated effort:** Medium (extract shared positioning hook, update both selectors)

### [SCALE] ICON_MAP hardcoded in FailureSelector — won't scale for Epic 13

- **Source:** 9-7 review (2026-03-27)
- **Finding:** `ICON_MAP` in `FailureSelector.tsx` maps icon name strings from YAML to Lucide components via a static dictionary. This works for 6 presets but won't scale when Epic 13 adds more failure/chaos scenarios. Fallback to `AlertTriangle` is safe. Consider a shared icon resolver utility when expanding the failure catalog.
- **Files:** `src/components/canvas/FailureSelector.tsx`
- **Stage:** SCALE — extensibility concern for Epic 13 expansion
- **Estimated effort:** Small (extract shared icon resolver utility)

### [SCALE] Fit level tooltip (title attribute) inaccessible on mobile/keyboard

- **Source:** 7.5-3 review (2026-03-18)
- **Finding:** `suggestion.fitExplanation` is only accessible via `title` attribute hover tooltip in PathwayGuidancePanel. On mobile and keyboard-only navigation, `title` tooltips are inaccessible. Desktop-first per PRD, so acceptable for MVP. Address in a future accessibility pass.
- **Files:** `src/components/dashboard/PathwayGuidancePanel.tsx`
- **Stage:** SCALE — accessibility improvement for mobile/keyboard users; desktop-first tool per PRD
- **Estimated effort:** Small (add aria-label or tooltip component)
