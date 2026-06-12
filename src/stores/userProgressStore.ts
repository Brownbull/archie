import { create } from "zustand"
import { doc, getDoc, setDoc, serverTimestamp, increment, deleteDoc } from "firebase/firestore"
import { db, auth } from "@/lib/firebase"
import { randomNickname, nicknameSlug, validateNickname } from "@/lib/nicknames"

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
export const PROGRESS_GENERATION = 4

/** D104 (owner, 2026-06-11): every user — newly registered or generation-reset — starts provisioned
 *  with a baseline grant so the dual-currency economy is playable from minute one. Tunable here. */
export const STARTER_BONUS_STARS = 3
export const STARTER_EXPERT = 1

/** D107 — XP granted per Expert EARNED through play (rankings are XP-only; packs grant none). */
export const EXPERT_XP = 50

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
  /** D102 — the global break-method registry: a WAY of breaking pays once game-wide, then it's
   *  knowledge. methodId → where/when it was first earned + every quest it's been confirmed on. */
  breakMethods: Readonly<Record<string, { challengeId: string; earnedAt: number; confirmedOn: Readonly<Record<string, true>> }>>
  /** D103 — capability progression: purchased vendors (account-wide) and premium tiers. */
  unlockedVendors: Readonly<Record<string, true>>
  unlockedTiers: Readonly<Record<string, true>>
  /** D103 — stars spent on vendor/tier unlocks (subtracted from the spendable pool). */
  starsSpentOnUnlocks: number
  /** D104 — provisioned starter stars (granted at registration/reset), added to the spendable pool. */
  bonusStars: number
  /** D105 — self-stamped display name (from the auth profile) for the leaderboard. */
  displayName: string | null
  /** D105b — the unique, player-visible nickname (auto-assigned, changeable in the profile). */
  nickname: string | null
}

const EMPTY_PROGRESS: UserProgress = { trackXp: {}, completedChallenges: [], bestStarsCloud: {}, equippedAvatar: null, hintsUnlocked: {}, expertCurrency: 0, breaksByChallenge: {}, requiredFilterUnlocked: {}, resilienceClears: {}, breakMethods: {}, unlockedVendors: {}, unlockedTiers: {}, starsSpentOnUnlocks: 0, bonusStars: 0, displayName: null, nickname: null, generation: PROGRESS_GENERATION }

/** D104 — the provisioned baseline a fresh/reset account lands on. */
const STARTER_PROGRESS: UserProgress = { ...EMPTY_PROGRESS, bonusStars: STARTER_BONUS_STARS, expertCurrency: STARTER_EXPERT }

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
  // 2026-06-11 (spend-display bug): LX1's free-first retired with P199 — EVERY unlocked hint cost
  // a star, so every one counts as spent. The old `b - 1` discount made spends invisible.
  return Object.values(p.hintsUnlocked).reduce((a, b) => a + b, 0)
}

/** Spendable star balance (D68): earned − spent, never negative. */
export function spendableStars(p: Pick<UserProgress, "bestStarsCloud" | "hintsUnlocked" | "starsSpentOnUnlocks" | "bonusStars">): number {
  // D103/D104: stars are dual-use — hints AND capability unlocks draw from one pool, which the
  // starter grant (bonusStars) seeds at provisioning.
  return Math.max(0, totalEarnedStars(p) + (p.bonusStars ?? 0) - totalHintsSpent(p) - (p.starsSpentOnUnlocks ?? 0))
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
  /** D102/D107: pay 1 expert iff the METHOD is new game-wide (+EXPERT_XP onto the quest's track —
   *  rankings are XP-only and XP comes solely from play). False = already known. */
  collectBreakMethod: (userId: string, methodId: string, challengeId: string, trackId?: string) => Promise<boolean>
  /** D102: register that a KNOWN method also fells this quest's build (no payout, pure knowledge). */
  confirmBreakMethod: (userId: string, methodId: string, challengeId: string) => Promise<void>
  /** D103: buy a vendor with stars or expert per the pricing model. False = broke/owned/invalid. */
  purchaseVendor: (userId: string, vendorId: string, cost: { stars?: number; expert?: number }) => Promise<boolean>
  /** D103: buy a premium tier (stars only). False = broke/owned/invalid. */
  purchaseTier: (userId: string, vendorId: string, variantId: string, costStars: number) => Promise<boolean>
  /** D105b: claim + set a new nickname. Returns null on success, or a user-facing error message. */
  changeNickname: (userId: string, nickname: string) => Promise<string | null>
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
          // D104: a reset doesn't strand the player at zero — they land on the starter grant.
          const wiped: UserProgress = { ...STARTER_PROGRESS, displayName: auth.currentUser?.displayName ?? null, nickname: randomNickname(), generation: PROGRESS_GENERATION }
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
          breakMethods: (data.breakMethods as UserProgress["breakMethods"]) ?? {},
          unlockedVendors: (data.unlockedVendors as UserProgress["unlockedVendors"]) ?? {},
          unlockedTiers: (data.unlockedTiers as UserProgress["unlockedTiers"]) ?? {},
          starsSpentOnUnlocks: (data.starsSpentOnUnlocks as number) ?? 0,
          bonusStars: (data.bonusStars as number) ?? 0,
          displayName: (data.displayName as string) ?? null,
          nickname: (data.nickname as string) ?? null,
          generation: storedGen,
          loading: false,
        })
        // D105/D105b: older docs may predate the name/nickname stamps — backfill once, fire-and-forget.
        if (!data.displayName && auth.currentUser?.displayName) {
          void setDoc(doc(db, COLLECTION, userId), { displayName: auth.currentUser.displayName, generation: PROGRESS_GENERATION, updatedAt: serverTimestamp() }, { merge: true })
        }
        if (!data.nickname) {
          const assigned = randomNickname()
          set({ nickname: assigned })
          void setDoc(doc(db, COLLECTION, userId), { nickname: assigned, generation: PROGRESS_GENERATION, updatedAt: serverTimestamp() }, { merge: true })
          void setDoc(doc(db, "nicknames", nicknameSlug(assigned)), { uid: userId }).catch(() => undefined)
        }
      } else {
        // D104: first sign-in (or post-wipe) — provision the starter grant and persist it so the
        // baseline is durable from minute one.
        const provisioned = { ...STARTER_PROGRESS, displayName: auth.currentUser?.displayName ?? null, nickname: randomNickname() }
        set({ ...provisioned, loading: false })
        try {
          await setDoc(doc(db, COLLECTION, userId), { ...provisioned, updatedAt: serverTimestamp() })
          if (provisioned.nickname) void setDoc(doc(db, "nicknames", nicknameSlug(provisioned.nickname)), { uid: userId }).catch(() => undefined)
        } catch (err) {
          if (import.meta.env.DEV) console.error("Failed to provision starter progress:", err)
        }
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

  changeNickname: async (userId, raw) => {
    if (!userId) return "Sign in to change your nickname."
    const invalid = validateNickname(raw)
    if (invalid) return invalid
    const nickname = raw.trim()
    const slug = nicknameSlug(nickname)
    const prev = get().nickname
    if (prev && nicknameSlug(prev) === slug) return null // unchanged
    try {
      // Claim: creating an EXISTING doc is an update, owner-only by rules → denied = occupied.
      const claim = await getDoc(doc(db, "nicknames", slug))
      if (claim.exists() && (claim.data() as { uid?: string }).uid !== userId) {
        return "Name is occupied. Please use another one."
      }
      await setDoc(doc(db, "nicknames", slug), { uid: userId })
      await setDoc(doc(db, COLLECTION, userId), { nickname, generation: PROGRESS_GENERATION, updatedAt: serverTimestamp() }, { merge: true })
      if (prev && nicknameSlug(prev) !== slug) {
        void deleteDoc(doc(db, "nicknames", nicknameSlug(prev))).catch(() => undefined)
      }
      set({ nickname, error: null })
      return null
    } catch {
      // The claim write itself is the race-proof gate: a concurrent claimant's create became a
      // denied update — surface it as occupied.
      return "Name is occupied. Please use another one."
    }
  },

  purchaseVendor: async (userId, vendorId, cost) => {
    if (!userId || !vendorId) return false
    const state = get()
    if (state.unlockedVendors[vendorId]) return false
    const stars = cost.stars ?? 0
    const expert = cost.expert ?? 0
    if (stars > 0 && spendableStars(state) < stars) return false
    if (expert > 0 && state.expertCurrency < expert) return false
    set({
      unlockedVendors: { ...state.unlockedVendors, [vendorId]: true as const },
      starsSpentOnUnlocks: state.starsSpentOnUnlocks + stars,
      expertCurrency: state.expertCurrency - expert,
      error: null,
    })
    try {
      await setDoc(
        doc(db, COLLECTION, userId),
        {
          unlockedVendors: { [vendorId]: true },
          ...(stars > 0 ? { starsSpentOnUnlocks: increment(stars) } : {}),
          ...(expert > 0 ? { expertCurrency: increment(-expert) } : {}),
          generation: PROGRESS_GENERATION,
          updatedAt: serverTimestamp(),
        },
        { merge: true },
      )
    } catch (err) {
      if (import.meta.env.DEV) console.error("Failed to save vendor unlock:", err)
      set({ error: "Could not save your vendor unlock." })
    }
    return true
  },

  purchaseTier: async (userId, vendorId, variantId, costStars) => {
    if (!userId || !vendorId || !variantId) return false
    const state = get()
    const key = `${vendorId}/${variantId}`
    if (state.unlockedTiers[key]) return false
    if (spendableStars(state) < costStars) return false
    set({
      unlockedTiers: { ...state.unlockedTiers, [key]: true as const },
      starsSpentOnUnlocks: state.starsSpentOnUnlocks + costStars,
      error: null,
    })
    try {
      await setDoc(
        doc(db, COLLECTION, userId),
        { unlockedTiers: { [key]: true }, starsSpentOnUnlocks: increment(costStars), generation: PROGRESS_GENERATION, updatedAt: serverTimestamp() },
        { merge: true },
      )
    } catch (err) {
      if (import.meta.env.DEV) console.error("Failed to save tier unlock:", err)
      set({ error: "Could not save your tier unlock." })
    }
    return true
  },

  collectBreakMethod: async (userId, methodId, challengeId, trackId) => {
    if (!userId || !methodId) return false
    const state = get()
    if (state.breakMethods[methodId]) return false // known way — knowledge, not money (D102)
    const entry = { challengeId, earnedAt: Date.now(), confirmedOn: { [challengeId]: true as const } }
    // D107: the wallet gets the spendable point; the RANKING gets EXPERT_XP on the quest's track —
    // XP only ever comes from play, so future purchased packs can't rank by construction.
    const xpTrack = trackId ?? null
    set({
      breakMethods: { ...state.breakMethods, [methodId]: entry },
      expertCurrency: state.expertCurrency + 1,
      ...(xpTrack ? { trackXp: { ...state.trackXp, [xpTrack]: (state.trackXp[xpTrack] ?? 0) + EXPERT_XP } } : {}),
      error: null,
    })
    try {
      await setDoc(
        doc(db, COLLECTION, userId),
        {
          breakMethods: { [methodId]: entry },
          expertCurrency: increment(1),
          ...(xpTrack ? { trackXp: { [xpTrack]: increment(EXPERT_XP) } } : {}),
          generation: PROGRESS_GENERATION,
          updatedAt: serverTimestamp(),
        },
        { merge: true },
      )
    } catch (err) {
      if (import.meta.env.DEV) console.error("Failed to save break method:", err)
      set({ error: "Could not save your break." })
    }
    return true
  },

  confirmBreakMethod: async (userId, methodId, challengeId) => {
    if (!userId || !methodId) return
    const state = get()
    const entry = state.breakMethods[methodId]
    if (!entry || entry.confirmedOn[challengeId]) return
    const updated = { ...entry, confirmedOn: { ...entry.confirmedOn, [challengeId]: true as const } }
    set({ breakMethods: { ...state.breakMethods, [methodId]: updated }, error: null })
    try {
      await setDoc(
        doc(db, COLLECTION, userId),
        { breakMethods: { [methodId]: { confirmedOn: { [challengeId]: true } } }, generation: PROGRESS_GENERATION, updatedAt: serverTimestamp() },
        { merge: true },
      )
    } catch (err) {
      if (import.meta.env.DEV) console.error("Failed to confirm break method:", err)
    }
  },

  collectBreak: async (userId, challengeId, attribute) => {
    if (!userId || !challengeId) return false
    const state = get()
    const record = state.breaksByChallenge[challengeId] ?? {}
    if (record[attribute]) return false // this attribute's break already collected for this quest

    const newBreaks = { ...state.breaksByChallenge, [challengeId]: { ...record, [attribute]: true as const } }
    // D102: this record is COVERAGE (which dials you've mapped on this quest) — the money lives in
    // the global method registry (collectBreakMethod). Atomic deep-merge per the wallet-bug fix.
    set({ breaksByChallenge: newBreaks, error: null })
    try {
      await setDoc(
        doc(db, COLLECTION, userId),
        { breaksByChallenge: { [challengeId]: { [attribute]: true } }, generation: PROGRESS_GENERATION, updatedAt: serverTimestamp() },
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
        { requiredFilterUnlocked: { [challengeId]: true }, expertCurrency: increment(-1), generation: PROGRESS_GENERATION, updatedAt: serverTimestamp() },
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
    // D102: the clear record is per-quest knowledge; the PAY rides the method registry
    // (resilience-<conditionId> via collectBreakMethod — once game-wide, folded in by owner fork).
    set({ resilienceClears: newClears, error: null })
    try {
      await setDoc(
        doc(db, COLLECTION, userId),
        { resilienceClears: { [challengeId]: { [conditionId]: true } }, generation: PROGRESS_GENERATION, updatedAt: serverTimestamp() },
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
