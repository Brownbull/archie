import { useEffect, useRef } from "react"
import { useGuestStore } from "@/stores/guestStore"
import { useChallengeStore } from "@/stores/challengeStore"
import { launchFirstServiceQuest } from "@/services/questLaunch"

/**
 * Drop a guest straight into the First Service quest. A guest entered with no Firebase user and no
 * fork choice to make — they already chose "try the first quest" — so once the component library is
 * ready we auto-launch it, guarded to fire at most once per mount and never over an already-active
 * quest (so an in-tab refresh that lands mid-quest doesn't reset it).
 *
 * @param libraryReady — true once componentLibrary.initialize() resolved (challenge seeding needs it).
 */
export function useGuestQuestLaunch(libraryReady: boolean): void {
  const isGuest = useGuestStore((s) => s.isGuest)
  const launchedRef = useRef(false)

  useEffect(() => {
    if (!isGuest || !libraryReady || launchedRef.current) return
    // Don't clobber an in-progress quest (e.g. after an in-tab refresh while playing).
    if (useChallengeStore.getState().activeChallenge) {
      launchedRef.current = true
      return
    }
    launchedRef.current = launchFirstServiceQuest()
  }, [isGuest, libraryReady])
}
