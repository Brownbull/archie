export type {
  WeightProfile,
  Constraint,
  ConstraintOperator,
  ParsedConstraint,
  StackComponent,
  StackConnection,
  StackCategoryScore,
} from "@/lib/constants"
export type {
  AccessPattern,
  DataSize,
  StructureType,
  FitLevel,
  FitCompatibility,
  DataContextItem,
  FitFactor,
  FitResult,
} from "@/lib/constants"
export type { MetricValue } from "@/schemas/metricSchema"
export type { MetricCategory, ScoreInterpretation } from "@/schemas/metricCategorySchema"
export type {
  Component,
  ConfigVariant,
  CodeSnippet,
  MetricExplanation,
  ConnectionProperties,
} from "@/schemas/componentSchema"
export type { Stack, StackDefinition } from "@/schemas/stackSchema"
export type { Blueprint } from "@/schemas/blueprintSchema"
export type { ArchieEdgeData } from "@/stores/architectureStore"
export type { CompatibilityResult } from "@/engine/compatibilityChecker"
export type {
  RecalculatedMetrics,
  ArchitectureMetrics,
  ConnectedNodeInfo,
  MetricAdjustment,
} from "@/engine/recalculator"
export type { PropagationHop } from "@/engine/propagator"
export type { RecalculationResult } from "@/services/recalculationService"
export type { HeatmapStatus } from "@/engine/heatmapCalculator"
export type { CategoryScore, CategoryBreakdown, ComponentCategoryMetric } from "@/engine/dashboardCalculator"
export type { VariantRecommendation } from "@/engine/recommendationEngine"
export type { ConstraintViolation } from "@/engine/constraintEvaluator"
export type {
  TierDefinition,
  TierResult,
  TierGap,
  TierRequirement,
} from "@/lib/tierDefinitions"
export type {
  ArchitectureFile,
  ArchitectureFileNode,
  ArchitectureFileEdge,
} from "@/schemas/architectureFileSchema"
