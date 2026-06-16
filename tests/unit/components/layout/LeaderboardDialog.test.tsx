import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"

vi.mock("@/lib/firebase", () => ({ db: {}, auth: { currentUser: null } }))
const { mockGetDocs, mockGetDoc, mockGetCountFromServer } = vi.hoisted(() => ({
  mockGetDocs: vi.fn(),
  mockGetDoc: vi.fn(),
  mockGetCountFromServer: vi.fn(),
}))
vi.mock("firebase/firestore", () => ({
  collection: vi.fn(() => ({})),
  query: vi.fn((...args: unknown[]) => args),
  orderBy: vi.fn(),
  limit: vi.fn(),
  where: vi.fn(),
  doc: vi.fn(),
  getDocs: mockGetDocs,
  getDoc: mockGetDoc,
  getCountFromServer: mockGetCountFromServer,
}))
vi.mock("@/hooks/useCurrentUserId", () => ({ useCurrentUserId: () => "me" }))

import { LeaderboardDialog, __resetLeaderboardCache } from "@/components/layout/LeaderboardDialog"

const snap = (docs: Array<{ id: string; data: Record<string, unknown> }>) => ({
  forEach: (cb: (d: { id: string; data: () => Record<string, unknown> }) => void) =>
    docs.forEach((d) => cb({ id: d.id, data: () => d.data })),
})

describe("LeaderboardDialog (D105)", () => {
  beforeEach(() => {
    mockGetDocs.mockReset()
    mockGetDoc.mockReset()
    mockGetCountFromServer.mockReset()
    __resetLeaderboardCache()
  })

  it("ranks by XP ONLY (D107); equal XP shares a rank, alphabetical within; zero-XP hidden", async () => {
    mockGetDocs.mockResolvedValue(snap([
      { id: "a", data: { nickname: "Zelda", trackXp: { f: 500 }, totalXp: 500, bestStarsCloud: { q1: 3, q2: 3 } } },
      { id: "me", data: { nickname: "Gabriel", trackXp: { f: 500 }, totalXp: 500, bestStarsCloud: { q1: 3, q2: 3 } } },
      { id: "zero", data: { nickname: "Lurker", trackXp: {}, totalXp: 0, bestStarsCloud: {} } },
      { id: "b", data: { trackXp: { f: 100 }, totalXp: 100, bestStarsCloud: { q1: 3, q2: 3, q3: 3 } } },
    ]))
    render(<LeaderboardDialog open onOpenChange={() => {}} />)
    await waitFor(() => expect(screen.getByTestId("leaderboard-row-1")).toBeInTheDocument())
    expect(screen.getByTestId("leaderboard-row-1")).toHaveTextContent("Gabriel (you)")
    expect(screen.getByTestId("leaderboard-row-2")).toHaveTextContent("Zelda")
    expect(screen.getByTestId("leaderboard-row-2")).toHaveTextContent("1") // shared rank
    expect(screen.getByTestId("leaderboard-row-3")).toHaveTextContent("Anonymous architect")
    expect(screen.getByTestId("leaderboard-row-3")).toHaveTextContent("3") // competition skip (1,1,3)
    expect(screen.queryByText("Lurker")).toBeNull() // xp 0 hidden
  })

  it("shows only the top 10 — with an ellipsis + your row when you rank below", async () => {
    // Top query returns 15 docs (top users only, user "me" not among them)
    const topDocs = Array.from({ length: 14 }, (_, i) => ({
      id: `u${i}`,
      data: { nickname: `Arch${String(i).padStart(2, "0")}`, trackXp: { f: 1000 - i * 10 }, totalXp: 1000 - i * 10, bestStarsCloud: { q1: 3 } },
    }))
    mockGetDocs.mockResolvedValue(snap(topDocs))
    // getDoc for the user's own row (outside top 10)
    mockGetDoc.mockResolvedValue({
      exists: () => true,
      data: () => ({ nickname: "TailMe", trackXp: { f: 1 }, totalXp: 1, bestStarsCloud: {} }),
    })
    // getCountFromServer for rank calculation
    mockGetCountFromServer.mockResolvedValue({ data: () => ({ count: 14 }) })
    render(<LeaderboardDialog open onOpenChange={() => {}} />)
    await waitFor(() => expect(screen.getByTestId("leaderboard-row-1")).toBeInTheDocument())
    expect(screen.getByTestId("leaderboard-row-10")).toBeInTheDocument()
    expect(screen.queryByTestId("leaderboard-row-11")).toBeNull() // top 10 only
    expect(screen.getByTestId("leaderboard-ellipsis")).toBeInTheDocument()
    expect(screen.getByTestId("leaderboard-row-you")).toHaveTextContent("TailMe (you)")
    expect(screen.getByTestId("leaderboard-row-you")).toHaveTextContent("15") // your true rank (14 above + 1)
  })

  it("fetch failure shows the error state, not a crash", async () => {
    mockGetDocs.mockImplementationOnce(async () => { throw new Error("offline") })
    render(<LeaderboardDialog open onOpenChange={() => {}} />)
    await waitFor(() => expect(screen.getByText(/Couldn't load the leaderboard/)).toBeInTheDocument())
  })
})
