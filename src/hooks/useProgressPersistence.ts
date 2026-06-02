import { useEffect, useRef } from "react"
import { toast } from "sonner"
import { useChallengeStore } from "@/stores/challengeStore"
import { useUserProgressStore } from "@/stores/userProgressStore"
import { useCurrentUserId } from "@/hooks/useCurrentUserId"
import { rankForXp, CHALLENGE_TRACKS } from "@/lib/challengeTracks"
import type { StarBreakdown } from "@/lib/challengeTypes"

/**
 * Awards Mastery Tracks XP on a scored challenge attempt (D45-AC1).
 *
 * XP is split across the 3 stars: each star earns ceil(totalXp / 3). Only the delta above the
 * player's previous best stars for this challenge is awarded. A 1-star first clear gets 1/3;
 * coming back for 3 stars gets the remaining 2/3. This makes re-attempts meaningful.
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
    const prevTrackXp = useUserProgressStore.getState().trackXp[track] ?? 0
    const prevRank = rankForXp(prevTrackXp).rank

    void useUserProgressStore.getState().awardXp(
      userId,
      track,
      activeChallenge.rewards.xp,
      activeChallenge.id,
      lastResult.stars,
    ).then(() => {
      const newTrackXp = useUserProgressStore.getState().trackXp[track] ?? 0
      const newRank = rankForXp(newTrackXp)
      if (newRank.rank > prevRank) {
        const trackName = CHALLENGE_TRACKS.get(track)?.name ?? track
        toast.success(`Rank up! ${trackName}: ${newRank.name}`, { duration: 5000 })
      }
    })
  }, [attemptState, lastResult, userId])
}
