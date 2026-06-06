import { describe, it, expect, vi, beforeEach } from "vitest"

vi.mock("@/lib/firebase", () => ({ db: {}, auth: { currentUser: null } }))
vi.mock("firebase/firestore", () => ({
  doc: vi.fn(() => ({})),
  getDoc: vi.fn(),
  setDoc: vi.fn(() => Promise.resolve()),
  serverTimestamp: vi.fn(() => "ts"),
}))

import { getDoc, setDoc } from "firebase/firestore"
import { useUserProgressStore, spendableStars, totalEarnedStars, totalHintsUnlocked, totalHintsSpent, PROGRESS_GENERATION } from "@/stores/userProgressStore"

const mockGetDoc = vi.mocked(getDoc)
const mockSetDoc = vi.mocked(setDoc)
const snapshot = (data: Record<string, unknown>) => ({ exists: () => true, data: () => data }) as never
const noDoc = () => ({ exists: () => false, data: () => undefined }) as never

describe("hint economy selectors (ISAPivot Phase 5, D68)", () => {
  it("totalEarnedStars sums per-challenge bests", () => {
    expect(totalEarnedStars({ bestStarsCloud: { a: 3, b: 2, c: 1 } })).toBe(6)
    expect(totalEarnedStars({ bestStarsCloud: {} })).toBe(0)
  })

  it("totalHintsUnlocked sums raw unlock counts", () => {
    expect(totalHintsUnlocked({ hintsUnlocked: { a: 2, b: 1 } })).toBe(3)
    expect(totalHintsUnlocked({ hintsUnlocked: {} })).toBe(0)
  })

  it("totalHintsSpent counts only hints beyond the first per challenge (first is free, LX1)", () => {
    expect(totalHintsSpent({ hintsUnlocked: { a: 2, b: 1 } })).toBe(1) // a: 2→1 spent, b: 1→0 (free)
    expect(totalHintsSpent({ hintsUnlocked: { a: 1, b: 1, c: 1 } })).toBe(0) // all first hints free
    expect(totalHintsSpent({ hintsUnlocked: {} })).toBe(0)
  })

  it("spendable = earned − spent (first hint per challenge free), clamped at 0", () => {
    expect(spendableStars({ bestStarsCloud: { a: 3, b: 2 }, hintsUnlocked: { a: 2 } })).toBe(4) // 5 earned − 1 spent (a's 2nd)
    expect(spendableStars({ bestStarsCloud: { a: 1 }, hintsUnlocked: { a: 5 } })).toBe(0) // never negative
    expect(spendableStars({ bestStarsCloud: { a: 3 }, hintsUnlocked: { a: 1 } })).toBe(3) // first hint free
    expect(spendableStars({ bestStarsCloud: { a: 3 }, hintsUnlocked: {} })).toBe(3)
  })
})

describe("unlockHint — atomic guarded spend (D68)", () => {
  const base = { trackXp: {}, completedChallenges: [], equippedAvatar: null, error: null, loading: false, lastAward: null }
  beforeEach(() => {
    useUserProgressStore.setState({ ...base, bestStarsCloud: {}, hintsUnlocked: {} })
  })

  it("unlocks the FIRST hint for free, even at 0 spendable stars (LX1)", async () => {
    useUserProgressStore.setState({ bestStarsCloud: {}, hintsUnlocked: {} }) // 0 earned
    const ok = await useUserProgressStore.getState().unlockHint("u1", "c1", 5)
    expect(ok).toBe(true)
    expect(useUserProgressStore.getState().hintsUnlocked.c1).toBe(1)
    expect(spendableStars(useUserProgressStore.getState())).toBe(0) // first hint cost nothing
  })

  it("charges a star for the 2nd+ hint; first free, then drains the balance", async () => {
    useUserProgressStore.setState({ bestStarsCloud: { c1: 3 }, hintsUnlocked: {} })
    const s = useUserProgressStore.getState()
    await s.unlockHint("u1", "c1", 5) // 1st — free
    expect(spendableStars(useUserProgressStore.getState())).toBe(3)
    await s.unlockHint("u1", "c1", 5) // 2nd — costs 1
    expect(useUserProgressStore.getState().hintsUnlocked.c1).toBe(2)
    expect(spendableStars(useUserProgressStore.getState())).toBe(2) // 3 earned − 1 spent
  })

  it("spends a star earned on ANY challenge for hints on ANOTHER (shared pool, anytime access)", async () => {
    useUserProgressStore.setState({ bestStarsCloud: { c1: 3 }, hintsUnlocked: {} })
    const ok = await useUserProgressStore.getState().unlockHint("u1", "c2", 5) // c2 not yet cleared
    expect(ok).toBe(true)
    expect(useUserProgressStore.getState().hintsUnlocked.c2).toBe(1)
  })

  it("returns false (no-op) for a PAID hint when the spendable balance is 0", async () => {
    // c1 already past its free first hint (unlocked 2 = 1 free + 1 paid); earned 1 → spendable 0.
    useUserProgressStore.setState({ bestStarsCloud: { c1: 1 }, hintsUnlocked: { c1: 2 } })
    const ok = await useUserProgressStore.getState().unlockHint("u1", "c1", 5)
    expect(ok).toBe(false)
    expect(useUserProgressStore.getState().hintsUnlocked.c1).toBe(2) // unchanged
  })

  it("returns false (no-op) when all ladder hints are already unlocked", async () => {
    useUserProgressStore.setState({ bestStarsCloud: { c1: 10 }, hintsUnlocked: { c1: 3 } })
    const ok = await useUserProgressStore.getState().unlockHint("u1", "c1", 3) // ladderLength 3, already 3
    expect(ok).toBe(false)
    expect(useUserProgressStore.getState().hintsUnlocked.c1).toBe(3)
  })

  it("returns false without a userId or with an empty ladder", async () => {
    useUserProgressStore.setState({ bestStarsCloud: { c1: 3 }, hintsUnlocked: {} })
    expect(await useUserProgressStore.getState().unlockHint("", "c1", 5)).toBe(false)
    expect(await useUserProgressStore.getState().unlockHint("u1", "c1", 0)).toBe(false)
  })
})

describe("loadProgress — Phase 6 generation reset (D65)", () => {
  beforeEach(() => {
    mockGetDoc.mockReset()
    mockSetDoc.mockReset().mockResolvedValue(undefined as never)
    useUserProgressStore.setState({ trackXp: {}, completedChallenges: [], bestStarsCloud: {}, equippedAvatar: null, hintsUnlocked: {}, generation: PROGRESS_GENERATION, error: null, loading: false, lastAward: null })
  })

  it("wipes + stamps a below-generation doc, persisting a FULL replace (not a merge)", async () => {
    mockGetDoc.mockResolvedValue(snapshot({
      generation: 1, trackXp: { foundations: 500 }, completedChallenges: ["a", "b"],
      bestStarsCloud: { a: 3, b: 2 }, hintsUnlocked: { a: 2 }, equippedAvatar: "rank-avatar",
    }))
    await useUserProgressStore.getState().loadProgress("u1")
    const s = useUserProgressStore.getState()
    expect(s.trackXp).toEqual({})
    expect(s.completedChallenges).toEqual([])
    expect(s.bestStarsCloud).toEqual({})
    expect(s.hintsUnlocked).toEqual({})
    expect(s.equippedAvatar).toBeNull()
    expect(s.generation).toBe(PROGRESS_GENERATION)
    expect(spendableStars(s)).toBe(0)
    // persisted once, as a FULL document replace (no merge options) so old maps are truly cleared
    expect(mockSetDoc).toHaveBeenCalledTimes(1)
    const call = mockSetDoc.mock.calls[0]
    expect(call[1]).toMatchObject({ trackXp: {}, bestStarsCloud: {}, hintsUnlocked: {}, generation: PROGRESS_GENERATION })
    expect(call[2]).toBeUndefined() // no { merge: true } → full replace
  })

  it("treats a legacy doc with no generation field as generation 1 → resets", async () => {
    mockGetDoc.mockResolvedValue(snapshot({ trackXp: { foundations: 100 }, bestStarsCloud: { a: 2 } }))
    await useUserProgressStore.getState().loadProgress("u1")
    expect(useUserProgressStore.getState().bestStarsCloud).toEqual({})
    expect(useUserProgressStore.getState().generation).toBe(PROGRESS_GENERATION)
    expect(mockSetDoc).toHaveBeenCalledTimes(1)
  })

  it("loads a current-generation doc unchanged — no reset, no write (idempotent)", async () => {
    mockGetDoc.mockResolvedValue(snapshot({
      generation: PROGRESS_GENERATION, trackXp: { foundations: 300 }, completedChallenges: ["a"],
      bestStarsCloud: { a: 3 }, hintsUnlocked: { a: 1 }, equippedAvatar: "y",
    }))
    await useUserProgressStore.getState().loadProgress("u1")
    const s = useUserProgressStore.getState()
    expect(s.bestStarsCloud).toEqual({ a: 3 })
    expect(s.hintsUnlocked).toEqual({ a: 1 })
    expect(s.generation).toBe(PROGRESS_GENERATION)
    expect(mockSetDoc).not.toHaveBeenCalled()
  })

  it("no existing doc → empty at current generation, no write", async () => {
    mockGetDoc.mockResolvedValue(noDoc())
    await useUserProgressStore.getState().loadProgress("u1")
    expect(useUserProgressStore.getState().generation).toBe(PROGRESS_GENERATION)
    expect(mockSetDoc).not.toHaveBeenCalled()
  })
})
