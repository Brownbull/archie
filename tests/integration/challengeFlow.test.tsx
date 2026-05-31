import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { render, screen, fireEvent, act } from "@testing-library/react"
import type { ComponentCategoryId } from "@/lib/constants"

// Real engine + real stats; only the component library is stubbed so nodes have capacity + cost.
const mockGetComponent = vi.fn()
vi.mock("@/services/componentLibrary", () => ({
  componentLibrary: { getComponent: (...a: unknown[]) => mockGetComponent(...a) },
}))
vi.mock("@/lib/firebase", () => ({ auth: { currentUser: null }, db: {} }))
// Persistence needs auth context; covered by its own unit test + E2E. Keep this flow focused.
vi.mock("@/hooks/useAttemptPersistence", () => ({ useAttemptPersistence: () => undefined }))
vi.mock("@/hooks/useAttemptComparison", () => ({ useAttemptComparison: () => null }))

import { ChallengeStartButton } from "@/components/challenges/ChallengeStartButton"
import { ChallengeResultsModal } from "@/components/challenges/ChallengeResultsModal"
import { useChallengeStore } from "@/stores/challengeStore"
import { useSimulationStore } from "@/stores/simulationStore"
import { useArchitectureStore } from "@/stores/architectureStore"
import type { Challenge } from "@/lib/challengeTypes"

const LIB: Record<string, { category: string; maxRPS: number; baseLatencyMs: number; monthlyCost: number }> = {
  app: { category: "compute", maxRPS: 300, baseLatencyMs: 15, monthlyCost: 50 },
  db: { category: "data-storage", maxRPS: 1000, baseLatencyMs: 8, monthlyCost: 30 },
}
function comp(id: string) {
  const c = LIB[id]
  return { id, name: id, category: c.category, configVariants: [{ id: "default", name: "d", metrics: [], maxRPS: c.maxRPS, baseLatencyMs: c.baseLatencyMs, monthlyCost: c.monthlyCost }] }
}
const node = (id: string, c: string) => ({
  id,
  type: "archie" as const,
  position: { x: 0, y: 0 },
  data: { archieComponentId: c, activeConfigVariantId: "default", componentCategory: LIB[c].category as ComponentCategoryId, replicaCount: 1 },
})

const challenge: Challenge = {
  id: "flow", title: "End To End", brief: "b", difficulty: "beginner", budgetCap: 100, durationSeconds: 90,
  trafficCurve: [{ t: 0, rps: 0 }, { t: 90, rps: 200 }],
  requiredComponents: ["compute"], targetMetrics: { uptimePercent: 90, p99LatencyMs: 500 },
  scheduledEvents: [], hints: [],
}
const cs = () => useChallengeStore.getState()

describe("challenge flow (integration): Start → real sim → auto-score → results (Epic 16 P4)", () => {
  beforeEach(() => {
    vi.useFakeTimers()
    mockGetComponent.mockImplementation((id: string) => (LIB[id] ? comp(id) : undefined))
    useChallengeStore.setState({ activeChallenge: null, attemptState: "idle", lastResult: null, lastMeasured: null, attemptSnapshot: null, bestStars: {} })
    useSimulationStore.getState().reset()
    useArchitectureStore.setState({ nodes: [node("n-app", "app"), node("n-db", "db")] as never, edges: [{ id: "e", source: "n-app", target: "n-db" }] as never, topologyIssues: [], topologyIssuesByNodeId: new Map() })
  })
  afterEach(() => {
    useSimulationStore.getState().reset()
    vi.clearAllTimers()
    vi.useRealTimers()
  })

  it("runs the real engine to completion and scores the attempt against the rubric", () => {
    cs().selectChallenge(challenge) // building
    render(
      <>
        <ChallengeStartButton />
        <ChallengeResultsModal />
      </>,
    )

    // Start the challenge (real startAttempt snapshot + real simulationStore.start)
    fireEvent.click(screen.getByTestId("start-challenge"))
    expect(cs().attemptState).toBe("running")
    expect(useSimulationStore.getState().status).toBe("running")
    // snapshot captured the real start-time cost (50 + 30) before any playback
    expect(cs().attemptSnapshot).toEqual({ totalCost: 80, topologyIssueCount: 0 })

    // Play the simulation through to completion (50 ticks × 1000ms at speed 1).
    act(() => {
      vi.advanceTimersByTime(60_000)
    })

    expect(useSimulationStore.getState().status).toBe("done")
    expect(cs().attemptState).toBe("scored")

    // Results modal shows the scored outcome computed by the REAL stats pipeline.
    expect(screen.getByTestId("challenge-results")).toBeInTheDocument()
    expect(screen.getByTestId("result-stars").getAttribute("aria-label")).toMatch(/^[0-3] of 3 stars$/)
    expect(cs().lastMeasured).not.toBeNull()
    expect(cs().lastMeasured?.totalCost).toBe(80) // start snapshot, not recomputed live
    expect(typeof cs().lastResult?.stars).toBe("number")
  })
})
