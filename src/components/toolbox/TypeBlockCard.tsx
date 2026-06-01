import { type DragEvent, type MouseEvent, useMemo } from "react"
import { Plus } from "lucide-react"
import { COMPONENT_CATEGORIES } from "@/lib/constants"
import { COMPONENT_TYPES, type ComponentTypeGroup } from "@/lib/componentTypes"
import { getTypeIconUrl } from "@/lib/typeIcons"
import { CATEGORY_ICONS } from "@/lib/categoryIcons"
import { useArchitectureStore } from "@/stores/architectureStore"
import { useUiStore } from "@/stores/uiStore"
import { BlockConceptLoop } from "@/components/common/BlockConceptLoop"

interface TypeBlockCardProps {
  group: ComponentTypeGroup
  dimmed?: boolean
}

/**
 * A logical-block row in the toolbox (CDN, Cache, Database…). The architect builds with TYPES,
 * not vendors: dropping a block places the type's default provider, and the vendor + tier are
 * refined later in the inspector's Provider picker. Shows a type icon + label + the cost range
 * across all vendors of the type; hover reveals which vendors are available inside.
 */
export function TypeBlockCard({ group, dimmed }: TypeBlockCardProps) {
  const addNodeSmartPosition = useArchitectureStore((s) => s.addNodeSmartPosition)
  const setActiveDrag = useUiStore((s) => s.setActiveDrag)

  const category = COMPONENT_CATEGORIES[group.categoryId]
  const color = category?.color ?? "var(--color-muted)"
  const iconUrl = group.typeId ? getTypeIconUrl(group.typeId) : null
  // eslint-disable-next-line security/detect-object-injection -- iconName is a typed enum value
  const CategoryIcon = category ? CATEGORY_ICONS[category.iconName] : undefined

  // The vendor a dropped block instantiates: the type's configured default if it's actually
  // present in the loaded library, else the first available provider of this type.
  const defaultProviderId = useMemo(() => {
    const preferred = group.typeId ? COMPONENT_TYPES.get(group.typeId)?.defaultProviderId : undefined
    if (preferred && group.providers.some((p) => p.id === preferred)) return preferred
    return group.providers[0]?.id ?? ""
  }, [group])

  const costRange = useMemo(() => {
    const costs = group.providers
      .flatMap((p) => p.configVariants.map((v) => v.monthlyCost))
      .filter((c): c is number => typeof c === "number")
    if (costs.length === 0) return null
    const min = Math.min(...costs)
    const max = Math.max(...costs)
    if (min === max) return min === 0 ? "Free" : `$${min}/mo`
    return min === 0 ? `Free–$${max}/mo` : `$${min}–$${max}/mo`
  }, [group.providers])

  const vendorNames = group.providers.map((p) => p.name).join(", ")

  const handleDragStart = (event: DragEvent<HTMLDivElement>) => {
    if (!defaultProviderId) return
    event.dataTransfer.setData("application/archie-component", defaultProviderId)
    event.dataTransfer.effectAllowed = "move"
    setActiveDrag({ kind: "toolbox", componentId: defaultProviderId, componentCategory: group.categoryId })
  }

  const handleDragEnd = () => setActiveDrag(null)

  const handleAdd = (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation()
    if (defaultProviderId) addNodeSmartPosition(defaultProviderId)
  }

  return (
    <div
      data-testid={`type-block-${group.typeId ?? group.key}`}
      className={`group relative h-full cursor-grab rounded-md border border-archie-border bg-panel p-2 pl-3 transition-opacity duration-200 active:cursor-grabbing ${
        dimmed ? "opacity-40 grayscale" : "opacity-100"
      }`}
      draggable
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      title={dimmed ? "Incompatible with the selected block" : undefined}
    >
      <div className="absolute left-0 top-0 h-full w-1 rounded-l-md" style={{ backgroundColor: color }} />

      <button
        data-testid={`add-type-${group.typeId ?? group.key}`}
        type="button"
        className="absolute right-0.5 top-0.5 flex h-5 w-5 items-center justify-center rounded text-text-secondary opacity-60 transition-opacity hover:bg-archie-border hover:opacity-100"
        draggable={false}
        onDragStart={(e) => e.stopPropagation()}
        onClick={handleAdd}
        title="Add to canvas — pick a vendor afterward"
      >
        <Plus className="h-3.5 w-3.5" />
      </button>

      {/* Compact 2-column-grid cell: animated concept loop + (wrapping) label, then cost beneath.
          The loop replaces the static type icon so the palette communicates what each block does. */}
      <div className="flex items-start gap-1 pr-3">
        {group.typeId ? (
          <BlockConceptLoop typeId={group.typeId} size="sm" color={color} className="shrink-0" title={`${group.label} concept`} />
        ) : iconUrl ? (
          <img src={iconUrl} alt="" className="h-4 w-4 shrink-0" />
        ) : (
          CategoryIcon && <CategoryIcon className="h-4 w-4 shrink-0" style={{ color }} />
        )}
        <h4 className="min-w-0 flex-1 break-words text-xs font-semibold leading-tight text-text-primary line-clamp-2">{group.label}</h4>
      </div>
      {costRange && (
        <div data-testid={`type-cost-${group.typeId ?? group.key}`} className="mt-1 text-[0.625rem] font-medium text-emerald-400">
          {costRange}
        </div>
      )}

      {/* Vendor detail on hover — absolute overlay so it doesn't reflow the grid. */}
      <div className="invisible absolute inset-x-0 top-full z-20 mt-0.5 rounded-md border border-archie-border bg-panel p-1.5 shadow-lg group-hover:visible">
        <p className="text-[0.625rem] leading-tight text-text-secondary">
          {group.providers.length} {group.providers.length === 1 ? "vendor" : "vendors"}: {vendorNames}
        </p>
      </div>
    </div>
  )
}
