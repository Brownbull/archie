import { create } from "zustand"
import { collection, addDoc, getDocs, query, where, orderBy, serverTimestamp, Timestamp } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { AttemptStoredSchema, type AttemptRecord, type AttemptStored } from "@/schemas/attemptSchema"

const COLLECTION = "attempts"

// Monotonic load token: guards against out-of-order resolution. If a slow load for user A resolves
// after a newer load (e.g. user B, or a refetch) started, the stale response is discarded — user B
// must never briefly see user A's attempts.
let loadSeq = 0

interface AttemptsState {
  attempts: AttemptRecord[]
  loading: boolean
  error: string | null
  /**
   * Persist a scored attempt. Best-effort: a denied / failed write (e.g. rules not yet deployed,
   * offline) is caught and surfaced via `error` but NEVER thrown — scoring + results must not break.
   * No-op when userId is empty, so a missing auth state can never produce an unowned write.
   */
  recordAttempt: (record: AttemptStored) => Promise<void>
  /** Load the signed-in user's attempts, newest first. Owner-scoped by the query + Firestore rules. */
  loadAttempts: (userId: string) => Promise<void>
  /** Clear loaded attempts (e.g. on sign-out). */
  reset: () => void
}

function toRecord(id: string, data: Record<string, unknown>): AttemptRecord | null {
  // createdAt is the server timestamp (not part of the strict client schema) — split it off first.
  const { createdAt: ts, ...fields } = data
  const parsed = AttemptStoredSchema.safeParse(fields)
  if (!parsed.success) {
    if (import.meta.env.DEV) console.warn("Invalid attempt document:", parsed.error.issues)
    return null
  }
  const createdAt = ts instanceof Timestamp ? ts.toMillis() : 0
  return { id, ...parsed.data, createdAt }
}

export const useAttemptsStore = create<AttemptsState>((set) => ({
  attempts: [],
  loading: false,
  error: null,

  recordAttempt: async (record) => {
    if (!record.userId) return // defensive — never write an unowned attempt
    const valid = AttemptStoredSchema.safeParse(record)
    if (!valid.success) {
      set({ error: "Invalid attempt — not saved." })
      return
    }
    try {
      await addDoc(collection(db, COLLECTION), { ...valid.data, createdAt: serverTimestamp() })
      set({ error: null })
    } catch (err) {
      // Best-effort persistence: log + surface, but don't disrupt the scored-results UX.
      if (import.meta.env.DEV) console.error("Failed to save attempt:", err)
      set({ error: "Could not save this attempt." })
    }
  },

  loadAttempts: async (userId) => {
    if (!userId) {
      set({ attempts: [], loading: false, error: null })
      return
    }
    const seq = ++loadSeq
    // Clear immediately so a previous user's (or stale) list never renders during the fetch.
    set({ loading: true, error: null, attempts: [] })
    try {
      const q = query(collection(db, COLLECTION), where("userId", "==", userId), orderBy("createdAt", "desc"))
      const snapshot = await getDocs(q)
      if (seq !== loadSeq) return // superseded by a newer load — discard this stale response
      const attempts: AttemptRecord[] = []
      for (const docSnap of snapshot.docs) {
        const rec = toRecord(docSnap.id, docSnap.data() as Record<string, unknown>)
        if (rec) attempts.push(rec)
      }
      set({ attempts, loading: false })
    } catch (err) {
      if (seq !== loadSeq) return
      if (import.meta.env.DEV) console.error("Failed to load attempts:", err)
      set({ attempts: [], loading: false, error: "Could not load your attempt history." })
    }
  },

  reset: () => set({ attempts: [], loading: false, error: null }),
}))
