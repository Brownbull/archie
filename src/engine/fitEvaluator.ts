import type { DataContextItem, FitResult, FitFactor, FitLevel, FitCompatibility } from "@/lib/constants"
import { sanitizeDisplayString } from "@/lib/sanitize"

// --- Compatibility Mapping ---

/** Maps component library string values to FitCompatibility. Unknown values → "neutral". */
const DATA_FIT_COMPATIBILITY_MAP: Record<string, FitCompatibility> = {
  great: "positive",
  good: "positive",
  neutral: "neutral",
  poor: "negative",
  incompatible: "negative",
}

function toFitCompatibility(value: string | undefined): FitCompatibility {
  if (!value) return "neutral"
  return DATA_FIT_COMPATIBILITY_MAP[value.toLowerCase()] ?? "neutral"
}

// --- Aggregation ---

/**
 * Aggregates factor compatibility counts into a FitLevel.
 *
 * | Positive | Negative | Result     |
 * |----------|----------|------------|
 * | 3        | 0        | great-fit  |
 * | >0       | 0        | good-fit   |
 * | 0        | 3        | risky      |
 * | 0        | >0       | poor-fit   |
 * | mixed or all neutral | trade-off |
 */
function aggregateToFitLevel(factors: FitFactor[]): FitLevel {
  let positive = 0
  let negative = 0
  for (const f of factors) {
    if (f.compatibility === "positive") positive++
    if (f.compatibility === "negative") negative++
  }

  if (negative === 0 && positive === factors.length) return "great-fit"
  if (negative === 0 && positive > 0) return "good-fit"
  if (positive === 0 && negative === factors.length) return "risky"
  if (positive === 0 && negative > 0) return "poor-fit"
  return "trade-off"
}

// --- Dimension Labels ---

const DIMENSION_LABELS: Record<string, string> = {
  accessPattern: "Access Pattern",
  averageSize: "Data Size",
  structureType: "Structure Type",
}

// --- Public API ---

/**
 * Evaluates how well a data context item fits a component variant.
 *
 * Pure function — no React, Zustand, or side effects (AC-ARCH-NO-2).
 * Fit rules are data-driven via dataFitProfile from the component library (AC-ARCH-PATTERN-4).
 *
 * @param item - The data context item to evaluate
 * @param dataFitProfile - Variant's compatibility matrix (keys = dimension values, values = compatibility strings).
 *   Undefined or empty → fallback to "trade-off" with explanatory message.
 * @returns FitResult with level, explanation, and per-dimension factors
 */
export function evaluateFit(
  item: DataContextItem,
  dataFitProfile: Record<string, string> | undefined,
): FitResult {
  if (!dataFitProfile || Object.keys(dataFitProfile).length === 0) {
    return {
      level: "trade-off",
      explanation: "No compatibility data available for this component variant. The fit cannot be determined.",
      factors: [],
    }
  }

  const dimensions: { key: string; value: string }[] = [
    { key: "accessPattern", value: item.accessPattern },
    { key: "averageSize", value: item.averageSize },
    { key: "structureType", value: item.structureType },
  ]

  const factors: FitFactor[] = dimensions.map(({ key, value }) => {
    const profileValue = dataFitProfile[value]
    return {
      dimension: DIMENSION_LABELS[key] ?? key,
      compatibility: toFitCompatibility(profileValue),
      detail: profileValue ? sanitizeDisplayString(profileValue, 200) : "No data available",
    }
  })

  const level = aggregateToFitLevel(factors)

  const factorSummaries = factors
    .map((f) => `${f.dimension}: ${f.detail} (${f.compatibility})`)
    .join("; ")
  const explanation = `${level.replaceAll("-", " ")} — ${factorSummaries}`

  return { level, explanation, factors }
}

/**
 * Evaluates fit for multiple data context items against the same variant profile.
 * Convenience wrapper — each item evaluation is O(1).
 */
export function evaluateFitBatch(
  items: DataContextItem[],
  dataFitProfile: Record<string, string> | undefined,
): FitResult[] {
  return items.map((item) => evaluateFit(item, dataFitProfile))
}
