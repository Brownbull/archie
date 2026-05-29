import { Play } from "lucide-react"
import { useArchitectureStore } from "@/stores/architectureStore"
import { useSimulationStore } from "@/stores/simulationStore"
import { buildSimGraph } from "@/stores/architectureStoreHelpers"
import { defaultTrafficCurve } from "@/engine/simulationEngine"
import { getScenarioPreset } from "@/services/scenarioLoader"

/**
 * "Run Simulation" trigger (Epic 15 Phase 5). Builds the SimGraph from the current canvas,
 * resolves a traffic curve (active scenario's curve, else a default ramp), and starts the
 * simulationStore. Hidden while a sim is active (the SimulationBar takes over) or canvas empty.
 */
export function RunSimulationButton() {
  const status = useSimulationStore((s) => s.status)
  const start = useSimulationStore((s) => s.start)
  const nodeCount = useArchitectureStore((s) => s.nodes.length)

  if (status !== "idle" || nodeCount === 0) return null

  const onRun = () => {
    const { nodes, edges, activeScenarioId } = useArchitectureStore.getState()
    const graph = buildSimGraph(nodes, edges)
    const scenarioCurve = activeScenarioId ? getScenarioPreset(activeScenarioId)?.trafficCurve : undefined
    start(graph, scenarioCurve ?? defaultTrafficCurve())
  }

  return (
    <button
      type="button"
      data-testid="run-simulation"
      onClick={onRun}
      className="absolute left-1/2 top-3 z-10 flex -translate-x-1/2 items-center gap-1.5 rounded-full border border-blue-500/40 bg-blue-500/90 px-3 py-1.5 text-xs font-semibold text-white shadow-md transition-colors hover:bg-blue-500"
    >
      <Play className="h-3.5 w-3.5" />
      Run Simulation
    </button>
  )
}
