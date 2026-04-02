# Deferred Findings Backlog

> Items identified during code review but deferred beyond the current epic.
> Grouped by product stage. Review during epic planning for future epics.

## PROD Backlog

### [PROD] Blueprint YAML validation: structural assertions + referential integrity

- **Source:** TD-11-data review (2026-04-01)
- **Finding:** Blueprint validation tests only check schema pass/fail. No assertions on skeleton node count, edge count, or that `component_id` references in blueprint nodes map to known component IDs in the catalog. A referential integrity test (`it("all node component_ids reference known components")`) would catch data drift between blueprint and component YAML files.
- **Files:** `tests/unit/data/blueprint-yaml-validation.test.ts`
- **Stage:** PROD — data integrity coverage for cross-file references; not blocking functionality
- **Estimated effort:** Small (2-3 test case additions)

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

### [PROD] Existing blueprints use schema_version 1.0.0 (current is 2.0.0)

- **Source:** 10-2 review (2026-03-28)
- **Finding:** `whatsapp-messaging.yaml` and `telegram-messaging.yaml` still declare `schema_version: "1.0.0"` inside their `skeleton` block, but `CURRENT_SCHEMA_VERSION` in `architectureFileSchema.ts` is `"2.0.0"`. New blueprints correctly use 2.0.0. The importer accepts both versions, so this is not feature-blocking, but the library is inconsistent.
- **Files:** `src/data/blueprints/whatsapp-messaging.yaml`, `src/data/blueprints/telegram-messaging.yaml`
- **Stage:** PROD — data consistency across blueprint library; importer handles both versions
- **Estimated effort:** Small (update schema_version field in 2 files, verify import/export round-trip)

### [PROD] Existing blueprints missing optional tier field

- **Source:** 10-2 review (2026-03-28)
- **Finding:** `whatsapp-messaging.yaml` and `telegram-messaging.yaml` lack the `tier` field that all 8 new blueprints include. `BlueprintSchema` declares `tier: z.number().optional()`, so both states are schema-valid, but the blueprint browser may display inconsistently (some with tiers, some without).
- **Files:** `src/data/blueprints/whatsapp-messaging.yaml`, `src/data/blueprints/telegram-messaging.yaml`
- **Stage:** PROD — data consistency in blueprint library; display may vary
- **Estimated effort:** Small (add `tier: 3` to both files based on their component count/spread)

### [PROD] AC-2 weight slider state not explicitly reset — test isolation risk

- **Source:** 10-3 review (2026-03-30)
- **Finding:** AC-2 test assumes weight sliders start at 1.0 (default). No explicit reset before adjusting sliders. If a prior test run or retry leaves non-default weights in storageState, State A setup produces wrong slider values. Needs an app-level reset mechanism (store reset via URL param in test mode, or explicit beforeEach navigation).
- **Files:** `tests/e2e/canvas-enhancements.spec.ts`
- **Stage:** PROD — test reliability in CI environments, not feature-blocking
- **Estimated effort:** Medium (requires app-level reset mechanism or per-test state isolation)

### [PROD] selectScenario + addComponentWithMetrics duplicated across E2E specs

- **Source:** 10-3 review (2026-03-30)
- **Finding:** `selectScenario` and `addComponentWithMetrics` helper functions are independently implemented in both `demand-simulation.spec.ts` and `canvas-enhancements.spec.ts` with identical logic. Should be promoted to `tests/e2e/helpers/canvas-helpers.ts` to eliminate DRY violation and maintenance fork risk.
- **Files:** `tests/e2e/canvas-enhancements.spec.ts`, `tests/e2e/demand-simulation.spec.ts`, `tests/e2e/helpers/canvas-helpers.ts`
- **Stage:** PROD — DRY/maintainability, not feature-blocking
- **Estimated effort:** Small (extract to canvas-helpers.ts, update both specs)

### [PROD] waitForTimeout(800) in selectScenario — prefer explicit wait signal

- **Source:** 10-3 review (2026-03-30)
- **Finding:** `selectScenario` uses `waitForTimeout(800)` for recalculation settling after scenario selection. Borderline vs the <1000ms testing convention. Replace with `expect.poll` on a stable DOM signal (e.g., scenario banner text or metric value change) once a stable signal exists. Current approach is correct in spirit but may cause flakiness under CI load.
- **Files:** `tests/e2e/canvas-enhancements.spec.ts`
- **Stage:** PROD — CI reliability, not feature-blocking
- **Estimated effort:** Small (replace waitForTimeout with expect.poll on stable signal)

### [PROD] StoreSnapshot interface duplicates store type shape — drift risk

- **Source:** 10-4 review (2026-03-30)
- **Finding:** `StoreSnapshot` interface in `ExportReportButton.tsx` manually declares the shape of `architectureStore.getState()` (nodes, edges, computedMetrics, heatmapColors, etc.). If store fields are renamed, added, or removed, this interface silently drifts. Should derive from `ReturnType<typeof useArchitectureStore.getState>` with `Pick<>` to stay in sync.
- **Files:** `src/components/toolbar/ExportReportButton.tsx`
- **Stage:** PROD — type safety / SSoT, not feature-blocking
- **Estimated effort:** Medium (derive type from store, update Pick fields, verify type compatibility)

### [PROD] mdCell only escapes pipe/newline — markdown injection via heading/link syntax unguarded

- **Source:** 10-4 review (2026-03-30)
- **Finding:** `mdCell()` in `reportGenerator.ts` escapes `|` and `\n` for table cell safety, but component names and categories used in H3 headings (`### ${mdCell(comp.componentName)}`) are not protected against markdown heading injection (`# injected`), link syntax (`[click](url)`), or HTML-like tags (`<script>`). Since the report is a downloaded .md file rendered by external viewers, injected markdown could render unexpectedly. Extend `mdCell` to strip `#` at string start and escape `[`, `(`, `<`, `>` for non-table contexts, or introduce a separate `mdText()` sanitizer for headings.
- **Files:** `src/services/reportGenerator.ts`
- **Stage:** PROD — defense-in-depth for exported artifacts rendered in external markdown viewers
- **Estimated effort:** Medium (design mdText sanitizer, apply to all non-table interpolation points, add tests)

### ~~[PROD] E2E gap: export-report-button not covered in E2E specs~~ RESOLVED

- **Source:** 10-4 self-review (2026-03-30)
- **Resolved:** 10-4 code review (2026-03-30) — `tests/e2e/export-report.spec.ts` added with 4 tests: button gating (AC-1), download+provenance (AC-7/AC-8/V2/V5), content verification (AC-2/AC-3/V1/V6), scenario impact (AC-5/V3). All pass.

### [PROD] Missing geographic-spread demand variable on AI/ML + Data Eng components

- **Source:** 11-1 review (2026-03-30)
- **Finding:** All 4 new components (llm-gateway, vector-db, serverless, etl-pipeline) lack `geographic-spread` demand responses. This variable is meaningful for LLM Gateway (multi-region inference routing) and Serverless (edge-function variant explicitly targets global distribution). Omission is not a schema violation but misses a directionally informative signal.
- **Files:** `src/data/components/llm-gateway.yaml`, `src/data/components/vector-db.yaml`, `src/data/components/serverless.yaml`, `src/data/components/etl-pipeline.yaml`
- **Stage:** PROD — data completeness for demand simulation accuracy, not feature-blocking
- **Estimated effort:** Small (add geographic-spread entries to 4 YAML files, 2 levels each)

### [PROD] No comparative degradation tests for Epic 11 components

- **Source:** 11-1 review (2026-03-30)
- **Finding:** Existing components have cross-component comparative degradation tests (redis-cache vs redis, nginx vs node-express, kafka vs rabbitmq). The 4 new components get no analogous treatment. Directionally meaningful comparisons: vector-db single-node vs distributed under data-size:extreme, serverless cold-start vs provisioned-concurrency under burst-pattern, etl-pipeline batch vs streaming under data-size:extreme.
- **Files:** `tests/unit/schemas/componentSchema.test.ts`
- **Stage:** PROD — test semantic depth for demand response accuracy, not feature-blocking
- **Estimated effort:** Small (3-4 comparative test cases following existing pattern)

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

### [PROD] RecalculationService.run() accumulating positional parameters (6 params)

- **Source:** 11-4 review (2026-03-31)
- **Finding:** `recalculationService.run()` now takes 6 positional parameters (nodes, edges, changedNodeId, demandProfile, failureModifiers, activeFailurePresetId). At threshold for parameter object refactor. Next parameter addition should trigger extraction to a `RecalculationOptions` object.
- **Files:** `src/services/recalculationService.ts`, `src/stores/architectureStore.ts`
- **Stage:** PROD — API ergonomics and maintainability, not feature-blocking
- **Estimated effort:** Small (extract options object, update callers)

### [PROD] Duplicate parseComponent test helper across 11-3 and 11-4 test files

- **Source:** 11-4 review (2026-03-31)
- **Finding:** `parseComponent()` helper is independently defined in both `componentDataQuality-11-3.test.ts` and `componentFailureResponses-11-4.test.ts` with identical logic (readFileSync + load + ComponentYamlSchema.safeParse). Extract to shared `tests/unit/schemas/helpers.ts` to eliminate duplication as more story-specific test files accumulate.
- **Files:** `tests/unit/schemas/componentDataQuality-11-3.test.ts`, `tests/unit/schemas/componentFailureResponses-11-4.test.ts`
- **Stage:** PROD — DRY/maintainability for test infrastructure, not feature-blocking
- **Estimated effort:** Small (extract shared helper, update 2 test files)

### [PROD] Cost-efficiency metric ID naming convention drift across 18 components

- **Source:** 11-3 review (2026-03-30)
- **Finding:** 10 existing components use component-prefixed metric IDs (`redis-cost-efficiency`, `postgres-cost-efficiency`, `nginx-cost-efficiency`, etc.) while 8 new components from 11-1/11-2 use semantically-descriptive IDs (`cost-per-inference`, `cost-per-invocation`, `cost-per-query`, `cost-per-gb`, `cost-per-gb-ingested`). The scoring pipeline uses `metric.category` for aggregation (functionally correct), but `INTERACTION_RULES` in `recalculator.ts` reads metric IDs directly. If future stories add cost-efficiency adjacency rules, the inconsistent IDs would cause silent misses. Standardize to either semantic or generic convention across all 18 components.
- **Files:** All 18 `src/data/components/*.yaml` files
- **Stage:** PROD — no functional impact today (pipeline is category-driven), but creates latent maintenance risk for future interaction rules
- **Estimated effort:** Medium (rename metric IDs in 18 YAML files + update corresponding tests)
