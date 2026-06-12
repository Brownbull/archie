import { useEffect, useRef, useState } from "react"
import { useChallengeStore } from "@/stores/challengeStore"
import { useArchitectureStore } from "@/stores/architectureStore"
import { useUserProgressStore } from "@/stores/userProgressStore"
import { useCurrentUserId } from "@/hooks/useCurrentUserId"
import { computeBreakingFailures } from "@/services/failureImpact"
import { getFailurePreset, isKnownFailurePresetId } from "@/services/failureLoader"
import { diffTrafficAttributes, resilienceMethodId } from "@/engine/breakDetection"
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
      // Origin gate (review #2): only BUILTIN quests mint expert currency — a user-authored quest
      // could author arbitrary (even unknown) conditions and self-mint. Mirrors awardXp's gate.
      // Unknown preset ids are also skipped: a condition the probe can't simulate can't be earned.
      const conditions = (activeChallenge?.origin === "builtin" ? activeChallenge.resilienceConditions ?? [] : [])
        .filter((id) => isKnownFailurePresetId(id))
      // Only a FULL 3★ clear can collect — the extra is "held the targets AND survived", not
      // "survived a condition on a build that failed the quest".
      if (activeChallenge && conditions.length > 0 && lastResult.stars === 3) {
        const { nodes, edges } = useArchitectureStore.getState()
        // Authored-demand gate (review #1): post-3★ the canvas dials drive the load (the S3 seam)
        // while the probe is load-independent — without this check a player could lower the rps
        // dial, cheese an easy 3★, and collect a clear their build never earned at the authored
        // demand. The dials must MATCH the spec for the 3★ half of the bargain to count.
        const authoredDemand = diffTrafficAttributes(nodes, activeChallenge.trafficSources ?? []).size === 0
        const breaking = authoredDemand ? computeBreakingFailures(nodes, edges) : null
        const progress = useUserProgressStore.getState()
        const record = progress.resilienceClears[activeChallenge.id] ?? {}
        const survived = breaking ? conditions.filter((id) => !breaking.has(id)) : []
        if (survived.length > 0) {
          next = survived.map((conditionId) => {
            const fresh = !record[conditionId] && !!userId
            if (fresh) {
              void progress.collectResilienceClear(userId, activeChallenge.id, conditionId)
              // D102: the PAY rides the global method registry — surviving this condition is a
              // "way" earned once game-wide; later quests' clears register knowledge, not money.
              void progress.collectBreakMethod(userId, resilienceMethodId(conditionId), activeChallenge.id, activeChallenge.track)
            }
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
