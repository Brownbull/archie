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
import { useUserProgressStore, spendableStars, totalEarnedStars, totalHintsUnlocked, totalHintsSpent, PROGRESS_GENERATION, STARTER_BONUS_STARS, STARTER_EXPERT, EXPERT_XP } from "@/stores/userProgressStore"

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

  it("totalHintsSpent counts EVERY unlocked hint — LX1 free-first retired (the spend-display bug)", () => {
    expect(totalHintsSpent({ hintsUnlocked: { a: 2, b: 1 } })).toBe(3)
    expect(totalHintsSpent({ hintsUnlocked: { a: 1, b: 1, c: 1 } })).toBe(3)
    expect(totalHintsSpent({ hintsUnlocked: {} })).toBe(0)
  })

  it("spendable = earned − every hint spent, clamped at 0", () => {
    expect(spendableStars({ bestStarsCloud: { a: 3, b: 2 }, hintsUnlocked: { a: 2 } })).toBe(3) // 5 earned − 2 spent
    expect(spendableStars({ bestStarsCloud: { a: 1 }, hintsUnlocked: { a: 5 } })).toBe(0) // never negative
    expect(spendableStars({ bestStarsCloud: { a: 3 }, hintsUnlocked: { a: 1 } })).toBe(2) // first hint costs too
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

  it("every hint drains the balance — the indicator discounts from the first reveal", async () => {
    useUserProgressStore.setState({ bestStarsCloud: { c1: 3 }, hintsUnlocked: {} })
    const s = useUserProgressStore.getState()
    await s.unlockHint("u1", "c1", 5) // 1st — costs 1 (2026-06-11)
    expect(spendableStars(useUserProgressStore.getState())).toBe(2)
    await s.unlockHint("u1", "c1", 5) // 2nd — costs 1
    expect(useUserProgressStore.getState().hintsUnlocked.c1).toBe(2)
    expect(spendableStars(useUserProgressStore.getState())).toBe(1)
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
    // D104: a reset PROVISIONS — players land on the starter grant, not zero
    expect(s.bonusStars).toBe(STARTER_BONUS_STARS)
    expect(s.expertCurrency).toBe(STARTER_EXPERT)
    expect(spendableStars(s)).toBe(STARTER_BONUS_STARS)
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
      nickname: "KeptName42",
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

  it("no existing doc → PROVISIONED at the starter grant, persisted (D104)", async () => {
    mockGetDoc.mockResolvedValue(noDoc())
    await useUserProgressStore.getState().loadProgress("u1")
    const st = useUserProgressStore.getState()
    expect(st.generation).toBe(PROGRESS_GENERATION)
    expect(st.bonusStars).toBe(STARTER_BONUS_STARS)
    expect(st.expertCurrency).toBe(STARTER_EXPERT)
    expect(spendableStars(st)).toBe(STARTER_BONUS_STARS)
    // D105b: the provisioning write + the nickname claim
    expect(mockSetDoc.mock.calls.length).toBeGreaterThanOrEqual(1)
    expect(mockSetDoc.mock.calls[0][1]).toMatchObject({ bonusStars: STARTER_BONUS_STARS, expertCurrency: STARTER_EXPERT, generation: PROGRESS_GENERATION })
    expect(typeof (mockSetDoc.mock.calls[0][1] as { nickname?: unknown }).nickname).toBe("string")
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

  it("generation wipe resets the expert economy to the STARTER grant (D104)", async () => {
    mockGetDoc.mockReset().mockResolvedValue(snapshot({
      generation: 1, expertCurrency: 3, breaksByChallenge: { a: { rps: true } }, requiredFilterUnlocked: { a: true },
    }))
    await useUserProgressStore.getState().loadProgress("u1")
    const s = useUserProgressStore.getState()
    expect(s.expertCurrency).toBe(STARTER_EXPERT)
    expect(s.breaksByChallenge).toEqual({})
    expect(s.requiredFilterUnlocked).toEqual({})
    expect(mockSetDoc.mock.calls[0][1]).toMatchObject({ expertCurrency: STARTER_EXPERT, breaksByChallenge: {}, requiredFilterUnlocked: {} })
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

describe("vendor & tier purchases (D103)", () => {
  const base = {
    trackXp: {}, completedChallenges: [], bestStarsCloud: { q1: 3, q2: 3 }, equippedAvatar: null, hintsUnlocked: {},
    expertCurrency: 2, breaksByChallenge: {}, requiredFilterUnlocked: {}, breakMethods: {}, resilienceClears: {},
    unlockedVendors: {}, unlockedTiers: {}, starsSpentOnUnlocks: 0,
    generation: PROGRESS_GENERATION, error: null, loading: false, lastAward: null,
  }
  beforeEach(() => {
    mockSetDoc.mockReset().mockResolvedValue(undefined as never)
    useUserProgressStore.setState({ ...base })
  })

  it("purchaseVendor with stars: spends from the pool, persists atomic increments", async () => {
    const ok = await useUserProgressStore.getState().purchaseVendor("u1", "python-fastapi", { stars: 2 })
    expect(ok).toBe(true)
    const s = useUserProgressStore.getState()
    expect(s.unlockedVendors["python-fastapi"]).toBe(true)
    expect(s.starsSpentOnUnlocks).toBe(2)
    expect(spendableStars(s)).toBe(4) // 6 earned − 2 spent
    expect(mockSetDoc.mock.calls[0][1]).toMatchObject({ unlockedVendors: { "python-fastapi": true }, starsSpentOnUnlocks: { __increment: 2 } })
  })

  it("purchaseVendor with expert: spends the wallet; broke = refused", async () => {
    expect(await useUserProgressStore.getState().purchaseVendor("u1", "go-service", { expert: 2 })).toBe(true)
    expect(useUserProgressStore.getState().expertCurrency).toBe(0)
    expect(await useUserProgressStore.getState().purchaseVendor("u1", "spring-boot", { expert: 1 })).toBe(false)
  })

  it("purchaseTier spends stars once; owned tier refuses", async () => {
    expect(await useUserProgressStore.getState().purchaseTier("u1", "node-express", "cluster-mode", 1)).toBe(true)
    expect(useUserProgressStore.getState().unlockedTiers["node-express/cluster-mode"]).toBe(true)
    expect(await useUserProgressStore.getState().purchaseTier("u1", "node-express", "cluster-mode", 1)).toBe(false)
    expect(useUserProgressStore.getState().starsSpentOnUnlocks).toBe(1)
  })

  it("star purchases refuse when the pool (earned − hints − unlocks) can't cover", async () => {
    useUserProgressStore.setState({ bestStarsCloud: { q1: 2 }, starsSpentOnUnlocks: 1 } as never) // spendable 1
    expect(await useUserProgressStore.getState().purchaseVendor("u1", "laravel", { stars: 2 })).toBe(false)
    expect(useUserProgressStore.getState().unlockedVendors["laravel"]).toBeUndefined()
  })
})

describe("nickname auto-assign + change (D105b)", () => {
  beforeEach(() => {
    mockSetDoc.mockReset().mockResolvedValue(undefined as never)
    mockGetDoc.mockReset()
    useUserProgressStore.setState({ nickname: null, error: null })
  })

  it("a current-gen doc missing a nickname gets one backfilled (write fired)", async () => {
    mockGetDoc.mockResolvedValue(snapshot({ generation: PROGRESS_GENERATION, trackXp: { f: 10 } }))
    await useUserProgressStore.getState().loadProgress("u1")
    expect(useUserProgressStore.getState().nickname).toBeTruthy()
    expect(mockSetDoc).toHaveBeenCalled()
  })

  it("changeNickname: occupied name errors with the exact copy", async () => {
    mockGetDoc.mockResolvedValue({ exists: () => true, data: () => ({ uid: "someone-else" }) })
    const err = await useUserProgressStore.getState().changeNickname("u1", "TakenName")
    expect(err).toBe("Name is occupied. Please use another one.")
  })

  it("changeNickname: free name claims + saves", async () => {
    mockGetDoc.mockResolvedValue({ exists: () => false, data: () => ({}) })
    const err = await useUserProgressStore.getState().changeNickname("u1", "FreshName_7")
    expect(err).toBeNull()
    expect(useUserProgressStore.getState().nickname).toBe("FreshName_7")
  })

  it("changeNickname: invalid input is rejected before any I/O", async () => {
    const err = await useUserProgressStore.getState().changeNickname("u1", "x")
    expect(err).toMatch(/3–20 characters/)
    expect(mockGetDoc).not.toHaveBeenCalled()
  })
})

describe("play-only XP accountability (D106→D107)", () => {
  beforeEach(() => {
    mockSetDoc.mockReset().mockResolvedValue(undefined as never)
    useUserProgressStore.setState({ expertCurrency: 0, trackXp: {}, breakMethods: {}, error: null })
  })

  it("in-game collection pays the wallet AND grants EXPERT_XP onto the quest's track (D107)", async () => {
    useUserProgressStore.setState({ trackXp: {} } as never)
    await useUserProgressStore.getState().collectBreakMethod("u1", "rps-overload", "c1", "foundations")
    const s = useUserProgressStore.getState()
    expect(s.expertCurrency).toBe(1)
    expect(s.trackXp.foundations).toBe(EXPERT_XP)
    expect(mockSetDoc.mock.calls[0][1]).toMatchObject({ expertCurrency: { __increment: 1 }, trackXp: { foundations: { __increment: EXPERT_XP } } })
  })

  it("spending lowers the wallet but never XP", async () => {
    useUserProgressStore.setState({ expertCurrency: 2, trackXp: { f: 100 }, requiredFilterUnlocked: {} } as never)
    await useUserProgressStore.getState().unlockRequiredFilter("u1", "c1")
    const s = useUserProgressStore.getState()
    expect(s.expertCurrency).toBe(1)
    expect(s.trackXp.f).toBe(100) // spending never touches XP — the ranking axis (D107)
  })
})
