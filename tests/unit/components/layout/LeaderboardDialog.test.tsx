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

  it("ranks by 3★ then XP; TIES share a rank and order alphabetically; zero-XP hidden", async () => {
    mockGetDocs.mockResolvedValue(snap([
      { id: "a", data: { nickname: "Zelda", trackXp: { f: 500 }, bestStarsCloud: { q1: 3, q2: 3 } } },
      { id: "me", data: { nickname: "Gabriel", trackXp: { f: 500 }, bestStarsCloud: { q1: 3, q2: 3 } } },
      { id: "zero", data: { nickname: "Lurker", trackXp: {}, bestStarsCloud: {} } },
      { id: "b", data: { trackXp: { f: 100 }, bestStarsCloud: { q1: 3, q2: 3, q3: 3 } } },
    ]))
    render(<LeaderboardDialog open onOpenChange={() => {}} />)
    await waitFor(() => expect(screen.getByTestId("leaderboard-row-1")).toBeInTheDocument())
    expect(screen.getByTestId("leaderboard-row-1")).toHaveTextContent("Anonymous architect") // 3×3★ → rank 1
    // Gabriel and Zelda tie (2×3★, 500xp) → BOTH rank 2, alphabetical: Gabriel first
    expect(screen.getByTestId("leaderboard-row-2")).toHaveTextContent("Gabriel (you)")
    expect(screen.getByTestId("leaderboard-row-2")).toHaveTextContent("2")
    expect(screen.getByTestId("leaderboard-row-3")).toHaveTextContent("Zelda")
    expect(screen.getByTestId("leaderboard-row-3")).toHaveTextContent("2") // shared rank
    expect(screen.queryByText("Lurker")).toBeNull() // xp 0 hidden
  })

  it("shows only the top 10 — with an ellipsis + your row when you rank below", async () => {
    const docs = Array.from({ length: 14 }, (_, i) => ({
      id: `u${i}`,
      data: { nickname: `Arch${String(i).padStart(2, "0")}`, trackXp: { f: 1000 - i * 10 }, bestStarsCloud: { q1: 3 } },
    }))
    docs.push({ id: "me", data: { nickname: "TailMe", trackXp: { f: 1 }, bestStarsCloud: {} } })
    mockGetDocs.mockResolvedValue(snap(docs))
    render(<LeaderboardDialog open onOpenChange={() => {}} />)
    await waitFor(() => expect(screen.getByTestId("leaderboard-row-1")).toBeInTheDocument())
    expect(screen.getByTestId("leaderboard-row-10")).toBeInTheDocument()
    expect(screen.queryByTestId("leaderboard-row-11")).toBeNull() // top 10 only
    expect(screen.getByTestId("leaderboard-ellipsis")).toBeInTheDocument()
    expect(screen.getByTestId("leaderboard-row-you")).toHaveTextContent("TailMe (you)")
    expect(screen.getByTestId("leaderboard-row-you")).toHaveTextContent("15") // your true rank
  })

  it("fetch failure shows the error state, not a crash", async () => {
    mockGetDocs.mockImplementationOnce(async () => { throw new Error("offline") })
    render(<LeaderboardDialog open onOpenChange={() => {}} />)
    await waitFor(() => expect(screen.getByText(/Couldn't load the leaderboard/)).toBeInTheDocument())
  })
})
