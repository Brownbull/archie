# aislop Quality Report

**Date:** 20260605-220327
**Score:** 14/100 (Critical)
**Scan:** `aislop scan --staged`

## Engine Summary

| Engine | Issues | Time |
|--------|--------|------|
| lint | 43 | 433ms |
| code-quality | 57 | 3995ms |
| ai-slop | 0 | 10ms |
| security | 10 | 1732ms |

## Findings

### code-quality (57)

- [!] `src/declarations.d.ts:0` — knip/files: Unused file
- [!] `package.json:43` — knip/dependencies: Unused dependency: tailwindcss
- [!] `package.json:71` — knip/devDependencies: Unused devDependency: shadcn
- [!] `package.json:73` — knip/devDependencies: Unused devDependency: tw-animate-css
- [!!!] `tests/e2e/challenge-validation.spec.ts:92` — knip/unresolved: Unresolved import: /src/services/challengeLoader
- [!!!] `tests/e2e/challenge-validation.spec.ts:93` — knip/unresolved: Unresolved import: /src/stores/challengeStore
- [!!!] `tests/e2e/challenge-validation.spec.ts:94` — knip/unresolved: Unresolved import: /src/stores/userProgressStore
- [!] `src/engine/topologyChecker.ts:27` — knip/exports: Unused export: isBlockingTopologyIssue
- [!] `src/services/trafficSourceInjection.ts:70` — knip/exports: Unused export: MAX_TRAFFIC_SOURCES
- [!] `src/services/trafficSourceInjection.ts:73` — knip/exports: Unused export: trafficProviderTypes
- [!] `src/services/trafficSourceInjection.ts:16` — knip/types: Unused type: TrafficSourceConfig
- [!] `src/schemas/blueprintSchema.ts:42` — knip/types: Unused type: Blueprint
- [!] `src/lib/constants.ts:58` — knip/types: Unused type: ReplicaType
- [!] `src/lib/constants.ts:60` — knip/types: Unused type: ScalingRule
- [!] `src/lib/constants.ts:222` — knip/types: Unused type: StackComponent
- [!] `src/lib/constants.ts:233` — knip/types: Unused type: StackConnection
- [!] `src/lib/constants.ts:240` — knip/types: Unused type: StackCategoryScore
- [!] `src/lib/constants.ts:315` — knip/types: Unused type: TailwindZIndex
- [!] `src/lib/constants.ts:445` — knip/types: Unused type: FailurePresetId
- [!] `src/lib/constants.ts:0` — knip/duplicates: Duplicate export: unknown
- [!] `src/stores/challengeStore.ts:12` — knip/types: Unused type: AttemptSnapshot
- [!] `src/stores/simulationStore.ts:6` — knip/types: Unused type: SimulationStatus
- [!] `src/stores/userProgressStore.ts:18` — knip/types: Unused type: UserProgress
- [!] `src/engine/dashboardCalculator.ts:8` — knip/types: Unused type: ComponentCategoryMetric
- [!] `src/engine/dashboardCalculator.ts:13` — knip/types: Unused type: CategoryBreakdown
- [!] `src/engine/recalculator.ts:13` — knip/types: Unused type: MetricAdjustment
- [!] `src/services/recalculationService.ts:23` — knip/types: Unused type: RecalculationResult
- [!] `src/lib/demandTypes.ts:6` — knip/types: Unused type: DemandVariableMetadata
- [!] `src/lib/demandTypes.ts:14` — knip/types: Unused type: DemandLevelMeta
- [!] `src/lib/demandTypes.ts:100` — knip/types: Unused type: FailureResponse
- [!] `src/services/stackPlacement.ts:18` — knip/types: Unused type: StackPlacementResult
- [!] `src/engine/compatibilityChecker.ts:3` — knip/types: Unused type: CompatibilityResult
- [!] `src/engine/demandEngine.ts:7` — knip/types: Unused type: AdjustedMetric
- [!] `src/engine/ghostSuggestionEngine.ts:10` — knip/types: Unused type: GhostPlacement
- [!] `src/engine/portCompatibilityChecker.ts:4` — knip/types: Unused type: PortCompatibilityResult
- [!] `src/engine/portResolution.ts:5` — knip/types: Unused type: ResolvedPortPair
- [!] `src/engine/suggestionEngine.ts:39` — knip/types: Unused type: SuggestionChangeType
- [!] `src/engine/topologyAssertions.ts:27` — knip/types: Unused type: TopologyAssertionResult
- [!] `src/engine/trafficPatterns.ts:15` — knip/types: Unused type: TrafficPattern
- [!] `src/hooks/useAttemptComparison.ts:6` — knip/types: Unused type: CurrentAttemptStats
- [!] `src/hooks/useChallengeCoach.ts:15` — knip/types: Unused type: CoachState
- [!] `src/hooks/useEdgeOverlay.ts:7` — knip/types: Unused type: EdgeOverlayStyle
- [!] `src/stores/uiStore.ts:10` — knip/types: Unused type: DragSource
- [!] `src/stores/uiStore.ts:14` — knip/types: Unused type: ContextMenuState
- [!] `src/hooks/useNodeOverlay.ts:8` — knip/types: Unused type: NodeOverlayInfo
- [!] `src/stores/preferencesStore.ts:5` — knip/types: Unused type: Theme
- [!] `src/stores/preferencesStore.ts:6` — knip/types: Unused type: FontSize
- [!] `src/lib/componentTypes.ts:10` — knip/types: Unused type: ComponentType
- [!] `src/lib/aggregateStats.ts:4` — knip/types: Unused type: VariantStats
- [!] `src/lib/challengeTracks.ts:10` — knip/types: Unused type: ChallengeTrack
- [!] `src/lib/challengeTracks.ts:66` — knip/types: Unused type: MasteryRank
- [!] `src/stores/userBlockDefaultsStore.ts:17` — knip/types: Unused type: BlockDefault
- [!] `src/stores/userCanvasesStore.ts:22` — knip/types: Unused type: CanvasSlot
- [!] `src/stores/userCanvasesStore.ts:28` — knip/types: Unused type: CanvasSlots
- [!] `src/services/challengeAutosave.ts:5` — knip/types: Unused type: SavedChallenge
- [!] `src/lib/equipmentSlots.ts:3` — knip/types: Unused type: EquipmentSlot
- [!] `src/components/common/DataSourceNote.tsx:4` — knip/types: Unused type: DataSourceKind

### lint (43)

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
- [!] `src/components/dashboard/DashboardOverlay.tsx:255` — jsx-a11y/prefer-tag-over-role: Prefer `button` over `role` attribute `button`.
- [!] `src/components/inspector/ConfigSelector.tsx:24` — jsx-a11y/label-has-associated-control: A form label must be associated with a control.
- [!] `tests/unit/components/canvas/ObjectActionToolbar.test.tsx:35` — jsx-a11y/click-events-have-key-events: Enforce a clickable non-interactive element has at least one keyboard event listener.
- [!] `tests/unit/components/canvas/ObjectActionToolbar.test.tsx:35` — jsx-a11y/no-static-element-interactions: Static HTML elements with event handlers require a role.
- [!] `src/services/yamlImporter.ts:139` — eslint/no-unused-vars: Catch parameter '_err' is caught but never used.
- [!] `tests/unit/services/yamlImporter-v3-migration.test.ts:4` — eslint/no-unused-vars: Identifier 'setPortResolver' is imported but never used.
- [!] `src/components/inspector/FitIndicator.tsx:55` — jsx-a11y/prefer-tag-over-role: Prefer `button` over `role` attribute `button`.
- [!] `src/components/canvas/NodeProviderSelect.tsx:59` — jsx-a11y/click-events-have-key-events: Enforce a clickable non-interactive element has at least one keyboard event listener.
- [!] `src/components/canvas/NodeProviderSelect.tsx:59` — jsx-a11y/no-static-element-interactions: Static HTML elements with event handlers require a role.
- [!] `src/components/canvas/TrafficNodeControls.tsx:69` — jsx-a11y/click-events-have-key-events: Enforce a clickable non-interactive element has at least one keyboard event listener.
- [!] `src/components/canvas/TrafficNodeControls.tsx:69` — jsx-a11y/no-static-element-interactions: Static HTML elements with event handlers require a role.
- [!] `src/components/canvas/TrafficPatternSelect.tsx:26` — jsx-a11y/click-events-have-key-events: Enforce a clickable non-interactive element has at least one keyboard event listener.
- [!] `src/components/canvas/TrafficPatternSelect.tsx:26` — jsx-a11y/no-static-element-interactions: Static HTML elements with event handlers require a role.
- [!] `src/components/canvas/ArchieNode.tsx:7` — import/no-duplicates: Module '@/lib/constants' is imported more than once in this file
- [!] `src/components/canvas/ArchieNode.tsx:325` — jsx-a11y/click-events-have-key-events: Enforce a clickable non-interactive element has at least one keyboard event listener.
- [!] `src/components/canvas/ArchieNode.tsx:325` — jsx-a11y/no-static-element-interactions: Static HTML elements with event handlers require a role.
- [!] `src/components/inspector/MetricBar.tsx:25` — jsx-a11y/click-events-have-key-events: Enforce a clickable non-interactive element has at least one keyboard event listener.
- [!] `src/components/inspector/MetricBar.tsx:25` — jsx-a11y/no-static-element-interactions: Static HTML elements with event handlers require a role.
- [!] `src/components/challenges/MasteryProfilePanel.tsx:1` — import/no-duplicates: Module 'react' is imported more than once in this file
- [!] `src/components/layout/AppMenuBar.tsx:51` — jsx-a11y/click-events-have-key-events: Enforce a clickable non-interactive element has at least one keyboard event listener.
- [!] `src/components/layout/AppMenuBar.tsx:51` — jsx-a11y/no-static-element-interactions: Static HTML elements with event handlers require a role.
- [!] `tests/e2e/status-dot-and-swap-popover.spec.ts:144` — eslint/no-unused-vars: Variable 'node' is declared but never used. Unused variables should start with a '_'.
- [!] `tests/unit/engine/monitoringFeedback.test.ts:2` — eslint/no-unused-vars: Identifier 'simulateTick' is imported but never used.
- [!] `tests/integration/data-context-flow.test.ts:4` — eslint/no-unused-vars: Type 'FitLevel' is imported but never used.
- [!] `tests/unit/stores/architectureStore.test.ts:1` — eslint/no-unused-vars: Identifier 'afterEach' is imported but never used.
- [!] `tests/unit/schemas/portDefinition.test.ts:31` — eslint/no-unused-vars: Variable 'key' is declared but never used. Unused variables should start with a '_'.
- [!] `tests/unit/engine/simulationEngine.test.ts:3` — import/no-duplicates: Modules should not be imported multiple times in the same file
- [!] `tests/e2e/export-report.spec.ts:5` — eslint/no-unused-vars: Identifier 'waitForBlueprints' is imported but never used.
- [!] `tests/e2e/unlocked-setup.ts:32` — unicorn/no-useless-fallback-in-spread: Empty fallbacks in spreads are unnecessary
- [!] `tests/e2e/port-handles.spec.ts:66` — eslint/no-unused-vars: Variable 'expressPortHandles' is declared but never used. Unused variables should start with a '_'.
- [!] `tests/e2e/global-setup.ts:20` — unicorn/no-useless-fallback-in-spread: Empty fallbacks in spreads are unnecessary

### security (10)

- [!] `package.json:0` — security/vulnerable-dependency: Vulnerable dependency (npm audit): @google-cloud/firestore (moderate)
- [!] `package.json:0` — security/vulnerable-dependency: Vulnerable dependency (npm audit): @google-cloud/storage (moderate)
- [!] `package.json:0` — security/vulnerable-dependency: Vulnerable dependency (npm audit): firebase-admin (moderate)
- [!] `package.json:0` — security/vulnerable-dependency: Vulnerable dependency (npm audit): gaxios (moderate)
- [!] `package.json:0` — security/vulnerable-dependency: Vulnerable dependency (npm audit): google-gax (moderate)
- [!!!] `package.json:0` — security/vulnerable-dependency: Vulnerable dependency (npm audit): react-router (high)
- [!!!] `package.json:0` — security/vulnerable-dependency: Vulnerable dependency (npm audit): react-router-dom (high)
- [!] `package.json:0` — security/vulnerable-dependency: Vulnerable dependency (npm audit): retry-request (moderate)
- [!] `package.json:0` — security/vulnerable-dependency: Vulnerable dependency (npm audit): teeny-request (moderate)
- [!] `package.json:0` — security/vulnerable-dependency: Vulnerable dependency (npm audit): uuid (moderate)

