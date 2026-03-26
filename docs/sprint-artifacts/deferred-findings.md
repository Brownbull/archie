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

### [PROD] AC-2 default-1.0 behavior untested in engine

- **Source:** 9-2 review (2026-03-26)
- **Finding:** AC-2 specifies "the engine treats the missing entry as 1.0 (no change)" for sparse demand responses, but no test confirms this behavior. Story 9-2 is data-only (AC-ARCH-NO-1); the default-to-1.0 semantic belongs in the engine story that consumes demand response data. When the engine story is implemented, it must include a test confirming that a missing variable/level pair returns a 1.0 multiplier (not `undefined`).
- **Files:** Future engine story test file (TBD)
- **Stage:** PROD — correctness verification for engine behavior; data layer contract is met
- **Estimated effort:** Small (1 test case in engine story)

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

### [SCALE] Fit level tooltip (title attribute) inaccessible on mobile/keyboard

- **Source:** 7.5-3 review (2026-03-18)
- **Finding:** `suggestion.fitExplanation` is only accessible via `title` attribute hover tooltip in PathwayGuidancePanel. On mobile and keyboard-only navigation, `title` tooltips are inaccessible. Desktop-first per PRD, so acceptable for MVP. Address in a future accessibility pass.
- **Files:** `src/components/dashboard/PathwayGuidancePanel.tsx`
- **Stage:** SCALE — accessibility improvement for mobile/keyboard users; desktop-first tool per PRD
- **Estimated effort:** Small (add aria-label or tooltip component)
