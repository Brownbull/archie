import { useMemo } from "react"
import { useChallengeStore } from "@/stores/challengeStore"
import { useArchitectureStore } from "@/stores/architectureStore"
import { suggestArchitectureChange, type SuggestionResult } from "@/engine/suggestionEngine"

/**
 * Computes the "try this next" suggestion for the scored challenge attempt (Epic 17 Phase 2).
 * Shadow-simulates candidate changes to the CURRENT architecture against the active challenge's
 * curve / events / duration / target metrics. Returns null outside a scored attempt. Memoized so
 * the (multi-sim) computation runs once per result, not on every render.
 */
export function useChallengeSuggestion(): SuggestionResult | null {
  const challenge = useChallengeStore((s) => s.activeChallenge)
  const attemptState = useChallengeStore((s) => s.attemptState)
  const nodes = useArchitectureStore((s) => s.nodes)
  const edges = useArchitectureStore((s) => s.edges)

  return useMemo(() => {
    if (!challenge || attemptState !== "scored") return null
    return suggestArchitectureChange({
      nodes,
      edges,
      curve: challenge.trafficCurve,
      scheduledEvents: challenge.scheduledEvents,
      durationS: challenge.durationSeconds,
      targetMetrics: challenge.targetMetrics,
    })
  }, [challenge, attemptState, nodes, edges])
}
