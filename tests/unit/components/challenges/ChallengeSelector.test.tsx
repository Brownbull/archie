import { describe, it, expect, beforeEach, vi } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"
import type { Challenge } from "@/lib/challengeTypes"

// Mock the loader — challenge YAML content lands in Phase 5, so the selector is exercised
// against an injected fixture rather than build-time globs.
const sample: Challenge[] = [
  {
    id: "starter", title: "First Service", brief: "Stand up a single compute node under budget.",
    difficulty: "beginner", budgetCap: 50, durationSeconds: 60,
    trafficCurve: [{ t: 0, rps: 0 }, { t: 60, rps: 100 }],
    requiredComponents: ["compute"], targetMetrics: { uptimePercent: 99, p99LatencyMs: 200 },
    scheduledEvents: [], hints: ["Pick the cheapest variant"],
  },
  {
    id: "ha", title: "Survive an Outage", brief: "Stay up when an AZ fails.",
    difficulty: "advanced", budgetCap: 500, durationSeconds: 120,
    trafficCurve: [{ t: 0, rps: 0 }, { t: 120, rps: 1000 }],
    requiredComponents: ["compute", "load-balancing"], targetMetrics: { uptimePercent: 99.9, p99LatencyMs: 150 },
    scheduledEvents: [], hints: [],
  },
]
const getAllChallenges = vi.fn<[], Challenge[]>(() => sample)
vi.mock("@/services/challengeLoader", () => ({ getAllChallenges: () => getAllChallenges() }))

import { ChallengeSelector } from "@/components/challenges/ChallengeSelector"
import { useChallengeStore } from "@/stores/challengeStore"
import { useUiStore } from "@/stores/uiStore"

const s = () => useChallengeStore.getState()

describe("ChallengeSelector (Epic 16)", () => {
  beforeEach(() => {
    useChallengeStore.setState({ activeChallenge: null, attemptState: "idle", lastResult: null, bestStars: {} })
    // Open state now lives in uiStore — reset it so each test starts with the dialog closed.
    useUiStore.setState({ challengesOpen: false })
    getAllChallenges.mockReturnValue(sample)
  })

  it("opens the dialog and lists each challenge with budget + duration", () => {
    render(<ChallengeSelector />)
    fireEvent.click(screen.getByTestId("open-challenges"))
    expect(screen.getByTestId("challenge-selector")).toBeInTheDocument()
    expect(screen.getByTestId("challenge-card-starter")).toHaveTextContent("First Service")
    expect(screen.getByTestId("challenge-card-starter")).toHaveTextContent("$50/mo")
    expect(screen.getByTestId("challenge-card-ha")).toHaveTextContent("Survive an Outage")
  })

  it("selecting a card enters building mode and closes the dialog", () => {
    render(<ChallengeSelector />)
    fireEvent.click(screen.getByTestId("open-challenges"))
    fireEvent.click(screen.getByTestId("challenge-card-starter"))
    expect(s().activeChallenge?.id).toBe("starter")
    expect(s().attemptState).toBe("building")
    expect(screen.queryByTestId("challenge-selector")).not.toBeInTheDocument()
  })

  it("renders best-stars earned per challenge", () => {
    useChallengeStore.setState({ bestStars: { starter: 2 } })
    render(<ChallengeSelector />)
    fireEvent.click(screen.getByTestId("open-challenges"))
    const stars = screen.getAllByTestId("challenge-best-stars")
    expect(stars[0]).toHaveAttribute("aria-label", "2 of 3 stars")
    expect(stars[1]).toHaveAttribute("aria-label", "0 of 3 stars")
  })

  it("shows an empty state when no challenges are available", () => {
    getAllChallenges.mockReturnValue([])
    render(<ChallengeSelector />)
    fireEvent.click(screen.getByTestId("open-challenges"))
    expect(screen.getByTestId("challenge-empty")).toBeInTheDocument()
  })
})
