import { useRef } from "react"
import { ChevronLeft, ChevronRight, Maximize2, Minimize2, Maximize } from "lucide-react"
import { INSPECTOR_DEFAULT_WIDTH, INSPECTOR_EXPANDED_WIDTH } from "@/lib/constants"
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
  const inspectorWidth = useUiStore((s) => s.inspectorWidth)
  const setInspectorWidth = useUiStore((s) => s.setInspectorWidth)
  const inspectorOverlay = useUiStore((s) => s.inspectorOverlay)
  const setInspectorOverlay = useUiStore((s) => s.setInspectorOverlay)

  const contentRef = useRef<HTMLDivElement>(null)
  const isExpanded = inspectorWidth > INSPECTOR_DEFAULT_WIDTH

  const handleToggleExpand = () => {
    setInspectorWidth(isExpanded ? INSPECTOR_DEFAULT_WIDTH : INSPECTOR_EXPANDED_WIDTH)
  }

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
        <div className="flex items-center gap-0.5">
          <Button
            variant="ghost"
            size="icon"
            data-testid="inspector-expand-toggle"
            onClick={handleToggleExpand}
            aria-label={isExpanded ? "Compact inspector" : "Expand inspector"}
            className="h-7 w-7"
          >
            {isExpanded ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            data-testid="inspector-maximize-btn"
            onClick={() => setInspectorOverlay(true)}
            aria-label="Full-screen inspector"
            className="h-7 w-7"
          >
            <Maximize className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            data-testid="inspector-collapse-btn"
            onClick={() => {
              setInspectorCollapsed(true)
              if (inspectorOverlay) setInspectorOverlay(false)
            }}
            aria-label="Collapse inspector"
            className="h-7 w-7"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
      {selectedNodeId && !selectedEdgeId && (
        <div
          data-testid="inspector-section-nav"
          className="flex gap-1 border-b border-archie-border px-2 py-1"
        >
          {(["code", "details", "metrics"] as const).map((section) => (
            <button
              key={section}
              type="button"
              className="rounded px-1.5 py-0.5 text-[10px] text-text-secondary hover:bg-surface hover:text-text-primary"
              onClick={() => {
                contentRef.current
                  ?.querySelector(`[data-section="${section}"]`)
                  ?.scrollIntoView({ behavior: "smooth", block: "start" })
              }}
            >
              {section.charAt(0).toUpperCase() + section.slice(1)}
            </button>
          ))}
        </div>
      )}
      <div ref={contentRef} data-testid="inspector-content" className="flex-1 overflow-hidden">
        {selectedEdgeId ? (
          <ConnectionDetail edgeId={selectedEdgeId} />
        ) : selectedNodeId ? (
          <NodeInspectorContent nodeId={selectedNodeId} />
        ) : null}
      </div>
    </div>
  )
}
