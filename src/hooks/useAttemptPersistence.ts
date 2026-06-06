import { useEffect, useRef } from "react"
import { useChallengeStore } from "@/stores/challengeStore"
import { useAttemptsStore } from "@/stores/attemptsStore"
import { useCurrentUserId } from "@/hooks/useCurrentUserId"
import type { StarBreakdown } from "@/lib/challengeTypes"

/**
 * Persists a scored challenge attempt to Firestore exactly once (Epic 17 Phase 4).
 * Fires when an attempt reaches "scored": assembles the owner-stamped record from the challenge,
 * star result, and measured snapshot, and writes it via attemptsStore (best-effort — a failed write
 * never disrupts the results UX). Idempotent: each score produces a fresh lastResult object, and a
 * ref guard records each one only once even across re-renders. No userId → no write (no unowned data);
 * if auth resolves after scoring, the effect re-runs and records then.
 */
export function useAttemptPersistence(): void {
  const attemptState = useChallengeStore((s) => s.attemptState)
  const lastResult = useChallengeStore((s) => s.lastResult)
  const userId = useCurrentUserId()
  const recordedRef = useRef<StarBreakdown | null>(null)

  useEffect(() => {
    if (attemptState !== "scored" || !lastResult) return
    if (recordedRef.current === lastResult) return // this scored attempt was already persisted
    const { activeChallenge, lastMeasured, lastRecordable } = useChallengeStore.getState()
    if (!activeChallenge || !lastMeasured || !userId) return
    // D20 (D74): once a challenge is 3★ its traffic node unlocks for experimentation; only a run that
    // RE-EARNS 3★ is persisted — a worse post-clear tinker doesn't get recorded.
    if (!lastRecordable) { recordedRef.current = lastResult; return }
    recordedRef.current = lastResult
    void useAttemptsStore.getState().recordAttempt({
      userId,
      challengeId: activeChallenge.id,
      stars: lastResult.stars,
      uptimePercent: lastMeasured.uptimePercent,
      p99LatencyMs: lastMeasured.p99LatencyMs,
      totalCost: lastMeasured.totalCost,
      topologyIssueCount: lastMeasured.topologyIssueCount,
    })
  }, [attemptState, lastResult, userId])
}
