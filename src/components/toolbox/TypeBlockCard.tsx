import { type DragEvent, type MouseEvent, useMemo } from "react"
import { Plus, CheckCircle2, Lock } from "lucide-react"
import { COMPONENT_CATEGORIES } from "@/lib/constants"
import { COMPONENT_TYPES, type ComponentTypeGroup } from "@/lib/componentTypes"
import { getTypeIconUrl } from "@/lib/typeIcons"
import { CATEGORY_ICONS } from "@/lib/categoryIcons"
import { useArchitectureStore } from "@/stores/architectureStore"
import { useUiStore } from "@/stores/uiStore"
import { usePreferencesStore } from "@/stores/preferencesStore"
import { useUserProgressStore } from "@/stores/userProgressStore"
import { resolveTechTree } from "@/engine/techTree"
import { getAllChallenges } from "@/services/challengeLoader"
import { TypeIcon } from "@/components/common/TypeIcon"

interface TypeBlockCardProps {
  group: ComponentTypeGroup
  dimmed?: boolean
}

export function TypeBlockCard({ group, dimmed }: TypeBlockCardProps) {
  const addNodeSmartPosition = useArchitectureStore((s) => s.addNodeSmartPosition)
  const setActiveDrag = useUiStore((s) => s.setActiveDrag)
  const iconSet = usePreferencesStore((s) => s.iconSet)
  const completedChallenges = useUserProgressStore((s) => s.completedChallenges)

  const category = COMPONENT_CATEGORIES[group.categoryId]
  const color = category?.color ?? "var(--color-muted)"
  const iconUrl = group.typeId ? getTypeIconUrl(group.typeId) : null
  const CategoryIcon = category ? CATEGORY_ICONS[category.iconName] : undefined

  const defaultProviderId = useMemo(() => {
    const preferred = group.typeId ? COMPONENT_TYPES.get(group.typeId)?.defaultProviderId : undefined
    if (preferred && group.providers.some((p) => p.id === preferred)) return preferred
    return group.providers[0]?.id ?? ""
  }, [group])

  // Block mastery: is this block type unlocked via the tech tree?
  const isMastered = useMemo(() => {
    if (!group.typeId) return true
    const baseBlocks = ["traffic-source", "compute"]
    if (baseBlocks.includes(group.typeId)) return true
    const challenges = getAllChallenges()
    const tree = resolveTechTree(challenges, completedChallenges)
    return tree.unlockedBlocks.has(group.typeId)
  }, [group.typeId, completedChallenges])

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

      {/* Mastery indicator + add button */}
      <div className="absolute right-0.5 top-0.5 flex items-center gap-0.5">
        {isMastered ? (
          <span title="Mastered — unlocked via quest"><CheckCircle2 className="h-3.5 w-3.5 text-[#ff8a3d]" /></span>
        ) : (
          <span title="Not yet mastered — complete its quest"><Lock className="h-3 w-3 text-text-secondary opacity-40" /></span>
        )}
        <button
          data-testid={`add-type-${group.typeId ?? group.key}`}
          type="button"
          className="flex h-5 w-5 items-center justify-center rounded text-text-secondary opacity-60 transition-opacity hover:bg-archie-border hover:opacity-100"
          draggable={false}
          onDragStart={(e) => e.stopPropagation()}
          onClick={handleAdd}
          title="Add to canvas"
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="flex flex-col gap-1 pr-6">
        {group.typeId ? (
          <TypeIcon
            typeId={group.typeId}
            size="sm"
            color={isMastered ? color : "#4b5563"}
            className={`shrink-0 ${isMastered ? "" : "grayscale opacity-50"}`}
            title={`${group.label}${isMastered ? "" : " (not mastered)"}`}
          />
        ) : iconSet === "pixel" && iconUrl ? (
          <img src={iconUrl} alt="" className={`h-4 w-4 shrink-0 ${isMastered ? "" : "grayscale opacity-50"}`} />
        ) : (
          CategoryIcon && <CategoryIcon className={`h-4 w-4 shrink-0 ${isMastered ? "" : "grayscale opacity-50"}`} style={{ color: isMastered ? color : "#4b5563" }} />
        )}
        <h4 className="break-words text-xs font-semibold leading-tight text-text-primary line-clamp-2">{group.label}</h4>
      </div>

      <div className="invisible absolute inset-x-0 top-full z-20 mt-0.5 rounded-md border border-archie-border bg-panel p-1.5 shadow-lg group-hover:visible">
        <p className="text-[0.625rem] leading-tight text-text-secondary">
          {group.providers.length} {group.providers.length === 1 ? "vendor" : "vendors"}: {vendorNames}
        </p>
      </div>
    </div>
  )
}
