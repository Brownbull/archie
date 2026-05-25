import { useMemo } from "react"
import { useUiStore, type DragSource } from "@/stores/uiStore"
import { useArchitectureStore } from "@/stores/architectureStore"
import { checkCompatibility } from "@/engine/compatibilityChecker"
import { componentLibrary } from "@/services/componentLibrary"

export interface NodeCompatibility {
  nodeId: string
  isCompatible: boolean
  reason: string
}

function computeNodeCompatibilities(
  drag: DragSource,
  nodes: ReadonlyArray<{ id: string; data: { archieComponentId: string; componentCategory: string } }>,
): Map<string, NodeCompatibility> {
  const result = new Map<string, NodeCompatibility>()

  const dragComponent = drag.kind === "toolbox"
    ? componentLibrary.getComponent(drag.componentId)
    : (() => {
        const sourceNode = nodes.find((n) => n.id === drag.sourceNodeId)
        return sourceNode ? componentLibrary.getComponent(sourceNode.data.archieComponentId) : undefined
      })()

  if (!dragComponent) return result

  for (const node of nodes) {
    if (drag.kind === "connection" && node.id === drag.sourceNodeId) continue

    const nodeComponent = componentLibrary.getComponent(node.data.archieComponentId)
    const { isCompatible, reason } = checkCompatibility(
      { category: dragComponent.category, compatibility: dragComponent.compatibility },
      nodeComponent ? { category: nodeComponent.category, compatibility: nodeComponent.compatibility } : undefined,
    )

    result.set(node.id, { nodeId: node.id, isCompatible, reason })
  }

  return result
}

export function useCompatibilityFilter(): {
  activeDrag: DragSource | null
  nodeCompatibilities: Map<string, NodeCompatibility>
  isNodeCompatible: (nodeId: string) => boolean
  getIncompatibilityReason: (nodeId: string) => string | null
} {
  const activeDrag = useUiStore((s) => s.activeDrag)
  const nodes = useArchitectureStore((s) => s.nodes)

  const nodeCompatibilities = useMemo(() => {
    if (!activeDrag) return new Map<string, NodeCompatibility>()
    return computeNodeCompatibilities(activeDrag, nodes)
  }, [activeDrag, nodes])

  const isNodeCompatible = (nodeId: string): boolean => {
    const entry = nodeCompatibilities.get(nodeId)
    return entry?.isCompatible ?? true
  }

  const getIncompatibilityReason = (nodeId: string): string | null => {
    const entry = nodeCompatibilities.get(nodeId)
    if (!entry || entry.isCompatible) return null
    return entry.reason
  }

  return { activeDrag, nodeCompatibilities, isNodeCompatible, getIncompatibilityReason }
}
