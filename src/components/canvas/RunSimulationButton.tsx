import { Play } from "lucide-react"
import { useArchitectureStore } from "@/stores/architectureStore"
import { useSimulationStore } from "@/stores/simulationStore"
import { useChallengeStore, isChallengeMode } from "@/stores/challengeStore"
import { launchSandboxRun } from "@/lib/simulationLaunch"

/**
 * "Run Simulation" trigger (Epic 15 Phase 5). Builds the SimGraph from the current canvas,
 * resolves a traffic curve (active scenario's curve, else a default ramp), and starts the
 * simulationStore. Hidden while a sim is active (the SimulationBar takes over), the canvas is
 * empty, or a challenge is active (ChallengeStartButton takes over — Epic 16 P4).
 */
export function RunSimulationButton() {
  const status = useSimulationStore((s) => s.status)
  const nodeCount = useArchitectureStore((s) => s.nodes.length)
  const inChallenge = useChallengeStore(isChallengeMode)

  if (status !== "idle" || nodeCount === 0 || inChallenge) return null

  const onRun = () => launchSandboxRun()

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
