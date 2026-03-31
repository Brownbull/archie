# aislop Quality Report

**Date:** 20260327-221029
**Score:** 9/100 (Critical)
**Scan:** `aislop scan --staged`

## Engine Summary

| Engine | Issues | Time |
|--------|--------|------|
| lint | 9 | 484ms |
| code-quality | 79 | 3535ms |
| ai-slop | 0 | 13ms |
| security | 16 | 2927ms |

## Findings

### code-quality (79)

- [!] `src/declarations.d.ts:0` — knip/files: Unused file
- [!] `package.json:41` — knip/dependencies: Unused dependency: tailwindcss
- [!] `package.json:66` — knip/devDependencies: Unused devDependency: shadcn
- [!] `package.json:68` — knip/devDependencies: Unused devDependency: tw-animate-css
- [!] `src/lib/constants.ts:131` — knip/exports: Unused export: SLUG_ID_FORMAT
- [!] `src/lib/constants.ts:134` — knip/types: Unused type: StackComponent
- [!] `src/lib/constants.ts:145` — knip/types: Unused type: StackConnection
- [!] `src/lib/constants.ts:152` — knip/types: Unused type: StackCategoryScore
- [!] `src/lib/constants.ts:224` — knip/types: Unused type: TailwindZIndex
- [!] `src/lib/constants.ts:0` — knip/duplicates: Duplicate export: unknown
- [!] `src/schemas/metricCategorySchema.ts:39` — knip/types: Unused type: ScoreInterpretation
- [!] `src/schemas/componentSchema.ts:129` — knip/types: Unused type: ConnectionProperties
- [!] `src/schemas/blueprintSchema.ts:42` — knip/types: Unused type: Blueprint
- [!] `src/engine/dashboardCalculator.ts:8` — knip/types: Unused type: ComponentCategoryMetric
- [!] `src/engine/dashboardCalculator.ts:13` — knip/types: Unused type: CategoryBreakdown
- [!] `src/engine/recalculator.ts:13` — knip/types: Unused type: MetricAdjustment
- [!] `src/stores/architectureStore.ts:755` — knip/types: Unused type: ArchitectureSkeleton
- [!] `src/services/recalculationService.ts:23` — knip/types: Unused type: RecalculationResult
- [!] `src/lib/demandTypes.ts:5` — knip/types: Unused type: DemandVariableMetadata
- [!] `src/lib/demandTypes.ts:13` — knip/types: Unused type: DemandLevelMeta
- [!] `src/services/stackPlacement.ts:16` — knip/types: Unused type: StackPlacementResult
- [!] `src/engine/compatibilityChecker.ts:3` — knip/types: Unused type: CompatibilityResult
- [!] `src/services/yamlImporter.ts:37` — knip/types: Unused type: HydratedArchitecture
- [!] `src/services/yamlImporter.ts:48` — knip/types: Unused type: ImportResult
- [!] `src/engine/demandEngine.ts:7` — knip/types: Unused type: AdjustedMetric
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
- [!] `src/types/index.ts:29` — knip/types: Unused type: Stack
- [!] `src/types/index.ts:29` — knip/types: Unused type: StackDefinition
- [!] `src/types/index.ts:30` — knip/types: Unused type: Blueprint
- [!] `src/types/index.ts:31` — knip/types: Unused type: ArchieEdgeData
- [!] `src/types/index.ts:32` — knip/types: Unused type: CompatibilityResult
- [!] `src/types/index.ts:34` — knip/types: Unused type: RecalculatedMetrics
- [!] `src/types/index.ts:35` — knip/types: Unused type: ArchitectureMetrics
- [!] `src/types/index.ts:36` — knip/types: Unused type: ConnectedNodeInfo
- [!] `src/types/index.ts:37` — knip/types: Unused type: MetricAdjustment
- [!] `src/types/index.ts:39` — knip/types: Unused type: PropagationHop
- [!] `src/types/index.ts:40` — knip/types: Unused type: RecalculationResult
- [!] `src/types/index.ts:41` — knip/types: Unused type: HeatmapStatus
- [!] `src/types/index.ts:42` — knip/types: Unused type: CategoryScore
- [!] `src/types/index.ts:42` — knip/types: Unused type: CategoryBreakdown
- [!] `src/types/index.ts:42` — knip/types: Unused type: ComponentCategoryMetric
- [!] `src/types/index.ts:43` — knip/types: Unused type: VariantRecommendation
- [!] `src/types/index.ts:44` — knip/types: Unused type: ConstraintViolation
- [!] `src/types/index.ts:45` — knip/types: Unused type: PathwaySuggestion
- [!] `src/types/index.ts:46` — knip/types: Unused type: AdjustedMetric
- [!] `src/types/index.ts:47` — knip/types: Unused type: PathwaySuggestionsResult
- [!] `src/types/index.ts:49` — knip/types: Unused type: TierDefinition
- [!] `src/types/index.ts:50` — knip/types: Unused type: TierResult
- [!] `src/types/index.ts:51` — knip/types: Unused type: TierGap
- [!] `src/types/index.ts:52` — knip/types: Unused type: TierRequirement
- [!] `src/types/index.ts:55` — knip/types: Unused type: ArchitectureFile
- [!] `src/types/index.ts:56` — knip/types: Unused type: ArchitectureFileNode
- [!] `src/types/index.ts:57` — knip/types: Unused type: ArchitectureFileEdge
- [!] `src/types/index.ts:59` — knip/types: Unused type: DemandVariable
- [!] `src/types/index.ts:59` — knip/types: Unused type: DemandLevel
- [!] `src/types/index.ts:61` — knip/types: Unused type: DemandResponse
- [!] `src/types/index.ts:62` — knip/types: Unused type: DemandProfile
- [!] `src/types/index.ts:63` — knip/types: Unused type: ScenarioPreset
- [!] `src/types/index.ts:64` — knip/types: Unused type: DemandVariableMetadata
- [!] `src/types/index.ts:65` — knip/types: Unused type: DemandLevelMeta
- [!] `src/stores/preferencesStore.ts:4` — knip/types: Unused type: Theme
- [!] `src/stores/preferencesStore.ts:5` — knip/types: Unused type: FontSize

### lint (9)

- [!] `src/components/inspector/ComponentSwapper.tsx:27` — jsx-a11y/label-has-associated-control: A form label must be associated with a control.
- [!] `src/components/dashboard/DashboardOverlay.tsx:232` — jsx-a11y/prefer-tag-over-role: Prefer `button` over `role` attribute `button`.
- [!] `src/components/inspector/FitIndicator.tsx:55` — jsx-a11y/prefer-tag-over-role: Prefer `button` over `role` attribute `button`.
- [!] `src/services/yamlImporter.ts:134` — eslint/no-unused-vars: Catch parameter '_err' is caught but never used.
- [!] `src/components/dashboard/CategoryBar.tsx:30` — jsx-a11y/no-static-element-interactions: Static HTML elements with event handlers require a role.
- [!] `src/components/inspector/ConfigSelector.tsx:23` — jsx-a11y/label-has-associated-control: A form label must be associated with a control.
- [!] `src/components/inspector/MetricBar.tsx:25` — jsx-a11y/click-events-have-key-events: Enforce a clickable non-interactive element has at least one keyboard event listener.
- [!] `src/components/inspector/MetricBar.tsx:25` — jsx-a11y/no-static-element-interactions: Static HTML elements with event handlers require a role.
- [!] `tests/integration/data-context-flow.test.ts:4` — eslint/no-unused-vars: Type 'FitLevel' is imported but never used.

### security (16)

- [!] `package.json:0` — security/vulnerable-dependency: Vulnerable dependency (npm audit): @google-cloud/firestore (low)
- [!] `package.json:0` — security/vulnerable-dependency: Vulnerable dependency (npm audit): @google-cloud/storage (low)
- [!] `package.json:0` — security/vulnerable-dependency: Vulnerable dependency (npm audit): @tootallnate/once (low)
- [!] `package.json:0` — security/vulnerable-dependency: Vulnerable dependency (npm audit): brace-expansion (moderate)
- [!!!] `package.json:0` — security/vulnerable-dependency: Vulnerable dependency (npm audit): fast-xml-parser (high)
- [!] `package.json:0` — security/vulnerable-dependency: Vulnerable dependency (npm audit): firebase-admin (low)
- [!!!] `package.json:0` — security/vulnerable-dependency: Vulnerable dependency (npm audit): flatted (high)
- [!] `package.json:0` — security/vulnerable-dependency: Vulnerable dependency (npm audit): google-gax (low)
- [!] `package.json:0` — security/vulnerable-dependency: Vulnerable dependency (npm audit): http-proxy-agent (low)
- [!!!] `package.json:0` — security/vulnerable-dependency: Vulnerable dependency (npm audit): node-forge (high)
- [!!!] `package.json:0` — security/vulnerable-dependency: Vulnerable dependency (npm audit): path-to-regexp (high)
- [!!!] `package.json:0` — security/vulnerable-dependency: Vulnerable dependency (npm audit): picomatch (high)
- [!] `package.json:0` — security/vulnerable-dependency: Vulnerable dependency (npm audit): retry-request (low)
- [!] `package.json:0` — security/vulnerable-dependency: Vulnerable dependency (npm audit): smol-toml (moderate)
- [!] `package.json:0` — security/vulnerable-dependency: Vulnerable dependency (npm audit): teeny-request (low)
- [!] `package.json:0` — security/vulnerable-dependency: Vulnerable dependency (npm audit): yaml (moderate)

