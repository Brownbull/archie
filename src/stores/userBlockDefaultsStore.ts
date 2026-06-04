import { create } from "zustand"
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore"
import { db } from "@/lib/firebase"

/**
 * Per-user, per-block-TYPE configuration defaults. When a user saves a node's current
 * provider + config variant as their default for that block type, every NEW block of that
 * type they add afterward starts from that provider + variant (see architectureStore.addNode).
 *
 * Owner-only Firestore doc `userBlockDefaults/{uid}` (mirrors userProgressStore). Cloud-only;
 * loaded on sign-in via useAuth. Applies to future adds only — never retroactive.
 */
const COLLECTION = "userBlockDefaults"

let loadSeq = 0

export interface BlockDefault {
  providerId: string
  variantId: string
}

interface UserBlockDefaultsState {
  /** Keyed by component typeId (e.g. "relational-db" → { providerId, variantId }). */
  defaults: Readonly<Record<string, BlockDefault>>
  loading: boolean
  error: string | null
  loadDefaults: (userId: string) => Promise<void>
  saveDefault: (userId: string, typeId: string, providerId: string, variantId: string) => Promise<void>
  /** Synchronous read for addNode — returns the saved default for a type, or undefined. */
  getDefault: (typeId: string) => BlockDefault | undefined
  reset: () => void
}

export const useUserBlockDefaultsStore = create<UserBlockDefaultsState>((set, get) => ({
  defaults: {},
  loading: false,
  error: null,

  loadDefaults: async (userId) => {
    if (!userId) {
      set({ defaults: {}, loading: false, error: null })
      return
    }
    const seq = ++loadSeq
    set({ loading: true, error: null, defaults: {} })
    try {
      const snap = await getDoc(doc(db, COLLECTION, userId))
      if (seq !== loadSeq) return
      if (snap.exists()) {
        const data = snap.data()
        set({ defaults: (data.defaults as Record<string, BlockDefault>) ?? {}, loading: false })
      } else {
        set({ defaults: {}, loading: false })
      }
    } catch (err) {
      if (seq !== loadSeq) return
      if (import.meta.env.DEV) console.error("Failed to load block defaults:", err)
      set({ defaults: {}, loading: false, error: "Could not load your block defaults." })
    }
  },

  saveDefault: async (userId, typeId, providerId, variantId) => {
    if (!userId || !typeId || !providerId || !variantId) return
    // Optimistic local update first so the button clears immediately, then persist.
    const next = { ...get().defaults, [typeId]: { providerId, variantId } }
    set({ defaults: next, error: null })
    try {
      await setDoc(
        doc(db, COLLECTION, userId),
        { defaults: next, updatedAt: serverTimestamp() },
        { merge: true },
      )
    } catch (err) {
      if (import.meta.env.DEV) console.error("Failed to save block default:", err)
      set({ error: "Could not save your block default." })
    }
  },

  getDefault: (typeId) => get().defaults[typeId],

  reset: () => set({ defaults: {}, loading: false, error: null }),
}))
