import { useEffect, useRef } from "react"
import { toast } from "sonner"
import { useChallengeStore } from "@/stores/challengeStore"
import { useUserProgressStore } from "@/stores/userProgressStore"
import { useCurrentUserId } from "@/hooks/useCurrentUserId"
import { rankForXp, CHALLENGE_TRACKS } from "@/lib/challengeTracks"
import { getDisciplineAvatars } from "@/lib/masteryAvatars"
import { getAllChallenges } from "@/services/challengeLoader"
import { saveChainBuild } from "@/services/chainCarryForward"
import { useArchitectureStore } from "@/stores/architectureStore"
import type { StarBreakdown } from "@/lib/challengeTypes"

/** Per-track completed-quest count — the SAME basis MasteryProfilePanel's DisciplineRow unlocks on
 *  (tech-tree completions for the track, NOT XP), so the toast can never fire on a threshold the
 *  profile doesn't show as unlocked (D93). */
function trackCompletedCount(track: string, completedIds: readonly string[]): number {
  const completed = new Set(completedIds)
  return getAllChallenges().filter((c) => c.track === track && completed.has(c.id)).length
}

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

    // P5-S5 (D95): a 3★ clear of a CHAIN quest snapshots the winning build so the next stage
    // starts from it (client-side; losing it falls back to the stage's authored seed).
    if (activeChallenge.chain && lastResult.stars === 3) {
      const { nodes, edges } = useArchitectureStore.getState()
      saveChainBuild(activeChallenge.id, nodes, edges)
    }

    const track = activeChallenge.track
    const prevTrackXp = useUserProgressStore.getState().trackXp[track] ?? 0
    const prevRank = rankForXp(prevTrackXp).rank
    // S6 (D92/D93): discipline tiers unlock on per-track COMPLETIONS — snapshot the count before the
    // award so a first-clear that crosses a tier threshold can be announced.
    const prevCompletedCount = trackCompletedCount(track, useUserProgressStore.getState().completedChallenges)

    void useUserProgressStore.getState().awardXp(
      userId,
      track,
      activeChallenge.rewards.xp,
      activeChallenge.id,
      lastResult.stars,
    ).then(() => {
      const newTrackXp = useUserProgressStore.getState().trackXp[track] ?? 0
      const newRank = rankForXp(newTrackXp)
      const trackName = CHALLENGE_TRACKS.get(track)?.name ?? track
      if (newRank.rank > prevRank) {
        toast.success(`Rank up! ${trackName}: ${newRank.name}`, { duration: 5000 })
      }
      // S6 (D93): announce a crossed discipline tier (thresholds = the avatar levels on disk; top tier
      // = full track clear). Only a FIRST clear moves the completed count, so re-runs never re-toast.
      const newCompletedCount = trackCompletedCount(track, useUserProgressStore.getState().completedChallenges)
      if (newCompletedCount > prevCompletedCount) {
        const crossed = getDisciplineAvatars(track).filter(
          (a) => prevCompletedCount < a.level && newCompletedCount >= a.level,
        )
        const top = crossed[crossed.length - 1]
        if (top) {
          toast.success(`Discipline unlocked! ${trackName} tier ${top.level} — see your Quest Profile`, { duration: 6000 })
        }
      }
    })
  }, [attemptState, lastResult, userId])
}
