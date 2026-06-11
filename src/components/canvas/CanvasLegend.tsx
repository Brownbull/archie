import { useState } from "react"
import { useUiStore } from "@/stores/uiStore"
import { Z_INDEX, PORT_TYPES, PORT_SORT_ORDER } from "@/lib/constants"
import { PORT_DASHARRAYS } from "@/lib/linkViz"
import { X, Minus, Maximize2 } from "lucide-react"

const LEGEND_ITEMS = [
  { label: "Healthy", cssVar: "var(--color-heatmap-green)", speed: "Fast" },
  { label: "Warning", cssVar: "var(--color-heatmap-yellow)", speed: "Medium" },
  { label: "Bottleneck", cssVar: "var(--color-heatmap-red)", speed: "Slow" },
] as const

export function CanvasLegend() {
  const heatmapEnabled = useUiStore((s) => s.heatmapEnabled)
  const legendDismissed = useUiStore((s) => s.legendDismissed)
  const setLegendDismissed = useUiStore((s) => s.setLegendDismissed)
  const [minimized, setMinimized] = useState(false)

  // P5-S6 (D95): the legend now also decodes LINK styles (protocol → line style, port color,
  // throughput → dot speed), which apply in the DEFAULT view — so it renders in both modes.
  if (legendDismissed) return null

  return (
    <div
      data-testid="canvas-legend-container"
      className={`pointer-events-none absolute bottom-4 left-16 ${Z_INDEX.CANVAS_OVERLAY}`}
    >
      <div
        data-testid="canvas-legend"
        className="pointer-events-auto rounded-lg border border-archie-border bg-panel/90 p-3 shadow-lg backdrop-blur-sm"
      >
        <div className={`flex items-center justify-between ${minimized ? "" : "mb-2"}`}>
          <span className="text-[0.8125rem] font-semibold text-text-primary">
            {heatmapEnabled ? "Heatmap Legend" : "Link Legend"}
          </span>
          <div className="ml-3 flex items-center gap-0.5">
            <button
              data-testid="legend-collapse-toggle"
              type="button"
              onClick={() => setMinimized((v) => !v)}
              className="rounded p-0.5 text-text-secondary hover:text-text-primary"
              aria-label={minimized ? "Expand legend" : "Minimize legend"}
              aria-expanded={!minimized}
            >
              {minimized ? <Maximize2 className="h-3 w-3" /> : <Minus className="h-3 w-3" />}
            </button>
            <button
              data-testid="canvas-legend-dismiss"
              type="button"
              onClick={() => setLegendDismissed(true)}
              className="rounded p-0.5 text-text-secondary hover:text-text-primary"
              aria-label="Dismiss legend"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        </div>
        {!minimized && heatmapEnabled && (
          <>
            <div className="space-y-1.5">
              {LEGEND_ITEMS.map((item) => (
                <div key={item.label} className="flex items-center gap-2 text-[0.6875rem]">
                  <span
                    className="inline-block h-2.5 w-2.5 rounded-sm"
                    style={{ backgroundColor: item.cssVar }}
                  />
                  <span className="text-text-primary">{item.label}</span>
                  <span className="text-text-secondary">({item.speed})</span>
                </div>
              ))}
            </div>
            <div className="mt-2 border-t border-archie-border pt-1.5 text-[0.6875rem] text-text-secondary">
              Particle speed: Fast = Healthy, Slow = Bottleneck
            </div>
          </>
        )}
        {!minimized && !heatmapEnabled && (
          <>
            <div data-testid="link-legend-styles" className="space-y-1">
              {PORT_SORT_ORDER.map((t) => (
                <div key={t} className="flex items-center gap-2 text-[0.6875rem]">
                  <svg width="26" height="6" aria-hidden>
                    <line x1="1" y1="3" x2="25" y2="3" stroke={PORT_TYPES[t].color} strokeWidth="2" strokeDasharray={PORT_DASHARRAYS[t]} />
                  </svg>
                  <span className="text-text-primary">{PORT_TYPES[t].label}</span>
                </div>
              ))}
            </div>
            <div className="mt-2 border-t border-archie-border pt-1.5 text-[0.6875rem] text-text-secondary">
              Dot speed scales with the link's downstream capacity
            </div>
          </>
        )}
      </div>
    </div>
  )
}
