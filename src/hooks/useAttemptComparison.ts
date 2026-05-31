import { useEffect, useMemo } from "react"
import { useAttemptsStore } from "@/stores/attemptsStore"
import { useCurrentUserId } from "@/hooks/useCurrentUserId"
import type { AttemptRecord } from "@/schemas/attemptSchema"

export interface CurrentAttemptStats {
  stars: number
  totalCost: number
  p99LatencyMs: number
  uptimePercent: number
}

/**
 * Solo progress loop (P4): find the user's best PRIOR attempt at a challenge so the results
 * modal can show "vs your past attempts" deltas. Strictly single-player — no cross-user data.
 *
 * Loads the owner-scoped attempts once if none are cached. Any attempt whose metric signature
 * matches the current one is excluded, so a freshly-persisted current attempt that a concurrent
 * reload happened to include never compares against itself. Returns the best remaining prior
 * attempt (most stars → lowest cost → lowest latency), or null when this is the first attempt.
 */
export function useAttemptComparison(
  challengeId: string,
  current: CurrentAttemptStats,
): AttemptRecord | null {
  const userId = useCurrentUserId()
  const attempts = useAttemptsStore((s) => s.attempts)
  const loading = useAttemptsStore((s) => s.loading)
  const loadAttempts = useAttemptsStore((s) => s.loadAttempts)

  useEffect(() => {
    // challengeId is "" while the modal is closed → stay inert (no background load).
    if (challengeId && userId && attempts.length === 0 && !loading) void loadAttempts(userId)
    // Load once on open when nothing is cached; deliberately not re-run on attempts/loading change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, challengeId])

  return useMemo(() => {
    const prior = attempts.filter(
      (a) =>
        a.challengeId === challengeId &&
        !(
          a.stars === current.stars &&
          a.totalCost === current.totalCost &&
          Math.round(a.p99LatencyMs) === Math.round(current.p99LatencyMs) &&
          a.uptimePercent.toFixed(1) === current.uptimePercent.toFixed(1)
        ),
    )
    if (prior.length === 0) return null
    return prior.reduce((best, a) => {
      if (a.stars !== best.stars) return a.stars > best.stars ? a : best
      if (a.totalCost !== best.totalCost) return a.totalCost < best.totalCost ? a : best
      return a.p99LatencyMs < best.p99LatencyMs ? a : best
    })
  }, [attempts, challengeId, current.stars, current.totalCost, current.p99LatencyMs, current.uptimePercent])
}
