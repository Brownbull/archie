import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"
import type { Challenge } from "@/lib/challengeTypes"

let mockUser: { uid: string } | null = null
vi.mock("@/hooks/useAuth", () => ({ useAuth: () => ({ user: mockUser }) }))
vi.mock("@/lib/firebase", () => ({ db: {}, auth: { currentUser: null } }))
vi.mock("firebase/firestore", () => ({
  increment: vi.fn((n: number) => ({ __increment: n })),
  doc: vi.fn(() => ({})),
  getDoc: vi.fn(),
  setDoc: vi.fn(() => Promise.resolve()),
  serverTimestamp: vi.fn(() => "ts"),
}))

import { HintPanel } from "@/components/challenges/HintPanel"
import { useChallengeStore } from "@/stores/challengeStore"
import { useUserProgressStore } from "@/stores/userProgressStore"

const challenge: Challenge = {
  id: "c1", title: "T", brief: "b", difficulty: "beginner", budgetCap: 100, durationSeconds: 60,
  trafficCurve: [{ t: 0, rps: 0 }], requiredComponents: [], targetMetrics: { uptimePercent: 99, p99LatencyMs: 200 },
  scheduledEvents: [], hints: ["First nudge", "Second hint", "The full solution"],
  schemaVersion: 2, requires: [], unlocks: [], minXp: 0, requiredTypes: [], availableBlocks: [], grants: [], origin: "builtin",
}
const PROGRESS_BASE = { trackXp: {}, completedChallenges: [], equippedAvatar: null, error: null, loading: false, lastAward: null }

beforeEach(() => {
  mockUser = null
  useChallengeStore.setState({ activeChallenge: challenge })
  useUserProgressStore.setState({ ...PROGRESS_BASE, bestStarsCloud: {}, hintsUnlocked: {} })
})

describe("HintPanel (ISAPivot Phase 5 hint economy)", () => {
  it("renders nothing with no active challenge", () => {
    useChallengeStore.setState({ activeChallenge: null })
    const { container } = render(<HintPanel />)
    expect(container.firstChild).toBeNull()
  })

  it("signed out: shows 0 balance, a login prompt, and a disabled reveal button", () => {
    render(<HintPanel />)
    expect(screen.getByTestId("hint-panel")).toHaveTextContent("Hints (0/4)") // +1: the required-blocks reveal leads the ladder
    expect(screen.getByTestId("hint-balance")).toHaveTextContent("0")
    expect(screen.getByTestId("hint-reveal-next")).toBeDisabled()
    expect(screen.getByTestId("hint-login")).toBeInTheDocument()
    expect(screen.queryByTestId("hint-0")).not.toBeInTheDocument()
  })

  it("the FIRST hint is the required-blocks reveal and costs 1★ — broke = disabled (2026-06-11; LX1 retired)", () => {
    mockUser = { uid: "u1" }
    render(<HintPanel />) // 0 stars, 0 unlocked
    expect(screen.getByTestId("hint-reveal-next")).toBeDisabled() // no free first anymore
    expect(screen.getByTestId("hint-cost")).toHaveTextContent("1")
    expect(screen.getByTestId("hint-no-stars")).toBeInTheDocument()
  })

  it("with a star: the first reveal names the REQUIRED blocks", () => {
    mockUser = { uid: "u1" }
    useUserProgressStore.setState({ bestStarsCloud: { cX: 1 }, hintsUnlocked: {} })
    render(<HintPanel />)
    expect(screen.getByTestId("hint-reveal-next")).toHaveTextContent("required blocks")
    fireEvent.click(screen.getByTestId("hint-reveal-next"))
    expect(useUserProgressStore.getState().hintsUnlocked.c1).toBe(1)
    expect(screen.getByTestId("hint-0")).toHaveTextContent(/This quest grades on/)
  })

  it("the authored hints follow, shifted by one, each 1★", () => {
    mockUser = { uid: "u1" }
    useUserProgressStore.setState({ bestStarsCloud: { cX: 3 }, hintsUnlocked: { c1: 1 } })
    render(<HintPanel />)
    expect(screen.getByTestId("hint-cost")).toHaveTextContent("1")
    fireEvent.click(screen.getByTestId("hint-reveal-next"))
    expect(useUserProgressStore.getState().hintsUnlocked.c1).toBe(2)
    expect(screen.getByTestId("hint-1")).toHaveTextContent("First nudge")
  })

  it("labels the final hint as the full solution and shows all-revealed when done", () => {
    mockUser = { uid: "u1" }
    useUserProgressStore.setState({ bestStarsCloud: { cX: 10 }, hintsUnlocked: { c1: 3 } }) // 3 of 4 revealed
    render(<HintPanel />)
    expect(screen.getByTestId("hint-reveal-next")).toHaveTextContent("full solution")

    fireEvent.click(screen.getByTestId("hint-reveal-next"))

    expect(useUserProgressStore.getState().hintsUnlocked.c1).toBe(4)
    expect(screen.getByTestId("hint-3")).toHaveTextContent("The full solution")
    expect(screen.getByTestId("hint-all-revealed")).toBeInTheDocument()
    expect(screen.queryByTestId("hint-reveal-next")).not.toBeInTheDocument()
  })
})
