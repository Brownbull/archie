import type { MetricValue } from "@/schemas/metricSchema"
import type { DemandResponse, DemandProfile, FailureModifiers } from "@/lib/demandTypes"
import { DEMAND_METRIC_FLOOR, DEMAND_METRIC_CEILING, DEMAND_VARIABLE_VALUES } from "@/lib/constants"

// --- Types ---

export type AdjustedMetric = MetricValue & {
  demandMultiplier: number
  originalValue: number
}

// --- Pure Functions ---

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

// Thresholds align with the 1-10 directional scale: low=1-3, medium=4-7, high=8-10
function deriveValueEnum(numericValue: number): "low" | "medium" | "high" {
  if (numericValue <= 3) return "low"
  if (numericValue <= 7) return "medium"
  return "high"
}

/**
 * Applies demand modifiers to a single component's base metrics.
 * Pure function — no side effects, no store/service imports.
 *
 * Multiplicative stacking: effectiveValue = baseValue * m1 * m2 * ...
 * Clamped to [DEMAND_METRIC_FLOOR, DEMAND_METRIC_CEILING].
 * demandMultiplier = clampedValue / originalValue.
 */
export function applyDemandModifiers(
  baseMetrics: MetricValue[],
  demandResponses: DemandResponse | undefined,
  demandProfile: DemandProfile | null | undefined,
): AdjustedMetric[] {
  // AC-6: No scenario = identity
  if (!demandProfile) {
    return baseMetrics.map((m) => ({
      ...m,
      demandMultiplier: 1.0,
      originalValue: m.numericValue,
    }))
  }

  return baseMetrics.map((metric) => {
    let combinedMultiplier = 1.0

    // Iterate canonical variable list for deterministic ordering
    for (const variable of DEMAND_VARIABLE_VALUES) {
      const level = demandProfile[variable]
      const modifier = demandResponses?.[variable]?.[level]?.[metric.id]
      if (modifier !== undefined) {
        combinedMultiplier *= modifier
      }
      // AC-2: missing modifier = 1.0 (no-op)
    }

    const rawValue = metric.numericValue * combinedMultiplier
    const clampedValue = clamp(rawValue, DEMAND_METRIC_FLOOR, DEMAND_METRIC_CEILING)

    return {
      ...metric,
      numericValue: clampedValue,
      value: deriveValueEnum(clampedValue),
      demandMultiplier: clampedValue / (metric.numericValue || 1),
      originalValue: metric.numericValue,
    }
  })
}

/**
 * Applies failure modifiers to metrics (Level 4 — after demand at Level 3).
 * Pure function — flat per-metric multipliers, simpler than demand's per-variable/per-level structure.
 * Clamped to [DEMAND_METRIC_FLOOR, DEMAND_METRIC_CEILING].
 */
export function applyFailureModifiers(
  baseMetrics: MetricValue[],
  failureModifiers: FailureModifiers | null | undefined,
): MetricValue[] {
  // Identity fast-path: returns same array reference when no modifiers apply.
  // Normal path returns new objects via .map(). Callers should not rely on reference equality.
  if (!failureModifiers || Object.keys(failureModifiers).length === 0) return baseMetrics

  return baseMetrics.map((metric) => {
    const modifier = failureModifiers[metric.id]
    if (modifier === undefined) return metric
    const rawValue = metric.numericValue * modifier
    const clampedValue = clamp(rawValue, DEMAND_METRIC_FLOOR, DEMAND_METRIC_CEILING)
    return {
      ...metric,
      numericValue: clampedValue,
      value: deriveValueEnum(clampedValue),
    }
  })
}

/**
 * Computes demand-adjusted metrics for all canvas components.
 * Pure function — caller assembles the input maps.
 */
export function computeDemandAdjustedMetrics(
  nodeMetrics: Map<string, MetricValue[]>,
  nodeDemandResponses: Map<string, DemandResponse | undefined>,
  demandProfile: DemandProfile | null | undefined,
): Map<string, AdjustedMetric[]> {
  const result = new Map<string, AdjustedMetric[]>()

  for (const [nodeId, metrics] of nodeMetrics) {
    const demandResponses = nodeDemandResponses.get(nodeId)
    result.set(nodeId, applyDemandModifiers(metrics, demandResponses, demandProfile))
  }

  return result
}
