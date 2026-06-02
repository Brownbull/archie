import { create } from "zustand"
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore"
import { db } from "@/lib/firebase"

const COLLECTION = "userProgress"

let loadSeq = 0

export interface UserProgress {
  trackXp: Readonly<Record<string, number>>
  completedChallenges: readonly string[]
}

const EMPTY_PROGRESS: UserProgress = { trackXp: {}, completedChallenges: [] }

interface UserProgressState extends UserProgress {
  loading: boolean
  error: string | null
  loadProgress: (userId: string) => Promise<void>
  awardXp: (userId: string, track: string, xp: number, challengeId: string) => Promise<void>
  reset: () => void
}

export const useUserProgressStore = create<UserProgressState>((set, get) => ({
  ...EMPTY_PROGRESS,
  loading: false,
  error: null,

  loadProgress: async (userId) => {
    if (!userId) {
      set({ ...EMPTY_PROGRESS, loading: false, error: null })
      return
    }
    const seq = ++loadSeq
    set({ loading: true, error: null, ...EMPTY_PROGRESS })
    try {
      const snap = await getDoc(doc(db, COLLECTION, userId))
      if (seq !== loadSeq) return
      if (snap.exists()) {
        const data = snap.data()
        set({
          trackXp: (data.trackXp as Record<string, number>) ?? {},
          completedChallenges: (data.completedChallenges as string[]) ?? [],
          loading: false,
        })
      } else {
        set({ ...EMPTY_PROGRESS, loading: false })
      }
    } catch (err) {
      if (seq !== loadSeq) return
      if (import.meta.env.DEV) console.error("Failed to load user progress:", err)
      set({ ...EMPTY_PROGRESS, loading: false, error: "Could not load your progress." })
    }
  },

  awardXp: async (userId, track, xp, challengeId) => {
    if (!userId || !track || xp <= 0) return
    const state = get()
    const completed = new Set(state.completedChallenges)
    if (completed.has(challengeId)) return

    const newTrackXp = { ...state.trackXp, [track]: (state.trackXp[track] ?? 0) + xp }
    const newCompleted = [...state.completedChallenges, challengeId]

    set({ trackXp: newTrackXp, completedChallenges: newCompleted, error: null })

    try {
      await setDoc(
        doc(db, COLLECTION, userId),
        { trackXp: newTrackXp, completedChallenges: newCompleted, updatedAt: serverTimestamp() },
        { merge: true },
      )
    } catch (err) {
      if (import.meta.env.DEV) console.error("Failed to save progress:", err)
      set({ error: "Could not save your progress." })
    }
  },

  reset: () => set({ ...EMPTY_PROGRESS, loading: false, error: null }),
}))
