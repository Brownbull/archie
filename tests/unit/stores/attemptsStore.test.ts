import { describe, it, expect, vi, beforeEach } from "vitest"
import type { AttemptStored } from "@/schemas/attemptSchema"

const addDocMock = vi.fn()
const getDocsMock = vi.fn()
vi.mock("@/lib/firebase", () => ({ db: { __db: true } }))
vi.mock("firebase/firestore", () => ({
  collection: vi.fn((_db: unknown, name: string) => ({ name })),
  addDoc: (...a: unknown[]) => addDocMock(...a),
  getDocs: (...a: unknown[]) => getDocsMock(...a),
  query: vi.fn((...a: unknown[]) => ({ q: a })),
  where: vi.fn((field: string, op: string, val: unknown) => ({ where: [field, op, val] })),
  orderBy: vi.fn((field: string, dir: string) => ({ orderBy: [field, dir] })),
  serverTimestamp: vi.fn(() => "SERVER_TS"),
  Timestamp: class {
    constructor(public ms: number) {}
    toMillis() {
      return this.ms
    }
  },
}))

import { Timestamp } from "firebase/firestore"
import { useAttemptsStore } from "@/stores/attemptsStore"

const s = () => useAttemptsStore.getState()
const valid: AttemptStored = {
  userId: "user-1", challengeId: "first-service", stars: 2,
  uptimePercent: 99.4, p99LatencyMs: 120, totalCost: 80, topologyIssueCount: 0,
}
const docOf = (id: string, over: Partial<AttemptStored> & { createdAt?: unknown } = {}) => ({
  id,
  data: () => ({ ...valid, createdAt: new Timestamp(1000), ...over }),
})

describe("attemptsStore (Epic 17 P4)", () => {
  beforeEach(() => {
    addDocMock.mockReset().mockResolvedValue({ id: "new" })
    getDocsMock.mockReset()
    useAttemptsStore.setState({ attempts: [], loading: false, error: null })
  })

  it("recordAttempt writes an owner-stamped doc with a server timestamp", async () => {
    await s().recordAttempt(valid)
    expect(addDocMock).toHaveBeenCalledTimes(1)
    const [, payload] = addDocMock.mock.calls[0]
    expect(payload).toEqual({ ...valid, createdAt: "SERVER_TS" })
    expect(s().error).toBeNull()
  })

  it("recordAttempt is a no-op with an empty userId (never an unowned write)", async () => {
    await s().recordAttempt({ ...valid, userId: "" })
    expect(addDocMock).not.toHaveBeenCalled()
  })

  it("recordAttempt rejects an invalid record (out-of-range stars) without writing", async () => {
    await s().recordAttempt({ ...valid, stars: 5 })
    expect(addDocMock).not.toHaveBeenCalled()
    expect(s().error).toMatch(/invalid/i)
  })

  it("recordAttempt surfaces a write failure without throwing (best-effort)", async () => {
    addDocMock.mockRejectedValueOnce(new Error("permission-denied"))
    await expect(s().recordAttempt(valid)).resolves.toBeUndefined()
    expect(s().error).toMatch(/could not save/i)
  })

  it("loadAttempts scopes the query to the user and parses docs newest-first", async () => {
    getDocsMock.mockResolvedValueOnce({ docs: [docOf("a"), docOf("b", { stars: 3 })] })
    await s().loadAttempts("user-1")
    const { where } = await import("firebase/firestore")
    expect(where).toHaveBeenCalledWith("userId", "==", "user-1")
    expect(s().attempts).toHaveLength(2)
    expect(s().attempts[0]).toMatchObject({ id: "a", userId: "user-1", createdAt: 1000 })
    expect(s().attempts[1].stars).toBe(3)
    expect(s().loading).toBe(false)
  })

  it("loadAttempts sorts newest-first client-side without a composite-index orderBy (P4)", async () => {
    getDocsMock.mockResolvedValueOnce({
      docs: [
        docOf("old", { createdAt: new Timestamp(1000) }),
        docOf("new", { createdAt: new Timestamp(9000) }),
        docOf("mid", { createdAt: new Timestamp(5000) }),
      ],
    })
    await s().loadAttempts("user-1")
    expect(s().attempts.map((a) => a.id)).toEqual(["new", "mid", "old"])
    // The query must NOT use orderBy — that needs a deployed composite index (the cause of
    // the "Could not load your attempt history" error). Guard against re-introducing it.
    const { orderBy } = await import("firebase/firestore")
    expect(orderBy).not.toHaveBeenCalled()
  })

  it("loadAttempts drops malformed docs", async () => {
    getDocsMock.mockResolvedValueOnce({ docs: [docOf("ok"), docOf("bad", { stars: 99 })] })
    await s().loadAttempts("user-1")
    expect(s().attempts).toHaveLength(1)
    expect(s().attempts[0].id).toBe("ok")
  })

  it("loadAttempts tolerates a missing/pending createdAt (no crash, defaults to 0)", async () => {
    getDocsMock.mockResolvedValueOnce({ docs: [docOf("pending", { createdAt: null })] })
    await s().loadAttempts("user-1")
    expect(s().attempts).toHaveLength(1)
    expect(s().attempts[0].createdAt).toBe(0)
  })

  it("loadAttempts with empty userId clears without querying", async () => {
    await s().loadAttempts("")
    expect(getDocsMock).not.toHaveBeenCalled()
    expect(s().attempts).toEqual([])
  })

  it("discards a superseded out-of-order load — never shows the prior user's data", async () => {
    let resolveA!: (v: unknown) => void
    let resolveB!: (v: unknown) => void
    const pA = new Promise((r) => { resolveA = r })
    const pB = new Promise((r) => { resolveB = r })
    getDocsMock.mockReturnValueOnce(pA).mockReturnValueOnce(pB)

    const p1 = s().loadAttempts("userA") // seq 1
    const p2 = s().loadAttempts("userB") // seq 2 — the latest
    resolveB({ docs: [docOf("b", { userId: "userB" })] }) // B resolves first
    await p2
    expect(s().attempts.map((a) => a.id)).toEqual(["b"])

    resolveA({ docs: [docOf("a", { userId: "userA" })] }) // A resolves late
    await p1
    expect(s().attempts.map((a) => a.id)).toEqual(["b"]) // stale A response discarded
  })

  it("loadAttempts clears the previous list immediately while loading", async () => {
    useAttemptsStore.setState({ attempts: [{ id: "old", userId: "prev", challengeId: "x", stars: 1, uptimePercent: 90, p99LatencyMs: 10, totalCost: 1, topologyIssueCount: 0, createdAt: 1 }] })
    let resolve!: (v: unknown) => void
    getDocsMock.mockReturnValueOnce(new Promise((r) => { resolve = r }))
    const p = s().loadAttempts("user-1")
    expect(s().attempts).toEqual([]) // cleared synchronously — no stale render during the fetch
    expect(s().loading).toBe(true)
    resolve({ docs: [docOf("fresh")] })
    await p
    expect(s().attempts.map((a) => a.id)).toEqual(["fresh"])
  })

  it("loadAttempts surfaces a read failure as an error", async () => {
    getDocsMock.mockRejectedValueOnce(new Error("network"))
    await s().loadAttempts("user-1")
    expect(s().attempts).toEqual([])
    expect(s().error).toMatch(/could not load/i)
    expect(s().loading).toBe(false)
  })
})
