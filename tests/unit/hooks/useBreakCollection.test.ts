import { describe, it, expect, vi, beforeEach } from "vitest"
import { renderHook, waitFor } from "@testing-library/react"

vi.mock("@/lib/firebase", () => ({ db: {}, auth: { currentUser: null } }))
vi.mock("firebase/firestore", () => ({
  doc: vi.fn(() => ({})),
  getDoc: vi.fn(),
  setDoc: vi.fn(() => Promise.resolve()),
  serverTimestamp: vi.fn(() => "ts"),
}))
vi.mock("@/hooks/useCurrentUserId", () => ({ useCurrentUserId: () => "u1" }))
// D101: probe behavior is pinned in breakProbe.test — here we script verdict paths.
const { mockMinBreakingRps, mockIsCausal } = vi.hoisted(() => ({
  mockMinBreakingRps: vi.fn<() => number | null>(() => null),
  mockIsCausal: vi.fn(() => false),
}))
vi.mock("@/services/breakProbe", () => ({
  minBreakingRps: mockMinBreakingRps,
  isCategoricalCausal: mockIsCausal,
  rawTrafficRps: (nodes: Array<{ data: { componentCategory: string; trafficRps?: number } }>) =>
    nodes.reduce((sum, n) => sum + (n.data.componentCategory === "traffic" ? (n.data.trafficRps ?? 0) : 0), 0),
}))

import { useBreakCollection } from "@/hooks/useBreakCollection"
import { useChallengeStore } from "@/stores/challengeStore"
import { useArchitectureStore } from "@/stores/architectureStore"
import { useUserProgressStore } from "@/stores/userProgressStore"
import type { Challenge, StarBreakdown } from "@/lib/challengeTypes"

const challenge = {
  id: "c1", title: "t", brief: "b", difficulty: "beginner", budgetCap: 100, durationSeconds: 60,
  trafficCurve: [{ t: 0, rps: 0 }], requiredComponents: [],
  targetMetrics: { uptimePercent: 99, p99LatencyMs: 200 }, scheduledEvents: [], hints: [],
  trafficSources: [{ type: "web-users", rps: 1000, kind: "steady", workload: "mixed", origin: "one-region" }],
  origin: "builtin",
} as unknown as Challenge

const failed = (): StarBreakdown => ({ stars: 0, passedMetrics: false, underBudget: true, cleanTopology: true }) as StarBreakdown
const passed = (): StarBreakdown => ({ stars: 3, passedMetrics: true, underBudget: true, cleanTopology: true }) as StarBreakdown

const trafficNode = (over: Record<string, unknown> = {}) => ({
  id: "t1",
  data: { componentCategory: "traffic", trafficRps: 1000, trafficKind: "steady", trafficWorkload: "mixed", trafficOrigin: "one-region", ...over },
})

describe("useBreakCollection (P4-S3 / D94)", () => {
  beforeEach(() => {
    useChallengeStore.setState({ activeChallenge: challenge, attemptState: "idle", lastResult: null, bestStars: { c1: 3 } })
    useArchitectureStore.setState({ nodes: [trafficNode()] as never })
    useUserProgressStore.setState({ expertCurrency: 0, breaksByChallenge: {}, requiredFilterUnlocked: {}, error: null })
  })

  it("collects a fresh break: outcome reported, +1 expert, attribute recorded", async () => {
    useArchitectureStore.setState({ nodes: [trafficNode({ trafficRps: 9000 })] as never })
    useChallengeStore.setState({ attemptState: "scored", lastResult: failed() })
    const { result } = renderHook(() => useBreakCollection())
    await waitFor(() => expect(result.current).not.toBeNull())
    expect(result.current).toMatchObject({ attribute: "rps", fresh: true, remaining: ["kind", "workload", "origin"] })
    expect(useUserProgressStore.getState().expertCurrency).toBe(1)
    expect(useUserProgressStore.getState().breaksByChallenge.c1).toEqual({ rps: true })
  })

  it("a repeat of an already-collected attribute reports fresh=false and pays nothing", async () => {
    useUserProgressStore.setState({ expertCurrency: 1, breaksByChallenge: { c1: { rps: true } } })
    useArchitectureStore.setState({ nodes: [trafficNode({ trafficRps: 9000 })] as never })
    useChallengeStore.setState({ attemptState: "scored", lastResult: failed() })
    const { result } = renderHook(() => useBreakCollection())
    await waitFor(() => expect(result.current).not.toBeNull())
    expect(result.current).toMatchObject({ attribute: "rps", fresh: false })
    expect(useUserProgressStore.getState().expertCurrency).toBe(1)
  })

  it("no break pre-3★ — an imported deviation graded on the authored demand is not a break", () => {
    useChallengeStore.setState({ bestStars: {}, attemptState: "scored", lastResult: failed() })
    useArchitectureStore.setState({ nodes: [trafficNode({ trafficRps: 9000 })] as never })
    const { result } = renderHook(() => useBreakCollection())
    expect(result.current).toBeNull()
    expect(useUserProgressStore.getState().expertCurrency).toBe(0)
  })

  it("no break when the build held (the 3★-earning run itself)", () => {
    useChallengeStore.setState({ attemptState: "scored", lastResult: passed() })
    const { result } = renderHook(() => useBreakCollection())
    expect(result.current).toBeNull()
  })

  it("no break when nothing deviated; rps+kind combo pays ONLY when the kind is causal (D101)", async () => {
    useChallengeStore.setState({ attemptState: "scored", lastResult: failed() })
    const { result: untouched } = renderHook(() => useBreakCollection())
    expect(untouched.current).toBeNull()

    // combo, NOT causal: the load alone would've felled it — verdict surfaces, nothing pays
    mockIsCausal.mockReturnValue(false)
    useArchitectureStore.setState({ nodes: [trafficNode({ trafficRps: 9000, trafficKind: "periodic" })] as never })
    useChallengeStore.setState({ attemptState: "scored", lastResult: failed() })
    const { result: notCausal } = renderHook(() => useBreakCollection())
    await waitFor(() => expect(notCausal.current?.verdict).toBe("not-causal"))
    expect(notCausal.current?.attribute).toBe("kind")
    expect(useUserProgressStore.getState().expertCurrency).toBe(0)

    // combo, CAUSAL: the owner's combination semantics — the kind made the difference, pays
    mockIsCausal.mockReturnValue(true)
    useChallengeStore.setState({ attemptState: "scored", lastResult: { ...failed() } })
    const { result: causal } = renderHook(() => useBreakCollection())
    await waitFor(() => expect(causal.current?.verdict).toBe("collected"))
    expect(causal.current?.attribute).toBe("kind")
    await waitFor(() => expect(useUserProgressStore.getState().expertCurrency).toBe(1))
  })

  it("an rps break past 2× the boundary is an OVERSHOOT — broke it, paid nothing (D101)", async () => {
    mockMinBreakingRps.mockReturnValue(200) // boundary 200; player at 9000 ≫ 400
    useArchitectureStore.setState({ nodes: [trafficNode({ trafficRps: 9000 })] as never })
    useChallengeStore.setState({ attemptState: "scored", lastResult: failed() })
    const { result } = renderHook(() => useBreakCollection())
    await waitFor(() => expect(result.current?.verdict).toBe("overshoot"))
    expect(useUserProgressStore.getState().expertCurrency).toBe(0)
    mockMinBreakingRps.mockReturnValue(null)
  })

  it("an rps break within 2× of the boundary collects AND reports the boundary (D101)", async () => {
    mockMinBreakingRps.mockReturnValue(5000) // player 9000 ≤ 10000 ✓
    useArchitectureStore.setState({ nodes: [trafficNode({ trafficRps: 9000 })] as never })
    useChallengeStore.setState({ attemptState: "scored", lastResult: failed() })
    const { result } = renderHook(() => useBreakCollection())
    await waitFor(() => expect(result.current?.verdict).toBe("collected"))
    expect(result.current?.boundary).toBe(5000)
    await waitFor(() => expect(useUserProgressStore.getState().expertCurrency).toBe(1))
    mockMinBreakingRps.mockReturnValue(null)
  })

  it("the same scored result is collected exactly once (re-render can't double-pay)", async () => {
    useArchitectureStore.setState({ nodes: [trafficNode({ trafficRps: 9000 })] as never })
    useChallengeStore.setState({ attemptState: "scored", lastResult: failed() })
    const { result, rerender } = renderHook(() => useBreakCollection())
    await waitFor(() => expect(result.current).not.toBeNull())
    rerender()
    rerender()
    expect(useUserProgressStore.getState().expertCurrency).toBe(1)
  })

  it("clears the outcome when the attempt leaves the scored state", async () => {
    useArchitectureStore.setState({ nodes: [trafficNode({ trafficRps: 9000 })] as never })
    useChallengeStore.setState({ attemptState: "scored", lastResult: failed() })
    const { result } = renderHook(() => useBreakCollection())
    await waitFor(() => expect(result.current).not.toBeNull())
    useChallengeStore.setState({ attemptState: "building", lastResult: null })
    await waitFor(() => expect(result.current).toBeNull())
  })

  it("no collection on user-authored quests — only builtins mint expert currency (review #2)", () => {
    useChallengeStore.setState({
      activeChallenge: { ...challenge, origin: "user" } as never,
      attemptState: "scored", lastResult: failed(),
    })
    useArchitectureStore.setState({ nodes: [trafficNode({ trafficRps: 9000 })] as never })
    const { result } = renderHook(() => useBreakCollection())
    expect(result.current).toBeNull()
    expect(useUserProgressStore.getState().expertCurrency).toBe(0)
  })
})
