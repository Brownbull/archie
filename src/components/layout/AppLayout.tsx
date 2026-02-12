import { Toolbar } from "@/components/layout/Toolbar"
import {
  TOOLBOX_WIDTH,
  INSPECTOR_WIDTH,
  DASHBOARD_HEIGHT,
} from "@/lib/constants"

export function AppLayout() {
  return (
    <div className="flex h-screen flex-col bg-canvas">
      <Toolbar />

      <div className="flex flex-1 overflow-hidden">
        <aside
          data-testid="toolbox"
          className="flex items-center justify-center border-r border-archie-border bg-panel text-text-secondary"
          style={{ width: `${TOOLBOX_WIDTH}px` }}
        >
          Toolbox
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
    </div>
  )
}
