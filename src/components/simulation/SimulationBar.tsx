import { X } from "lucide-react"
import { useSimulationStore } from "@/stores/simulationStore"
import { SimulationTimeline } from "./SimulationTimeline"
import { SimulationStatsPanel } from "./SimulationStatsPanel"
import { PlaybackControls } from "./PlaybackControls"

/**
 * Bottom simulation bar (Epic 15) — stats + timeline + playback controls.
 * Self-gating: renders nothing when no simulation is active (status idle).
 */
export function SimulationBar() {
  const status = useSimulationStore((s) => s.status)
  const ticks = useSimulationStore((s) => s.ticks)
  const currentTick = useSimulationStore((s) => s.currentTick)
  const reset = useSimulationStore((s) => s.reset)

  if (status === "idle") return null

  return (
    <div data-testid="simulation-bar" className="border-t border-archie-border bg-panel px-3 py-2">
      <div className="flex items-center justify-between pb-1">
        <SimulationStatsPanel />
        <button
          type="button"
          data-testid="sim-close"
          aria-label="Close simulation"
          onClick={() => reset()}
          className="flex h-5 w-5 items-center justify-center rounded text-text-secondary hover:bg-surface hover:text-text-primary"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
      <div className="h-14 w-full overflow-hidden rounded bg-surface/40">
        <SimulationTimeline ticks={ticks} currentTick={currentTick} />
      </div>
      <div className="pt-1.5">
        <PlaybackControls />
      </div>
    </div>
  )
}
