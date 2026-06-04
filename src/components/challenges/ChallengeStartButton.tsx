import { Play } from "lucide-react"
import { useArchitectureStore } from "@/stores/architectureStore"
import { useSimulationStore } from "@/stores/simulationStore"
import { useChallengeStore, isChallengeMode } from "@/stores/challengeStore"
import { buildSimGraph, computeTotalArchitectureCost, buildTrafficCurveFromSpecs } from "@/stores/architectureStoreHelpers"

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
    const { nodes, edges, topologyIssues } = useArchitectureStore.getState()
    const graph = buildSimGraph(nodes, edges)
    // Snapshot cost + topology NOW: the sim runs on this graph, so scoring must use the
    // architecture as it is at start, not the live canvas (the user can edit mid-run).
    startAttempt({
      totalCost: computeTotalArchitectureCost(nodes),
      topologyIssueCount: topologyIssues.length,
    }) // building → running BEFORE the sim, so a single-tick run is still scored
    // ISAPivot (D63): when the challenge declares typed trafficSources, derive the load from them
    // (peak-anchored, summed) — they OVERRIDE the legacy trafficCurve. Otherwise use trafficCurve.
    const curve =
      challenge.trafficSources && challenge.trafficSources.length > 0
        ? buildTrafficCurveFromSpecs(challenge.trafficSources, challenge.durationSeconds)
        : challenge.trafficCurve
    // Pass the challenge's authored duration so the curve + scheduled events map over the
    // intended window (not the engine's default 90s).
    startSim(graph, curve, challenge.scheduledEvents, challenge.durationSeconds)
  }

  return (
    <button
      type="button"
      data-testid="start-challenge"
      onClick={onStart}
      className="absolute bottom-4 left-1/2 z-10 flex -translate-x-1/2 items-center gap-1.5 rounded-full border border-emerald-500/40 bg-emerald-500/90 px-3 py-1.5 text-xs font-semibold text-white shadow-md transition-colors hover:bg-emerald-500"
    >
      <Play className="h-3.5 w-3.5" />
      Start Challenge
    </button>
  )
}
