import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"
import type { Challenge } from "@/lib/challengeTypes"

const firstService: Challenge = {
  id: "first-service", title: "First Service", brief: "Stand up a single compute node under budget.",
  difficulty: "beginner", budgetCap: 80, durationSeconds: 60,
  trafficCurve: [{ t: 0, rps: 0 }, { t: 60, rps: 100 }],
  requiredComponents: ["compute"], targetMetrics: { uptimePercent: 99, p99LatencyMs: 200 },
  scheduledEvents: [], hints: [],
  schemaVersion: 2, requires: [], unlocks: [], minXp: 0, requiredTypes: [], availableBlocks: ["traffic-source", "compute"], grants: [], origin: "builtin",
  track: "foundations", tier: 1, rewards: { xp: 100 },
}

const getAllChallenges = vi.fn<[], Challenge[]>(() => [firstService])
vi.mock("@/services/challengeLoader", () => ({ getAllChallenges: () => getAllChallenges() }))
vi.mock("@/services/challengeCanvasSeed", () => ({ makeChallengeCanvas: () => ({ nodes: [], edges: [] }) }))
vi.mock("@/lib/firebase", () => ({ auth: { currentUser: null }, db: {} }))

import { FirstRunFork } from "@/components/canvas/FirstRunFork"
import { usePreferencesStore } from "@/stores/preferencesStore"
import { useChallengeStore } from "@/stores/challengeStore"

describe("FirstRunFork (S1)", () => {
  beforeEach(() => {
    usePreferencesStore.setState({ firstRunChoice: null, experienceLevel: "expert" })
    useChallengeStore.setState({ activeChallenge: null })
    getAllChallenges.mockReturnValue([firstService])
  })

  it("renders both fork options", () => {
    render(<FirstRunFork />)
    expect(screen.getByTestId("first-run-quest")).toBeInTheDocument()
    expect(screen.getByTestId("first-run-free")).toBeInTheDocument()
  })

  it("'New to architecture?' launches First Service in Quest Mode and records the choice", () => {
    render(<FirstRunFork />)
    fireEvent.click(screen.getByTestId("first-run-quest"))
    expect(usePreferencesStore.getState().firstRunChoice).toBe("quest")
    // Entering Quest Mode = challengeStore.activeChallenge set to first-service.
    expect(useChallengeStore.getState().activeChallenge?.id).toBe("first-service")
    // The quest's difficulty drives the experience level (beginner here).
    expect(usePreferencesStore.getState().experienceLevel).toBe("beginner")
  })

  it("'I know architecture' records the free choice without entering a quest", () => {
    render(<FirstRunFork />)
    fireEvent.click(screen.getByTestId("first-run-free"))
    expect(usePreferencesStore.getState().firstRunChoice).toBe("free")
    expect(useChallengeStore.getState().activeChallenge).toBeNull()
  })
})
