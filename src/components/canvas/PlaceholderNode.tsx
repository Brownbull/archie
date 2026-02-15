import { memo } from "react"
import { Handle, Position } from "@xyflow/react"
import type { NodeProps, Node } from "@xyflow/react"
import type { ArchieNodeData } from "@/stores/architectureStore"
import { NODE_WIDTH } from "@/lib/constants"
import { CircleAlert } from "lucide-react"

type PlaceholderNodeType = Node<ArchieNodeData, "placeholder">

function PlaceholderNodeComponent({ data }: NodeProps<PlaceholderNodeType>) {
  return (
    <div
      data-testid="placeholder-node"
      className="rounded-md border-2 border-dashed border-archie-border bg-surface/50 shadow-sm"
      style={{ width: `${NODE_WIDTH}px` }}
    >
      <div className="flex items-center gap-2 px-3 py-2">
        <CircleAlert className="h-4 w-4 shrink-0 text-text-secondary" />
        <div className="min-w-0">
          <span className="block truncate text-xs font-medium text-text-secondary">
            {data.archieComponentId}
          </span>
          <span className="text-[10px] text-text-secondary/70">
            Component not found
          </span>
        </div>
      </div>

      <Handle
        type="target"
        position={Position.Left}
        className="!h-2.5 !w-2.5 !border-2 !border-archie-border !bg-surface"
      />
      <Handle
        type="source"
        position={Position.Right}
        className="!h-2.5 !w-2.5 !border-2 !border-archie-border !bg-surface"
      />
    </div>
  )
}

export const PlaceholderNode = memo(PlaceholderNodeComponent)
