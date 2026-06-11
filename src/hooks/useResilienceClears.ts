import { useEffect, useRef, useState } from "react"
import { useChallengeStore } from "@/stores/challengeStore"
import { useArchitectureStore } from "@/stores/architectureStore"
import { useUserProgressStore } from "@/stores/userProgressStore"
import { useCurrentUserId } from "@/hooks/useCurrentUserId"
import { computeBreakingFailures } from "@/services/failureImpact"
import { getFailurePreset } from "@/services/failureLoader"
import type { StarBreakdown } from "@/lib/challengeTypes"

/** One resilience extra the just-scored 3★ run survived. */
export interface ResilienceClearOutcome {
  conditionId: string
  /** Player-facing preset name (e.g. "Traffic Spike (10x)"). */
  name: string
  /** True when THIS run newly cleared it (+1 expert); false when it was already collected. */
  fresh: boolean
}

/**
 * The resilience-extras collector (P4-S7, D94). When a quest authors `resilience_conditions`, a 3★
 * run whose build ALSO survives a condition — the metric probe (P4-S4) reports no new bottleneck
 * under that failure preset — clears the extra: +1 expert each, once per (quest, condition).
 * Detection runs on the same scored transition as the break collector and is just as read-only:
 * the probe re-runs the heatmap recalculation, never the rubric — the D66 invariants can't move.
 */
export function useResilienceClears(): ResilienceClearOutcome[] | null {
  const attemptState = useChallengeStore((s) => s.attemptState)
  const lastResult = useChallengeStore((s) => s.lastResult)
  const userId = useCurrentUserId()
  const handledRef = useRef<StarBreakdown | null>(null)
  const [outcomes, setOutcomes] = useState<ResilienceClearOutcome[] | null>(null)

  useEffect(() => {
    let next: ResilienceClearOutcome[] | null = null

    if (attemptState === "scored" && lastResult && handledRef.current !== lastResult) {
      handledRef.current = lastResult
      const { activeChallenge } = useChallengeStore.getState()
      const conditions = activeChallenge?.resilienceConditions ?? []
      // Only a FULL 3★ clear can collect — the extra is "held the targets AND survived", not
      // "survived a condition on a build that failed the quest".
      if (activeChallenge && conditions.length > 0 && lastResult.stars === 3) {
        const { nodes, edges } = useArchitectureStore.getState()
        const breaking = computeBreakingFailures(nodes, edges)
        const progress = useUserProgressStore.getState()
        const record = progress.resilienceClears[activeChallenge.id] ?? {}
        const survived = conditions.filter((id) => !breaking.has(id))
        if (survived.length > 0) {
          next = survived.map((conditionId) => {
            const fresh = !record[conditionId] && !!userId
            if (fresh) void progress.collectResilienceClear(userId, activeChallenge.id, conditionId)
            return { conditionId, name: getFailurePreset(conditionId)?.name ?? conditionId, fresh }
          })
        }
      }
    } else if (attemptState === "scored") {
      return // same result already handled — keep the displayed outcome
    }

    let cancelled = false
    void Promise.resolve().then(() => {
      if (!cancelled) setOutcomes(next)
    })
    return () => {
      cancelled = true
    }
  }, [attemptState, lastResult, userId])

  return outcomes
}
