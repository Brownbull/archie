import { useCallback, useMemo, useState } from "react"
import { ChevronDown, ChevronRight, Sparkles, Target } from "lucide-react"
import { useLibrary } from "@/hooks/useLibrary"
import { useUiStore } from "@/stores/uiStore"
import { useArchitectureStore } from "@/stores/architectureStore"
import { useChallengeStore } from "@/stores/challengeStore"
import { usePreferencesStore } from "@/stores/preferencesStore"
import { usePathwaySuggestions } from "@/hooks/usePathwaySuggestions"
import { TypeBlockCard } from "@/components/toolbox/TypeBlockCard"
import { BlockLevelSelector } from "@/components/toolbox/BlockLevelSelector"
import { PathwayGuidancePanel } from "@/components/dashboard/PathwayGuidancePanel"
import { ScrollArea } from "@/components/ui/scroll-area"
import { COMPONENT_CATEGORIES, type ComponentCategoryId } from "@/lib/constants"
import { CATEGORY_ICONS } from "@/lib/categoryIcons"
import { groupComponentsByType, typeMatchesQuery, typeWithinLevel, type ComponentTypeGroup } from "@/lib/componentTypes"
import { checkCompatibility } from "@/engine/compatibilityChecker"
import { componentLibrary } from "@/services/componentLibrary"

/** Maps a component-category id to its display label, falling back to the raw id. */
function categoryLabel(id: string): string {
  return COMPONENT_CATEGORIES[id as ComponentCategoryId]?.label ?? id
}

/**
 * Shown atop the component palette while a challenge is active — it connects challenge
 * mode to the toolbox by spelling out which component categories the brief needs (and,
 * when the challenge restricts them via allowedCategories, that only those are available).
 */
function ChallengeGuidanceBanner({
  required,
  allowed,
}: {
  required: readonly string[]
  allowed: readonly string[] | null
}) {
  if (required.length === 0 && !allowed) return null
  return (
    <div
      data-testid="challenge-component-guidance"
      className="mb-3 rounded-md border border-blue-500/40 bg-blue-500/10 p-2 text-[11px] text-text-secondary"
    >
      <div className="flex items-center gap-1.5 font-medium text-text-primary">
        <Target className="h-3 w-3 text-blue-400" />
        {allowed ? "Allowed for this challenge" : "This challenge needs"}
      </div>
      <div className="mt-1 flex flex-wrap gap-1">
        {(allowed ?? required).map((cat) => (
          <span key={cat} className="rounded-full bg-surface px-1.5 py-0.5 text-[10px] text-text-primary">
            {categoryLabel(cat)}
          </span>
        ))}
      </div>
    </div>
  )
}

export function ComponentTab() {
  const { components, searchComponents } = useLibrary()
  const searchQuery = useUiStore((s) => s.searchQuery)
  const selectedNodeId = useUiStore((s) => s.selectedNodeId)
  const activeChallenge = useChallengeStore((s) => s.activeChallenge)
  const blockLevel = usePreferencesStore((s) => s.blockLevel)
  const { suggestions: pathwaySuggestions } = usePathwaySuggestions()

  // Surface "what to add next" inline in the toolbox (where you add components) during free
  // build — not buried in the dashboard overlay. Hidden while searching or in a challenge
  // (which has its own guidance banner), and only when the engine has suggestions.
  const showPathway = !searchQuery && !activeChallenge && pathwaySuggestions.length > 0

  // Challenge guidance: required categories are always shown; allowedCategories (optional)
  // additionally restricts the palette to those categories for the duration of the challenge.
  const requiredCategories = activeChallenge?.requiredComponents ?? []
  const allowedCategories = activeChallenge?.allowedCategories?.length
    ? activeChallenge.allowedCategories
    : null
  const selectedArchieComponentId = useArchitectureStore(
    useCallback(
      (s) => {
        if (!selectedNodeId) return null
        return s.nodes.find((n) => n.id === selectedNodeId)?.data.archieComponentId ?? null
      },
      [selectedNodeId],
    ),
  )

  const selectedComponent = useMemo(() => {
    if (!selectedArchieComponentId) return null
    return componentLibrary.getComponent(selectedArchieComponentId) ?? null
  }, [selectedArchieComponentId])

  const incompatibleIds = useMemo(() => {
    if (!selectedComponent) return new Set<string>()
    const ids = new Set<string>()
    for (const comp of components) {
      const result = checkCompatibility(
        { category: selectedComponent.category, compatibility: selectedComponent.compatibility },
        { category: comp.category, compatibility: comp.compatibility },
      )
      if (!result.isCompatible) ids.add(comp.id)
    }
    return ids
  }, [selectedComponent, components])

  // Collapsible CATEGORY sections. The palette now lists logical-block TYPES (the architect
  // builds with concepts, then picks a vendor in the inspector); types are grouped under their
  // visual category. Default expanded; an active search force-expands so matches aren't hidden.
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(new Set())
  const toggleCategory = useCallback((key: string) => {
    setCollapsedCategories((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }, [])
  // "More advanced blocks" drawer holds the above-level types (P86 progressive disclosure).
  // Collapsed by default; force-open below if no in-level blocks would otherwise show.
  const [advancedOpen, setAdvancedOpen] = useState(false)

  // P5: search matches provider name/tags (existing) OR the fundamental type's label/synonyms,
  // so concept queries ("cache", "lb") surface the right type even if no provider name matches.
  const filtered = useMemo(() => {
    // Restrict to challenge-allowed categories first (no-op when the challenge sets none).
    const scoped = allowedCategories
      ? components.filter((c) => allowedCategories.includes(c.category))
      : components
    if (!searchQuery) return scoped
    const q = searchQuery.toLowerCase()
    const nameMatches = new Set(searchComponents(searchQuery).map((c) => c.id))
    return scoped.filter((c) => nameMatches.has(c.id) || typeMatchesQuery(c, q))
  }, [searchQuery, components, searchComponents, allowedCategories])

  // Organize the palette by fundamental TYPE (one logical-block per type), then group those
  // type-blocks under their visual category for the collapsible sections.
  const groups = useMemo(() => groupComponentsByType(filtered), [filtered])

  // P86 progressive disclosure: partition by experience level. At/below-level blocks render in
  // their category sections; above-level blocks fall into the "More advanced blocks" drawer.
  // An active search bypasses gating entirely — searching means the user wants to see everything.
  const showAllLevels = searchQuery.length > 0
  const inLevelGroups = useMemo(
    () => (showAllLevels ? groups : groups.filter((g) => typeWithinLevel(g.typeId, blockLevel))),
    [groups, showAllLevels, blockLevel],
  )
  const advancedGroups = useMemo(
    () => (showAllLevels ? [] : groups.filter((g) => !typeWithinLevel(g.typeId, blockLevel))),
    [groups, showAllLevels, blockLevel],
  )

  const categorySections = useMemo(() => {
    const byCategory = new Map<ComponentCategoryId, ComponentTypeGroup[]>()
    for (const g of inLevelGroups) {
      const arr = byCategory.get(g.categoryId) ?? []
      arr.push(g)
      byCategory.set(g.categoryId, arr)
    }
    return [...byCategory.entries()].map(([categoryId, typeGroups]) => ({ categoryId, typeGroups }))
  }, [inLevelGroups])

  // Advanced drawer contents, ordered by category then label so the extras list reads tidily.
  const advancedSorted = useMemo(
    () =>
      [...advancedGroups].sort(
        (a, b) => a.categoryId.localeCompare(b.categoryId) || a.label.localeCompare(b.label),
      ),
    [advancedGroups],
  )
  // Force the drawer open when nothing would show otherwise (e.g. a challenge restricted to
  // above-level categories) so the toolbox is never visibly empty.
  const advancedExpanded = advancedOpen || categorySections.length === 0

  const isDimmed = useCallback(
    (g: ComponentTypeGroup) => g.providers.length > 0 && g.providers.every((p) => incompatibleIds.has(p.id)),
    [incompatibleIds],
  )

  if (filtered.length === 0) {
    return (
      <div data-testid="component-tab-empty" className="p-3">
        {activeChallenge && (
          <ChallengeGuidanceBanner required={requiredCategories} allowed={allowedCategories} />
        )}
        <p className="p-3 text-center text-sm text-text-secondary">
          {searchQuery ? "No matching components" : "No components loaded"}
        </p>
      </div>
    )
  }

  return (
    <ScrollArea data-testid="component-tab" className="h-full">
      <div className="space-y-3 p-3">
        {activeChallenge && (
          <ChallengeGuidanceBanner required={requiredCategories} allowed={allowedCategories} />
        )}
        <BlockLevelSelector />
        {showPathway && (
          <div data-testid="component-tab-pathway" className="rounded-md border border-blue-500/30 bg-blue-500/5 p-2">
            <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-text-secondary">Suggested next</p>
            <PathwayGuidancePanel hideWhenEmpty maxItems={2} />
          </div>
        )}
        {categorySections.map(({ categoryId, typeGroups }) => {
          const category = COMPONENT_CATEGORIES[categoryId]
          const IconComponent = category ? CATEGORY_ICONS[category.iconName] : undefined
          const isCollapsed = !searchQuery && collapsedCategories.has(categoryId)

          return (
            <div key={categoryId} data-testid={`category-group-${categoryId}`}>
              <button
                type="button"
                data-testid={`category-toggle-${categoryId}`}
                aria-expanded={!isCollapsed}
                onClick={() => toggleCategory(categoryId)}
                className="mb-2 flex w-full items-center gap-1.5 rounded px-0.5 py-0.5 hover:bg-surface"
              >
                {isCollapsed
                  ? <ChevronRight className="h-3 w-3 shrink-0 text-text-secondary" />
                  : <ChevronDown className="h-3 w-3 shrink-0 text-text-secondary" />}
                {IconComponent && (
                  <IconComponent className="h-3.5 w-3.5" style={{ color: category?.color }} />
                )}
                <h3
                  className="text-[0.6875rem] font-semibold uppercase tracking-wider"
                  style={{ color: category?.color }}
                >
                  {category?.label ?? categoryId}
                </h3>
                <span className="text-[0.625rem] text-text-secondary">({typeGroups.length})</span>
              </button>
              {!isCollapsed && (
                <div className="grid grid-cols-2 gap-2">
                  {typeGroups.map((g) => (
                    <TypeBlockCard key={g.key} group={g} dimmed={isDimmed(g)} />
                  ))}
                </div>
              )}
            </div>
          )
        })}

        {advancedGroups.length > 0 && (
          <div data-testid="advanced-blocks">
            <button
              type="button"
              data-testid="advanced-blocks-toggle"
              aria-expanded={advancedExpanded}
              onClick={() => setAdvancedOpen((o) => !o)}
              className="mb-2 flex w-full items-center gap-1.5 rounded px-0.5 py-0.5 hover:bg-surface"
            >
              {advancedExpanded
                ? <ChevronDown className="h-3 w-3 shrink-0 text-text-secondary" />
                : <ChevronRight className="h-3 w-3 shrink-0 text-text-secondary" />}
              <Sparkles className="h-3.5 w-3.5 text-text-secondary" />
              <h3 className="text-[0.6875rem] font-semibold uppercase tracking-wider text-text-secondary">
                More advanced blocks
              </h3>
              <span className="text-[0.625rem] text-text-secondary">({advancedGroups.length})</span>
            </button>
            {advancedExpanded && (
              <div className="grid grid-cols-2 gap-2">
                {advancedSorted.map((g) => (
                  <TypeBlockCard key={g.key} group={g} dimmed={isDimmed(g)} />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </ScrollArea>
  )
}
