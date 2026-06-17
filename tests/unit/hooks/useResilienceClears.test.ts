import { describe, it, expect, vi, beforeEach } from "vitest"
import { renderHook, waitFor } from "@testing-library/react"

vi.mock("@/lib/writeThrottle", () => ({ canWrite: () => true }))
vi.mock("@/lib/firebase", () => ({ db: {}, auth: { currentUser: null } }))
vi.mock("firebase/firestore", () => ({
  increment: vi.fn((n: number) => ({ __increment: n })),
  doc: vi.fn(() => ({})),
  getDoc: vi.fn(),
  setDoc: vi.fn(() => Promise.resolve()),
  serverTimestamp: vi.fn(() => "ts"),
}))
vi.mock("@/hooks/useCurrentUserId", () => ({ useCurrentUserId: () => "u1" }))
const { computeMock } = vi.hoisted(() => ({ computeMock: vi.fn() }))
vi.mock("@/services/failureImpact", () => ({ computeBreakingFailures: computeMock }))
vi.mock("@/services/failureLoader", () => ({
  getFailurePreset: (id: string) => (id === "failure-traffic-spike" ? { id, name: "Traffic Spike (10x)" } : undefined),
  isKnownFailurePresetId: (id: string) => id === "failure-traffic-spike",
}))

import { useResilienceClears } from "@/hooks/useResilienceClears"
import { useChallengeStore } from "@/stores/challengeStore"
import { useArchitectureStore } from "@/stores/architectureStore"
import { useUserProgressStore } from "@/stores/userProgressStore"
import type { Challenge, StarBreakdown } from "@/lib/challengeTypes"

const quest = (over: Partial<Challenge> = {}) => ({
  id: "c1", title: "t", brief: "b", difficulty: "beginner", budgetCap: 100, durationSeconds: 60,
  trafficCurve: [{ t: 0, rps: 0 }], requiredComponents: [], origin: "builtin",
  trafficSources: [{ type: "web-users", rps: 1000, kind: "steady", workload: "mixed", origin: "one-region" }],
  targetMetrics: { uptimePercent: 99, p99LatencyMs: 200 }, scheduledEvents: [], hints: [],
  resilienceConditions: ["failure-traffic-spike"], ...over,
}) as unknown as Challenge

const matchingTraffic = (over: Record<string, unknown> = {}) => ({
  id: "t1",
  data: { componentCategory: "traffic", trafficRps: 1000, trafficKind: "steady", trafficWorkload: "mixed", trafficOrigin: "one-region", ...over },
})

const threeStars = (): StarBreakdown => ({ stars: 3, passedMetrics: true, underBudget: true, cleanTopology: true }) as StarBreakdown
const failed = (): StarBreakdown => ({ stars: 0, passedMetrics: false, underBudget: true, cleanTopology: true }) as StarBreakdown

describe("useResilienceClears (P4-S7 / D94)", () => {
  beforeEach(() => {
    computeMock.mockReset().mockReturnValue(new Set()) // default: the build survives everything
    useChallengeStore.setState({ activeChallenge: quest(), attemptState: "idle", lastResult: null, bestStars: {} })
    useArchitectureStore.setState({ nodes: [matchingTraffic()] as never, edges: [] })
    useUserProgressStore.setState({ expertCurrency: 0, resilienceClears: {}, breakMethods: {}, error: null })
  })

  it("a 3★ run that survives the authored condition collects it (+1 expert, fresh)", async () => {
    useChallengeStore.setState({ attemptState: "scored", lastResult: threeStars() })
    const { result } = renderHook(() => useResilienceClears())
    await waitFor(() => expect(result.current).not.toBeNull())
    expect(result.current).toEqual([{ conditionId: "failure-traffic-spike", name: "Traffic Spike (10x)", fresh: true }])
    expect(useUserProgressStore.getState().expertCurrency).toBe(1)
  })

  it("no clear when the probe says the condition still breaks the build", () => {
    computeMock.mockReturnValue(new Set(["failure-traffic-spike"]))
    useChallengeStore.setState({ attemptState: "scored", lastResult: threeStars() })
    const { result } = renderHook(() => useResilienceClears())
    expect(result.current).toBeNull()
    expect(useUserProgressStore.getState().expertCurrency).toBe(0)
  })

  it("no clear on a sub-3★ run — surviving a condition on a failing build earns nothing", () => {
    useChallengeStore.setState({ attemptState: "scored", lastResult: failed() })
    const { result } = renderHook(() => useResilienceClears())
    expect(result.current).toBeNull()
    expect(computeMock).not.toHaveBeenCalled()
  })

  it("a repeat clear reports fresh=false and pays nothing", async () => {
    useUserProgressStore.setState({ expertCurrency: 1, resilienceClears: { c1: { "failure-traffic-spike": true } }, breakMethods: { "resilience-failure-traffic-spike": { challengeId: "c1", earnedAt: 1, confirmedOn: { c1: true } } } })
    useChallengeStore.setState({ attemptState: "scored", lastResult: threeStars() })
    const { result } = renderHook(() => useResilienceClears())
    await waitFor(() => expect(result.current).not.toBeNull())
    expect(result.current?.[0]).toMatchObject({ fresh: false })
    expect(useUserProgressStore.getState().expertCurrency).toBe(1)
  })

  it("null on quests without authored conditions (the other 60 are inert)", () => {
    useChallengeStore.setState({ activeChallenge: quest({ resilienceConditions: undefined }), attemptState: "scored", lastResult: threeStars() })
    const { result } = renderHook(() => useResilienceClears())
    expect(result.current).toBeNull()
    expect(computeMock).not.toHaveBeenCalled()
  })

  it("the same scored result collects exactly once across re-renders", async () => {
    useChallengeStore.setState({ attemptState: "scored", lastResult: threeStars() })
    const { result, rerender } = renderHook(() => useResilienceClears())
    await waitFor(() => expect(result.current).not.toBeNull())
    rerender()
    rerender()
    expect(useUserProgressStore.getState().expertCurrency).toBe(1)
  })

  it("no clear when the dials deviate from the authored spec — a cheesed easy 3★ can't collect (review #1)", () => {
    useArchitectureStore.setState({ nodes: [matchingTraffic({ trafficRps: 100 })] as never })
    useChallengeStore.setState({ attemptState: "scored", lastResult: threeStars() })
    const { result } = renderHook(() => useResilienceClears())
    expect(result.current).toBeNull()
    expect(computeMock).not.toHaveBeenCalled() // probe skipped entirely off-spec
    expect(useUserProgressStore.getState().expertCurrency).toBe(0)
  })

  it("no clear on user-authored quests — only builtins mint expert currency (review #2)", () => {
    useChallengeStore.setState({ activeChallenge: quest({ origin: "user" } as never), attemptState: "scored", lastResult: threeStars() })
    const { result } = renderHook(() => useResilienceClears())
    expect(result.current).toBeNull()
    expect(useUserProgressStore.getState().expertCurrency).toBe(0)
  })

  it("unknown preset ids are never collectable — a condition the probe can't simulate can't be earned (review #2)", () => {
    useChallengeStore.setState({
      activeChallenge: quest({ resilienceConditions: ["failure-bogus"] } as never),
      attemptState: "scored", lastResult: threeStars(),
    })
    const { result } = renderHook(() => useResilienceClears())
    expect(result.current).toBeNull()
    expect(useUserProgressStore.getState().expertCurrency).toBe(0)
  })
})
