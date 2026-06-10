import { describe, it, expect, vi, beforeEach } from "vitest"
import { renderHook, waitFor } from "@testing-library/react"

vi.mock("sonner", () => ({ toast: { success: vi.fn(), warning: vi.fn(), error: vi.fn() } }))
vi.mock("@/lib/firebase", () => ({ auth: { currentUser: null }, db: {} }))
vi.mock("@/hooks/useCurrentUserId", () => ({ useCurrentUserId: () => "u1" }))

// Two edge-track quests: completing the second crosses the tier-2 discipline threshold.
vi.mock("@/services/challengeLoader", () => ({
  getAllChallenges: vi.fn(() => [
    { id: "q1", track: "edge" },
    { id: "q2", track: "edge" },
    { id: "q3", track: "data" },
  ]),
}))
vi.mock("@/lib/masteryAvatars", () => ({
  getDisciplineAvatars: vi.fn((track: string) =>
    track === "edge" ? [{ level: 2, src: "edge-2.png" }, { level: 4, src: "edge-4.png" }] : [],
  ),
}))

// Stateful fake progress store: awardXp marks the challenge completed + bumps XP.
const progressState: { trackXp: Record<string, number>; completedChallenges: string[] } = {
  trackXp: {},
  completedChallenges: [],
}
const awardXp = vi.fn(async (_u: string, track: string, xp: number, id: string) => {
  progressState.trackXp[track] = (progressState.trackXp[track] ?? 0) + xp
  if (!progressState.completedChallenges.includes(id)) progressState.completedChallenges.push(id)
})
vi.mock("@/stores/userProgressStore", () => ({
  useUserProgressStore: { getState: () => ({ ...progressState, awardXp }) },
}))

import { useProgressPersistence } from "@/hooks/useProgressPersistence"
import { useChallengeStore } from "@/stores/challengeStore"
import { toast } from "sonner"
import type { Challenge, StarBreakdown } from "@/lib/challengeTypes"

const quest = (id: string): Challenge => ({
  id, title: id, brief: "b", difficulty: "beginner", budgetCap: 100, durationSeconds: 60,
  trafficCurve: [{ t: 0, rps: 0 }], requiredComponents: [],
  targetMetrics: { uptimePercent: 95, p99LatencyMs: 400 }, scheduledEvents: [], hints: [],
  schemaVersion: 2, requires: [], unlocks: [], minXp: 0, requiredTypes: [], availableBlocks: [],
  grants: [], origin: "builtin", track: "edge", rewards: { xp: 90 },
} as Challenge)

const scored: StarBreakdown = { stars: 3, passedMetrics: true, underBudget: true, cleanTopology: true }

describe("useProgressPersistence — discipline-unlock toast (S6 / D93)", () => {
  beforeEach(() => {
    vi.mocked(toast.success).mockClear()
    awardXp.mockClear()
    progressState.trackXp = {}
    progressState.completedChallenges = []
    useChallengeStore.setState({ activeChallenge: null, attemptState: "idle", lastResult: null })
  })

  it("toasts when a first clear crosses a discipline tier threshold (tech-tree count basis)", async () => {
    progressState.completedChallenges = ["q1"] // edge count 1 → clearing q2 makes 2 → crosses tier 2
    useChallengeStore.setState({ activeChallenge: quest("q2"), attemptState: "scored", lastResult: scored })
    renderHook(() => useProgressPersistence())
    await waitFor(() => expect(awardXp).toHaveBeenCalled())
    await waitFor(() =>
      expect(toast.success).toHaveBeenCalledWith(expect.stringContaining("Discipline unlocked!"), expect.anything()),
    )
    expect(toast.success).toHaveBeenCalledWith(expect.stringContaining("tier 2"), expect.anything())
  })

  it("does not toast a discipline when the clear crosses no threshold", async () => {
    progressState.completedChallenges = [] // 0 → 1: below tier 2
    useChallengeStore.setState({ activeChallenge: quest("q2"), attemptState: "scored", lastResult: scored })
    renderHook(() => useProgressPersistence())
    await waitFor(() => expect(awardXp).toHaveBeenCalled())
    const disciplineToasts = vi.mocked(toast.success).mock.calls.filter((c) => String(c[0]).includes("Discipline"))
    expect(disciplineToasts).toHaveLength(0)
  })

  it("does not re-toast on a repeat clear (completed count unchanged)", async () => {
    progressState.completedChallenges = ["q1", "q2"] // q2 already completed → count stays 2
    useChallengeStore.setState({ activeChallenge: quest("q2"), attemptState: "scored", lastResult: scored })
    renderHook(() => useProgressPersistence())
    await waitFor(() => expect(awardXp).toHaveBeenCalled())
    const disciplineToasts = vi.mocked(toast.success).mock.calls.filter((c) => String(c[0]).includes("Discipline"))
    expect(disciplineToasts).toHaveLength(0)
  })
})
