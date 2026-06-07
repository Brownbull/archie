import { Play } from "lucide-react"
import { useArchitectureStore } from "@/stores/architectureStore"
import { useSimulationStore } from "@/stores/simulationStore"
import { useChallengeStore, isChallengeMode } from "@/stores/challengeStore"
import { buildSimGraph, computeTotalArchitectureCost, buildTrafficCurveFromSpecs, workloadBlend, crossRegionSimOpts } from "@/stores/architectureStoreHelpers"
import { countTopologyIssues } from "@/engine/topologyChecker"
import { componentLibrary } from "@/services/componentLibrary"

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
  const bestStars = useChallengeStore((s) => s.bestStars)

  if (!inChallenge || !challenge || attemptState !== "building" || simStatus !== "idle" || nodeCount === 0) {
    return null
  }

  const onStart = () => {
    const { nodes, edges, topologyIssues } = useArchitectureStore.getState()
    // D20 (D74): until the player 3★s this challenge, its authored workload is AUTHORITATIVE — override
    // the canvas-derived write-pressure / cacheable-fraction / access-pattern erosion with the challenge's
    // own blend so the cache/DB derating matches the harness (the demand is the fixed problem statement;
    // it can't be gamed by editing the traffic node). Once 3★ is earned the node unlocks → canvas wins.
    const baseGraph = buildSimGraph(nodes, edges, crossRegionSimOpts(challenge))
    const locked = (bestStars[challenge.id] ?? 0) < 3
    const graph =
      locked && challenge.trafficSources && challenge.trafficSources.length > 0
        ? { ...baseGraph, ...workloadBlend(challenge.trafficSources) }
        : baseGraph
    // Freeze the structural graph (node-id→TYPE-id + edges) for required_topology grading (D66) —
    // same start-time discipline as cost/topology. typeId resolves vendor componentId → fundamental type.
    const typeByNodeId = new Map<string, string>()
    for (const n of nodes) {
      const typeId = componentLibrary.getComponent(n.data.archieComponentId)?.typeId
      if (typeId) typeByNodeId.set(n.id, typeId)
    }
    // Keep only edges whose BOTH endpoints resolved to a typed node — a dangling edge (e.g. a stale
    // imported node id) must not inflate fan-out or skew adjacency in required_topology grading.
    const typedEdges = edges
      .filter((e) => typeByNodeId.has(e.source) && typeByNodeId.has(e.target))
      .map((e) => ({ source: e.source, target: e.target }))
    // Snapshot cost + topology NOW: the sim runs on this graph, so scoring must use the
    // architecture as it is at start, not the live canvas (the user can edit mid-run). Split topology
    // into blocking (orphan/unreachable → gates the well-formed star) + advisory (SPOF/LB → resilient).
    const topo = countTopologyIssues(topologyIssues)
    startAttempt({
      totalCost: computeTotalArchitectureCost(nodes, edges), // D74: on-path only — a disconnected block doesn't bill
      topologyIssueCount: topo.blocking,
      topologyAdvisoryCount: topo.advisory,
      topologyGraph: { typeByNodeId, edges: typedEdges },
    }) // building → running BEFORE the sim, so a single-tick run is still scored
    // ISAPivot (D63): when the challenge declares typed trafficSources, derive the load from them
    // (peak-anchored, summed) — they OVERRIDE the legacy trafficCurve. Otherwise use trafficCurve.
    const curve =
      challenge.trafficSources && challenge.trafficSources.length > 0
        ? buildTrafficCurveFromSpecs(challenge.trafficSources, challenge.durationSeconds)
        : challenge.trafficCurve
    // Pass the challenge's authored duration so the curve + scheduled events map over the
    // intended window (not the engine's default 90s), plus its chaos intensity (3e; undefined ⇒ 1).
    startSim(graph, curve, challenge.scheduledEvents, challenge.durationSeconds, challenge.chaosIntensity)
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
