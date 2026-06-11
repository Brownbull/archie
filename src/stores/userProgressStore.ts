import { create } from "zustand"
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore"
import { db } from "@/lib/firebase"

const COLLECTION = "userProgress"

let loadSeq = 0

/**
 * Progress generation (ISAPivot Phase 6, D65). Bumped to force a ONE-TIME, all-user reset to ground
 * zero after a tree/balance change that invalidates existing progress. A user whose stored
 * `generation` is below this is wiped + re-stamped on their next load (idempotent: it runs once,
 * then they're current).
 * Generation 1 = pre-ISAPivot (the implicit default for legacy docs that predate the field).
 * Generation 2 = ISAPivot challenge rebalance + hint economy.
 * Generation 3 = Quest Integrity Phase 2 (D28/D89): unlock-ordering restructure (13 new prereq
 *   edges, burst-absorber re-tiered), port-enforcement star gate, scheduled events firing live +
 *   chaos re-tune — old completions reflect a progression that no longer exists, so everyone
 *   re-climbs the corrected tree. The E2E unlocked account is exempt in effect: unlocked-setup
 *   re-seeds it with the CURRENT generation on every run (see tests/e2e/helpers/seed-progress.ts).
 */
export const PROGRESS_GENERATION = 3

export interface UserProgress {
  trackXp: Readonly<Record<string, number>>
  completedChallenges: readonly string[]
  bestStarsCloud: Readonly<Record<string, number>>
  equippedAvatar: string | null
  /** Schema/reset generation this progress was last stamped at (Phase 6). */
  generation: number
  /**
   * Hint economy (ISAPivot Phase 5, D68): challengeId → number of progressive hints unlocked.
   * Each unlock spends 1 star; spent stars are DERIVED as the sum of these counts (single source of
   * truth) — there is no separate spent counter.
   */
  hintsUnlocked: Readonly<Record<string, number>>
  /**
   * Expert currency (Phase 4, D94): earned by single-attribute traffic breaks (+ resilience extras,
   * P4-S7); spent on the per-quest required-blocks filter. NEVER part of the hint-star pool.
   */
  expertCurrency: number
  /** Per-challenge record of which break attributes have been collected (rps/kind/workload/origin). */
  breaksByChallenge: Readonly<Record<string, Partial<Record<"rps" | "kind" | "workload" | "origin", true>>>>
  /** Challenges whose "show required blocks" filter has been purchased (1 expert unit each). */
  requiredFilterUnlocked: Readonly<Record<string, true>>
  /** P4-S7 (D94): cleared resilience extras per challenge — failure-preset id → collected. Each
   *  clear paid 1 expert unit once; the record is the idempotence guard, like breaksByChallenge. */
  resilienceClears: Readonly<Record<string, Readonly<Record<string, true>>>>
}

const EMPTY_PROGRESS: UserProgress = { trackXp: {}, completedChallenges: [], bestStarsCloud: {}, equippedAvatar: null, hintsUnlocked: {}, expertCurrency: 0, breaksByChallenge: {}, requiredFilterUnlocked: {}, resilienceClears: {}, generation: PROGRESS_GENERATION }

/** Total stars earned across challenges (sum of per-challenge bests — the ratings, unchanged by spending). */
export function totalEarnedStars(p: Pick<UserProgress, "bestStarsCloud">): number {
  return Object.values(p.bestStarsCloud).reduce((a, b) => a + b, 0)
}

/** Total hints unlocked across all challenges (raw count, not the spent total). */
export function totalHintsUnlocked(p: Pick<UserProgress, "hintsUnlocked">): number {
  return Object.values(p.hintsUnlocked).reduce((a, b) => a + b, 0)
}

/**
 * Stars SPENT on hints (LX1, D74): the FIRST hint per challenge is FREE, so only hints beyond the
 * first count against the balance. This keeps a stuck beginner (0 earned stars) from being gated out
 * of the one hint that would unblock them — they still pay for the deeper reference-solution hints.
 */
export function totalHintsSpent(p: Pick<UserProgress, "hintsUnlocked">): number {
  return Object.values(p.hintsUnlocked).reduce((a, b) => a + Math.max(0, b - 1), 0)
}

/** Spendable star balance (D68): earned − spent (first hint per challenge free, LX1), never negative. */
export function spendableStars(p: Pick<UserProgress, "bestStarsCloud" | "hintsUnlocked">): number {
  return Math.max(0, totalEarnedStars(p) - totalHintsSpent(p))
}

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
  /**
   * Unlock the next progressive hint for a challenge by spending 1 spendable star (D68). Returns true
   * when a hint was unlocked, false when blocked (all `ladderLength` hints already unlocked, or the
   * spendable balance is < 1). Persists optimistically.
   */
  unlockHint: (userId: string, challengeId: string, ladderLength: number) => Promise<boolean>
  /**
   * Collect a single-attribute break (Phase 4, D94): idempotent per challenge+attribute — the first
   * collection earns 1 expert-currency unit and records the attribute; repeats return false. Persists
   * optimistically (merge).
   */
  collectBreak: (userId: string, challengeId: string, attribute: "rps" | "kind" | "workload" | "origin") => Promise<boolean>
  /** Spend 1 expert unit to unlock a quest's required-blocks filter. False when broke or already owned. */
  unlockRequiredFilter: (userId: string, challengeId: string) => Promise<boolean>
  /** Collect a cleared resilience extra (P4-S7): +1 expert once per (challenge, condition). */
  collectResilienceClear: (userId: string, challengeId: string, conditionId: string) => Promise<boolean>
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
        const storedGen = (data.generation as number) ?? 1 // legacy docs (pre-Phase-6) are generation 1
        if (storedGen < PROGRESS_GENERATION) {
          // Phase 6 (D65): one-time destructive reset to ground zero, then stamp current. Idempotent —
          // after the stamp persists, storedGen == PROGRESS_GENERATION and this branch never re-fires.
          const wiped: UserProgress = { trackXp: {}, completedChallenges: [], bestStarsCloud: {}, equippedAvatar: null, hintsUnlocked: {}, expertCurrency: 0, breaksByChallenge: {}, requiredFilterUnlocked: {}, resilienceClears: {}, generation: PROGRESS_GENERATION }
          set({ ...wiped, loading: false })
          try {
            // FULL replace (no merge): merge would deep-merge the maps and leave old stars/hints behind.
            await setDoc(doc(db, COLLECTION, userId), { ...wiped, updatedAt: serverTimestamp() })
          } catch (err) {
            if (import.meta.env.DEV) console.error("Failed to persist progress reset:", err)
            set({ error: "Could not reset your progress." })
          }
          return
        }
        set({
          trackXp: (data.trackXp as Record<string, number>) ?? {},
          completedChallenges: (data.completedChallenges as string[]) ?? [],
          bestStarsCloud: (data.bestStarsCloud as Record<string, number>) ?? {},
          equippedAvatar: (data.equippedAvatar as string) ?? null,
          hintsUnlocked: (data.hintsUnlocked as Record<string, number>) ?? {},
          expertCurrency: (data.expertCurrency as number) ?? 0,
          breaksByChallenge: (data.breaksByChallenge as UserProgress["breaksByChallenge"]) ?? {},
          requiredFilterUnlocked: (data.requiredFilterUnlocked as Record<string, true>) ?? {},
          resilienceClears: (data.resilienceClears as UserProgress["resilienceClears"]) ?? {},
          generation: storedGen,
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
        { trackXp: newTrackXp, completedChallenges: newCompleted, bestStarsCloud: newBestStars, generation: PROGRESS_GENERATION, updatedAt: serverTimestamp() },
        { merge: true },
      )
    } catch (err) {
      if (import.meta.env.DEV) console.error("Failed to save progress:", err)
      set({ error: "Could not save your progress." })
    }
  },

  unlockHint: async (userId, challengeId, ladderLength) => {
    if (!userId || !challengeId || ladderLength <= 0) return false
    const state = get()
    const current = state.hintsUnlocked[challengeId] ?? 0
    if (current >= ladderLength) return false // all hints for this challenge already revealed
    // LX1 (D74): the first hint per challenge is free; only the 2nd+ require a spendable star.
    if (current >= 1 && spendableStars(state) < 1) return false // not enough spendable stars

    const newHints = { ...state.hintsUnlocked, [challengeId]: current + 1 }
    set({ hintsUnlocked: newHints, error: null })
    try {
      await setDoc(
        doc(db, COLLECTION, userId),
        { hintsUnlocked: newHints, generation: PROGRESS_GENERATION, updatedAt: serverTimestamp() },
        { merge: true },
      )
    } catch (err) {
      if (import.meta.env.DEV) console.error("Failed to save unlocked hint:", err)
      set({ error: "Could not save your hint unlock." })
    }
    return true
  },

  equipAvatar: async (userId, avatarKey) => {
    if (!userId) return
    set({ equippedAvatar: avatarKey })
    try {
      await setDoc(doc(db, COLLECTION, userId), { equippedAvatar: avatarKey, generation: PROGRESS_GENERATION, updatedAt: serverTimestamp() }, { merge: true })
    } catch (err) {
      if (import.meta.env.DEV) console.error("Failed to save equipped avatar:", err)
    }
  },

  collectBreak: async (userId, challengeId, attribute) => {
    if (!userId || !challengeId) return false
    const state = get()
    const record = state.breaksByChallenge[challengeId] ?? {}
    if (record[attribute]) return false // this attribute's break already collected for this quest

    const newBreaks = { ...state.breaksByChallenge, [challengeId]: { ...record, [attribute]: true as const } }
    const newCurrency = state.expertCurrency + 1
    set({ breaksByChallenge: newBreaks, expertCurrency: newCurrency, error: null })
    try {
      await setDoc(
        doc(db, COLLECTION, userId),
        { breaksByChallenge: newBreaks, expertCurrency: newCurrency, generation: PROGRESS_GENERATION, updatedAt: serverTimestamp() },
        { merge: true },
      )
    } catch (err) {
      if (import.meta.env.DEV) console.error("Failed to save collected break:", err)
      set({ error: "Could not save your break." })
    }
    return true
  },

  unlockRequiredFilter: async (userId, challengeId) => {
    if (!userId || !challengeId) return false
    const state = get()
    if (state.requiredFilterUnlocked[challengeId]) return false // already owned for this quest
    if (state.expertCurrency < 1) return false // nothing to spend

    const newUnlocked = { ...state.requiredFilterUnlocked, [challengeId]: true as const }
    const newCurrency = state.expertCurrency - 1
    set({ requiredFilterUnlocked: newUnlocked, expertCurrency: newCurrency, error: null })
    try {
      await setDoc(
        doc(db, COLLECTION, userId),
        { requiredFilterUnlocked: newUnlocked, expertCurrency: newCurrency, generation: PROGRESS_GENERATION, updatedAt: serverTimestamp() },
        { merge: true },
      )
    } catch (err) {
      if (import.meta.env.DEV) console.error("Failed to save filter unlock:", err)
      set({ error: "Could not save your filter unlock." })
    }
    return true
  },

  collectResilienceClear: async (userId, challengeId, conditionId) => {
    if (!userId || !challengeId || !conditionId) return false
    const state = get()
    const record = state.resilienceClears[challengeId] ?? {}
    if (record[conditionId]) return false // this extra already cleared for this quest

    const newClears = { ...state.resilienceClears, [challengeId]: { ...record, [conditionId]: true as const } }
    const newCurrency = state.expertCurrency + 1
    set({ resilienceClears: newClears, expertCurrency: newCurrency, error: null })
    try {
      await setDoc(
        doc(db, COLLECTION, userId),
        { resilienceClears: newClears, expertCurrency: newCurrency, generation: PROGRESS_GENERATION, updatedAt: serverTimestamp() },
        { merge: true },
      )
    } catch (err) {
      if (import.meta.env.DEV) console.error("Failed to save resilience clear:", err)
      set({ error: "Could not save your resilience clear." })
    }
    return true
  },

  reset: () => set({ ...EMPTY_PROGRESS, loading: false, error: null, lastAward: null }),
}))
