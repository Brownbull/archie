import { useCallback, useMemo, useState } from "react"
import { ChevronDown, ChevronRight } from "lucide-react"
import { useLibrary } from "@/hooks/useLibrary"
import { useUiStore } from "@/stores/uiStore"
import { useArchitectureStore } from "@/stores/architectureStore"
import { ComponentCard } from "@/components/toolbox/ComponentCard"
import { ScrollArea } from "@/components/ui/scroll-area"
import { COMPONENT_CATEGORIES, type ComponentCategoryId } from "@/lib/constants"
import { CATEGORY_ICONS } from "@/lib/categoryIcons"
import { groupByCategory } from "@/lib/componentUtils"
import { checkCompatibility } from "@/engine/compatibilityChecker"
import { componentLibrary } from "@/services/componentLibrary"

export function ComponentTab() {
  const { components, searchComponents } = useLibrary()
  const searchQuery = useUiStore((s) => s.searchQuery)
  const selectedNodeId = useUiStore((s) => s.selectedNodeId)
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

  // Collapsible categories (P3 density). Default expanded; an active search force-expands all
  // so matches are never hidden behind a collapsed header.
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(new Set())
  const toggleCategory = useCallback((categoryId: string) => {
    setCollapsedCategories((prev) => {
      const next = new Set(prev)
      if (next.has(categoryId)) next.delete(categoryId)
      else next.add(categoryId)
      return next
    })
  }, [])

  const filtered = searchQuery ? searchComponents(searchQuery) : components
  const grouped = groupByCategory(filtered)

  if (filtered.length === 0) {
    return (
      <div data-testid="component-tab-empty" className="flex items-center justify-center p-6 text-sm text-text-secondary">
        {searchQuery ? "No matching components" : "No components loaded"}
      </div>
    )
  }

  return (
    <ScrollArea data-testid="component-tab" className="h-full">
      <div className="space-y-3 p-3">
        {Object.entries(grouped).map(([categoryId, comps]) => {
          const category = COMPONENT_CATEGORIES[categoryId as ComponentCategoryId]
          const IconComponent = category ? CATEGORY_ICONS[category.iconName] : undefined

          const isCollapsed = !searchQuery && collapsedCategories.has(categoryId)

          return (
            <div key={categoryId} data-testid={`category-${categoryId}`}>
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
                  <IconComponent
                    className="h-3.5 w-3.5"
                    style={{ color: category?.color }}
                  />
                )}
                <h3
                  className="text-[0.6875rem] font-semibold uppercase tracking-wider"
                  style={{ color: category?.color }}
                >
                  {category?.label ?? categoryId}
                </h3>
                <span className="text-[0.625rem] text-text-secondary">({comps.length})</span>
              </button>
              {!isCollapsed && (
                <div className="space-y-2">
                  {comps.map((comp) => (
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
