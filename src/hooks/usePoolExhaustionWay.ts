import { useEffect, useRef, useState } from "react"
import { useChallengeStore } from "@/stores/challengeStore"
import { useArchitectureStore } from "@/stores/architectureStore"
import { useUserProgressStore } from "@/stores/userProgressStore"
import { useCurrentUserId } from "@/hooks/useCurrentUserId"
import { poolExhaustionCausal } from "@/services/breakProbe"
import type { StarBreakdown } from "@/lib/challengeTypes"

export interface MechanicWayOutcome {
  methodId: "pool-exhaustion"
  /** True when THIS run earned the way (registry-new, +1 Expert). */
  fresh: boolean
  /** For a known way: where it was first earned. */
  earnedOnChallengeId?: string
}

/**
 * D103/B — the first MECHANIC way: pool exhaustion. Unlike dial ways (post-3★ deviations), a
 * mechanic way is earnable at FIRST ENCOUNTER: any failed scored run on a builtin quest whose
 * build is concurrency-capped, where the counterfactual WITHOUT the caps passes (causal-grade).
 * The Pool Runs Dry's seeded build is the introduction. Pays once game-wide (D102 registry).
 */
export function usePoolExhaustionWay(): MechanicWayOutcome | null {
  const attemptState = useChallengeStore((s) => s.attemptState)
  const lastResult = useChallengeStore((s) => s.lastResult)
  const userId = useCurrentUserId()
  const handledRef = useRef<StarBreakdown | null>(null)
  const [outcome, setOutcome] = useState<MechanicWayOutcome | null>(null)

  useEffect(() => {
    let next: MechanicWayOutcome | null = null
    if (attemptState === "scored" && lastResult && handledRef.current !== lastResult) {
      handledRef.current = lastResult
      const { activeChallenge, bestStars } = useChallengeStore.getState()
      if (activeChallenge && activeChallenge.origin === "builtin" && !lastResult.passedMetrics) {
        const { nodes, edges } = useArchitectureStore.getState()
        const locked = (bestStars[activeChallenge.id] ?? 0) < 3 // pre-3★ runs score the authored demand
        if (poolExhaustionCausal(nodes, edges, activeChallenge, locked)) {
          const progress = useUserProgressStore.getState()
          const known = progress.breakMethods["pool-exhaustion"]
          if (!known) {
            const fresh = !!userId
            if (fresh) void progress.collectBreakMethod(userId, "pool-exhaustion", activeChallenge.id)
            next = { methodId: "pool-exhaustion", fresh }
          } else {
            if (userId) void progress.confirmBreakMethod(userId, "pool-exhaustion", activeChallenge.id)
            next = { methodId: "pool-exhaustion", fresh: false, earnedOnChallengeId: known.challengeId }
          }
        }
      }
    } else if (attemptState === "scored") {
      return
    }
    let cancelled = false
    void Promise.resolve().then(() => {
      if (!cancelled) setOutcome(next)
    })
    return () => {
      cancelled = true
    }
  }, [attemptState, lastResult, userId])

  return outcome
}
