import { create } from "zustand"
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { stripUndefined } from "@/lib/firestoreSanitize"
import { sanitizeDisplayString } from "@/lib/sanitize"
import type { SavedCanvas } from "@/services/canvasAutosave"

/**
 * Per-user saved canvases — up to 2 named slots, owner-only Firestore doc `userCanvases/{uid}`
 * (mirrors userBlockDefaultsStore / userProgressStore). Loaded on sign-in. A slot stores a
 * JSON-sanitized canvas snapshot (nodes/edges/weights/scenario) + a name + a save timestamp.
 * Saves are cloud-only; the existing localStorage autosave remains a separate refresh safety net.
 */
const COLLECTION = "userCanvases"
const MAX_SLOTS = 2
export const CANVAS_NAME_MAX = 60
/** Reject a save whose serialized payload would risk Firestore's 1 MiB doc cap. */
const MAX_SLOT_BYTES = 700_000

let loadSeq = 0

export interface CanvasSlot {
  name: string
  savedAt: number
  canvas: SavedCanvas
}

export type CanvasSlots = readonly (CanvasSlot | null)[]

const EMPTY_SLOTS: CanvasSlots = [null, null]

/** Normalize any persisted value to exactly MAX_SLOTS entries (null = empty slot). */
function normalizeSlots(raw: unknown): CanvasSlots {
  const arr = Array.isArray(raw) ? raw : []
  return Array.from({ length: MAX_SLOTS }, (_, i) => (arr[i] as CanvasSlot | null) ?? null)
}

interface UserCanvasesState {
  slots: CanvasSlots
  loading: boolean
  error: string | null
  loadCanvases: (userId: string) => Promise<void>
  /** Save a snapshot into slot `index` (0 or 1), overwriting any existing slot. */
  saveToSlot: (userId: string, index: number, name: string, canvas: SavedCanvas) => Promise<boolean>
  deleteSlot: (userId: string, index: number) => Promise<void>
  getSlots: () => CanvasSlots
  reset: () => void
}

export const useUserCanvasesStore = create<UserCanvasesState>((set, get) => ({
  slots: EMPTY_SLOTS,
  loading: false,
  error: null,

  loadCanvases: async (userId) => {
    if (!userId) {
      set({ slots: EMPTY_SLOTS, loading: false, error: null })
      return
    }
    const seq = ++loadSeq
    set({ loading: true, error: null, slots: EMPTY_SLOTS })
    try {
      const snap = await getDoc(doc(db, COLLECTION, userId))
      if (seq !== loadSeq) return
      set({ slots: snap.exists() ? normalizeSlots(snap.data().slots) : EMPTY_SLOTS, loading: false })
    } catch (err) {
      if (seq !== loadSeq) return
      if (import.meta.env.DEV) console.error("Failed to load saved canvases:", err)
      set({ slots: EMPTY_SLOTS, loading: false, error: "Could not load your saved canvases." })
    }
  },

  saveToSlot: async (userId, index, name, canvas) => {
    if (!userId || index < 0 || index >= MAX_SLOTS) return false
    const slot: CanvasSlot = {
      name: sanitizeDisplayString(name, CANVAS_NAME_MAX) || `Canvas ${index + 1}`,
      savedAt: Date.now(),
      canvas: stripUndefined(canvas),
    }
    const next = [...get().slots]
    next[index] = slot

    const sanitized = stripUndefined(next)
    if (JSON.stringify(sanitized).length > MAX_SLOT_BYTES) {
      set({ error: "This canvas is too large to save." })
      return false
    }

    // Optimistic local update first so the UI reflects the save immediately.
    set({ slots: sanitized, error: null })
    try {
      await setDoc(doc(db, COLLECTION, userId), { slots: sanitized, updatedAt: serverTimestamp() }, { merge: true })
      return true
    } catch (err) {
      if (import.meta.env.DEV) console.error("Failed to save canvas:", err)
      set({ error: "Could not save your canvas." })
      return false
    }
  },

  deleteSlot: async (userId, index) => {
    if (!userId || index < 0 || index >= MAX_SLOTS) return
    const next = [...get().slots]
    next[index] = null
    set({ slots: next, error: null })
    try {
      await setDoc(doc(db, COLLECTION, userId), { slots: next, updatedAt: serverTimestamp() }, { merge: true })
    } catch (err) {
      if (import.meta.env.DEV) console.error("Failed to delete saved canvas:", err)
      set({ error: "Could not delete the saved canvas." })
    }
  },

  getSlots: () => get().slots,

  reset: () => set({ slots: EMPTY_SLOTS, loading: false, error: null }),
}))
