import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"

vi.mock("@/lib/firebase", () => ({ db: {}, auth: { currentUser: null } }))
const { mockGetDocs } = vi.hoisted(() => ({ mockGetDocs: vi.fn() }))
vi.mock("firebase/firestore", () => ({
  collection: vi.fn(() => ({})),
  getDocs: mockGetDocs,
}))
vi.mock("@/hooks/useCurrentUserId", () => ({ useCurrentUserId: () => "me" }))

import { LeaderboardDialog } from "@/components/layout/LeaderboardDialog"

const snap = (docs: Array<{ id: string; data: Record<string, unknown> }>) => ({
  forEach: (cb: (d: { id: string; data: () => Record<string, unknown> }) => void) =>
    docs.forEach((d) => cb({ id: d.id, data: () => d.data })),
})

describe("LeaderboardDialog (D105)", () => {
  beforeEach(() => mockGetDocs.mockReset())

  it("ranks by 3★ quests then XP, hides zero-XP accounts, marks you", async () => {
    mockGetDocs.mockResolvedValue(snap([
      { id: "a", data: { displayName: "Ada", trackXp: { f: 500 }, bestStarsCloud: { q1: 3, q2: 3, q3: 2 } } },
      { id: "me", data: { displayName: "Gabriel", trackXp: { f: 900 }, bestStarsCloud: { q1: 3, q2: 3 } } },
      { id: "zero", data: { displayName: "Lurker", trackXp: {}, bestStarsCloud: {} } },
      { id: "b", data: { trackXp: { f: 100 }, bestStarsCloud: { q1: 3, q2: 3, q3: 3 } } },
    ]))
    render(<LeaderboardDialog open onOpenChange={() => {}} />)
    await waitFor(() => expect(screen.getByTestId("leaderboard-row-1")).toBeInTheDocument())
    expect(screen.getByTestId("leaderboard-row-1")).toHaveTextContent("Anonymous architect") // 3×3★ wins
    expect(screen.getByTestId("leaderboard-row-2")).toHaveTextContent("Gabriel (you)") // 2×3★, 900xp beats Ada's 500
    expect(screen.getByTestId("leaderboard-row-3")).toHaveTextContent("Ada")
    expect(screen.queryByText("Lurker")).toBeNull() // xp 0 hidden
  })

  it("fetch failure shows the error state, not a crash", async () => {
    mockGetDocs.mockImplementationOnce(async () => { throw new Error("offline") })
    render(<LeaderboardDialog open onOpenChange={() => {}} />)
    await waitFor(() => expect(screen.getByText(/Couldn't load the leaderboard/)).toBeInTheDocument())
  })
})
