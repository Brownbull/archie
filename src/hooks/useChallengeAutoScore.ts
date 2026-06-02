import { useEffect } from "react"
import { useSimulationStore } from "@/stores/simulationStore"
import { useChallengeStore } from "@/stores/challengeStore"
import { useArchitectureStore } from "@/stores/architectureStore"
import { computeSimStats } from "@/lib/simulationStats"
import { computeTotalArchitectureCost } from "@/stores/architectureStoreHelpers"

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
    if (simStatus !== "done" || attemptState !== "running") return
    const { ticks } = useSimulationStore.getState()
    const { attemptSnapshot, scoreAttempt } = useChallengeStore.getState()
    const stats = computeSimStats(ticks, ticks.length - 1)
    const archState = useArchitectureStore.getState()
    const { activeChallenge } = useChallengeStore.getState()
    const rawIssueCount = attemptSnapshot?.topologyIssueCount ?? archState.topologyIssues.length
    const totalCost = attemptSnapshot?.totalCost ?? computeTotalArchitectureCost(archState.nodes)

    // In challenge mode, suppress topology issues the player can't fix with the available blocks.
    // - replicas-without-lb: requires load-balancer in availableBlocks
    // - missing-hop (single point of failure): requires redundant paths, often impossible with
    //   limited block palettes — suppress when availableBlocks is constrained
    let solvableIssueCount = rawIssueCount
    if (activeChallenge?.availableBlocks?.length) {
      const available = new Set(activeChallenge.availableBlocks)
      const unsolvable = archState.topologyIssues.filter((i) => {
        if (i.issueType === "replicas-without-lb" && !available.has("load-balancer")) return true
        if (i.issueType === "missing-hop") return true
        return false
      })
      solvableIssueCount = Math.max(0, rawIssueCount - unsolvable.length)
    }

    scoreAttempt(stats, solvableIssueCount, totalCost)
  }, [simStatus, attemptState])
}
