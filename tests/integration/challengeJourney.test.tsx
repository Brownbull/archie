import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { render, screen, fireEvent, act } from "@testing-library/react"
import type { ComponentCategoryId } from "@/lib/constants"

// Real loader + real engine + real stats; only the component library is stubbed for capacity/cost.
const mockGetComponent = vi.fn()
vi.mock("@/services/componentLibrary", () => ({
  componentLibrary: { getComponent: (...a: unknown[]) => mockGetComponent(...a) },
}))
vi.mock("@/lib/firebase", () => ({ auth: { currentUser: null }, db: {} }))
vi.mock("@/hooks/useAuth", () => ({ useAuth: () => ({ user: { uid: "test-user" }, loading: false, error: null, signIn: vi.fn(), signInWithTest: vi.fn(), signOut: vi.fn() }) }))
// Persistence requires auth context; it's covered by its own unit test + E2E. Keep the journey focused.
vi.mock("@/hooks/useAttemptPersistence", () => ({ useAttemptPersistence: () => undefined }))
vi.mock("@/hooks/useProgressPersistence", () => ({ useProgressPersistence: () => undefined }))
vi.mock("@/hooks/useAttemptComparison", () => ({ useAttemptComparison: () => null }))

import { ChallengeSelector } from "@/components/challenges/ChallengeSelector"
import { ChallengeHud } from "@/components/challenges/ChallengeHud"
import { ChallengeStartButton } from "@/components/challenges/ChallengeStartButton"
import { ChallengeResultsModal } from "@/components/challenges/ChallengeResultsModal"
import { useChallengeStore } from "@/stores/challengeStore"
import { useSimulationStore } from "@/stores/simulationStore"
import { useArchitectureStore } from "@/stores/architectureStore"
import { getChallenge } from "@/services/challengeLoader"
import { interpolateRps } from "@/engine/simulationEngine"

const LIB: Record<string, { category: string; maxRPS: number; baseLatencyMs: number; monthlyCost: number }> = {
  edge: { category: "delivery-network", maxRPS: 5000, baseLatencyMs: 2, monthlyCost: 20 },
  app: { category: "compute", maxRPS: 500, baseLatencyMs: 15, monthlyCost: 40 },
  db: { category: "data-storage", maxRPS: 1000, baseLatencyMs: 8, monthlyCost: 30 },
}
function comp(id: string) {
  const c = LIB[id]
  return { id, name: id, category: c.category, configVariants: [{ id: "default", name: "d", metrics: [], maxRPS: c.maxRPS, baseLatencyMs: c.baseLatencyMs, monthlyCost: c.monthlyCost }] }
}
const node = (id: string, c: string) => ({
  id, type: "archie" as const, position: { x: 0, y: 0 },
  data: { archieComponentId: c, activeConfigVariantId: "default", componentCategory: LIB[c].category as ComponentCategoryId, replicaCount: 1 },
})
const computeNode = node("n-app", "app")
const cs = () => useChallengeStore.getState()

function ChallengeSurface() {
  return (
    <>
      <ChallengeSelector />
      <ChallengeHud />
      <ChallengeStartButton />
      <ChallengeResultsModal />
    </>
  )
}

describe("challenge journey (integration): select → build → start → score (Epic 16 P6)", () => {
  beforeEach(async () => {
    const { useUserProgressStore } = await import("@/stores/userProgressStore")
    vi.useFakeTimers()
    mockGetComponent.mockImplementation((id: string) => (LIB[id] ? comp(id) : undefined))
    useChallengeStore.setState({ activeChallenge: null, attemptState: "idle", lastResult: null, lastMeasured: null, attemptSnapshot: null, bestStars: {} })
    useSimulationStore.getState().reset()
    useArchitectureStore.setState({ nodes: [], edges: [], topologyIssues: [], topologyIssuesByNodeId: new Map() })
    useUserProgressStore.setState({ trackXp: {}, completedChallenges: [], loading: false, error: null })
  })
  afterEach(() => {
    useSimulationStore.getState().reset()
    vi.clearAllTimers()
    vi.useRealTimers()
  })

  it("plays a real authored level end-to-end from the selector to a scored result", () => {
    render(<ChallengeSurface />)

    // SELECT — open the selector and pick a real authored level (loaded via the build-time glob).
    fireEvent.click(screen.getByTestId("open-challenges"))
    expect(screen.getByTestId("challenge-selector")).toBeInTheDocument()
    fireEvent.click(screen.getByTestId("challenge-play-first-service"))
    expect(cs().activeChallenge?.id).toBe("first-service")
    expect(cs().attemptState).toBe("building")

    // BUILD — the HUD shows the brief + required-components checklist; compute starts unmet.
    expect(screen.getByTestId("challenge-hud")).toBeInTheDocument()
    expect(screen.getByTestId("req-compute")).not.toHaveAttribute("data-present")
    act(() => {
      useArchitectureStore.setState({ nodes: [computeNode] as never })
    })
    expect(screen.getByTestId("req-compute")).toHaveAttribute("data-present", "true") // checklist ticks

    // START — Start replaces Run, real engine kicks off on the challenge's curve.
    fireEvent.click(screen.getByTestId("start-challenge"))
    expect(cs().attemptState).toBe("running")
    expect(useSimulationStore.getState().status).toBe("running")

    // Mutate the canvas mid-run — scoring must still use the start-time snapshot, not this.
    act(() => {
      useArchitectureStore.setState({ nodes: [computeNode, { ...computeNode, id: "n-app-2" }] as never })
    })

    // SCORE — play to completion; the auto-score hook scores and opens the results modal.
    act(() => {
      vi.advanceTimersByTime(70_000)
    })
    expect(useSimulationStore.getState().status).toBe("done")
    expect(cs().attemptState).toBe("scored")
    expect(screen.getByTestId("challenge-results")).toBeInTheDocument()
    expect(screen.getByTestId("result-stars").getAttribute("aria-label")).toMatch(/^[0-3] of 3 stars$/)
    expect(cs().lastMeasured?.totalCost).toBe(40) // ONE node at snapshot time — not the mid-run mutation (80)
    // the "try this next" card is wired through the REAL hook + engine (not mocked here) and renders
    expect(screen.getByTestId("suggestion-card")).toBeInTheDocument()

    // RETRY — re-enters build mode, clears the finished sim, keeps the level selected.
    fireEvent.click(screen.getByTestId("result-retry"))
    expect(cs().attemptState).toBe("building")
    expect(cs().activeChallenge?.id).toBe("first-service")
    expect(useSimulationStore.getState().status).toBe("idle")
  })

  it("honors the level's traffic curve, scheduled outage, and authored duration end-to-end", async () => {
    const { useUserProgressStore } = await import("@/stores/userProgressStore")
    useUserProgressStore.setState({ completedChallenges: ["first-service", "scale-out", "dns-routing", "edge-balance", "edge-delivery", "observe-baseline", "zone-replica"], trackXp: { foundations: 1000, edge: 1000, reliability: 500 } })
    const zone = getChallenge("zone-failure")
    expect(zone).toBeDefined()
    if (!zone) return

    render(<ChallengeSurface />)
    fireEvent.click(screen.getByTestId("open-challenges"))
    fireEvent.click(screen.getByTestId("challenge-play-zone-failure"))
    // edge → compute → db; compute (maxRPS 500) is overloaded by the 1600-rps peak.
    act(() => {
      useArchitectureStore.setState({
        nodes: [node("n-edge", "edge"), node("n-app", "app"), node("n-db", "db")] as never,
        edges: [{ id: "e1", source: "n-edge", target: "n-app" }, { id: "e2", source: "n-app", target: "n-db" }] as never,
      })
    })
    fireEvent.click(screen.getByTestId("start-challenge"))
    act(() => {
      vi.advanceTimersByTime(60_000)
    })
    expect(cs().attemptState).toBe("scored")

    const ticks = useSimulationStore.getState().ticks
    const computeFrames = ticks.map((t) => t.nodes.find((n) => n.nodeId === "n-app")).filter(Boolean) as { servedRps: number; incomingRps: number }[]

    // CURVE used: overload at the 1600-rps peak forced shedding → uptime fell below 100.
    expect(cs().lastMeasured!.uptimePercent).toBeLessThan(100)
    // SCHEDULED EVENT processed: the compute tier is fully offline (serves 0 with inflow) during
    // the az_outage window, but serving normally outside it — proves the event fired transiently.
    expect(computeFrames.some((f) => f.servedRps === 0 && f.incomingRps > 0)).toBe(true)
    expect(computeFrames.some((f) => f.servedRps > 0)).toBe(true)
    // AUTHORED DURATION honored: the last tick maps to t = durationSeconds, so its target RPS is
    // the curve endpoint (1600). With the old 90s default it would interpolate to ~1480.
    expect(ticks[ticks.length - 1].targetRps).toBe(interpolateRps(zone.trafficCurve, zone.durationSeconds))
  })
})
