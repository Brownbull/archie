import { describe, it, expect, vi, beforeEach } from "vitest"
import { renderHook } from "@testing-library/react"
import { useAttemptComparison } from "@/hooks/useAttemptComparison"
import type { AttemptRecord } from "@/schemas/attemptSchema"

let mockAttempts: AttemptRecord[] = []
let mockLoading = false
const mockLoadAttempts = vi.fn()

vi.mock("@/stores/attemptsStore", () => ({
  useAttemptsStore: (selector: (s: Record<string, unknown>) => unknown) =>
    selector({ attempts: mockAttempts, loading: mockLoading, loadAttempts: mockLoadAttempts }),
}))
vi.mock("@/hooks/useCurrentUserId", () => ({ useCurrentUserId: () => "u1" }))

const rec = (over: Partial<AttemptRecord>): AttemptRecord => ({
  id: "x", userId: "u1", challengeId: "c1", stars: 1,
  uptimePercent: 90, p99LatencyMs: 200, totalCost: 100, topologyIssueCount: 0, createdAt: 1,
  ...over,
})
const current = { stars: 2, totalCost: 80, p99LatencyMs: 120, uptimePercent: 99 }

beforeEach(() => {
  mockAttempts = []
  mockLoading = false
  mockLoadAttempts.mockReset()
})

describe("useAttemptComparison (P4)", () => {
  it("returns null on the first attempt (no prior same-challenge attempts)", () => {
    const { result } = renderHook(() => useAttemptComparison("c1", current))
    expect(result.current).toBeNull()
  })

  it("loads the owner's attempts once when none are cached", () => {
    renderHook(() => useAttemptComparison("c1", current))
    expect(mockLoadAttempts).toHaveBeenCalledWith("u1")
  })

  it("does not load when a challenge is not active (closed modal)", () => {
    renderHook(() => useAttemptComparison("", current))
    expect(mockLoadAttempts).not.toHaveBeenCalled()
  })

  it("picks the best prior attempt by stars → cost → latency", () => {
    mockAttempts = [
      rec({ id: "a", stars: 1, totalCost: 100 }),
      rec({ id: "b", stars: 2, totalCost: 150 }),
      rec({ id: "c", stars: 2, totalCost: 90 }),
    ]
    const { result } = renderHook(() =>
      useAttemptComparison("c1", { stars: 3, totalCost: 80, p99LatencyMs: 120, uptimePercent: 99 }),
    )
    expect(result.current?.id).toBe("c")
  })

  it("excludes the current attempt when a reload included it (metric-signature match)", () => {
    mockAttempts = [rec({ id: "self", stars: 2, totalCost: 80, p99LatencyMs: 120, uptimePercent: 99 })]
    const { result } = renderHook(() => useAttemptComparison("c1", current))
    expect(result.current).toBeNull()
  })

  it("ignores attempts from other challenges", () => {
    mockAttempts = [rec({ id: "other", challengeId: "c2", stars: 3 })]
    const { result } = renderHook(() => useAttemptComparison("c1", current))
    expect(result.current).toBeNull()
  })
})
