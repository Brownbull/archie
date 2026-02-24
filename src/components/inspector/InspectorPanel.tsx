import { ChevronLeft, ChevronRight } from "lucide-react"
import { useShallow } from "zustand/react/shallow"
import { useUiStore } from "@/stores/uiStore"
import { useArchitectureStore } from "@/stores/architectureStore"
import { useLibrary } from "@/hooks/useLibrary"
import { Button } from "@/components/ui/button"
import { ComponentDetail } from "@/components/inspector/ComponentDetail"
import { ConnectionDetail } from "@/components/inspector/ConnectionDetail"

/**
 * Node-specific inspector content. Extracted to a separate component
 * so that node store subscriptions only activate when a node is selected
 * (avoids conditional hook calls — React rules of hooks).
 */
function NodeInspectorContent({ nodeId }: { nodeId: string }) {
  const selectedNode = useArchitectureStore(
    useShallow((s) => s.nodes.find((n) => n.id === nodeId)),
  )
  const updateNodeConfigVariant = useArchitectureStore(
    (s) => s.updateNodeConfigVariant,
  )
  const swapNodeComponent = useArchitectureStore(
    (s) => s.swapNodeComponent,
  )

  const { getComponentById } = useLibrary()

  if (!selectedNode) return null

  const component = getComponentById(selectedNode.data.archieComponentId)
  if (!component) return null

  const handleVariantChange = (variantId: string) => {
    updateNodeConfigVariant(nodeId, variantId)
  }

  const handleSwapComponent = (newComponentId: string) => {
    swapNodeComponent(nodeId, newComponentId)
  }

  return (
    <ComponentDetail
      component={component}
      activeVariantId={selectedNode.data.activeConfigVariantId}
      onVariantChange={handleVariantChange}
      currentCategory={component.category}
      onSwapComponent={handleSwapComponent}
      nodeId={nodeId}
    />
  )
}

export function InspectorPanel() {
  const selectedNodeId = useUiStore((s) => s.selectedNodeId)
  const selectedEdgeId = useUiStore((s) => s.selectedEdgeId)
  const inspectorCollapsed = useUiStore((s) => s.inspectorCollapsed)
  const setInspectorCollapsed = useUiStore((s) => s.setInspectorCollapsed)

  // Guard: no selection at all (AC-ARCH-NO-4)
  if (!selectedNodeId && !selectedEdgeId) return null

  if (inspectorCollapsed) {
    return (
      <div
        data-testid="inspector-panel"
        className="flex h-full flex-col items-center pt-2"
      >
        <Button
          variant="ghost"
          size="icon"
          data-testid="inspector-collapse-btn"
          onClick={() => setInspectorCollapsed(false)}
          aria-label="Expand inspector"
          className="h-7 w-7"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
      </div>
    )
  }

  return (
    <div
      data-testid="inspector-panel"
      className="flex h-full flex-col"
    >
      <div className="flex items-center justify-between border-b border-archie-border px-2 py-1.5">
        <span className="text-xs font-medium text-text-primary">Inspector</span>
        <Button
          variant="ghost"
          size="icon"
          data-testid="inspector-collapse-btn"
          onClick={() => setInspectorCollapsed(true)}
          aria-label="Collapse inspector"
          className="h-7 w-7"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
      <div className="flex-1 overflow-hidden">
        {selectedEdgeId ? (
          <ConnectionDetail edgeId={selectedEdgeId} />
        ) : selectedNodeId ? (
          <NodeInspectorContent nodeId={selectedNodeId} />
        ) : null}
      </div>
    </div>
  )
}
