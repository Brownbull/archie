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
    const snapshot = attemptSnapshot ?? {
      totalCost: computeTotalArchitectureCost(useArchitectureStore.getState().nodes),
      topologyIssueCount: useArchitectureStore.getState().topologyIssues.length,
    }
    scoreAttempt(stats, snapshot.topologyIssueCount, snapshot.totalCost)
  }, [simStatus, attemptState])
}
