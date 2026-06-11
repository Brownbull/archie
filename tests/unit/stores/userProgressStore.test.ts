import { describe, it, expect, vi, beforeEach } from "vitest"

vi.mock("@/lib/firebase", () => ({ db: {}, auth: { currentUser: null } }))
vi.mock("firebase/firestore", () => ({
  doc: vi.fn(() => ({})),
  getDoc: vi.fn(),
  setDoc: vi.fn(() => Promise.resolve()),
  serverTimestamp: vi.fn(() => "ts"),
  // 2026-06-11 wallet fix: payouts write atomic increments — surface them as inspectable markers.
  increment: vi.fn((n: number) => ({ __increment: n })),
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
    useUserProgressStore.setState({ ...base, bestStarsCloud: {}, hintsUnlocked: {}, breakMethods: {}, expertCurrency: 0, breaksByChallenge: {}, resilienceClears: {}, requiredFilterUnlocked: {} })
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

describe("expert currency — break collection + spend (P4-S2 / D94)", () => {
  const base = {
    trackXp: {}, completedChallenges: [], bestStarsCloud: {}, equippedAvatar: null, hintsUnlocked: {},
    expertCurrency: 0, breaksByChallenge: {}, requiredFilterUnlocked: {}, breakMethods: {}, resilienceClears: {},
    generation: PROGRESS_GENERATION, error: null, loading: false, lastAward: null,
  }
  beforeEach(() => {
    mockSetDoc.mockReset().mockResolvedValue(undefined as never)
    useUserProgressStore.setState({ ...base })
  })

  it("collectBreak records COVERAGE only — money lives in the method registry (D102)", async () => {
    const ok = await useUserProgressStore.getState().collectBreak("u1", "c1", "rps")
    expect(ok).toBe(true)
    const s = useUserProgressStore.getState()
    expect(s.expertCurrency).toBe(0) // no pay here
    expect(s.breaksByChallenge.c1).toEqual({ rps: true })
    expect(mockSetDoc).toHaveBeenCalledTimes(1)
    expect(mockSetDoc.mock.calls[0][1]).toMatchObject({ breaksByChallenge: { c1: { rps: true } }, generation: PROGRESS_GENERATION })
    expect(mockSetDoc.mock.calls[0][1]).not.toHaveProperty("expertCurrency")
    expect(mockSetDoc.mock.calls[0][2]).toEqual({ merge: true })
  })

  it("collectBreakMethod pays ONCE game-wide with provenance; a known way returns false (D102)", async () => {
    const first = await useUserProgressStore.getState().collectBreakMethod("u1", "rps-overload", "c1")
    expect(first).toBe(true)
    let s = useUserProgressStore.getState()
    expect(s.expertCurrency).toBe(1)
    expect(s.breakMethods["rps-overload"]).toMatchObject({ challengeId: "c1", confirmedOn: { c1: true } })
    expect(mockSetDoc.mock.calls[0][1]).toMatchObject({ expertCurrency: { __increment: 1 }, generation: PROGRESS_GENERATION })
    const again = await useUserProgressStore.getState().collectBreakMethod("u1", "rps-overload", "c2")
    expect(again).toBe(false)
    s = useUserProgressStore.getState()
    expect(s.expertCurrency).toBe(1) // never re-pays
    expect(mockSetDoc).toHaveBeenCalledTimes(1)
  })

  it("confirmBreakMethod registers a known way onto another quest — knowledge, no pay (D102)", async () => {
    await useUserProgressStore.getState().collectBreakMethod("u1", "rps-overload", "c1")
    await useUserProgressStore.getState().confirmBreakMethod("u1", "rps-overload", "c2")
    const s = useUserProgressStore.getState()
    expect(s.expertCurrency).toBe(1)
    expect(s.breakMethods["rps-overload"].confirmedOn).toEqual({ c1: true, c2: true })
  })

  it("collectBreak is idempotent per attribute — a repeat is a no-op (no currency, no write)", async () => {
    await useUserProgressStore.getState().collectBreak("u1", "c1", "rps")
    mockSetDoc.mockClear()
    const again = await useUserProgressStore.getState().collectBreak("u1", "c1", "rps")
    expect(again).toBe(false)
    expect(useUserProgressStore.getState().expertCurrency).toBe(0) // coverage never pays (D102)
    expect(mockSetDoc).not.toHaveBeenCalled()
  })

  it("distinct attributes on one challenge each RECORD coverage — pay lives in the registry (D102)", async () => {
    const s = () => useUserProgressStore.getState()
    for (const attr of ["rps", "kind", "workload", "origin"] as const) {
      expect(await s().collectBreak("u1", "c1", attr)).toBe(true)
    }
    expect(s().expertCurrency).toBe(0) // coverage never pays — money is method-scoped (D102)
    expect(s().breaksByChallenge.c1).toEqual({ rps: true, kind: true, workload: true, origin: true })
  })

  it("expert currency NEVER feeds the hint-star pool (D94 invariant)", async () => {
    useUserProgressStore.setState({ bestStarsCloud: { c1: 3 }, hintsUnlocked: { c1: 1 } })
    const before = spendableStars(useUserProgressStore.getState())
    await useUserProgressStore.getState().collectBreak("u1", "c1", "rps")
    await useUserProgressStore.getState().collectBreak("u1", "c1", "kind")
    expect(spendableStars(useUserProgressStore.getState())).toBe(before)
  })

  it("collectBreak guards empty ids", async () => {
    expect(await useUserProgressStore.getState().collectBreak("", "c1", "rps")).toBe(false)
    expect(await useUserProgressStore.getState().collectBreak("u1", "", "rps")).toBe(false)
    expect(mockSetDoc).not.toHaveBeenCalled()
  })

  it("unlockRequiredFilter spends exactly 1 unit and records the challenge", async () => {
    useUserProgressStore.setState({ expertCurrency: 2 })
    const ok = await useUserProgressStore.getState().unlockRequiredFilter("u1", "c1")
    expect(ok).toBe(true)
    const s = useUserProgressStore.getState()
    expect(s.expertCurrency).toBe(1)
    expect(s.requiredFilterUnlocked.c1).toBe(true)
    expect(mockSetDoc.mock.calls[0][1]).toMatchObject({ expertCurrency: { __increment: -1 }, requiredFilterUnlocked: { c1: true }, generation: PROGRESS_GENERATION })
    expect(mockSetDoc.mock.calls[0][2]).toEqual({ merge: true })
  })

  it("unlockRequiredFilter is a no-op when already owned (never double-charges)", async () => {
    useUserProgressStore.setState({ expertCurrency: 2, requiredFilterUnlocked: { c1: true } })
    expect(await useUserProgressStore.getState().unlockRequiredFilter("u1", "c1")).toBe(false)
    expect(useUserProgressStore.getState().expertCurrency).toBe(2)
    expect(mockSetDoc).not.toHaveBeenCalled()
  })

  it("unlockRequiredFilter is a no-op at 0 balance", async () => {
    expect(await useUserProgressStore.getState().unlockRequiredFilter("u1", "c1")).toBe(false)
    expect(useUserProgressStore.getState().requiredFilterUnlocked.c1).toBeUndefined()
    expect(mockSetDoc).not.toHaveBeenCalled()
  })

  it("optimistic spend rolls visible state forward even if the write later fails (error surfaced)", async () => {
    useUserProgressStore.setState({ expertCurrency: 1 })
    mockSetDoc.mockRejectedValueOnce(new Error("offline") as never)
    const ok = await useUserProgressStore.getState().unlockRequiredFilter("u1", "c1")
    expect(ok).toBe(true) // optimistic, same contract as unlockHint
    expect(useUserProgressStore.getState().error).toBe("Could not save your filter unlock.")
  })

  it("collectBreak write failure surfaces the error but keeps the optimistic RECORD (same contract)", async () => {
    mockSetDoc.mockRejectedValueOnce(new Error("offline") as never)
    const ok = await useUserProgressStore.getState().collectBreak("u1", "c1", "rps")
    expect(ok).toBe(true)
    expect(useUserProgressStore.getState().breaksByChallenge.c1).toEqual({ rps: true }) // optimistic record kept
    expect(useUserProgressStore.getState().error).toBe("Could not save your break.")
  })

  it("generation wipe zeroes the expert economy alongside stars and hints", async () => {
    mockGetDoc.mockReset().mockResolvedValue(snapshot({
      generation: 1, expertCurrency: 3, breaksByChallenge: { a: { rps: true } }, requiredFilterUnlocked: { a: true },
    }))
    await useUserProgressStore.getState().loadProgress("u1")
    const s = useUserProgressStore.getState()
    expect(s.expertCurrency).toBe(0)
    expect(s.breaksByChallenge).toEqual({})
    expect(s.requiredFilterUnlocked).toEqual({})
    expect(mockSetDoc.mock.calls[0][1]).toMatchObject({ expertCurrency: 0, breaksByChallenge: {}, requiredFilterUnlocked: {} })
  })

  it("loadProgress reads the expert fields from a current-generation doc", async () => {
    mockGetDoc.mockReset().mockResolvedValue(snapshot({
      generation: PROGRESS_GENERATION, expertCurrency: 2,
      breaksByChallenge: { a: { rps: true, kind: true } }, requiredFilterUnlocked: { b: true },
    }))
    await useUserProgressStore.getState().loadProgress("u1")
    const s = useUserProgressStore.getState()
    expect(s.expertCurrency).toBe(2)
    expect(s.breaksByChallenge).toEqual({ a: { rps: true, kind: true } })
    expect(s.requiredFilterUnlocked).toEqual({ b: true })
  })
})

describe("resilience clears (P4-S7 / D94)", () => {
  beforeEach(() => {
    mockSetDoc.mockReset().mockResolvedValue(undefined as never)
    useUserProgressStore.setState({
      trackXp: {}, completedChallenges: [], bestStarsCloud: {}, equippedAvatar: null, hintsUnlocked: {},
      expertCurrency: 0, breaksByChallenge: {}, requiredFilterUnlocked: {}, resilienceClears: {},
      generation: PROGRESS_GENERATION, error: null, loading: false, lastAward: null,
    })
  })

  it("collectResilienceClear RECORDS the condition (pay rides the method registry — D102)", async () => {
    const ok = await useUserProgressStore.getState().collectResilienceClear("u1", "c1", "failure-traffic-spike")
    expect(ok).toBe(true)
    const s = useUserProgressStore.getState()
    expect(s.expertCurrency).toBe(0)
    expect(s.resilienceClears.c1).toEqual({ "failure-traffic-spike": true })
    expect(mockSetDoc.mock.calls[0][1]).toMatchObject({ resilienceClears: { c1: { "failure-traffic-spike": true } }, generation: PROGRESS_GENERATION })
    expect(mockSetDoc.mock.calls[0][1]).not.toHaveProperty("expertCurrency")
    expect(mockSetDoc.mock.calls[0][2]).toEqual({ merge: true })
  })

  it("a repeat clear is a no-op (idempotent per condition per quest)", async () => {
    await useUserProgressStore.getState().collectResilienceClear("u1", "c1", "failure-traffic-spike")
    mockSetDoc.mockClear()
    expect(await useUserProgressStore.getState().collectResilienceClear("u1", "c1", "failure-traffic-spike")).toBe(false)
    expect(useUserProgressStore.getState().expertCurrency).toBe(0) // record only — pay rides the registry (D102)
    expect(mockSetDoc).not.toHaveBeenCalled()
  })

  it("distinct conditions and quests each RECORD; guards empty ids", async () => {
    const st = () => useUserProgressStore.getState()
    expect(await st().collectResilienceClear("u1", "c1", "failure-a")).toBe(true)
    expect(await st().collectResilienceClear("u1", "c1", "failure-b")).toBe(true)
    expect(await st().collectResilienceClear("u1", "c2", "failure-a")).toBe(true)
    expect(st().expertCurrency).toBe(0) // records only — the registry pays (D102)
    expect(await st().collectResilienceClear("", "c1", "failure-a")).toBe(false)
    expect(await st().collectResilienceClear("u1", "", "failure-a")).toBe(false)
    expect(await st().collectResilienceClear("u1", "c1", "")).toBe(false)
  })

  it("the generation wipe zeroes resilienceClears with everything else", async () => {
    mockGetDoc.mockReset().mockResolvedValue(snapshot({
      generation: 1, resilienceClears: { a: { "failure-x": true } }, expertCurrency: 2,
    }))
    await useUserProgressStore.getState().loadProgress("u1")
    expect(useUserProgressStore.getState().resilienceClears).toEqual({})
    expect(mockSetDoc.mock.calls[0][1]).toMatchObject({ resilienceClears: {} })
  })

  it("loadProgress reads resilienceClears from a current-generation doc", async () => {
    mockGetDoc.mockReset().mockResolvedValue(snapshot({
      generation: PROGRESS_GENERATION, resilienceClears: { a: { "failure-x": true } },
    }))
    await useUserProgressStore.getState().loadProgress("u1")
    expect(useUserProgressStore.getState().resilienceClears).toEqual({ a: { "failure-x": true } })
  })
})
