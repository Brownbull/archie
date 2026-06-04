import { describe, it, expect, vi, beforeEach } from "vitest"

vi.mock("@/lib/firebase", () => ({ db: {}, auth: { currentUser: null } }))
vi.mock("firebase/firestore", () => ({
  doc: vi.fn(() => ({})),
  getDoc: vi.fn(),
  setDoc: vi.fn(() => Promise.resolve()),
  serverTimestamp: vi.fn(() => "ts"),
}))

import { useUserProgressStore, spendableStars, totalEarnedStars, totalHintsUnlocked } from "@/stores/userProgressStore"

describe("hint economy selectors (ISAPivot Phase 5, D68)", () => {
  it("totalEarnedStars sums per-challenge bests", () => {
    expect(totalEarnedStars({ bestStarsCloud: { a: 3, b: 2, c: 1 } })).toBe(6)
    expect(totalEarnedStars({ bestStarsCloud: {} })).toBe(0)
  })

  it("totalHintsUnlocked sums unlock counts (= stars spent)", () => {
    expect(totalHintsUnlocked({ hintsUnlocked: { a: 2, b: 1 } })).toBe(3)
    expect(totalHintsUnlocked({ hintsUnlocked: {} })).toBe(0)
  })

  it("spendable = earned − spent, clamped at 0", () => {
    expect(spendableStars({ bestStarsCloud: { a: 3, b: 2 }, hintsUnlocked: { a: 2 } })).toBe(3)
    expect(spendableStars({ bestStarsCloud: { a: 1 }, hintsUnlocked: { a: 5 } })).toBe(0) // never negative
    expect(spendableStars({ bestStarsCloud: { a: 3 }, hintsUnlocked: {} })).toBe(3)
  })
})

describe("unlockHint — atomic guarded spend (D68)", () => {
  const base = { trackXp: {}, completedChallenges: [], equippedAvatar: null, error: null, loading: false, lastAward: null }
  beforeEach(() => {
    useUserProgressStore.setState({ ...base, bestStarsCloud: {}, hintsUnlocked: {} })
  })

  it("unlocks the next hint and spends one star when affordable", async () => {
    useUserProgressStore.setState({ bestStarsCloud: { c1: 3 }, hintsUnlocked: {} })
    const ok = await useUserProgressStore.getState().unlockHint("u1", "c1", 5)
    expect(ok).toBe(true)
    expect(useUserProgressStore.getState().hintsUnlocked.c1).toBe(1)
    expect(spendableStars(useUserProgressStore.getState())).toBe(2) // 3 earned − 1 spent
  })

  it("unlocks sequentially across calls, draining the balance", async () => {
    useUserProgressStore.setState({ bestStarsCloud: { c1: 3 }, hintsUnlocked: {} })
    const s = useUserProgressStore.getState()
    await s.unlockHint("u1", "c1", 5)
    await s.unlockHint("u1", "c1", 5)
    expect(useUserProgressStore.getState().hintsUnlocked.c1).toBe(2)
    expect(spendableStars(useUserProgressStore.getState())).toBe(1)
  })

  it("spends a star earned on ANY challenge for hints on ANOTHER (shared pool, anytime access)", async () => {
    useUserProgressStore.setState({ bestStarsCloud: { c1: 3 }, hintsUnlocked: {} })
    const ok = await useUserProgressStore.getState().unlockHint("u1", "c2", 5) // c2 not yet cleared
    expect(ok).toBe(true)
    expect(useUserProgressStore.getState().hintsUnlocked.c2).toBe(1)
  })

  it("returns false (no-op) when the spendable balance is 0", async () => {
    useUserProgressStore.setState({ bestStarsCloud: { c1: 2 }, hintsUnlocked: { c1: 1, c2: 1 } }) // 2 earned − 2 spent = 0
    const ok = await useUserProgressStore.getState().unlockHint("u1", "c1", 5)
    expect(ok).toBe(false)
    expect(useUserProgressStore.getState().hintsUnlocked.c1).toBe(1) // unchanged
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
