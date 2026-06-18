import { create } from "zustand"
import { persist, createJSONStorage } from "zustand/middleware"

/**
 * Guest ("try without login") session flag. A guest reaches the canvas with NO Firebase user —
 * `useCurrentUserId()` stays null, so every Firestore write hard-bails (attemptsStore / userProgressStore
 * are already null-guarded) and nothing is ever persisted. The guest plays the first quest fully
 * client-side, like the app running without a backend.
 *
 * Persisted to sessionStorage (not localStorage): the flag survives an in-tab refresh — so a guest
 * isn't bounced back to /login — but clears when the tab closes. Guest gameplay state itself is never
 * persisted; only "this tab is a guest session" is.
 */
interface GuestState {
  isGuest: boolean
  enterGuest: () => void
  exitGuest: () => void
}

export const useGuestStore = create<GuestState>()(
  persist(
    (set) => ({
      isGuest: false,
      enterGuest: () => set({ isGuest: true }),
      exitGuest: () => set({ isGuest: false }),
    }),
    { name: "archie-guest", storage: createJSONStorage(() => sessionStorage) },
  ),
)
