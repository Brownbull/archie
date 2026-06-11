import { describe, it, expect, vi, beforeEach } from "vitest"
import { renderHook } from "@testing-library/react"

const { computeMock } = vi.hoisted(() => ({ computeMock: vi.fn() }))
vi.mock("@/services/failureImpact", () => ({ computeBreakingFailures: computeMock }))

import { useFailureImpacts } from "@/hooks/useFailureImpacts"
import { useArchitectureStore } from "@/stores/architectureStore"
import { useChallengeStore } from "@/stores/challengeStore"
import type { Challenge } from "@/lib/challengeTypes"

const challenge = { id: "c1", title: "t" } as Challenge
const node = { id: "n1", type: "archie-component", position: { x: 0, y: 0 }, data: { archieComponentId: "x", activeConfigVariantId: "v", componentName: "X", componentCategory: "compute", replicaCount: 1 } }

describe("useFailureImpacts — probe scope (P4-S4 / D94)", () => {
  beforeEach(() => {
    computeMock.mockReset().mockReturnValue(new Set(["failure-a"]))
    useArchitectureStore.setState({ nodes: [node] as never, edges: [] })
    useChallengeStore.setState({ activeChallenge: null, attemptState: "idle", bestStars: {} })
  })

  it("returns the breaking set in quest mode post-3★", () => {
    useChallengeStore.setState({ activeChallenge: challenge, bestStars: { c1: 3 } })
    const { result } = renderHook(() => useFailureImpacts())
    expect(result.current && [...result.current]).toEqual(["failure-a"])
  })

  it("null in free mode — no probe outside the quest loop", () => {
    const { result } = renderHook(() => useFailureImpacts())
    expect(result.current).toBeNull()
    expect(computeMock).not.toHaveBeenCalled()
  })

  it("null pre-3★ — the selector is locked, don't compute what can't be used", () => {
    useChallengeStore.setState({ activeChallenge: challenge, bestStars: { c1: 2 } })
    const { result } = renderHook(() => useFailureImpacts())
    expect(result.current).toBeNull()
    expect(computeMock).not.toHaveBeenCalled()
  })

  it("null on an empty canvas", () => {
    useChallengeStore.setState({ activeChallenge: challenge, bestStars: { c1: 3 } })
    useArchitectureStore.setState({ nodes: [] })
    const { result } = renderHook(() => useFailureImpacts())
    expect(result.current).toBeNull()
  })

  it("memoizes per canvas identity — a re-render without edits probes once", () => {
    useChallengeStore.setState({ activeChallenge: challenge, bestStars: { c1: 3 } })
    const { rerender } = renderHook(() => useFailureImpacts())
    rerender()
    rerender()
    expect(computeMock).toHaveBeenCalledTimes(1)
  })

  it("a node DRAG (new array identity, same structure) does not re-probe (review #3)", () => {
    useChallengeStore.setState({ activeChallenge: challenge, bestStars: { c1: 3 } })
    const { rerender } = renderHook(() => useFailureImpacts())
    expect(computeMock).toHaveBeenCalledTimes(1)
    // simulate a drag: same id/component/variant/replicas, new array + new position
    useArchitectureStore.setState({ nodes: [{ ...node, position: { x: 100, y: 50 } }] as never })
    rerender()
    expect(computeMock).toHaveBeenCalledTimes(1) // structural signature unchanged → memo holds
    // a REAL structural change (replica bump) re-probes
    useArchitectureStore.setState({ nodes: [{ ...node, data: { ...node.data, replicaCount: 3 } }] as never })
    rerender()
    expect(computeMock).toHaveBeenCalledTimes(2)
  })
})
