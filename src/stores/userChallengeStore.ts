import { create } from "zustand"
import { persist } from "zustand/middleware"
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { isKnownChallengeId } from "@/services/challengeLoader"
import type { Challenge } from "@/lib/challengeTypes"

const COLLECTION = "userChallenges"
const USER_ID_PREFIX = "user/"

/**
 * Namespace a user-authored challenge id so it can never collide with a built-in id (D45 rule 3).
 * If the id already starts with the prefix, it's left as-is (import idempotency).
 */
export function namespaceUserId(rawId: string): string {
  if (rawId.startsWith(USER_ID_PREFIX)) return rawId
  return `${USER_ID_PREFIX}${rawId}`
}

/** Strip the user/ prefix for display (keeps the id clean in the UI + exported YAML). */
export function stripUserPrefix(id: string): string {
  return id.startsWith(USER_ID_PREFIX) ? id.slice(USER_ID_PREFIX.length) : id
}

interface UserChallengeState {
  challenges: Challenge[]
  addChallenge: (challenge: Challenge) => void
  removeChallenge: (id: string) => void
  updateChallenge: (challenge: Challenge) => void
  syncToCloud: (userId: string) => Promise<void>
  loadFromCloud: (userId: string) => Promise<void>
  reset: () => void
}

export const useUserChallengeStore = create<UserChallengeState>()(
  persist(
    (set, get) => ({
      challenges: [],

      addChallenge: (challenge) => {
        const nsId = namespaceUserId(challenge.id)
        if (isKnownChallengeId(nsId)) return
        const existing = get().challenges
        if (existing.some((c) => c.id === nsId)) return
        const stamped: Challenge = { ...challenge, id: nsId, origin: "user" }
        set({ challenges: [...existing, stamped] })
      },

      removeChallenge: (id) => {
        set({ challenges: get().challenges.filter((c) => c.id !== id) })
      },

      updateChallenge: (challenge) => {
        set({
          challenges: get().challenges.map((c) => (c.id === challenge.id ? { ...challenge, origin: "user" } : c)),
        })
      },

      syncToCloud: async (userId) => {
        if (!userId) return
        const challenges = get().challenges
        try {
          const serializable = challenges.map((c) => ({
            id: c.id,
            title: c.title,
            brief: c.brief,
            difficulty: c.difficulty,
            budgetCap: c.budgetCap,
            durationSeconds: c.durationSeconds,
            trafficCurve: c.trafficCurve,
            requiredComponents: c.requiredComponents,
            targetMetrics: c.targetMetrics,
            scheduledEvents: c.scheduledEvents,
            hints: c.hints,
            schemaVersion: c.schemaVersion,
            track: c.track,
            tier: c.tier,
            requires: c.requires,
            unlocks: c.unlocks,
            availableBlocks: c.availableBlocks,
            grants: c.grants,
            rewards: c.rewards,
          }))
          await setDoc(doc(db, COLLECTION, userId), { challenges: serializable, updatedAt: serverTimestamp() }, { merge: true })
        } catch (err) {
          if (import.meta.env.DEV) console.error("Failed to sync user challenges to cloud:", err)
        }
      },

      loadFromCloud: async (userId) => {
        if (!userId) return
        try {
          const snap = await getDoc(doc(db, COLLECTION, userId))
          if (!snap.exists()) return
          const data = snap.data()
          const cloudChallenges = (data.challenges as Array<Record<string, unknown>>) ?? []
          const local = get().challenges
          const localIds = new Set(local.map((c) => c.id))
          const merged = [...local]
          for (const raw of cloudChallenges) {
            const id = raw.id as string
            if (!id || localIds.has(id)) continue
            merged.push({ ...raw, origin: "user" } as Challenge)
          }
          set({ challenges: merged })
        } catch (err) {
          if (import.meta.env.DEV) console.error("Failed to load user challenges from cloud:", err)
        }
      },

      reset: () => set({ challenges: [] }),
    }),
    { name: "archie-user-challenges" },
  ),
)
