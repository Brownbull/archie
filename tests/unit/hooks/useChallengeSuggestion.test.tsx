import { describe, it, expect, beforeEach, vi } from "vitest"
import { renderHook } from "@testing-library/react"
import type { Challenge } from "@/lib/challengeTypes"
import type { SuggestionInput, SuggestionResult } from "@/engine/suggestionEngine"

// Capture what the hook feeds the engine; return a fixed result.
const fixed: SuggestionResult = {
  kind: "suggestion",
  best: { changeType: "add-replica", nodeId: "n1", description: "Add a replica", uptimeDelta: 3, latencyDelta: -10, costDelta: 20 },
  baseline: { uptimePercent: 90, avgLatencyMs: 0, p99LatencyMs: 100, currentRps: 0, servedRps: 0, failedRps: 0, totalServed: 0, totalFailed: 0 },
  baselineCost: 40, considered: 2,
}
const suggestSpy = vi.fn<[SuggestionInput], SuggestionResult>(() => fixed)
vi.mock("@/engine/suggestionEngine", () => ({ suggestArchitectureChange: (i: SuggestionInput) => suggestSpy(i) }))

import { useChallengeSuggestion } from "@/hooks/useChallengeSuggestion"
import { useChallengeStore } from "@/stores/challengeStore"
import { useArchitectureStore } from "@/stores/architectureStore"

const challenge: Challenge = {
  id: "c1", title: "T", brief: "b", difficulty: "beginner", budgetCap: 100, durationSeconds: 75,
  trafficCurve: [{ t: 0, rps: 0 }, { t: 75, rps: 200 }],
  requiredComponents: ["compute"], targetMetrics: { uptimePercent: 95, p99LatencyMs: 250 },
  scheduledEvents: [{ t: 30, type: "az_outage", target: "compute", durationS: 10 }], hints: [],
}

describe("useChallengeSuggestion (Epic 17 P2)", () => {
  beforeEach(() => {
    suggestSpy.mockClear()
    useChallengeStore.setState({ activeChallenge: null, attemptState: "idle", lastResult: null, lastMeasured: null, attemptSnapshot: null, bestStars: {} })
    useArchitectureStore.setState({ nodes: [], edges: [] })
  })

  it("returns null outside a scored attempt (does not run the engine)", () => {
    useChallengeStore.setState({ activeChallenge: challenge, attemptState: "building" })
    const { result } = renderHook(() => useChallengeSuggestion())
    expect(result.current).toBeNull()
    expect(suggestSpy).not.toHaveBeenCalled()
  })

  it("feeds the active challenge's curve, events, duration, and targets to the engine when scored", () => {
    const nodes = [{ id: "n1", data: { archieComponentId: "app", activeConfigVariantId: "v1", componentCategory: "compute", replicaCount: 1 } }]
    const edges = [{ id: "e", source: "n1", target: "n2" }]
    useArchitectureStore.setState({ nodes: nodes as never, edges: edges as never })
    useChallengeStore.setState({ activeChallenge: challenge, attemptState: "scored" })
    const { result } = renderHook(() => useChallengeSuggestion())
    expect(result.current).toBe(fixed)
    expect(suggestSpy).toHaveBeenCalledTimes(1)
    const arg = suggestSpy.mock.calls[0][0]
    expect(arg.curve).toEqual(challenge.trafficCurve)
    expect(arg.scheduledEvents).toEqual(challenge.scheduledEvents)
    expect(arg.durationS).toBe(75)
    expect(arg.targetMetrics).toEqual(challenge.targetMetrics)
    expect(arg.nodes).toBe(nodes)
    expect(arg.edges).toBe(edges)
  })
})
