import { useEffect, useRef } from "react"
import { toast } from "sonner"
import { useChallengeStore } from "@/stores/challengeStore"
import { useUserProgressStore } from "@/stores/userProgressStore"
import { useCurrentUserId } from "@/hooks/useCurrentUserId"
import { rankForXp, CHALLENGE_TRACKS } from "@/lib/challengeTracks"
import type { StarBreakdown } from "@/lib/challengeTypes"

/**
 * Awards Mastery Tracks XP on a scored challenge attempt (Phase 2, D45-AC1).
 *
 * Rules:
 * - Only `origin === "builtin"` challenges grant progression — user-authored challenges are
 *   playable but produce ZERO XP/block grants (the tech-tree resolver already ignores non-built-in
 *   completed ids since they're in a separate registry).
 * - XP is awarded once per challenge (first clear only). The store deduplicates by challengeId.
 * - The award fires after scoring; it is best-effort (Firestore write may fail; UX is not gated).
 */
export function useProgressPersistence(): void {
  const attemptState = useChallengeStore((s) => s.attemptState)
  const lastResult = useChallengeStore((s) => s.lastResult)
  const userId = useCurrentUserId()
  const awardedRef = useRef<StarBreakdown | null>(null)

  useEffect(() => {
    if (attemptState !== "scored" || !lastResult) return
    if (awardedRef.current === lastResult) return
    const { activeChallenge } = useChallengeStore.getState()
    if (!activeChallenge || !userId) return
    if (activeChallenge.origin !== "builtin") return
    if (!activeChallenge.track || !activeChallenge.rewards?.xp) return
    if (lastResult.stars === 0) return

    awardedRef.current = lastResult

    const track = activeChallenge.track
    const xp = activeChallenge.rewards.xp
    const prevXp = useUserProgressStore.getState().trackXp[track] ?? 0
    const prevRank = rankForXp(prevXp).rank

    void useUserProgressStore.getState().awardXp(userId, track, xp, activeChallenge.id).then(() => {
      const newXp = useUserProgressStore.getState().trackXp[track] ?? 0
      const newRank = rankForXp(newXp)
      if (newRank.rank > prevRank) {
        const trackName = CHALLENGE_TRACKS.get(track)?.name ?? track
        toast.success(`Rank up! ${trackName}: ${newRank.name}`, { duration: 5000 })
      }
    })
  }, [attemptState, lastResult, userId])
}
