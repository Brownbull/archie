import { useEffect, useState } from "react"
import { toast } from "sonner"
import { Toolbar } from "@/components/layout/Toolbar"
import { ToolboxPanel } from "@/components/toolbox/ToolboxPanel"
import { CommandPalette } from "@/components/toolbox/CommandPalette"
import { CanvasView } from "@/components/canvas/CanvasView"
import { CanvasErrorBoundary } from "@/components/canvas/CanvasErrorBoundary"
import { InspectorPanel } from "@/components/inspector/InspectorPanel"
import { InspectorResizeHandle } from "@/components/inspector/InspectorResizeHandle"
import { InspectorOverlay } from "@/components/inspector/InspectorOverlay"
import { DashboardPanel } from "@/components/dashboard/DashboardPanel"
import { ImportProvider } from "@/components/import-export/ImportDialog"
// NOTE: Direct service import for initialization only (not data access).
// Data reads go through useLibrary hook per AC-ARCH-NO-2.
import { componentLibrary } from "@/services/componentLibrary"
import { useUiStore } from "@/stores/uiStore"
import { Skeleton } from "@/components/ui/skeleton"
import {
  TOOLBOX_WIDTH,
  INSPECTOR_COLLAPSED_WIDTH,
  DASHBOARD_HEIGHT,
} from "@/lib/constants"

function ToolboxSkeleton() {
  return (
    <div className="space-y-3 p-3" data-testid="toolbox-skeleton">
      <Skeleton className="h-8 w-full" />
      <Skeleton className="h-6 w-3/4" />
      <Skeleton className="h-24 w-full" />
      <Skeleton className="h-24 w-full" />
      <Skeleton className="h-24 w-full" />
    </div>
  )
}

export function AppLayout() {
  const [libraryReady, setLibraryReady] = useState(false)
  const inspectorCollapsed = useUiStore((s) => s.inspectorCollapsed)
  const inspectorOverlay = useUiStore((s) => s.inspectorOverlay)
  const storeWidth = useUiStore((s) => s.inspectorWidth)
  const selectedNodeId = useUiStore((s) => s.selectedNodeId)
  const selectedEdgeId = useUiStore((s) => s.selectedEdgeId)
  const hasSelection = selectedNodeId !== null || selectedEdgeId !== null
  const inspectorWidth = !hasSelection || inspectorOverlay
    ? 0
    : inspectorCollapsed ? INSPECTOR_COLLAPSED_WIDTH : storeWidth

  useEffect(() => {
    componentLibrary
      .initialize()
      .then(() => setLibraryReady(true))
      .catch(() => {
        toast.error("Failed to load component library")
      })
  }, [])

  return (
    <ImportProvider>
      <div className="flex h-screen flex-col bg-canvas">
        <Toolbar />

        <div className="flex flex-1 overflow-hidden">
          <aside
            data-testid="toolbox"
            className="flex flex-col border-r border-archie-border bg-panel"
            style={{ width: `${TOOLBOX_WIDTH}px` }}
          >
            {libraryReady ? <ToolboxPanel /> : <ToolboxSkeleton />}
          </aside>

          <main
            data-testid="canvas"
            className="flex-1 overflow-hidden bg-canvas"
          >
            <CanvasErrorBoundary>
              <CanvasView />
            </CanvasErrorBoundary>
          </main>

          {hasSelection && !inspectorCollapsed && !inspectorOverlay && (
            <InspectorResizeHandle />
          )}

          <aside
            data-testid="inspector"
            className="overflow-hidden border-l border-archie-border bg-panel transition-[width] duration-200 ease-in-out"
            style={{ width: `${inspectorWidth}px` }}
          >
            <InspectorPanel />
          </aside>
        </div>

        <footer
          data-testid="dashboard"
          className="border-t border-archie-border bg-panel"
          style={{ height: `${DASHBOARD_HEIGHT}px` }}
        >
          <DashboardPanel />
        </footer>

        <CommandPalette />

        {hasSelection && (
          <InspectorOverlay>
            <InspectorPanel />
          </InspectorOverlay>
        )}
      </div>
    </ImportProvider>
  )
}
