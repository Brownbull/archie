import { NodeToolbar, Position } from "@xyflow/react"
import { Copy, Trash2 } from "lucide-react"
import { useArchitectureStore } from "@/stores/architectureStore"
import { useUiStore } from "@/stores/uiStore"
import { ObjectActionToolbar, type ObjectAction } from "@/components/canvas/ObjectActionToolbar"

interface NodeActionToolbarProps {
  nodeId: string
}

/**
 * On-object Duplicate/Remove toolbar for a node. Shown above the node when it is the
 * app-selected node — the same selection that drives the inspector — so the toolbar and
 * the inspector always agree. Complements (does not replace) the Delete-key accelerator
 * and the right-click radial menu.
 */
export function NodeActionToolbar({ nodeId }: NodeActionToolbarProps) {
  const isSelected = useUiStore((s) => s.selectedNodeId === nodeId)
  const removeNode = useArchitectureStore((s) => s.removeNode)
  const duplicateNode = useArchitectureStore((s) => s.duplicateNode)
  const setSelectedNodeId = useUiStore((s) => s.setSelectedNodeId)

  const actions: ObjectAction[] = [
    {
      id: "duplicate",
      label: "Duplicate",
      icon: <Copy size={15} />,
      onClick: () => {
        const newId = duplicateNode(nodeId)
        if (newId) setSelectedNodeId(newId)
      },
    },
    {
      id: "remove",
      label: "Remove",
      icon: <Trash2 size={15} />,
      variant: "danger",
      onClick: () => removeNode(nodeId),
    },
  ]

  return (
    <NodeToolbar nodeId={nodeId} isVisible={isSelected} position={Position.Top} offset={8}>
      <ObjectActionToolbar testId="node-action-toolbar" actions={actions} />
    </NodeToolbar>
  )
}
