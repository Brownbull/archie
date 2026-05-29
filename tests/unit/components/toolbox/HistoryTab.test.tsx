import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { render, screen, fireEvent, within } from "@testing-library/react"
import type { AttemptRecord } from "@/schemas/attemptSchema"

let mockUid: string | null = "user-1"
vi.mock("@/hooks/useCurrentUserId", () => ({ useCurrentUserId: () => mockUid }))

import { HistoryTab } from "@/components/toolbox/HistoryTab"
import { useAttemptsStore } from "@/stores/attemptsStore"

const rec = (id: string, over: Partial<AttemptRecord> = {}): AttemptRecord => ({
  id, userId: "user-1", challengeId: "first-service", stars: 2,
  uptimePercent: 99.4, p99LatencyMs: 120, totalCost: 80, topologyIssueCount: 0, createdAt: 1000, ...over,
})

describe("HistoryTab (Epic 17 P5)", () => {
  let loadSpy: ReturnType<typeof vi.spyOn>
  beforeEach(() => {
    mockUid = "user-1"
    loadSpy = vi.spyOn(useAttemptsStore.getState(), "loadAttempts").mockResolvedValue(undefined)
    useAttemptsStore.setState({ attempts: [], loading: false, error: null })
  })
  afterEach(() => loadSpy.mockRestore())

  it("loads the signed-in user's attempts on mount", () => {
    render(<HistoryTab />)
    expect(loadSpy).toHaveBeenCalledWith("user-1")
  })

  it("shows loading / error / empty states", () => {
    useAttemptsStore.setState({ loading: true })
    const { rerender } = render(<HistoryTab />)
    expect(screen.getByTestId("history-loading")).toBeInTheDocument()

    useAttemptsStore.setState({ loading: false, error: "Could not load your attempt history." })
    rerender(<HistoryTab />)
    expect(screen.getByTestId("history-error")).toHaveTextContent("Could not load")

    useAttemptsStore.setState({ error: null, attempts: [] })
    rerender(<HistoryTab />)
    expect(screen.getByTestId("history-empty")).toBeInTheDocument()
  })

  it("lists attempts with resolved title, stars, pass/fail status, and metrics", () => {
    useAttemptsStore.setState({ attempts: [rec("a", { stars: 2 }), rec("b", { stars: 0, challengeId: "chaos-day" })] })
    render(<HistoryTab />)
    const a = screen.getByTestId("attempt-row-a")
    expect(a).toHaveTextContent("First Service") // resolved from challengeLoader
    expect(a).toHaveAttribute("data-passed", "true")
    expect(a).toHaveTextContent("99.4%")
    expect(a).toHaveTextContent("$80/mo")
    expect(within(a).getByLabelText("2 of 3 stars")).toBeInTheDocument()
    const b = screen.getByTestId("attempt-row-b")
    expect(b).toHaveTextContent("Chaos Day")
    expect(b).not.toHaveAttribute("data-passed") // 0 stars → not passed
  })

  it("sorts by stars (desc) when the Stars sort is chosen", () => {
    // date order would put 'newer' (1★, t=2000) first; sorting by stars surfaces the 3★ first.
    useAttemptsStore.setState({ attempts: [rec("low", { stars: 1, createdAt: 2000 }), rec("high", { stars: 3, createdAt: 1000 })] })
    render(<HistoryTab />)
    // default date sort → 'low' first
    let rows = screen.getAllByTestId(/^attempt-row-/)
    expect(rows[0]).toHaveAttribute("data-testid", "attempt-row-low")
    fireEvent.click(screen.getByTestId("history-sort-stars"))
    rows = screen.getAllByTestId(/^attempt-row-/)
    expect(rows[0]).toHaveAttribute("data-testid", "attempt-row-high") // 3★ surfaces to top
    expect(screen.getByTestId("history-sort-stars")).toHaveAttribute("aria-pressed", "true")
  })

  it("does not load when no user is signed in", () => {
    mockUid = null
    render(<HistoryTab />)
    expect(loadSpy).not.toHaveBeenCalled()
    expect(screen.getByTestId("history-empty")).toBeInTheDocument()
  })
})
