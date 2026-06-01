import { describe, it, expect, beforeEach } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"
import { BlockLevelSelector } from "@/components/toolbox/BlockLevelSelector"
import { usePreferencesStore } from "@/stores/preferencesStore"
import { useChallengeStore } from "@/stores/challengeStore"
import type { Challenge } from "@/lib/challengeTypes"

function makeChallenge(over: Partial<Challenge> = {}): Challenge {
  return {
    id: "c1", title: "Test", brief: "b", difficulty: "beginner",
    budgetCap: 100, durationSeconds: 60, trafficCurve: [{ t: 0, rps: 0 }],
    requiredComponents: ["compute"], targetMetrics: { uptimePercent: 99, p99LatencyMs: 200 },
    scheduledEvents: [], hints: [], ...over,
  }
}

describe("BlockLevelSelector (P86)", () => {
  beforeEach(() => {
    usePreferencesStore.setState({ blockLevel: "beginner" })
    useChallengeStore.setState({ activeChallenge: null })
  })

  it("renders three level radios with beginner active by default", () => {
    render(<BlockLevelSelector />)
    expect(screen.getByTestId("block-level-beginner")).toHaveAttribute("aria-checked", "true")
    expect(screen.getByTestId("block-level-intermediate")).toHaveAttribute("aria-checked", "false")
    expect(screen.getByTestId("block-level-advanced")).toHaveAttribute("aria-checked", "false")
  })

  it("clicking a level updates the persisted preference", () => {
    render(<BlockLevelSelector />)
    fireEvent.click(screen.getByTestId("block-level-advanced"))
    expect(usePreferencesStore.getState().blockLevel).toBe("advanced")
    expect(screen.getByTestId("block-level-advanced")).toHaveAttribute("aria-checked", "true")
  })

  it("reflects the current store level on render", () => {
    usePreferencesStore.setState({ blockLevel: "intermediate" })
    render(<BlockLevelSelector />)
    expect(screen.getByTestId("block-level-intermediate")).toHaveAttribute("aria-checked", "true")
  })

  it("shows challenge-aware hint copy when a challenge is active", () => {
    useChallengeStore.setState({ activeChallenge: makeChallenge() })
    render(<BlockLevelSelector />)
    expect(screen.getByText(/Set to match this challenge/i)).toBeInTheDocument()
  })

  it("shows free-build hint copy when no challenge is active", () => {
    render(<BlockLevelSelector />)
    expect(screen.getByText(/Raise the level to reveal more building blocks/i)).toBeInTheDocument()
  })
})
