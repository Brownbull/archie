import { Play } from "lucide-react"
import { useArchitectureStore } from "@/stores/architectureStore"
import { useSimulationStore } from "@/stores/simulationStore"
import { useChallengeStore, isChallengeMode } from "@/stores/challengeStore"
import { buildSimGraph } from "@/stores/architectureStoreHelpers"

/**
 * "Start Challenge" trigger (Epic 16 Phase 4). Replaces RunSimulationButton while a challenge
 * is being built: marks the attempt running and starts the simulation with the challenge's own
 * traffic curve + scheduled events, so the run is scored against the rubric on completion.
 * Shown only in challenge mode, while building, with the canvas non-empty and no sim active.
 */
export function ChallengeStartButton() {
  const inChallenge = useChallengeStore(isChallengeMode)
  const attemptState = useChallengeStore((s) => s.attemptState)
  const challenge = useChallengeStore((s) => s.activeChallenge)
  const startAttempt = useChallengeStore((s) => s.startAttempt)
  const simStatus = useSimulationStore((s) => s.status)
  const startSim = useSimulationStore((s) => s.start)
  const nodeCount = useArchitectureStore((s) => s.nodes.length)

  if (!inChallenge || !challenge || attemptState !== "building" || simStatus !== "idle" || nodeCount === 0) {
    return null
  }

  const onStart = () => {
    const { nodes, edges } = useArchitectureStore.getState()
    const graph = buildSimGraph(nodes, edges)
    startAttempt() // building → running BEFORE the sim, so a single-tick run is still scored
    startSim(graph, challenge.trafficCurve, challenge.scheduledEvents)
  }

  return (
    <button
      type="button"
      data-testid="start-challenge"
      onClick={onStart}
      className="absolute left-1/2 top-3 z-10 flex -translate-x-1/2 items-center gap-1.5 rounded-full border border-emerald-500/40 bg-emerald-500/90 px-3 py-1.5 text-xs font-semibold text-white shadow-md transition-colors hover:bg-emerald-500"
    >
      <Play className="h-3.5 w-3.5" />
      Start Challenge
    </button>
  )
}
