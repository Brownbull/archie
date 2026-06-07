import { useEffect } from "react"
import { useSimulationStore } from "@/stores/simulationStore"
import { useChallengeStore } from "@/stores/challengeStore"
import { useArchitectureStore } from "@/stores/architectureStore"
import { computeSimStats } from "@/lib/simulationStats"
import { computeTotalArchitectureCost, computeIntegratedArchitectureCost, getNodeCost } from "@/stores/architectureStoreHelpers"
import { peakOriginBoundRps } from "@/lib/challengeBudget"
import { countTopologyIssues } from "@/engine/topologyChecker"
import { componentLibrary } from "@/services/componentLibrary"

/**
 * Auto-scores a challenge attempt when its simulation finishes (Epic 16 Phase 4).
 * Watches the simulation status: on the running → done transition, while the attempt is
 * still "running", it scores against the rubric and moves the attempt to "scored" (opening
 * the results modal). The attemptState guard makes this fire exactly once per run — scoring
 * flips attemptState away from "running", so the effect is idempotent under status churn.
 *
 * Stats come from the simulation ticks (the result of the graph that was actually run).
 * Cost + topology come from the start-time snapshot recorded by startAttempt — NOT the live
 * canvas — so editing the canvas mid-run cannot skew the score (falls back to live only if
 * no snapshot was recorded, e.g. a sim started outside the challenge Start button).
 */
export function useChallengeAutoScore(): void {
  const simStatus = useSimulationStore((s) => s.status)
  const attemptState = useChallengeStore((s) => s.attemptState)

  useEffect(() => {
    // If the sim was stopped/reset while the challenge was running, return to building so the
    // user can retry — otherwise the challenge is stuck in "running" with no way to restart.
    if (simStatus === "idle" && attemptState === "running") {
      const { activeChallenge } = useChallengeStore.getState()
      if (activeChallenge) useChallengeStore.getState().selectChallenge(activeChallenge)
      return
    }
    if (simStatus !== "done" || attemptState !== "running") return
    const { ticks } = useSimulationStore.getState()
    const { attemptSnapshot, scoreAttempt } = useChallengeStore.getState()
    const stats = computeSimStats(ticks, ticks.length - 1)
    const archState = useArchitectureStore.getState()
    // ED9 (D74): an autoscaling build's cost depends on the run (mean active replicas over the curve), so
    // it can't use the start-time snapshot — integrate over the ticks. Non-autoscale builds keep the
    // frozen snapshot cost (the D72 mid-run-edit guard), so the 57 are byte-identical.
    const hasAutoscale = archState.nodes.some((n) => getNodeCost(n.data.archieComponentId, n.data.activeConfigVariantId, n.data.replicaCount ?? 1, n.data.trafficRps).autoscale === true)
    // D74: on-path cost — a disconnected block is inert in the sim, so it shouldn't bill against budget either.
    const totalCost = hasAutoscale
      ? computeIntegratedArchitectureCost(archState.nodes, ticks, archState.edges)
      : (attemptSnapshot?.totalCost ?? computeTotalArchitectureCost(archState.nodes, archState.edges))

    // Topology scoring (D72): only BLOCKING issues (orphan/unreachable — a structurally broken graph)
    // gate the well-formed star. SPOF (missing-hop) + replicas-without-LB are ADVISORY: they coach
    // toward resilience but never block a star (a build with zero of them earns the "Resilient" badge).
    // Prefer the start-time snapshot counts so a mid-run canvas edit can't skew the score; fall back to
    // the live topology issues (split here) when no snapshot was recorded.
    // Use the snapshot consistently (both counts frozen at start) or fall back to live for both —
    // never mix a snapshot blocking count with a live advisory count.
    const live = countTopologyIssues(archState.topologyIssues)
    const blockingIssueCount = attemptSnapshot ? attemptSnapshot.topologyIssueCount : live.blocking
    const advisoryIssueCount = attemptSnapshot ? (attemptSnapshot.topologyAdvisoryCount ?? 0) : live.advisory

    // Collect component TYPE ids on the canvas for required_types validation.
    // Node data has archieComponentId (vendor, e.g. "nginx") — we need the typeId
    // (fundamental type, e.g. "load-balancer") which is on the Component in the library.
    const canvasTypeIds = new Set<string>()
    const typeByNodeId = new Map<string, string>()
    const cdnHitByNodeId = new Map<string, number>() // EN5: CDN nodes' hit ratios (edge absorption)
    for (const node of archState.nodes) {
      const component = componentLibrary.getComponent(node.data.archieComponentId)
      if (component?.typeId) {
        canvasTypeIds.add(component.typeId)
        typeByNodeId.set(node.id, component.typeId)
        if (component.typeId === "cdn") {
          const hit = getNodeCost(node.data.archieComponentId, node.data.activeConfigVariantId, node.data.replicaCount ?? 1, node.data.trafficRps).cacheHitRatio
          if (hit !== undefined && hit > 0) cdnHitByNodeId.set(node.id, hit)
        }
      }
    }

    // LX2 (D74): find the most-overloaded node across the run — the actionable culprit when a run
    // fails (the iterate-coach + results modal name it instead of just "something's overloaded").
    let bottleneck: { typeId: string; capacityPercent: number; failedRps: number } | undefined
    let worstCap = 1 // only flag genuine overload (>100% capacity)
    for (const tick of ticks) {
      for (const nt of tick.nodes) {
        if (nt.capacityPercent > worstCap) {
          const typeId = typeByNodeId.get(nt.nodeId)
          if (typeId) {
            worstCap = nt.capacityPercent
            bottleneck = { typeId, capacityPercent: nt.capacityPercent, failedRps: nt.failedRps }
          }
        }
      }
    }

    // EN5 (D74): peak origin-bound load (post-CDN) that usage-based fees bill against; the CDN's edge
    // absorption lowers it. Cheap when no usage_rates (the value is ignored by scoreAttempt then).
    const originBoundRps = peakOriginBoundRps(ticks, cdnHitByNodeId)

    scoreAttempt(stats, blockingIssueCount, totalCost, canvasTypeIds, advisoryIssueCount, bottleneck, originBoundRps)
  }, [simStatus, attemptState])
}
