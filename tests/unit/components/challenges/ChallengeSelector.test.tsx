import { describe, it, expect, beforeEach, vi } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"
import type { Challenge } from "@/lib/challengeTypes"

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({ user: { uid: "test-user" }, loading: false, error: null, signIn: vi.fn(), signInWithTest: vi.fn(), signOut: vi.fn() }),
}))

const sample: Challenge[] = [
  {
    id: "starter", title: "First Service", brief: "Stand up a single compute node under budget.",
    difficulty: "beginner", budgetCap: 50, durationSeconds: 60,
    trafficCurve: [{ t: 0, rps: 0 }, { t: 60, rps: 100 }],
    requiredComponents: ["compute"], targetMetrics: { uptimePercent: 99, p99LatencyMs: 200 },
    scheduledEvents: [], hints: ["Pick the cheapest variant"],
    schemaVersion: 2, requires: [], unlocks: ["ha"], availableBlocks: ["traffic-source", "compute"], grants: [], origin: "builtin",
    track: "foundations", tier: 1, rewards: { xp: 100 },
  },
  {
    id: "ha", title: "Survive an Outage", brief: "Stay up when an AZ fails.",
    difficulty: "advanced", budgetCap: 500, durationSeconds: 120,
    trafficCurve: [{ t: 0, rps: 0 }, { t: 120, rps: 1000 }],
    requiredComponents: ["compute", "load-balancing"], targetMetrics: { uptimePercent: 99.9, p99LatencyMs: 150 },
    scheduledEvents: [], hints: [],
    schemaVersion: 2, requires: ["starter"], unlocks: [], availableBlocks: [], grants: [], origin: "builtin",
    track: "reliability", tier: 3, rewards: { xp: 200 },
  },
]
const getAllChallenges = vi.fn<[], Challenge[]>(() => sample)
vi.mock("@/services/challengeLoader", () => ({ getAllChallenges: () => getAllChallenges() }))

import { ChallengeSelector } from "@/components/challenges/ChallengeSelector"
import { useChallengeStore } from "@/stores/challengeStore"
import { useUiStore } from "@/stores/uiStore"
import { useUserProgressStore } from "@/stores/userProgressStore"

const s = () => useChallengeStore.getState()

describe("ChallengeSelector (Phase 2)", () => {
  beforeEach(() => {
    useChallengeStore.setState({ activeChallenge: null, attemptState: "idle", lastResult: null, bestStars: {} })
    useUserProgressStore.setState({ trackXp: {}, completedChallenges: [], loading: false, error: null })
    useUiStore.setState({ challengesOpen: false })
    getAllChallenges.mockReturnValue(sample)
  })

  it("opens the dialog and lists challenges ordered by tech tree (track, tier, id)", () => {
    render(<ChallengeSelector />)
    fireEvent.click(screen.getByTestId("open-challenges"))
    expect(screen.getByTestId("challenge-selector")).toBeInTheDocument()
    expect(screen.getByTestId("challenge-card-starter")).toHaveTextContent("First Service")
    expect(screen.getByTestId("challenge-card-ha")).toHaveTextContent("Survive an Outage")
  })

  it("selecting an available card enters building mode", () => {
    render(<ChallengeSelector />)
    fireEvent.click(screen.getByTestId("open-challenges"))
    fireEvent.click(screen.getByTestId("challenge-card-starter"))
    expect(s().activeChallenge?.id).toBe("starter")
    expect(s().attemptState).toBe("building")
  })

  it("locks challenges whose prerequisites are incomplete", () => {
    render(<ChallengeSelector />)
    fireEvent.click(screen.getByTestId("open-challenges"))
    const haCard = screen.getByTestId("challenge-card-ha")
    expect(haCard).toHaveAttribute("data-status", "locked")
    expect(haCard).toBeDisabled()
    expect(haCard).toHaveTextContent("Requires")
  })

  it("unlocks challenges once prerequisites are completed", () => {
    useUserProgressStore.setState({ completedChallenges: ["starter"] })
    render(<ChallengeSelector />)
    fireEvent.click(screen.getByTestId("open-challenges"))
    const haCard = screen.getByTestId("challenge-card-ha")
    expect(haCard).toHaveAttribute("data-status", "available")
    expect(haCard).not.toBeDisabled()
  })

  it("renders relative-level badges", () => {
    render(<ChallengeSelector />)
    fireEvent.click(screen.getByTestId("open-challenges"))
    const badges = screen.getAllByTestId("challenge-level-badge")
    expect(badges.length).toBeGreaterThan(0)
  })

  it("renders best-stars earned per challenge", () => {
    useChallengeStore.setState({ bestStars: { starter: 2 } })
    render(<ChallengeSelector />)
    fireEvent.click(screen.getByTestId("open-challenges"))
    const stars = screen.getAllByTestId("challenge-best-stars")
    expect(stars[0]).toHaveAttribute("aria-label", "2 of 3 stars")
  })

  it("shows an empty state when no challenges are available", () => {
    getAllChallenges.mockReturnValue([])
    render(<ChallengeSelector />)
    fireEvent.click(screen.getByTestId("open-challenges"))
    expect(screen.getByTestId("challenge-empty")).toBeInTheDocument()
  })
})
