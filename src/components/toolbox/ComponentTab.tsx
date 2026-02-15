import { useLibrary } from "@/hooks/useLibrary"
import { useUiStore } from "@/stores/uiStore"
import { ComponentCard } from "@/components/toolbox/ComponentCard"
import { ScrollArea } from "@/components/ui/scroll-area"
import { COMPONENT_CATEGORIES, type ComponentCategoryId } from "@/lib/constants"
import { CATEGORY_ICONS } from "@/lib/categoryIcons"
import { groupByCategory } from "@/lib/componentUtils"

export function ComponentTab() {
  const { components, searchComponents } = useLibrary()
  const searchQuery = useUiStore((s) => s.searchQuery)

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

          return (
            <div key={categoryId} data-testid={`category-${categoryId}`}>
              <div className="mb-2 flex items-center gap-1.5">
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
              </div>
              <div className="space-y-2">
                {comps.map((comp) => (
                  <ComponentCard key={comp.id} component={comp} />
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </ScrollArea>
  )
}
