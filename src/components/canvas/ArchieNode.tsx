import { memo } from "react"
import { Handle, Position } from "@xyflow/react"
import type { NodeProps } from "@xyflow/react"
import type { ArchieNode as ArchieNodeType } from "@/stores/architectureStore"
import { useArchitectureStore } from "@/stores/architectureStore"
import { useUiStore } from "@/stores/uiStore"
import { COMPONENT_CATEGORIES, HEATMAP_COLORS, NODE_WIDTH, type ComponentCategoryId } from "@/lib/constants"
import { CATEGORY_ICONS } from "@/lib/categoryIcons"

function ArchieNodeComponent({ id, data }: NodeProps<ArchieNodeType>) {
  const category = COMPONENT_CATEGORIES[data.componentCategory as ComponentCategoryId]
  const color = category?.color ?? "var(--color-muted)"
  const IconComponent = category ? CATEGORY_ICONS[category.iconName] : undefined

  // Heatmap state — targeted selectors (AC-ARCH-PATTERN-5, AC-ARCH-NO-6)
  const heatmapStatus = useArchitectureStore((s) => s.heatmapColors.get(id))
  const heatmapEnabled = useUiStore((s) => s.heatmapEnabled)

  // Box-shadow glow for heatmap (AC-ARCH-PATTERN-6) — separate from category stripe
  const boxShadow =
    heatmapEnabled && heatmapStatus
      ? `0 0 8px 2px ${HEATMAP_COLORS[heatmapStatus]}`
      : undefined

  // Accessibility: include heatmap status in aria-label for screen readers (TD-2-2b)
  const ariaLabel =
    heatmapEnabled && heatmapStatus
      ? `${data.componentName} \u2014 ${heatmapStatus}`
      : data.componentName

  return (
    <div
      data-testid="archie-node"
      className="rounded-md border border-archie-border bg-panel shadow-sm"
      style={{ width: `${NODE_WIDTH}px`, boxShadow }}
      aria-label={ariaLabel}
    >
      {/* Category stripe — identity, never heatmap (UX18, AC-ARCH-NO-9) */}
      <div
        className="h-1 w-full rounded-t-md"
        style={{ backgroundColor: color }}
        data-testid="archie-node-stripe"
      />

      <div className="flex items-center gap-2 px-3 py-2">
        {IconComponent && (
          <IconComponent
            className="h-4 w-4 shrink-0"
            style={{ color }}
          />
        )}
        <span className="truncate text-xs font-medium text-text-primary">
          {data.componentName}
        </span>
      </div>

      <Handle
        type="target"
        position={Position.Left}
        data-testid="archie-node-handle-target"
        className="!h-2.5 !w-2.5 !border-2 !border-archie-border !bg-surface"
      />
      <Handle
        type="source"
        position={Position.Right}
        data-testid="archie-node-handle-source"
        className="!h-2.5 !w-2.5 !border-2 !border-archie-border !bg-surface"
      />
    </div>
  )
}

export const ArchieNode = memo(ArchieNodeComponent)
