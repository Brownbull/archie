import type { TierDefinition, TierGap, TierRequirement, TierResult } from "@/lib/tierDefinitions"

// --- Minimal Input Types (no store/service dependencies) ---

export interface TierNodeSummary {
  id: string
  category: string
}

export interface TierCategoryScore {
  categoryId: string
  score: number
  hasData: boolean
}

// --- Pure Functions ---

/**
 * Converts kebab-case to Title Case.
 * e.g. "auth-security" -> "Auth Security"
 */
export function formatCategoryName(name: string): string {
  if (!name || !name.trim()) return ""
  const sanitized = name.replace(/[^a-z0-9-]/gi, "")
  if (!sanitized) return ""
  return sanitized
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ")
}

/**
 * Evaluates the current architecture against tier definitions.
 *
 * Pure function — no side effects, no imports from react/zustand/firebase/services.
 * Sorts definitions descending by index, returns the highest tier where ALL
 * requirements are met. Returns null if nodes are empty, definitions are empty,
 * or no tier qualifies.
 */
export function evaluateTier(
  nodes: TierNodeSummary[],
  categoryScores: TierCategoryScore[],
  tierDefinitions: TierDefinition[],
): TierResult | null {
  if (nodes.length === 0) return null
  if (tierDefinitions.length === 0) return null

  // Sort descending by index (highest tier first)
  const sorted = [...tierDefinitions].sort((a, b) => b.index - a.index)
  const totalTiers = tierDefinitions.length

  const distinctCategories = new Set(nodes.map((n) => n.category))
  const scoreMap = new Map(categoryScores.map((s) => [s.categoryId, s]))

  let currentTierDef: TierDefinition | null = null

  for (const def of sorted) {
    const allMet = def.requirements.every((req) =>
      isRequirementMet(req, nodes, distinctCategories, scoreMap),
    )
    if (allMet) {
      currentTierDef = def
      break
    }
  }

  if (!currentTierDef) return null

  // Compute gaps for the next tier above current
  const nextTierGaps = computeGaps(
    currentTierDef,
    sorted,
    nodes,
    distinctCategories,
    scoreMap,
  )

  return {
    tierId: currentTierDef.id,
    tierName: currentTierDef.name,
    tierIndex: currentTierDef.index,
    totalTiers,
    tierColor: currentTierDef.color,
    tierTextColor: currentTierDef.textColor,
    nextTierGaps,
    isMaxTier: nextTierGaps.length === 0 && currentTierDef.index === sorted[0].index,
  }
}

// --- Internal Helpers ---

function isRequirementMet(
  req: TierRequirement,
  nodes: TierNodeSummary[],
  distinctCategories: Set<string>,
  scoreMap: Map<string, TierCategoryScore>,
): boolean {
  switch (req.type) {
    case "min_component_count":
      return nodes.length >= req.minCount

    case "min_distinct_categories":
      return distinctCategories.size >= req.minCount

    case "min_category_score": {
      const score = scoreMap.get(req.categoryId)
      if (!score || !score.hasData) return false
      return score.score >= req.minScore
    }

    case "required_categories":
      return req.requiredCategories.every((cat) => distinctCategories.has(cat))
  }
}

function computeGaps(
  currentTier: TierDefinition,
  sortedDefs: TierDefinition[],
  nodes: TierNodeSummary[],
  distinctCategories: Set<string>,
  scoreMap: Map<string, TierCategoryScore>,
): TierGap[] {
  // Find next tier above current
  const nextTier = sortedDefs.find((d) => d.index === currentTier.index + 1)
  if (!nextTier) return [] // Already at max tier

  const gaps: TierGap[] = []

  for (const req of nextTier.requirements) {
    if (isRequirementMet(req, nodes, distinctCategories, scoreMap)) continue

    const gap = formatGap(req, nodes, distinctCategories, scoreMap)
    if (gap) gaps.push(gap)
  }

  return gaps
}

function formatGap(
  req: TierRequirement,
  nodes: TierNodeSummary[],
  distinctCategories: Set<string>,
  scoreMap: Map<string, TierCategoryScore>,
): TierGap | null {
  switch (req.type) {
    case "min_component_count": {
      const needed = req.minCount - nodes.length
      const plural = needed === 1 ? "component" : "components"
      return {
        requirementDescription: `Add ${needed} more ${plural} (currently ${nodes.length}, need ${req.minCount})`,
        currentValue: nodes.length,
        targetValue: req.minCount,
      }
    }

    case "min_distinct_categories": {
      const needed = req.minCount - distinctCategories.size
      const plural = needed === 1 ? "category" : "categories"
      return {
        requirementDescription: `Use components from ${needed} more ${plural} (currently ${distinctCategories.size}, need ${req.minCount})`,
        currentValue: distinctCategories.size,
        targetValue: req.minCount,
      }
    }

    case "min_category_score": {
      const score = scoreMap.get(req.categoryId)
      const currentScore = score?.hasData ? score.score : 0
      const displayScore = Math.round(currentScore * 10) / 10
      const catName = formatCategoryName(req.categoryId)
      return {
        requirementDescription: `Improve ${catName} score to ${req.minScore}+ (currently ${displayScore})`,
        currentValue: displayScore,
        targetValue: req.minScore,
      }
    }

    case "required_categories": {
      const missing = req.requiredCategories.filter(
        (cat) => !distinctCategories.has(cat),
      )
      const descriptions = missing.map((cat) => formatCategoryName(cat))
      return {
        requirementDescription: `Add a ${descriptions.join(" or ")} component to your architecture`,
        currentValue: "missing",
        targetValue: descriptions.join(", "),
      }
    }
  }
}
