import { useEffect, useState } from "react"
import { toast } from "sonner"
import { Toolbar } from "@/components/layout/Toolbar"
import { ToolboxPanel } from "@/components/toolbox/ToolboxPanel"
import { CommandPalette } from "@/components/toolbox/CommandPalette"
// NOTE: Direct service import for initialization only (not data access).
// Data reads go through useLibrary hook per AC-ARCH-NO-2.
import { componentLibrary } from "@/services/componentLibrary"
import { Skeleton } from "@/components/ui/skeleton"
import {
  TOOLBOX_WIDTH,
  INSPECTOR_WIDTH,
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

  useEffect(() => {
    componentLibrary
      .initialize()
      .then(() => setLibraryReady(true))
      .catch((err) => {
        console.error("Failed to initialize component library:", err)
        toast.error("Failed to load component library")
      })
  }, [])

  return (
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
          className="flex flex-1 items-center justify-center bg-canvas text-text-secondary"
        >
          Canvas
        </main>

        <aside
          data-testid="inspector"
          className="flex items-center justify-center border-l border-archie-border bg-panel text-text-secondary"
          style={{ width: `${INSPECTOR_WIDTH}px` }}
        >
          Inspector
        </aside>
      </div>

      <footer
        data-testid="dashboard"
        className="flex items-center justify-center border-t border-archie-border bg-panel text-text-secondary"
        style={{ height: `${DASHBOARD_HEIGHT}px` }}
      >
        Dashboard
      </footer>

      <CommandPalette />
    </div>
  )
}
