import { type DragEvent, type MouseEvent, useMemo } from "react"
import { Plus, CheckCircle2, Lock, Ban } from "lucide-react"
import { COMPONENT_CATEGORIES } from "@/lib/constants"
import { COMPONENT_TYPES, BLOCK_LOCK_REASON_LABELS, type BlockLockReason, type ComponentTypeGroup } from "@/lib/componentTypes"
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
  /**
   * Quest-mode lock (S6b, D89): when set, the card is SHOWN-but-locked — visible so the player learns
   * the constraint, but non-addable and non-draggable so it can never reach the canvas (a banned block
   * placed = hard 0★). `banned` renders a red Ban badge; `not-in-palette` a gray Lock.
   */
  lockReason?: BlockLockReason | null
}

export function TypeBlockCard({ group, dimmed, lockReason }: TypeBlockCardProps) {
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
    // S6b: a locked card must never start a drag — a banned block on the canvas is a hard 0★.
    if (lockReason) {
      event.preventDefault()
      return
    }
    if (!defaultProviderId) return
    event.dataTransfer.setData("application/archie-component", defaultProviderId)
    event.dataTransfer.effectAllowed = "move"
    setActiveDrag({ kind: "toolbox", componentId: defaultProviderId, componentCategory: group.categoryId })
  }

  const handleDragEnd = () => setActiveDrag(null)

  const handleAdd = (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation()
    if (lockReason) return // shown-but-locked: the Add affordance is inert
    if (defaultProviderId) addNodeSmartPosition(defaultProviderId)
  }

  const lockTitle = lockReason ? BLOCK_LOCK_REASON_LABELS[lockReason] : undefined

  return (
    <div
      data-testid={`type-block-${group.typeId ?? group.key}`}
      data-lock-reason={lockReason ?? undefined}
      className={`group relative h-full rounded-md border bg-panel p-2 pl-3 transition-opacity duration-200 ${
        lockReason === "banned"
          ? "cursor-not-allowed border-red-500/50 opacity-60"
          : lockReason
            ? "cursor-not-allowed border-archie-border opacity-50"
            : `cursor-grab border-archie-border active:cursor-grabbing ${dimmed ? "opacity-40 grayscale" : "opacity-100"}`
      }`}
      draggable={!lockReason}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      aria-disabled={lockReason ? true : undefined}
      title={lockTitle ?? (dimmed ? "Incompatible with the selected block" : undefined)}
    >
      <div className="absolute left-0 top-0 h-full w-1 rounded-l-md" style={{ backgroundColor: lockReason === "banned" ? "#ef4444" : color }} />

      {/* Add button — top-right. Locked cards keep the slot but the affordance is disabled. */}
      <button
        data-testid={`add-type-${group.typeId ?? group.key}`}
        type="button"
        className={`absolute right-0.5 top-0.5 flex h-5 w-5 items-center justify-center rounded text-text-secondary transition-opacity ${
          lockReason ? "cursor-not-allowed opacity-25" : "opacity-60 hover:bg-archie-border hover:opacity-100"
        }`}
        draggable={false}
        onDragStart={(e) => e.stopPropagation()}
        onClick={handleAdd}
        disabled={!!lockReason}
        aria-disabled={lockReason ? true : undefined}
        title={lockReason ? lockTitle : "Add to canvas"}
      >
        <Plus className="h-3.5 w-3.5" />
      </button>

      {/* Lock / mastery indicator — bottom-right. Quest locks outrank the free-build mastery mark. */}
      <div className="absolute bottom-1 right-1">
        {lockReason === "banned" ? (
          <span data-testid={`block-lock-${group.typeId ?? group.key}`} title={lockTitle}>
            <Ban className="h-3.5 w-3.5 text-red-400" />
          </span>
        ) : lockReason ? (
          <span data-testid={`block-lock-${group.typeId ?? group.key}`} title={lockTitle}>
            <Lock className="h-3 w-3 text-text-secondary opacity-60" />
          </span>
        ) : isMastered ? (
          <span title="Mastered — unlocked via quest"><CheckCircle2 className="h-3.5 w-3.5 text-[#ff8a3d]" /></span>
        ) : (
          <span title="Not yet mastered — complete its quest"><Lock className="h-3 w-3 text-text-secondary opacity-40" /></span>
        )}
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
