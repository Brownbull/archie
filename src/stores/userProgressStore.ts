import { create } from "zustand"
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore"
import { db } from "@/lib/firebase"

const COLLECTION = "userProgress"

let loadSeq = 0

export interface UserProgress {
  trackXp: Readonly<Record<string, number>>
  completedChallenges: readonly string[]
  bestStarsCloud: Readonly<Record<string, number>>
  equippedAvatar: string | null
}

const EMPTY_PROGRESS: UserProgress = { trackXp: {}, completedChallenges: [], bestStarsCloud: {}, equippedAvatar: null }

export interface XpAwardResult {
  xpAwarded: number
  newStars: number
  prevStars: number
  newTrackXp: number
  prevTrackXp: number
}

interface UserProgressState extends UserProgress {
  loading: boolean
  error: string | null
  lastAward: XpAwardResult | null
  loadProgress: (userId: string) => Promise<void>
  awardXp: (userId: string, track: string, totalXp: number, challengeId: string, stars: number) => Promise<void>
  equipAvatar: (userId: string, avatarKey: string) => Promise<void>
  reset: () => void
}

export const useUserProgressStore = create<UserProgressState>((set, get) => ({
  ...EMPTY_PROGRESS,
  loading: false,
  error: null,
  lastAward: null,

  loadProgress: async (userId) => {
    if (!userId) {
      set({ ...EMPTY_PROGRESS, loading: false, error: null, lastAward: null })
      return
    }
    const seq = ++loadSeq
    set({ loading: true, error: null, ...EMPTY_PROGRESS, lastAward: null })
    try {
      const snap = await getDoc(doc(db, COLLECTION, userId))
      if (seq !== loadSeq) return
      if (snap.exists()) {
        const data = snap.data()
        set({
          trackXp: (data.trackXp as Record<string, number>) ?? {},
          completedChallenges: (data.completedChallenges as string[]) ?? [],
          bestStarsCloud: (data.bestStarsCloud as Record<string, number>) ?? {},
          equippedAvatar: (data.equippedAvatar as string) ?? null,
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

  awardXp: async (userId, track, totalXp, challengeId, stars) => {
    if (!userId || !track || totalXp <= 0 || stars <= 0) return
    const state = get()
    const prevStars = state.bestStarsCloud[challengeId] ?? 0
    if (stars <= prevStars) return

    const xpPerStar = Math.ceil(totalXp / 3)
    const xpAwarded = (stars - prevStars) * xpPerStar
    const prevTrackXp = state.trackXp[track] ?? 0

    const newTrackXp = { ...state.trackXp, [track]: prevTrackXp + xpAwarded }
    const newBestStars = { ...state.bestStarsCloud, [challengeId]: stars }
    const completed = new Set(state.completedChallenges)
    if (!completed.has(challengeId)) completed.add(challengeId)
    const newCompleted = [...completed]

    const award: XpAwardResult = {
      xpAwarded,
      newStars: stars,
      prevStars,
      newTrackXp: prevTrackXp + xpAwarded,
      prevTrackXp,
    }

    set({ trackXp: newTrackXp, completedChallenges: newCompleted, bestStarsCloud: newBestStars, lastAward: award, error: null })

    try {
      await setDoc(
        doc(db, COLLECTION, userId),
        { trackXp: newTrackXp, completedChallenges: newCompleted, bestStarsCloud: newBestStars, updatedAt: serverTimestamp() },
        { merge: true },
      )
    } catch (err) {
      if (import.meta.env.DEV) console.error("Failed to save progress:", err)
      set({ error: "Could not save your progress." })
    }
  },

  equipAvatar: async (userId, avatarKey) => {
    if (!userId) return
    set({ equippedAvatar: avatarKey })
    try {
      await setDoc(doc(db, COLLECTION, userId), { equippedAvatar: avatarKey, updatedAt: serverTimestamp() }, { merge: true })
    } catch (err) {
      if (import.meta.env.DEV) console.error("Failed to save equipped avatar:", err)
    }
  },

  reset: () => set({ ...EMPTY_PROGRESS, loading: false, error: null, lastAward: null }),
}))
