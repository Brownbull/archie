import { useCallback, useMemo, useState } from "react"
import { ChevronDown, ChevronRight, Target } from "lucide-react"
import { useLibrary } from "@/hooks/useLibrary"
import { useUiStore } from "@/stores/uiStore"
import { useArchitectureStore } from "@/stores/architectureStore"
import { useChallengeStore } from "@/stores/challengeStore"
import { ComponentCard } from "@/components/toolbox/ComponentCard"
import { ScrollArea } from "@/components/ui/scroll-area"
import { COMPONENT_CATEGORIES, type ComponentCategoryId } from "@/lib/constants"
import { CATEGORY_ICONS } from "@/lib/categoryIcons"
import { groupComponentsByType, typeMatchesQuery } from "@/lib/componentTypes"
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

  // Collapsible TYPE sections (P3 density + P5 type grouping). Default expanded; an active search
  // force-expands all so matches are never hidden behind a collapsed header.
  const [collapsedTypes, setCollapsedTypes] = useState<Set<string>>(new Set())
  const toggleType = useCallback((key: string) => {
    setCollapsedTypes((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }, [])

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

  // P5: organize the palette by fundamental TYPE (Cache, Relational DB, …); each type lists its
  // provider components. Pre-P5 components without a typeId fall back to a per-category group.
  const groups = useMemo(() => groupComponentsByType(filtered), [filtered])

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
        {groups.map((group) => {
          const category = COMPONENT_CATEGORIES[group.categoryId]
          const IconComponent = category ? CATEGORY_ICONS[category.iconName] : undefined
          const isCollapsed = !searchQuery && collapsedTypes.has(group.key)

          return (
            <div key={group.key} data-testid={`type-group-${group.key}`}>
              <button
                type="button"
                data-testid={`type-toggle-${group.key}`}
                aria-expanded={!isCollapsed}
                onClick={() => toggleType(group.key)}
                className="mb-2 flex w-full items-center gap-1.5 rounded px-0.5 py-0.5 hover:bg-surface"
              >
                {isCollapsed
                  ? <ChevronRight className="h-3 w-3 shrink-0 text-text-secondary" />
                  : <ChevronDown className="h-3 w-3 shrink-0 text-text-secondary" />}
                {IconComponent && (
                  <IconComponent
                    className="h-3.5 w-3.5"
                    style={{ color: category?.color }}
                  />
                )}
                <h3
                  className="text-[0.6875rem] font-semibold uppercase tracking-wider"
                  style={{ color: category?.color }}
                >
                  {group.label}
                </h3>
                <span className="text-[0.625rem] text-text-secondary">({group.providers.length})</span>
              </button>
              {!isCollapsed && (
                <div className="space-y-2">
                  {group.providers.map((comp) => (
                    <ComponentCard
                      key={comp.id}
                      component={comp}
                      dimmed={incompatibleIds.has(comp.id)}
                    />
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </ScrollArea>
  )
}
