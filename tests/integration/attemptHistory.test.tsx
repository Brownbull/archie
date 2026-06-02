import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import type { Challenge } from "@/lib/challengeTypes"

// In-memory Firestore (hoisted so the mock factory + test share state): addDoc appends,
// getDocs returns owner-filtered docs newest-first.
const fs = vi.hoisted(() => {
  class MockTimestamp {
    constructor(public ms: number) {}
    toMillis() {
      return this.ms
    }
  }
  return { MockTimestamp, DOCS: [] as { id: string; data: Record<string, unknown> }[] }
})
vi.mock("@/lib/firebase", () => ({ auth: { currentUser: null }, db: { __db: true } }))
vi.mock("firebase/firestore", () => ({
  collection: (_db: unknown, name: string) => ({ name }),
  addDoc: async (_col: unknown, data: Record<string, unknown>) => {
    const createdAt = data.createdAt === "SERVER_TS" ? new fs.MockTimestamp(1000 + fs.DOCS.length) : data.createdAt
    const id = `doc-${fs.DOCS.length}`
    fs.DOCS.push({ id, data: { ...data, createdAt } })
    return { id }
  },
  getDocs: async (q: { constraints: { type: string; field?: string; val?: unknown }[] }) => {
    const w = q.constraints.find((c) => c.type === "where" && c.field === "userId")
    const matched = fs.DOCS.filter((d) => d.data.userId === w?.val)
    matched.sort((a, b) => (b.data.createdAt as InstanceType<typeof fs.MockTimestamp>).toMillis() - (a.data.createdAt as InstanceType<typeof fs.MockTimestamp>).toMillis())
    return { docs: matched.map((d) => ({ id: d.id, data: () => d.data })) }
  },
  query: (_col: unknown, ...constraints: unknown[]) => ({ constraints }),
  where: (field: string, op: string, val: unknown) => ({ type: "where", field, op, val }),
  orderBy: (field: string, dir: string) => ({ type: "orderBy", field, dir }),
  serverTimestamp: () => "SERVER_TS",
  Timestamp: fs.MockTimestamp,
}))

const mockUseAuth = vi.fn(() => ({ user: { uid: "user-1" }, loading: false }))
vi.mock("@/hooks/useAuth", () => ({ useAuth: () => mockUseAuth() }))

import { useAttemptPersistence } from "@/hooks/useAttemptPersistence"
import { HistoryTab } from "@/components/toolbox/HistoryTab"
import { useChallengeStore } from "@/stores/challengeStore"
import { useAttemptsStore } from "@/stores/attemptsStore"

const challenge: Challenge = {
  id: "first-service", title: "First Service", brief: "b", difficulty: "beginner", budgetCap: 100, durationSeconds: 60,
  trafficCurve: [{ t: 0, rps: 0 }, { t: 60, rps: 100 }],
  requiredComponents: ["compute"], targetMetrics: { uptimePercent: 95, p99LatencyMs: 200 },
  scheduledEvents: [], hints: [],
  schemaVersion: 2, requires: [], unlocks: [], requiredTypes: [], availableBlocks: [], grants: [], origin: "builtin",
}
function Persist() {
  useAttemptPersistence()
  return null
}

describe("attempt history (integration): score → persist → History (Epic 17 P6)", () => {
  beforeEach(() => {
    fs.DOCS.length = 0
    mockUseAuth.mockReturnValue({ user: { uid: "user-1" }, loading: false })
    useAttemptsStore.setState({ attempts: [], loading: false, error: null })
    useChallengeStore.setState({ activeChallenge: null, attemptState: "idle", lastResult: null, lastMeasured: null, attemptSnapshot: null, bestStars: {} })
  })

  it("a scored attempt is persisted to Firestore and then surfaces in the History tab", async () => {
    // SCORE: a finished, scored attempt in the store.
    useChallengeStore.setState({
      activeChallenge: challenge, attemptState: "scored",
      lastResult: { stars: 2, passedMetrics: true, underBudget: true, cleanTopology: true },
      lastMeasured: { uptimePercent: 99.4, p99LatencyMs: 120, totalCost: 80, topologyIssueCount: 0 },
    })

    // PERSIST: mounting the persistence hook writes the owner-stamped attempt.
    render(<Persist />)
    await waitFor(() => expect(fs.DOCS).toHaveLength(1))
    expect(fs.DOCS[0].data).toMatchObject({ userId: "user-1", challengeId: "first-service", stars: 2, uptimePercent: 99.4 })

    // HISTORY: the History tab loads the persisted attempt and renders it.
    render(<HistoryTab />)
    const row = await screen.findByTestId("attempt-row-doc-0")
    expect(row).toHaveTextContent("First Service")
    expect(row).toHaveTextContent("99.4%")
    expect(row).toHaveAttribute("data-passed", "true")
  })

  it("History shows only the signed-in user's attempts (owner-scoped query)", async () => {
    // Seed two users' attempts directly via the persistence-equivalent write path.
    await useAttemptsStore.getState().recordAttempt({ userId: "user-1", challengeId: "first-service", stars: 3, uptimePercent: 100, p99LatencyMs: 40, totalCost: 50, topologyIssueCount: 0 })
    await useAttemptsStore.getState().recordAttempt({ userId: "other-user", challengeId: "chaos-day", stars: 1, uptimePercent: 80, p99LatencyMs: 200, totalCost: 900, topologyIssueCount: 2 })
    expect(fs.DOCS).toHaveLength(2)

    render(<HistoryTab />)
    await screen.findByTestId(/^attempt-row-/)
    const rows = screen.getAllByTestId(/^attempt-row-/)
    expect(rows).toHaveLength(1) // only user-1's attempt
    expect(rows[0]).toHaveTextContent("First Service")
  })
})
