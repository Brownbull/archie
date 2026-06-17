# aislop Quality Report

**Date:** 20260617-012456
**Score:** 8/100 (Critical)
**Scan:** `aislop scan --staged`

## Engine Summary

| Engine | Issues | Time |
|--------|--------|------|
| lint | 54 | 405ms |
| code-quality | 84 | 4047ms |
| ai-slop | 0 | 2ms |
| security | 19 | 4170ms |

## Findings

### code-quality (84)

- [!] `src/declarations.d.ts:0` — knip/files: Unused file
- [!] `package.json:44` — knip/dependencies: Unused dependency: tailwindcss
- [!] `package.json:72` — knip/devDependencies: Unused devDependency: shadcn
- [!] `package.json:74` — knip/devDependencies: Unused devDependency: tw-animate-css
- [!!!] `scripts/seed-qa-user.ts:19` — knip/unlisted: Unlisted dependency: dotenv
- [!!!] `scripts/seed-unlocked-qa-user.ts:21` — knip/unlisted: Unlisted dependency: dotenv
- [!!!] `tests/e2e/challenge-validation.spec.ts:96` — knip/unresolved: Unresolved import: /src/services/challengeLoader
- [!!!] `tests/e2e/challenge-validation.spec.ts:97` — knip/unresolved: Unresolved import: /src/stores/challengeStore
- [!!!] `tests/e2e/challenge-validation.spec.ts:98` — knip/unresolved: Unresolved import: /src/stores/userProgressStore
- [!!!] `tests/e2e/inspector-and-config.spec.ts:42` — knip/unresolved: Unresolved import: /src/stores/architectureStore.ts
- [!!!] `tests/e2e/inspector-and-config.spec.ts:43` — knip/unresolved: Unresolved import: /src/stores/userProgressStore.ts
- [!!!] `tests/e2e/inspector-and-config.spec.ts:44` — knip/unresolved: Unresolved import: /src/services/componentLibrary.ts
- [!!!] `tests/e2e/inspector-and-config.spec.ts:106` — knip/unresolved: Unresolved import: /src/stores/uiStore.ts
- [!] `src/schemas/componentSchema.ts:40` — knip/exports: Unused export: MAX_CONCURRENCY
- [!] `src/schemas/componentSchema.ts:42` — knip/exports: Unused export: MAX_VARIANT_DESCRIPTION_LENGTH
- [!] `src/schemas/componentSchema.ts:45` — knip/exports: Unused export: HttpsUrlSchema
- [!] `src/lib/constants.ts:446` — knip/exports: Unused export: SCENARIO_NONE_LABEL
- [!] `src/lib/constants.ts:447` — knip/exports: Unused export: SCENARIO_SELECTOR_TESTID
- [!] `src/lib/constants.ts:448` — knip/exports: Unused export: SCENARIO_BANNER_TESTID
- [!] `src/lib/constants.ts:503` — knip/exports: Unused export: MAX_AZ_COUNT
- [!] `src/lib/constants.ts:58` — knip/types: Unused type: ReplicaType
- [!] `src/lib/constants.ts:60` — knip/types: Unused type: ScalingRule
- [!] `src/lib/constants.ts:237` — knip/types: Unused type: StackComponent
- [!] `src/lib/constants.ts:248` — knip/types: Unused type: StackConnection
- [!] `src/lib/constants.ts:255` — knip/types: Unused type: StackCategoryScore
- [!] `src/lib/constants.ts:330` — knip/types: Unused type: TailwindZIndex
- [!] `src/lib/constants.ts:460` — knip/types: Unused type: FailurePresetId
- [!] `src/lib/constants.ts:0` — knip/duplicates: Duplicate export: unknown
- [!] `src/engine/breakDetection.ts:130` — knip/exports: Unused export: BREAK_METHOD_LABELS
- [!] `src/engine/breakDetection.ts:112` — knip/types: Unused type: BreakMethodId
- [!] `src/lib/vendorPricing.ts:33` — knip/exports: Unused export: eliteVendorId
- [!] `src/lib/vendorPricing.ts:15` — knip/types: Unused type: VendorPrice
- [!] `src/lib/vendorPricing.ts:22` — knip/types: Unused type: TierPrice
- [!] `src/engine/topologyChecker.ts:27` — knip/exports: Unused export: isBlockingTopologyIssue
- [!] `src/lib/componentTypes.ts:245` — knip/exports: Unused export: ASYNC_OFFPATH_CATEGORIES
- [!] `src/lib/componentTypes.ts:10` — knip/types: Unused type: ComponentType
- [!] `src/services/trafficSourceInjection.ts:70` — knip/exports: Unused export: MAX_TRAFFIC_SOURCES
- [!] `src/services/trafficSourceInjection.ts:73` — knip/exports: Unused export: trafficProviderTypes
- [!] `src/services/trafficSourceInjection.ts:16` — knip/types: Unused type: TrafficSourceConfig
- [!] `src/services/trafficSourceInjection.ts:182` — knip/types: Unused type: TrafficResetUpdate
- [!] `src/lib/nicknames.ts:24` — knip/exports: Unused export: NICKNAME_RE
- [!] `src/services/scenarioLoader.ts:34` — knip/exports: Unused export: getAllScenarioPresets
- [!] `src/lib/vendorOwnership.ts:36` — knip/exports: Unused export: typeIdOf
- [!] `src/schemas/blueprintSchema.ts:42` — knip/types: Unused type: Blueprint
- [!] `src/stores/challengeStore.ts:12` — knip/types: Unused type: AttemptSnapshot
- [!] `src/stores/simulationStore.ts:6` — knip/types: Unused type: SimulationStatus
- [!] `src/engine/dashboardCalculator.ts:8` — knip/types: Unused type: ComponentCategoryMetric
- [!] `src/engine/dashboardCalculator.ts:13` — knip/types: Unused type: CategoryBreakdown
- [!] `src/engine/recalculator.ts:13` — knip/types: Unused type: MetricAdjustment
- [!] `src/services/recalculationService.ts:23` — knip/types: Unused type: RecalculationResult
- [!] `src/lib/demandTypes.ts:6` — knip/types: Unused type: DemandVariableMetadata
- [!] `src/lib/demandTypes.ts:14` — knip/types: Unused type: DemandLevelMeta
- [!] `src/lib/demandTypes.ts:100` — knip/types: Unused type: FailureResponse
- [!] `src/services/stackPlacement.ts:18` — knip/types: Unused type: StackPlacementResult
- [!] `src/engine/compatibilityChecker.ts:3` — knip/types: Unused type: CompatibilityResult
- [!] `src/services/breakProbe.ts:130` — knip/types: Unused type: BreakFeasibility
- [!] `src/engine/demandEngine.ts:7` — knip/types: Unused type: AdjustedMetric
- [!] `src/engine/ghostSuggestionEngine.ts:10` — knip/types: Unused type: GhostPlacement
- [!] `src/engine/portCompatibilityChecker.ts:4` — knip/types: Unused type: PortCompatibilityResult
- [!] `src/engine/portResolution.ts:5` — knip/types: Unused type: ResolvedPortPair
- [!] `src/engine/suggestionEngine.ts:39` — knip/types: Unused type: SuggestionChangeType
- [!] `src/engine/topologyAssertions.ts:27` — knip/types: Unused type: TopologyAssertionResult
- [!] `src/engine/trafficPatterns.ts:15` — knip/types: Unused type: TrafficPattern
- [!] `src/hooks/useAttemptComparison.ts:6` — knip/types: Unused type: CurrentAttemptStats
- [!] `src/hooks/useChallengeCoach.ts:19` — knip/types: Unused type: CoachState
- [!] `src/hooks/useDisclosureTier.ts:18` — knip/types: Unused type: DisclosureTier
- [!] `src/stores/preferencesStore.ts:5` — knip/types: Unused type: Theme
- [!] `src/stores/preferencesStore.ts:6` — knip/types: Unused type: FontSize
- [!] `src/hooks/useEdgeOverlay.ts:7` — knip/types: Unused type: EdgeOverlayStyle
- [!] `src/stores/uiStore.ts:10` — knip/types: Unused type: DragSource
- [!] `src/stores/uiStore.ts:14` — knip/types: Unused type: ContextMenuState
- [!] `src/hooks/useNodeOverlay.ts:8` — knip/types: Unused type: NodeOverlayInfo
- [!] `src/hooks/useResilienceClears.ts:12` — knip/types: Unused type: ResilienceClearOutcome
- [!] `src/lib/aggregateStats.ts:4` — knip/types: Unused type: VariantStats
- [!] `src/lib/challengeTracks.ts:10` — knip/types: Unused type: ChallengeTrack
- [!] `src/lib/challengeTracks.ts:66` — knip/types: Unused type: MasteryRank
- [!] `src/lib/metricTone.ts:13` — knip/types: Unused type: MetricTone
- [!] `src/stores/userBlockDefaultsStore.ts:18` — knip/types: Unused type: BlockDefault
- [!] `src/stores/userCanvasesStore.ts:23` — knip/types: Unused type: CanvasSlot
- [!] `src/stores/userCanvasesStore.ts:29` — knip/types: Unused type: CanvasSlots
- [!] `src/services/challengeAutosave.ts:5` — knip/types: Unused type: SavedChallenge
- [!] `src/hooks/usePoolExhaustionWay.ts:9` — knip/types: Unused type: MechanicWayOutcome
- [!] `src/lib/equipmentSlots.ts:3` — knip/types: Unused type: EquipmentSlot
- [!] `src/components/common/DataSourceNote.tsx:4` — knip/types: Unused type: DataSourceKind

### lint (54)

- [!] `tests/integration/challenges/referenceSolution.ts:8` — eslint/no-unused-vars: Identifier 'computeTotalArchitectureCost' is imported but never used.
- [!] `src/components/canvas/ArchieNode.tsx:9` — import/no-duplicates: Module '@/lib/constants' is imported more than once in this file
- [!] `src/components/canvas/ArchieNode.tsx:391` — jsx-a11y/click-events-have-key-events: Enforce a clickable non-interactive element has at least one keyboard event listener.
- [!] `src/components/canvas/ArchieNode.tsx:391` — jsx-a11y/no-static-element-interactions: Static HTML elements with event handlers require a role.
- [!] `src/components/challenges/ChallengeTreeView.tsx:2` — import/no-duplicates: Module 'lucide-react' is imported more than once in this file
- [!] `src/components/canvas/NodeConfigSelect.tsx:76` — jsx-a11y/click-events-have-key-events: Enforce a clickable non-interactive element has at least one keyboard event listener.
- [!] `src/components/canvas/NodeConfigSelect.tsx:76` — jsx-a11y/no-static-element-interactions: Static HTML elements with event handlers require a role.
- [!] `src/components/canvas/NodeProviderSelect.tsx:1` — import/no-duplicates: Module 'react' is imported more than once in this file
- [!] `src/components/canvas/NodeProviderSelect.tsx:94` — jsx-a11y/click-events-have-key-events: Enforce a clickable non-interactive element has at least one keyboard event listener.
- [!] `src/components/canvas/NodeProviderSelect.tsx:94` — jsx-a11y/no-static-element-interactions: Static HTML elements with event handlers require a role.
- [!] `src/components/canvas/TrafficNodeControls.tsx:85` — jsx-a11y/click-events-have-key-events: Enforce a clickable non-interactive element has at least one keyboard event listener.
- [!] `src/components/canvas/TrafficNodeControls.tsx:123` — jsx-a11y/no-autofocus: The `autoFocus` attribute is found here, which can cause usability issues for sighted and non-sighted users.
- [!] `src/components/canvas/TrafficNodeControls.tsx:85` — jsx-a11y/no-static-element-interactions: Static HTML elements with event handlers require a role.
- [!] `src/components/challenges/ChallengeEditor.tsx:113` — jsx-a11y/label-has-associated-control: A form label must be associated with a control.
- [!] `src/components/challenges/ChallengeEditor.tsx:178` — jsx-a11y/label-has-associated-control: A form label must be associated with a control.
- [!] `src/components/challenges/ChallengeEditor.tsx:320` — jsx-a11y/label-has-associated-control: A form label must be associated with a control.
- [!] `src/components/challenges/ChallengeEditor.tsx:324` — jsx-a11y/label-has-associated-control: A form label must be associated with a control.
- [!] `src/components/challenges/ChallengeEditor.tsx:330` — jsx-a11y/label-has-associated-control: A form label must be associated with a control.
- [!] `src/components/challenges/ChallengeEditor.tsx:343` — jsx-a11y/label-has-associated-control: A form label must be associated with a control.
- [!] `src/components/challenges/ChallengeEditor.tsx:352` — jsx-a11y/label-has-associated-control: A form label must be associated with a control.
- [!] `src/components/challenges/ChallengeEditor.tsx:361` — jsx-a11y/label-has-associated-control: A form label must be associated with a control.
- [!] `src/components/challenges/ChallengeEditor.tsx:375` — jsx-a11y/label-has-associated-control: A form label must be associated with a control.
- [!] `src/components/challenges/ChallengeEditor.tsx:379` — jsx-a11y/label-has-associated-control: A form label must be associated with a control.
- [!] `src/components/challenges/ChallengeEditor.tsx:386` — jsx-a11y/label-has-associated-control: A form label must be associated with a control.
- [!] `src/components/challenges/ChallengeEditor.tsx:390` — jsx-a11y/label-has-associated-control: A form label must be associated with a control.
- [!] `src/components/canvas/TrafficPatternSelect.tsx:26` — jsx-a11y/click-events-have-key-events: Enforce a clickable non-interactive element has at least one keyboard event listener.
- [!] `src/components/canvas/TrafficPatternSelect.tsx:26` — jsx-a11y/no-static-element-interactions: Static HTML elements with event handlers require a role.
- [!] `src/services/yamlImporter.ts:153` — eslint/no-unused-vars: Catch parameter '_err' is caught but never used.
- [!] `tests/unit/components/canvas/ObjectActionToolbar.test.tsx:35` — jsx-a11y/click-events-have-key-events: Enforce a clickable non-interactive element has at least one keyboard event listener.
- [!] `tests/unit/components/canvas/ObjectActionToolbar.test.tsx:35` — jsx-a11y/no-static-element-interactions: Static HTML elements with event handlers require a role.
- [!] `src/components/inspector/ConfigSelector.tsx:24` — jsx-a11y/label-has-associated-control: A form label must be associated with a control.
- [!] `src/components/dashboard/DashboardOverlay.tsx:272` — jsx-a11y/prefer-tag-over-role: Prefer `button` over `role` attribute `button`.
- [!] `src/components/onboarding/SpotlightTour.tsx:55` — react-hooks/exhaustive-deps: React Hook useLayoutEffect has a complex expression in the dependency array.
- [!] `src/components/onboarding/SpotlightTour.tsx:42` — react-hooks/exhaustive-deps: React Hook useLayoutEffect has missing dependencies: 'selectors', and 'selectors.length'
- [!] `src/components/dashboard/CategoryBar.tsx:53` — jsx-a11y/no-static-element-interactions: Static HTML elements with event handlers require a role.
- [!] `tests/e2e/helpers/canvas-helpers.ts:27` — unicorn/no-useless-fallback-in-spread: Empty fallbacks in spreads are unnecessary
- [!] `tests/unit/services/yamlImporter-v3-migration.test.ts:4` — eslint/no-unused-vars: Identifier 'setPortResolver' is imported but never used.
- [!] `src/components/inspector/FitIndicator.tsx:55` — jsx-a11y/prefer-tag-over-role: Prefer `button` over `role` attribute `button`.
- [!] `src/components/inspector/MetricBar.tsx:25` — jsx-a11y/click-events-have-key-events: Enforce a clickable non-interactive element has at least one keyboard event listener.
- [!] `src/components/inspector/MetricBar.tsx:25` — jsx-a11y/no-static-element-interactions: Static HTML elements with event handlers require a role.
- [!] `src/components/challenges/BreakRegistryPanel.tsx:35` — react-hooks/exhaustive-deps: React Hook useMemo has missing dependencies: 'nodes', and 'edges'
- [!] `src/components/layout/AppMenuBar.tsx:51` — jsx-a11y/click-events-have-key-events: Enforce a clickable non-interactive element has at least one keyboard event listener.
- [!] `src/components/layout/AppMenuBar.tsx:51` — jsx-a11y/no-static-element-interactions: Static HTML elements with event handlers require a role.
- [!] `tests/e2e/status-dot-and-swap-popover.spec.ts:143` — eslint/no-unused-vars: Variable 'node' is declared but never used. Unused variables should start with a '_'.
- [!] `tests/unit/stores/architectureStore.test.ts:1` — eslint/no-unused-vars: Identifier 'afterEach' is imported but never used.
- [!] `tests/integration/data-context-flow.test.ts:4` — eslint/no-unused-vars: Type 'FitLevel' is imported but never used.
- [!] `tests/unit/engine/monitoringFeedback.test.ts:2` — eslint/no-unused-vars: Identifier 'simulateTick' is imported but never used.
- [!] `tests/unit/hooks/useChallengeCoach.test.ts:6` — eslint/no-unused-vars: Identifier 'COMPONENT_CATEGORIES' is imported but never used.
- [!] `tests/unit/engine/simulationEngine.test.ts:3` — import/no-duplicates: Modules should not be imported multiple times in the same file
- [!] `tests/unit/schemas/portDefinition.test.ts:31` — eslint/no-unused-vars: Variable 'key' is declared but never used. Unused variables should start with a '_'.
- [!] `tests/e2e/export-report.spec.ts:5` — eslint/no-unused-vars: Identifier 'waitForBlueprints' is imported but never used.
- [!] `tests/e2e/port-handles.spec.ts:66` — eslint/no-unused-vars: Variable 'expressPortHandles' is declared but never used. Unused variables should start with a '_'.
- [!] `tests/e2e/unlocked-setup.ts:34` — unicorn/no-useless-fallback-in-spread: Empty fallbacks in spreads are unnecessary
- [!] `tests/e2e/global-setup.ts:24` — unicorn/no-useless-fallback-in-spread: Empty fallbacks in spreads are unnecessary

### security (19)

- [!] `package.json:0` — security/vulnerable-dependency: Vulnerable dependency (npm audit): @babel/core (low)
- [!] `package.json:0` — security/vulnerable-dependency: Vulnerable dependency (npm audit): @google-cloud/firestore (moderate)
- [!] `package.json:0` — security/vulnerable-dependency: Vulnerable dependency (npm audit): @google-cloud/storage (moderate)
- [!!!] `package.json:0` — security/vulnerable-dependency: Vulnerable dependency (npm audit): @grpc/grpc-js (high)
- [!!!] `package.json:0` — security/vulnerable-dependency: Vulnerable dependency (npm audit): esbuild (high)
- [!] `package.json:0` — security/vulnerable-dependency: Vulnerable dependency (npm audit): firebase-admin (moderate)
- [!!!] `package.json:0` — security/vulnerable-dependency: Vulnerable dependency (npm audit): form-data (high)
- [!] `package.json:0` — security/vulnerable-dependency: Vulnerable dependency (npm audit): gaxios (moderate)
- [!] `package.json:0` — security/vulnerable-dependency: Vulnerable dependency (npm audit): google-gax (moderate)
- [!!!] `package.json:0` — security/vulnerable-dependency: Vulnerable dependency (npm audit): hono (high)
- [!] `package.json:0` — security/vulnerable-dependency: Vulnerable dependency (npm audit): js-yaml (moderate)
- [!] `package.json:0` — security/vulnerable-dependency: Vulnerable dependency (npm audit): protobufjs (moderate)
- [!!!] `package.json:0` — security/vulnerable-dependency: Vulnerable dependency (npm audit): react-router (high)
- [!!!] `package.json:0` — security/vulnerable-dependency: Vulnerable dependency (npm audit): react-router-dom (high)
- [!] `package.json:0` — security/vulnerable-dependency: Vulnerable dependency (npm audit): retry-request (moderate)
- [!] `package.json:0` — security/vulnerable-dependency: Vulnerable dependency (npm audit): tar (moderate)
- [!] `package.json:0` — security/vulnerable-dependency: Vulnerable dependency (npm audit): teeny-request (moderate)
- [!] `package.json:0` — security/vulnerable-dependency: Vulnerable dependency (npm audit): uuid (moderate)
- [!!!] `package.json:0` — security/vulnerable-dependency: Vulnerable dependency (npm audit): vite (high)

