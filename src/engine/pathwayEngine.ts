import type { TierRequirement } from "@/lib/tierDefinitions"
import type { Component } from "@/schemas/componentSchema"
import type { WeightProfile, Constraint, DataContextItem, FitLevel } from "@/lib/constants"
import { getWeight } from "@/lib/weightUtils"
import { evaluateFit } from "@/engine/fitEvaluator"
import { PATHWAY_SUGGESTION_LIMIT } from "@/lib/constants"

// --- Types ---

export interface PathwaySuggestion {
  componentId: string
  componentName: string
  category: string
  gapClosed: string
  weightedScore: number
  isConstraintSafe: boolean
  constraintWarning?: string
  fitLevel?: FitLevel
  fitExplanation?: string
  reason: string
}

// --- Internal Types ---

/** Gap type priority: lower number = higher priority in interleaving */
const GAP_PRIORITY: Record<TierRequirement["type"], number> = {
  required_categories: 0,
  min_category_score: 1,
  min_distinct_categories: 2,
  min_component_count: 3,
}

/** FitLevel ordering: lower index = better fit */
const FIT_LEVEL_ORDER: Record<FitLevel, number> = {
  "great-fit": 0,
  "good-fit": 1,
  "trade-off": 2,
  "poor-fit": 3,
  risky: 4,
}

interface RawSuggestion extends PathwaySuggestion {
  gapType: TierRequirement["type"]
  secondaryGaps: string[]
}

// --- Private Helpers ---

/**
 * Groups MetricValue entries by category and computes per-category sum and count.
 * Shared accumulation used by both weighted scoring and constraint safety checks (Story 9-0).
 */
function groupMetricsByCategory(
  metrics: { category: string; numericValue: number }[],
): Map<string, { sum: number; count: number }> {
  const categorySums = new Map<string, { sum: number; count: number }>()
  for (const metric of metrics) {
    const entry = categorySums.get(metric.category) ?? { sum: 0, count: 0 }
    entry.sum += metric.numericValue
    entry.count++
    categorySums.set(metric.category, entry)
  }
  return categorySums
}

/**
 * Computes a weighted aggregate score for a component using its default variant metrics.
 * Formula matches computeWeightedAggregateScore in dashboardCalculator.ts:
 * sum(categoryAvg * weight) / sum(weights) for categories with data.
 */
function computeCandidateWeightedScore(
  component: Component,
  weightProfile: WeightProfile,
): number {
  const defaultVariant = component.configVariants[0]
  if (!defaultVariant || defaultVariant.metrics.length === 0) return 0

  const categorySums = groupMetricsByCategory(defaultVariant.metrics)

  let weightedSum = 0
  let totalWeight = 0
  for (const [categoryId, { sum, count }] of categorySums) {
    const avg = sum / count
    const weight = getWeight(categoryId, weightProfile)
    weightedSum += avg * weight
    totalWeight += weight
  }

  if (totalWeight === 0) return 0
  return weightedSum / totalWeight
}

/**
 * Checks if a component's default variant metrics would violate any active constraint.
 * Heuristic only — actual violation depends on BFS recalculation after placement.
 */
function checkConstraintSafety(
  component: Component,
  constraints: Constraint[],
): { safe: boolean; warning?: string } {
  if (constraints.length === 0) return { safe: true }

  const defaultVariant = component.configVariants[0]
  if (!defaultVariant) return { safe: true }

  // Group metrics by category and compute averages (shared helper, Story 9-0)
  const categorySums = groupMetricsByCategory(defaultVariant.metrics)
  const categoryAvgs = new Map<string, number>()
  for (const [catId, { sum, count }] of categorySums) {
    categoryAvgs.set(catId, sum / count)
  }

  for (const constraint of constraints) {
    const avg = categoryAvgs.get(constraint.categoryId)
    if (avg === undefined) continue

    const violated =
      constraint.operator === "lte"
        ? avg > constraint.threshold
        : avg < constraint.threshold

    if (violated) {
      return { safe: false, warning: constraint.label }
    }
  }

  return { safe: true }
}

/**
 * Computes the worst (most pessimistic) fit level for a component across all data context items.
 * Returns undefined fitLevel when no data context items exist (AC-4).
 */
function computeFitForCandidate(
  component: Component,
  dataContextItems: DataContextItem[],
): { fitLevel?: FitLevel; fitExplanation?: string } {
  if (dataContextItems.length === 0) {
    return { fitLevel: undefined, fitExplanation: undefined }
  }

  const defaultVariant = component.configVariants[0]
  const dataFitProfile = defaultVariant?.dataFitProfile

  let worstLevel: FitLevel | undefined
  let worstOrder = -1

  for (const item of dataContextItems) {
    const result = evaluateFit(item, dataFitProfile)
    const order = FIT_LEVEL_ORDER[result.level] ?? 2
    if (order > worstOrder) {
      worstOrder = order
      worstLevel = result.level
    }
  }

  return {
    fitLevel: worstLevel,
    fitExplanation: worstLevel
      ? `${worstLevel.replaceAll("-", " ")} across ${dataContextItems.length} data context item${dataContextItems.length > 1 ? "s" : ""}`
      : undefined,
  }
}

// --- Gap Handlers ---

function handleRequiredCategories(
  req: Extract<TierRequirement, { type: "required_categories" }>,
  allComponents: Component[],
  existingNodeCategories: Set<string>,
  existingNodeComponentIds: Set<string>,
  weightProfile: WeightProfile,
  nextTierName: string,
): RawSuggestion[] {
  const missingCategories = req.requiredCategories.filter(
    (cat) => !existingNodeCategories.has(cat),
  )

  const suggestions: RawSuggestion[] = []
  for (const category of missingCategories) {
    const candidates = allComponents.filter(
      (c) => c.category === category && !existingNodeComponentIds.has(c.id),
    )

    for (const comp of candidates) {
      suggestions.push({
        componentId: comp.id,
        componentName: comp.name,
        category: comp.category,
        gapClosed: req.description,
        weightedScore: computeCandidateWeightedScore(comp, weightProfile),
        isConstraintSafe: true,
        reason: `Adding ${comp.name} provides the required ${category} component for ${nextTierName}`,
        gapType: "required_categories",
        secondaryGaps: [],
      })
    }
  }

  return suggestions
}

function handleMinDistinctCategories(
  _req: Extract<TierRequirement, { type: "min_distinct_categories" }>,
  allComponents: Component[],
  existingNodeCategories: Set<string>,
  existingNodeComponentIds: Set<string>,
  weightProfile: WeightProfile,
  nextTierName: string,
): RawSuggestion[] {
  // Find all categories present in the component library
  const allCategories = new Set(allComponents.map((c) => c.category))
  const unrepresented = [...allCategories].filter(
    (cat) => !existingNodeCategories.has(cat),
  )

  const suggestions: RawSuggestion[] = []
  for (const category of unrepresented) {
    const candidates = allComponents.filter(
      (c) => c.category === category && !existingNodeComponentIds.has(c.id),
    )

    // Pick the best component in this category
    let best: Component | undefined
    let bestScore = -1
    for (const comp of candidates) {
      const score = computeCandidateWeightedScore(comp, weightProfile)
      if (score > bestScore) {
        bestScore = score
        best = comp
      }
    }

    if (best) {
      suggestions.push({
        componentId: best.id,
        componentName: best.name,
        category: best.category,
        gapClosed: _req.description,
        weightedScore: bestScore,
        isConstraintSafe: true,
        reason: `Adding ${best.name} adds a new category (${category}) toward ${nextTierName}`,
        gapType: "min_distinct_categories",
        secondaryGaps: [],
      })
    }
  }

  return suggestions
}

function handleMinCategoryScore(
  req: Extract<TierRequirement, { type: "min_category_score" }>,
  allComponents: Component[],
  existingNodeComponentIds: Set<string>,
  weightProfile: WeightProfile,
  categoryScores: Map<string, number>,
  nextTierName: string,
): RawSuggestion[] {
  const currentAvg = categoryScores.get(req.categoryId) ?? 0
  // Filter ALL components that have metrics in the deficient metric category
  // (metric category ≠ component category — e.g., a "compute" component has "performance" metrics)
  const candidates = allComponents.filter(
    (c) => !existingNodeComponentIds.has(c.id) &&
      c.configVariants[0]?.metrics.some((m) => m.category === req.categoryId),
  )

  const suggestions: RawSuggestion[] = []
  for (const comp of candidates) {
    const defaultVariant = comp.configVariants[0]
    if (!defaultVariant) continue

    // Compute candidate's average score in the deficient category
    const catMetrics = defaultVariant.metrics.filter(
      (m) => m.category === req.categoryId,
    )
    if (catMetrics.length === 0) continue

    // catMetrics presence already confirmed above
    suggestions.push({
      componentId: comp.id,
      componentName: comp.name,
      category: comp.category,
      gapClosed: req.description,
      weightedScore: computeCandidateWeightedScore(comp, weightProfile),
      isConstraintSafe: true,
      reason: `Adding ${comp.name} contributes ${req.categoryId} metrics toward ${req.minScore} for ${nextTierName} (current avg: ${Math.round(currentAvg * 10) / 10})`,
      gapType: "min_category_score",
      secondaryGaps: [],
    })
  }

  return suggestions
}

function handleMinComponentCount(
  _req: Extract<TierRequirement, { type: "min_component_count" }>,
  allComponents: Component[],
  existingNodeCategories: Set<string>,
  existingNodeComponentIds: Set<string>,
  weightProfile: WeightProfile,
  otherSuggestions: RawSuggestion[],
  nextTierName: string,
): RawSuggestion[] {
  // If other gap types already produced suggestions, take the top ones
  if (otherSuggestions.length > 0) {
    return []
  }

  // No other gaps — suggest the best overall component from any unrepresented category first
  const allCategories = new Set(allComponents.map((c) => c.category))
  const unrepresented = [...allCategories].filter(
    (cat) => !existingNodeCategories.has(cat),
  )

  const unrepresentedSet = new Set(unrepresented)
  const pool = unrepresentedSet.size > 0
    ? allComponents.filter(
        (c) => unrepresentedSet.has(c.category) && !existingNodeComponentIds.has(c.id),
      )
    : allComponents.filter((c) => !existingNodeComponentIds.has(c.id))

  const suggestions: RawSuggestion[] = []
  for (const comp of pool) {
    suggestions.push({
      componentId: comp.id,
      componentName: comp.name,
      category: comp.category,
      gapClosed: _req.description,
      weightedScore: computeCandidateWeightedScore(comp, weightProfile),
      isConstraintSafe: true,
      reason: `Adding ${comp.name} increases component count toward ${nextTierName}`,
      gapType: "min_component_count",
      secondaryGaps: [],
    })
  }

  return suggestions
}

// --- Deduplication ---

function deduplicateSuggestions(suggestions: RawSuggestion[]): RawSuggestion[] {
  const byComponent = new Map<string, RawSuggestion[]>()
  for (const s of suggestions) {
    const existing = byComponent.get(s.componentId) ?? []
    existing.push(s)
    byComponent.set(s.componentId, existing)
  }

  const deduped: RawSuggestion[] = []
  for (const [, group] of byComponent) {
    if (group.length === 1) {
      deduped.push(group[0])
      continue
    }

    // Sort by gap priority (most specific first)
    group.sort((a, b) => GAP_PRIORITY[a.gapType] - GAP_PRIORITY[b.gapType])

    const primary = { ...group[0] }
    primary.secondaryGaps = group.slice(1).map((g) => g.gapClosed)
    if (primary.secondaryGaps.length > 0) {
      primary.reason = `${primary.reason}. Also closes: ${primary.secondaryGaps.join("; ")}`
    }

    deduped.push(primary)
  }

  return deduped
}

// --- Requirement Check ---

/**
 * Checks whether a tier requirement is already met by the current architecture state.
 * Similar to tierEvaluator.ts but operates on plain Maps (not TierCategoryScore objects).
 */
function isRequirementMet(
  req: TierRequirement,
  existingNodeCategories: Set<string>,
  existingNodeComponentIds: Set<string>,
  categoryScores: Map<string, number>,
): boolean {
  switch (req.type) {
    case "min_component_count":
      return existingNodeComponentIds.size >= req.minCount

    case "min_distinct_categories":
      return existingNodeCategories.size >= req.minCount

    case "min_category_score": {
      const score = categoryScores.get(req.categoryId)
      if (score === undefined) return false
      return score >= req.minScore
    }

    case "required_categories":
      return req.requiredCategories.every((cat) => existingNodeCategories.has(cat))
  }
}

// --- Main Engine ---

/**
 * Computes ranked pathway suggestions that would help close tier gaps.
 *
 * Pure function — no store imports, no service imports, no side effects (AC-ARCH-PATTERN-1).
 * Deterministic: same inputs = same output.
 *
 * @param tierRequirements - Requirements from the next tier definition
 * @param allComponents - Full component library (from componentLibrary.getAllComponents())
 * @param existingNodeCategories - Categories already on the canvas
 * @param existingNodeComponentIds - Component IDs already placed on the canvas
 * @param weightProfile - Active weight profile for scoring
 * @param constraints - Active constraint definitions
 * @param dataContextItems - Data context items from the architecture
 * @param categoryScores - Current weighted category scores (categoryId → score)
 * @param nextTierName - Name of the next tier (for human-readable reasons)
 */
export function computePathwaySuggestions(
  tierRequirements: TierRequirement[],
  allComponents: Component[],
  existingNodeCategories: Set<string>,
  existingNodeComponentIds: Set<string>,
  weightProfile: WeightProfile,
  constraints: Constraint[],
  dataContextItems: DataContextItem[],
  categoryScores: Map<string, number>,
  nextTierName?: string,
): PathwaySuggestion[] {
  if (tierRequirements.length === 0) return []
  if (allComponents.length === 0) return []

  const tierLabel = nextTierName ?? "next tier"

  // Phase 1: Generate raw suggestions per unmet requirement
  // Sort by gap priority so min_component_count processes last (it defers to other gap types)
  const sortedReqs = [...tierRequirements].sort(
    (a, b) => GAP_PRIORITY[a.type] - GAP_PRIORITY[b.type],
  )
  const rawSuggestions: RawSuggestion[] = []

  for (const req of sortedReqs) {
    // Check if this requirement is unmet
    if (isRequirementMet(req, existingNodeCategories, existingNodeComponentIds, categoryScores)) {
      continue
    }

    switch (req.type) {
      case "required_categories":
        rawSuggestions.push(
          ...handleRequiredCategories(req, allComponents, existingNodeCategories, existingNodeComponentIds, weightProfile, tierLabel),
        )
        break
      case "min_distinct_categories":
        rawSuggestions.push(
          ...handleMinDistinctCategories(req, allComponents, existingNodeCategories, existingNodeComponentIds, weightProfile, tierLabel),
        )
        break
      case "min_category_score":
        rawSuggestions.push(
          ...handleMinCategoryScore(req, allComponents, existingNodeComponentIds, weightProfile, categoryScores, tierLabel),
        )
        break
      case "min_component_count":
        rawSuggestions.push(
          ...handleMinComponentCount(req, allComponents, existingNodeCategories, existingNodeComponentIds, weightProfile, rawSuggestions, tierLabel),
        )
        break
    }
  }

  if (rawSuggestions.length === 0) return []

  // Phase 2: Apply constraint heuristic and fit scoring
  for (const suggestion of rawSuggestions) {
    const comp = allComponents.find((c) => c.id === suggestion.componentId)
    if (!comp) continue

    const safety = checkConstraintSafety(comp, constraints)
    suggestion.isConstraintSafe = safety.safe
    suggestion.constraintWarning = safety.warning

    const fit = computeFitForCandidate(comp, dataContextItems)
    suggestion.fitLevel = fit.fitLevel
    suggestion.fitExplanation = fit.fitExplanation
  }

  // Phase 3: Deduplicate
  const deduped = deduplicateSuggestions(rawSuggestions)

  // Phase 4: Sort — gap priority > weightedScore desc > fitLevel (better first) > alphabetical
  deduped.sort((a, b) => {
    // 1. Gap type priority (interleaving)
    const priorityDiff = GAP_PRIORITY[a.gapType] - GAP_PRIORITY[b.gapType]
    if (priorityDiff !== 0) return priorityDiff

    // 2. Weighted score descending
    const scoreDiff = b.weightedScore - a.weightedScore
    if (Math.abs(scoreDiff) > 0.001) return scoreDiff

    // 3. Fit level (better fit wins; undefined treated as "trade-off")
    const aFit = FIT_LEVEL_ORDER[a.fitLevel ?? "trade-off"] ?? 2
    const bFit = FIT_LEVEL_ORDER[b.fitLevel ?? "trade-off"] ?? 2
    if (aFit !== bFit) return aFit - bFit

    // 4. Alphabetical by componentName (deterministic)
    return a.componentName.localeCompare(b.componentName)
  })

  // Phase 5: Cap results and strip internal fields
  return deduped.slice(0, PATHWAY_SUGGESTION_LIMIT).map(
    ({ gapType: _gapType, secondaryGaps: _secondaryGaps, ...suggestion }) => suggestion,
  )
}

