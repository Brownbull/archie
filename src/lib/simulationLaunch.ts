import { useArchitectureStore } from "@/stores/architectureStore"
import { useSimulationStore } from "@/stores/simulationStore"
import { useChallengeStore } from "@/stores/challengeStore"
import {
  buildSimGraph,
  computeTotalArchitectureCost,
  buildTrafficCurveFromSpecs,
  workloadBlend,
  crossRegionSimOpts,
  totalTrafficSourceRps,
  scaleTrafficCurveToPeak,
  buildTrafficCurveFromSources,
  hasTrafficKind,
} from "@/stores/architectureStoreHelpers"
import { countTopologyIssues } from "@/engine/topologyChecker"
import { defaultTrafficCurve } from "@/engine/simulationEngine"
import { componentLibrary } from "@/services/componentLibrary"
import { getScenarioPreset } from "@/services/scenarioLoader"
import { SIM_DEFAULT_DURATION_S } from "@/lib/constants"
import type { Challenge } from "@/lib/challengeTypes"

/**
 * Shared simulation-launch flows (P1/T6). Extracted from ChallengeStartButton / RunSimulationButton
 * so the SimulationBar's "Rerun" can re-simulate + re-grade from the LIVE canvas with byte-identical
 * snapshot/workload-lock semantics to the original start — the anti-double-score discipline
 * (startAttempt only from "building") stays intact because rerun re-arms via selectChallenge first.
 */

/**
 * Start (or restart) a challenge attempt from the live canvas: freezes the cost/topology/type-graph
 * snapshot, marks the attempt running, and starts the sim with the challenge's authored curve,
 * events, duration, and (until 3★) its authoritative workload blend.
 * Precondition: attemptState === "building" (call selectChallenge first when re-arming).
 */
export function launchChallengeAttempt(challenge: Challenge): void {
  const { nodes, edges, topologyIssues } = useArchitectureStore.getState()
  const { startAttempt, bestStars } = useChallengeStore.getState()
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
  useSimulationStore
    .getState()
    .start(graph, curve, challenge.scheduledEvents, challenge.durationSeconds, challenge.chaosIntensity)
}

/**
 * Start (or restart) a free-build sandbox run from the live canvas. Curve precedence: an active
 * demand scenario shapes it (scaled to source volume); else a Traffic Source's own kind drives the
 * shape; else the default ramp.
 */
export function launchSandboxRun(): void {
  const { nodes, edges, activeScenarioId } = useArchitectureStore.getState()
  const graph = buildSimGraph(nodes, edges)
  const sourceTotal = totalTrafficSourceRps(nodes)
  const scenarioCurve = activeScenarioId ? getScenarioPreset(activeScenarioId)?.trafficCurve : undefined
  let curve
  if (scenarioCurve) {
    curve = sourceTotal > 0 ? scaleTrafficCurveToPeak(scenarioCurve, sourceTotal) : scenarioCurve
  } else if (hasTrafficKind(nodes)) {
    curve = buildTrafficCurveFromSources(nodes, SIM_DEFAULT_DURATION_S)
  } else {
    curve = sourceTotal > 0 ? scaleTrafficCurveToPeak(defaultTrafficCurve(), sourceTotal) : defaultTrafficCurve()
  }
  useSimulationStore.getState().start(graph, curve)
}
