import { describe, it, expect } from "vitest"
import { render, screen } from "@testing-library/react"
import { SuggestionCard } from "@/components/challenges/SuggestionCard"
import type { SuggestionResult } from "@/engine/suggestionEngine"
import type { SimulationStats } from "@/lib/simulationStats"

const stats: SimulationStats = { uptimePercent: 95, avgLatencyMs: 20, p99LatencyMs: 120, currentRps: 0, servedRps: 0, failedRps: 0, totalServed: 0, totalFailed: 0 }

describe("SuggestionCard (Epic 17 P2)", () => {
  it("renders the best change with directional, tone-coded deltas", () => {
    const result: SuggestionResult = {
      kind: "suggestion",
      best: { changeType: "add-replica", nodeId: "n1", description: "Add a replica to App Server (1× → 2×)", uptimeDelta: 4.2, latencyDelta: -30, costDelta: 40 },
      baseline: stats, baselineCost: 80, considered: 3,
    }
    render(<SuggestionCard result={result} />)
    expect(screen.getByTestId("suggestion-card")).toHaveAttribute("data-kind", "suggestion")
    expect(screen.getByTestId("suggestion-description")).toHaveTextContent("Add a replica to App Server (1× → 2×)")
    // uptime up = good; latency down = good; cost up = bad
    expect(screen.getByTestId("suggestion-delta-uptime")).toHaveAttribute("data-tone", "good")
    expect(screen.getByTestId("suggestion-delta-uptime")).toHaveTextContent("+4.2 pp")
    expect(screen.getByTestId("suggestion-delta-latency")).toHaveAttribute("data-tone", "good")
    expect(screen.getByTestId("suggestion-delta-latency")).toHaveTextContent("−30 ms")
    expect(screen.getByTestId("suggestion-delta-cost")).toHaveAttribute("data-tone", "bad")
    expect(screen.getByTestId("suggestion-delta-cost")).toHaveTextContent("+40 $/mo")
  })

  it("marks a saving (cost down) as good and a zero delta as neutral", () => {
    const result: SuggestionResult = {
      kind: "suggestion",
      best: { changeType: "remove-replica", nodeId: "n1", description: "Remove a replica from App Server (3× → 2×)", uptimeDelta: 0, latencyDelta: 0, costDelta: -40 },
      baseline: stats, baselineCost: 120, considered: 2,
    }
    render(<SuggestionCard result={result} />)
    expect(screen.getByTestId("suggestion-delta-cost")).toHaveAttribute("data-tone", "good")
    expect(screen.getByTestId("suggestion-delta-cost")).toHaveTextContent("−40 $/mo")
    expect(screen.getByTestId("suggestion-delta-uptime")).toHaveAttribute("data-tone", "neutral")
  })

  it("renders the well-optimized state with no suggestion", () => {
    const result: SuggestionResult = { kind: "well-optimized", best: null, baseline: stats, baselineCost: 80, considered: 4 }
    render(<SuggestionCard result={result} />)
    expect(screen.getByTestId("suggestion-card")).toHaveAttribute("data-kind", "well-optimized")
    expect(screen.getByTestId("suggestion-card")).toHaveTextContent("Well optimized")
    expect(screen.queryByTestId("suggestion-description")).not.toBeInTheDocument()
  })
})
