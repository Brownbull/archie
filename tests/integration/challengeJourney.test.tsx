import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { render, screen, fireEvent, act } from "@testing-library/react"
import type { ComponentCategoryId } from "@/lib/constants"

// Real loader + real engine + real stats; only the component library is stubbed for capacity/cost.
const mockGetComponent = vi.fn()
vi.mock("@/services/componentLibrary", () => ({
  componentLibrary: { getComponent: (...a: unknown[]) => mockGetComponent(...a) },
}))
vi.mock("@/lib/firebase", () => ({ auth: { currentUser: null }, db: {} }))

import { ChallengeSelector } from "@/components/challenges/ChallengeSelector"
import { ChallengeHud } from "@/components/challenges/ChallengeHud"
import { ChallengeStartButton } from "@/components/challenges/ChallengeStartButton"
import { ChallengeResultsModal } from "@/components/challenges/ChallengeResultsModal"
import { useChallengeStore } from "@/stores/challengeStore"
import { useSimulationStore } from "@/stores/simulationStore"
import { useArchitectureStore } from "@/stores/architectureStore"

function comp() {
  return { id: "app", name: "App Server", category: "compute", configVariants: [{ id: "default", name: "d", metrics: [], maxRPS: 500, baseLatencyMs: 15, monthlyCost: 40 }] }
}
const computeNode = {
  id: "n-app", type: "archie" as const, position: { x: 0, y: 0 },
  data: { archieComponentId: "app", activeConfigVariantId: "default", componentCategory: "compute" as ComponentCategoryId, replicaCount: 1 },
}
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
  beforeEach(() => {
    vi.useFakeTimers()
    mockGetComponent.mockImplementation((id: string) => (id === "app" ? comp() : undefined))
    useChallengeStore.setState({ activeChallenge: null, attemptState: "idle", lastResult: null, lastMeasured: null, attemptSnapshot: null, bestStars: {} })
    useSimulationStore.getState().reset()
    useArchitectureStore.setState({ nodes: [], edges: [], topologyIssues: [], topologyIssuesByNodeId: new Map() })
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
    fireEvent.click(screen.getByTestId("challenge-card-first-service"))
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

    // SCORE — play to completion; the auto-score hook scores and opens the results modal.
    act(() => {
      vi.advanceTimersByTime(70_000)
    })
    expect(useSimulationStore.getState().status).toBe("done")
    expect(cs().attemptState).toBe("scored")
    expect(screen.getByTestId("challenge-results")).toBeInTheDocument()
    expect(screen.getByTestId("result-stars").getAttribute("aria-label")).toMatch(/^[0-3] of 3 stars$/)
    expect(cs().lastMeasured?.totalCost).toBe(40) // single compute node, snapshot at start

    // RETRY — re-enters build mode, clears the finished sim, keeps the level selected.
    fireEvent.click(screen.getByTestId("result-retry"))
    expect(cs().attemptState).toBe("building")
    expect(cs().activeChallenge?.id).toBe("first-service")
    expect(useSimulationStore.getState().status).toBe("idle")
  })
})
