import { useEffect } from "react"
import { useSimulationStore } from "@/stores/simulationStore"
import { useChallengeStore } from "@/stores/challengeStore"
import { useArchitectureStore } from "@/stores/architectureStore"
import { computeSimStats } from "@/lib/simulationStats"
import { computeTotalArchitectureCost } from "@/stores/architectureStoreHelpers"

/**
 * Auto-scores a challenge attempt when its simulation finishes (Epic 16 Phase 4).
 * Watches the simulation status: on the running → done transition, while the attempt is
 * still "running", it computes the final stats, total cost, and topology-issue count and
 * calls challengeStore.scoreAttempt (which moves the attempt to "scored" and opens the
 * results modal). The attemptState guard makes this idempotent — it fires exactly once
 * per run, since scoring flips attemptState away from "running".
 */
export function useChallengeAutoScore(): void {
  const simStatus = useSimulationStore((s) => s.status)
  const attemptState = useChallengeStore((s) => s.attemptState)

  useEffect(() => {
    if (simStatus !== "done" || attemptState !== "running") return
    const { ticks } = useSimulationStore.getState()
    const { nodes, topologyIssues } = useArchitectureStore.getState()
    const stats = computeSimStats(ticks, ticks.length - 1)
    const totalCost = computeTotalArchitectureCost(nodes)
    useChallengeStore.getState().scoreAttempt(stats, topologyIssues.length, totalCost)
  }, [simStatus, attemptState])
}
