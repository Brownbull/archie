import { useUiStore } from "@/stores/uiStore"
import { Z_INDEX } from "@/lib/constants"
import { X } from "lucide-react"

const LEGEND_ITEMS = [
  { label: "Healthy", cssVar: "var(--color-heatmap-green)", speed: "Fast" },
  { label: "Warning", cssVar: "var(--color-heatmap-yellow)", speed: "Medium" },
  { label: "Bottleneck", cssVar: "var(--color-heatmap-red)", speed: "Slow" },
] as const

export function CanvasLegend() {
  const heatmapEnabled = useUiStore((s) => s.heatmapEnabled)
  const legendDismissed = useUiStore((s) => s.legendDismissed)
  const setLegendDismissed = useUiStore((s) => s.setLegendDismissed)

  if (!heatmapEnabled || legendDismissed) return null

  return (
    <div
      data-testid="canvas-legend-container"
      className={`pointer-events-none absolute bottom-4 left-4 ${Z_INDEX.CANVAS_OVERLAY}`}
    >
      <div
        data-testid="canvas-legend"
        className="pointer-events-auto rounded-lg border border-archie-border bg-panel/90 p-3 shadow-lg backdrop-blur-sm"
      >
        <div className="mb-2 flex items-center justify-between">
          <span className="text-xs font-semibold text-text-primary">
            Heatmap Legend
          </span>
          <button
            data-testid="canvas-legend-dismiss"
            type="button"
            onClick={() => setLegendDismissed(true)}
            className="ml-3 rounded p-0.5 text-text-secondary hover:text-text-primary"
            aria-label="Dismiss legend"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
        <div className="space-y-1.5">
          {LEGEND_ITEMS.map((item) => (
            <div key={item.label} className="flex items-center gap-2 text-[10px]">
              <span
                className="inline-block h-2.5 w-2.5 rounded-sm"
                style={{ backgroundColor: item.cssVar }}
              />
              <span className="text-text-primary">{item.label}</span>
              <span className="text-text-secondary">({item.speed})</span>
            </div>
          ))}
        </div>
        <div className="mt-2 border-t border-archie-border pt-1.5 text-[10px] text-text-secondary">
          Particle speed: Fast = Healthy, Slow = Bottleneck
        </div>
      </div>
    </div>
  )
}
