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

  const { getComponentById } = useLibrary()

  if (!selectedNode) return null

  const component = getComponentById(selectedNode.data.archieComponentId)
  if (!component) return null

  // Fluidity P1: the inspector is read-only — tuning (vendor / tier / replicas / traffic) lives on the
  // canvas block now, so no swap/variant handlers are wired here.
  return (
    <ComponentDetail
      component={component}
      activeVariantId={selectedNode.data.activeConfigVariantId}
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
      {/* Fluidity P3: no "Inspector" label — the selected block's own name (inspector-heading, below) is
          the title. The header bar carries only the panel-size controls. */}
      <div className="flex items-center justify-end border-b border-archie-border px-2 py-1.5">
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
      {/* Fluidity P3: removed the Code/Details/Metrics/Data section-nav — at most levels those sections
          are gated/empty so the tabs jumped to nothing. The sections themselves remain in the scroll. */}
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
