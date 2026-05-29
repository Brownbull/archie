# aislop Quality Report

**Date:** 20260529-160951
**Score:** 9/100 (Critical)
**Scan:** `aislop scan --staged`

## Engine Summary

| Engine | Issues | Time |
|--------|--------|------|
| lint | 20 | 269ms |
| code-quality | 103 | 3248ms |
| ai-slop | 0 | 9ms |
| security | 8 | 1836ms |

## Findings

### code-quality (103)

- [!] `src/declarations.d.ts:0` — knip/files: Unused file
- [!] `package.json:41` — knip/dependencies: Unused dependency: tailwindcss
- [!] `package.json:66` — knip/devDependencies: Unused devDependency: shadcn
- [!] `package.json:68` — knip/devDependencies: Unused devDependency: tw-animate-css
- [!] `src/lib/constants.ts:183` — knip/exports: Unused export: SLUG_ID_FORMAT
- [!] `src/lib/constants.ts:50` — knip/types: Unused type: ReplicaType
- [!] `src/lib/constants.ts:52` — knip/types: Unused type: ScalingRule
- [!] `src/lib/constants.ts:186` — knip/types: Unused type: StackComponent
- [!] `src/lib/constants.ts:197` — knip/types: Unused type: StackConnection
- [!] `src/lib/constants.ts:204` — knip/types: Unused type: StackCategoryScore
- [!] `src/lib/constants.ts:276` — knip/types: Unused type: TailwindZIndex
- [!] `src/lib/constants.ts:406` — knip/types: Unused type: FailurePresetId
- [!] `src/lib/constants.ts:0` — knip/duplicates: Duplicate export: unknown
- [!] `src/schemas/demandSchema.ts:115` — knip/exports: Unused export: TrafficCurvePointSchema
- [!] `src/schemas/metricCategorySchema.ts:39` — knip/types: Unused type: ScoreInterpretation
- [!] `src/schemas/componentSchema.ts:159` — knip/types: Unused type: ConnectionProperties
- [!] `src/schemas/componentSchema.ts:160` — knip/types: Unused type: PortDefinitionZod
- [!] `src/schemas/blueprintSchema.ts:42` — knip/types: Unused type: Blueprint
- [!] `src/stores/challengeStore.ts:6` — knip/types: Unused type: AttemptState
- [!] `src/stores/challengeStore.ts:9` — knip/types: Unused type: AttemptSnapshot
- [!] `src/stores/simulationStore.ts:6` — knip/types: Unused type: SimulationStatus
- [!] `src/stores/architectureStore.ts:811` — knip/types: Unused type: ArchitectureSkeleton
- [!] `src/engine/dashboardCalculator.ts:8` — knip/types: Unused type: ComponentCategoryMetric
- [!] `src/engine/dashboardCalculator.ts:13` — knip/types: Unused type: CategoryBreakdown
- [!] `src/engine/recalculator.ts:13` — knip/types: Unused type: MetricAdjustment
- [!] `src/services/recalculationService.ts:23` — knip/types: Unused type: RecalculationResult
- [!] `src/lib/demandTypes.ts:6` — knip/types: Unused type: DemandVariableMetadata
- [!] `src/lib/demandTypes.ts:14` — knip/types: Unused type: DemandLevelMeta
- [!] `src/lib/demandTypes.ts:100` — knip/types: Unused type: FailureResponse
- [!] `src/services/stackPlacement.ts:16` — knip/types: Unused type: StackPlacementResult
- [!] `src/engine/compatibilityChecker.ts:3` — knip/types: Unused type: CompatibilityResult
- [!] `src/services/yamlImporter.ts:39` — knip/types: Unused type: HydratedArchitecture
- [!] `src/services/yamlImporter.ts:51` — knip/types: Unused type: ImportResult
- [!] `src/engine/demandEngine.ts:7` — knip/types: Unused type: AdjustedMetric
- [!] `src/engine/ghostSuggestionEngine.ts:10` — knip/types: Unused type: GhostPlacement
- [!] `src/engine/portCompatibilityChecker.ts:4` — knip/types: Unused type: PortCompatibilityResult
- [!] `src/types/index.ts:2` — knip/types: Unused type: WeightProfile
- [!] `src/types/index.ts:3` — knip/types: Unused type: Constraint
- [!] `src/types/index.ts:4` — knip/types: Unused type: ConstraintOperator
- [!] `src/types/index.ts:5` — knip/types: Unused type: ParsedConstraint
- [!] `src/types/index.ts:6` — knip/types: Unused type: StackComponent
- [!] `src/types/index.ts:7` — knip/types: Unused type: StackConnection
- [!] `src/types/index.ts:8` — knip/types: Unused type: StackCategoryScore
- [!] `src/types/index.ts:11` — knip/types: Unused type: AccessPattern
- [!] `src/types/index.ts:12` — knip/types: Unused type: DataSize
- [!] `src/types/index.ts:13` — knip/types: Unused type: StructureType
- [!] `src/types/index.ts:14` — knip/types: Unused type: FitLevel
- [!] `src/types/index.ts:15` — knip/types: Unused type: FitCompatibility
- [!] `src/types/index.ts:16` — knip/types: Unused type: DataContextItem
- [!] `src/types/index.ts:17` — knip/types: Unused type: FitFactor
- [!] `src/types/index.ts:18` — knip/types: Unused type: FitResult
- [!] `src/types/index.ts:21` — knip/types: Unused type: MetricCategory
- [!] `src/types/index.ts:21` — knip/types: Unused type: ScoreInterpretation
- [!] `src/types/index.ts:27` — knip/types: Unused type: ConnectionProperties
- [!] `src/types/index.ts:28` — knip/types: Unused type: PortDefinitionZod
- [!] `src/types/index.ts:30` — knip/types: Unused type: PortType
- [!] `src/types/index.ts:30` — knip/types: Unused type: PortDefinition
- [!] `src/types/index.ts:31` — knip/types: Unused type: Stack
- [!] `src/types/index.ts:31` — knip/types: Unused type: StackDefinition
- [!] `src/types/index.ts:32` — knip/types: Unused type: Blueprint
- [!] `src/types/index.ts:33` — knip/types: Unused type: ArchieEdgeData
- [!] `src/types/index.ts:34` — knip/types: Unused type: CompatibilityResult
- [!] `src/types/index.ts:36` — knip/types: Unused type: PortCompatibilityResult
- [!] `src/types/index.ts:37` — knip/types: Unused type: PortLookupContext
- [!] `src/types/index.ts:40` — knip/types: Unused type: TopologyIssue
- [!] `src/types/index.ts:41` — knip/types: Unused type: TopologyIssueType
- [!] `src/types/index.ts:42` — knip/types: Unused type: TopologyIssueSeverity
- [!] `src/types/index.ts:45` — knip/types: Unused type: RecalculatedMetrics
- [!] `src/types/index.ts:46` — knip/types: Unused type: ArchitectureMetrics
- [!] `src/types/index.ts:47` — knip/types: Unused type: ConnectedNodeInfo
- [!] `src/types/index.ts:48` — knip/types: Unused type: MetricAdjustment
- [!] `src/types/index.ts:50` — knip/types: Unused type: PropagationHop
- [!] `src/types/index.ts:51` — knip/types: Unused type: RecalculationResult
- [!] `src/types/index.ts:52` — knip/types: Unused type: HeatmapStatus
- [!] `src/types/index.ts:53` — knip/types: Unused type: CategoryScore
- [!] `src/types/index.ts:53` — knip/types: Unused type: CategoryBreakdown
- [!] `src/types/index.ts:53` — knip/types: Unused type: ComponentCategoryMetric
- [!] `src/types/index.ts:54` — knip/types: Unused type: VariantRecommendation
- [!] `src/types/index.ts:55` — knip/types: Unused type: ConstraintViolation
- [!] `src/types/index.ts:56` — knip/types: Unused type: PathwaySuggestion
- [!] `src/types/index.ts:57` — knip/types: Unused type: AdjustedMetric
- [!] `src/types/index.ts:58` — knip/types: Unused type: PathwaySuggestionsResult
- [!] `src/types/index.ts:60` — knip/types: Unused type: TierDefinition
- [!] `src/types/index.ts:61` — knip/types: Unused type: TierResult
- [!] `src/types/index.ts:62` — knip/types: Unused type: TierGap
- [!] `src/types/index.ts:63` — knip/types: Unused type: TierRequirement
- [!] `src/types/index.ts:66` — knip/types: Unused type: ArchitectureFile
- [!] `src/types/index.ts:67` — knip/types: Unused type: ArchitectureFileNode
- [!] `src/types/index.ts:68` — knip/types: Unused type: ArchitectureFileEdge
- [!] `src/types/index.ts:70` — knip/types: Unused type: DemandVariable
- [!] `src/types/index.ts:70` — knip/types: Unused type: DemandLevel
- [!] `src/types/index.ts:72` — knip/types: Unused type: DemandResponse
- [!] `src/types/index.ts:73` — knip/types: Unused type: DemandProfile
- [!] `src/types/index.ts:74` — knip/types: Unused type: ScenarioPreset
- [!] `src/types/index.ts:75` — knip/types: Unused type: DemandVariableMetadata
- [!] `src/types/index.ts:76` — knip/types: Unused type: DemandLevelMeta
- [!] `src/engine/suggestionEngine.ts:39` — knip/types: Unused type: SuggestionChangeType
- [!] `src/hooks/useEdgeOverlay.ts:7` — knip/types: Unused type: EdgeOverlayStyle
- [!] `src/stores/uiStore.ts:10` — knip/types: Unused type: DragSource
- [!] `src/stores/uiStore.ts:14` — knip/types: Unused type: ContextMenuState
- [!] `src/hooks/useNodeOverlay.ts:8` — knip/types: Unused type: NodeOverlayInfo
- [!] `src/stores/preferencesStore.ts:4` — knip/types: Unused type: Theme
- [!] `src/stores/preferencesStore.ts:5` — knip/types: Unused type: FontSize

### lint (20)

- [!] `src/components/dashboard/DashboardOverlay.tsx:232` — jsx-a11y/prefer-tag-over-role: Prefer `button` over `role` attribute `button`.
- [!] `src/components/inspector/ComponentSwapper.tsx:27` — jsx-a11y/label-has-associated-control: A form label must be associated with a control.
- [!] `src/services/yamlImporter.ts:137` — eslint/no-unused-vars: Catch parameter '_err' is caught but never used.
- [!] `tests/unit/services/yamlImporter-v3-migration.test.ts:4` — eslint/no-unused-vars: Identifier 'setPortResolver' is imported but never used.
- [!] `src/components/inspector/ConfigSelector.tsx:23` — jsx-a11y/label-has-associated-control: A form label must be associated with a control.
- [!] `src/components/dashboard/CategoryBar.tsx:30` — jsx-a11y/no-static-element-interactions: Static HTML elements with event handlers require a role.
- [!] `src/components/inspector/FitIndicator.tsx:55` — jsx-a11y/prefer-tag-over-role: Prefer `button` over `role` attribute `button`.
- [!] `src/components/canvas/ArchieNode.tsx:7` — import/no-duplicates: Module '@/lib/constants' is imported more than once in this file
- [!] `src/components/canvas/ArchieNode.tsx:209` — jsx-a11y/click-events-have-key-events: Enforce a clickable non-interactive element has at least one keyboard event listener.
- [!] `src/components/canvas/ArchieNode.tsx:209` — jsx-a11y/no-static-element-interactions: Static HTML elements with event handlers require a role.
- [!] `src/components/inspector/MetricBar.tsx:25` — jsx-a11y/click-events-have-key-events: Enforce a clickable non-interactive element has at least one keyboard event listener.
- [!] `src/components/inspector/MetricBar.tsx:25` — jsx-a11y/no-static-element-interactions: Static HTML elements with event handlers require a role.
- [!] `tests/e2e/status-dot-and-swap-popover.spec.ts:144` — eslint/no-unused-vars: Variable 'node' is declared but never used. Unused variables should start with a '_'.
- [!] `tests/integration/data-context-flow.test.ts:4` — eslint/no-unused-vars: Type 'FitLevel' is imported but never used.
- [!] `tests/unit/schemas/portDefinition.test.ts:31` — eslint/no-unused-vars: Variable 'key' is declared but never used. Unused variables should start with a '_'.
- [!] `tests/unit/schemas/challengeSchema.test.ts:31` — eslint/no-unused-vars: Variable 'scheduled_events' is declared but never used. Unused variables should start with a '_'.
- [!] `tests/unit/schemas/challengeSchema.test.ts:31` — eslint/no-unused-vars: Variable 'hints' is declared but never used. Unused variables should start with a '_'.
- [!] `tests/unit/engine/simulationEngine.test.ts:3` — import/no-duplicates: Modules should not be imported multiple times in the same file
- [!] `tests/e2e/export-report.spec.ts:5` — eslint/no-unused-vars: Identifier 'waitForBlueprints' is imported but never used.
- [!] `tests/e2e/port-handles.spec.ts:66` — eslint/no-unused-vars: Variable 'expressPortHandles' is declared but never used. Unused variables should start with a '_'.

### security (8)

- [!] `package.json:0` — security/vulnerable-dependency: Vulnerable dependency (npm audit): @google-cloud/firestore (moderate)
- [!] `package.json:0` — security/vulnerable-dependency: Vulnerable dependency (npm audit): @google-cloud/storage (moderate)
- [!] `package.json:0` — security/vulnerable-dependency: Vulnerable dependency (npm audit): firebase-admin (moderate)
- [!] `package.json:0` — security/vulnerable-dependency: Vulnerable dependency (npm audit): gaxios (moderate)
- [!] `package.json:0` — security/vulnerable-dependency: Vulnerable dependency (npm audit): google-gax (moderate)
- [!] `package.json:0` — security/vulnerable-dependency: Vulnerable dependency (npm audit): retry-request (moderate)
- [!] `package.json:0` — security/vulnerable-dependency: Vulnerable dependency (npm audit): teeny-request (moderate)
- [!] `package.json:0` — security/vulnerable-dependency: Vulnerable dependency (npm audit): uuid (moderate)

