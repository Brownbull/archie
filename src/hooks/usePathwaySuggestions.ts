import { useMemo } from "react"
import { useArchitectureStore } from "@/stores/architectureStore"
import { componentLibrary } from "@/services/componentLibrary"
import { computePathwaySuggestions, type PathwaySuggestion } from "@/engine/pathwayEngine"
import { computeCategoryScores } from "@/engine/dashboardCalculator"
import { DEFAULT_TIER_DEFINITIONS } from "@/lib/tierDefinitions"

export interface PathwaySuggestionsResult {
  suggestions: PathwaySuggestion[]
  hasGaps: boolean
  nextTierName: string | null
}

// Shared instance returned for all empty-state branches — callers must not mutate
const EMPTY_RESULT: PathwaySuggestionsResult = {
  suggestions: [],
  hasGaps: false,
  nextTierName: null,
}

/**
 * Derives pathway suggestions reactively from architecture store state.
 * Pure derivation — no side effects, no new store state (AC-ARCH-NO-1, AC-ARCH-NO-2).
 * Pattern: useDashboardWeights.ts (individual selectors + useMemo).
 */
export function usePathwaySuggestions(): PathwaySuggestionsResult {
  // AC-ARCH-PATTERN-2: Read from architectureStore via selectors
  const currentTier = useArchitectureStore((s) => s.currentTier)
  const weightProfile = useArchitectureStore((s) => s.weightProfile)
  const constraints = useArchitectureStore((s) => s.constraints)
  const dataContextItems = useArchitectureStore((s) => s.dataContextItems)
  const nodes = useArchitectureStore((s) => s.nodes)
  const computedMetrics = useArchitectureStore((s) => s.computedMetrics)

  // AC-ARCH-PATTERN-1: useMemo over computePathwaySuggestions — no debounce, no worker
  return useMemo(() => {
    // AC-4 / Task 2.1: No tier evaluation (no components on canvas)
    if (!currentTier) return EMPTY_RESULT

    // AC-4 / Task 2.2: Max tier achieved
    if (currentTier.isMaxTier) return EMPTY_RESULT

    // AC-ARCH-PATTERN-3 (revised): getAllComponents() inside useMemo intentionally.
    // Array.from() creates new ref each call — adding componentLibrary to deps breaks memoization.
    // Service is a singleton cache (load-once, not reactive). Dep-array omission is deliberate.
    const allComponents = componentLibrary.getAllComponents()

    // Task 2.3: componentLibrary not initialized
    if (allComponents.length === 0) return EMPTY_RESULT

    // Task 1.5: Find next tier requirements
    const nextTierDef = DEFAULT_TIER_DEFINITIONS.find(
      (t) => t.index === currentTier.tierIndex + 1,
    )
    if (!nextTierDef) return EMPTY_RESULT

    // Task 1.3: Derive existing node categories and component IDs
    const existingNodeCategories = new Set(
      nodes.map((n) => n.data.componentCategory),
    )
    const existingNodeComponentIds = new Set(
      nodes.map((n) => n.data.archieComponentId),
    )

    // Derive category scores: CategoryScore[] → Map<string, number>
    const categoryScoreArray = computeCategoryScores(computedMetrics)
    const categoryScores = new Map<string, number>()
    for (const cs of categoryScoreArray) {
      if (cs.hasData) categoryScores.set(cs.categoryId, cs.score)
    }

    // Flatten dataContextItems: Map<string, DataContextItem[]> → DataContextItem[]
    const flatDataContextItems = [...dataContextItems.values()].flat()

    // Task 1.6: Call engine
    const suggestions = computePathwaySuggestions(
      nextTierDef.requirements,
      allComponents,
      existingNodeCategories,
      existingNodeComponentIds,
      weightProfile,
      constraints,
      flatDataContextItems,
      categoryScores,
      nextTierDef.name,
    )

    // Task 1.7: Return result
    return {
      suggestions,
      hasGaps: suggestions.length > 0,
      nextTierName: nextTierDef.name,
    }
    // Store contract: Zustand must replace Map references (not mutate in-place)
    // for computedMetrics and dataContextItems — shallow equality drives re-render
  }, [currentTier, weightProfile, constraints, dataContextItems, nodes, computedMetrics])
}
