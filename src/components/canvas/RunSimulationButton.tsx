import { Play } from "lucide-react"
import { useArchitectureStore } from "@/stores/architectureStore"
import { useSimulationStore } from "@/stores/simulationStore"
import { useChallengeStore, isChallengeMode } from "@/stores/challengeStore"
import { buildSimGraph, totalTrafficSourceRps, scaleTrafficCurveToPeak, buildTrafficCurveFromSources, hasTrafficPattern } from "@/stores/architectureStoreHelpers"
import { defaultTrafficCurve } from "@/engine/simulationEngine"
import { getScenarioPreset } from "@/services/scenarioLoader"
import { SIM_DEFAULT_DURATION_S } from "@/lib/constants"

/**
 * "Run Simulation" trigger (Epic 15 Phase 5). Builds the SimGraph from the current canvas,
 * resolves a traffic curve (active scenario's curve, else a default ramp), and starts the
 * simulationStore. Hidden while a sim is active (the SimulationBar takes over), the canvas is
 * empty, or a challenge is active (ChallengeStartButton takes over — Epic 16 P4).
 */
export function RunSimulationButton() {
  const status = useSimulationStore((s) => s.status)
  const start = useSimulationStore((s) => s.start)
  const nodeCount = useArchitectureStore((s) => s.nodes.length)
  const inChallenge = useChallengeStore(isChallengeMode)

  if (status !== "idle" || nodeCount === 0 || inChallenge) return null

  const onRun = () => {
    const { nodes, edges, activeScenarioId } = useArchitectureStore.getState()
    const graph = buildSimGraph(nodes, edges)
    const sourceTotal = totalTrafficSourceRps(nodes)
    // Curve precedence: an active demand Scenario shapes it (scaled to the source volume); else a
    // Traffic Source's own pattern (wobble/periodic/surge) drives the shape; else the default ramp.
    const scenarioCurve = activeScenarioId ? getScenarioPreset(activeScenarioId)?.trafficCurve : undefined
    let curve
    if (scenarioCurve) {
      curve = sourceTotal > 0 ? scaleTrafficCurveToPeak(scenarioCurve, sourceTotal) : scenarioCurve
    } else if (hasTrafficPattern(nodes)) {
      curve = buildTrafficCurveFromSources(nodes, SIM_DEFAULT_DURATION_S)
    } else {
      curve = sourceTotal > 0 ? scaleTrafficCurveToPeak(defaultTrafficCurve(), sourceTotal) : defaultTrafficCurve()
    }
    start(graph, curve)
  }

  return (
    <button
      type="button"
      data-testid="run-simulation"
      onClick={onRun}
      className="absolute bottom-4 left-1/2 z-10 flex -translate-x-1/2 items-center gap-1.5 rounded-full border border-blue-500/40 bg-blue-500/90 px-3 py-1.5 text-xs font-semibold text-white shadow-md transition-colors hover:bg-blue-500"
    >
      <Play className="h-3.5 w-3.5" />
      Run Simulation
    </button>
  )
}
