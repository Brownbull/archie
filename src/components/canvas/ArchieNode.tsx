import { memo } from "react"
import { Handle, Position } from "@xyflow/react"
import type { NodeProps } from "@xyflow/react"
import type { ArchieNode as ArchieNodeType } from "@/stores/architectureStore"
import { COMPONENT_CATEGORIES, NODE_WIDTH, type ComponentCategoryId } from "@/lib/constants"
import { CATEGORY_ICONS } from "@/lib/categoryIcons"

function ArchieNodeComponent({ data }: NodeProps<ArchieNodeType>) {
  const category = COMPONENT_CATEGORIES[data.componentCategory as ComponentCategoryId]
  const color = category?.color ?? "var(--color-muted)"
  const IconComponent = category ? CATEGORY_ICONS[category.iconName] : undefined

  return (
    <div
      data-testid="archie-node"
      className="rounded-md border border-archie-border bg-panel shadow-sm"
      style={{ width: `${NODE_WIDTH}px` }}
    >
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
