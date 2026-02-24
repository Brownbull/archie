import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, it, expect } from "vitest"
import { MetricCard } from "@/components/inspector/MetricCard"
import type { MetricValue, MetricExplanation } from "@/types"

const mockMetrics: MetricValue[] = [
  { id: "query-performance", value: "high", numericValue: 9, category: "performance" },
  { id: "write-throughput", value: "medium", numericValue: 5, category: "performance" },
  { id: "index-speed", value: "low", numericValue: 2, category: "performance" },
]

const mockExplanations: Record<string, MetricExplanation> = {
  "query-performance": {
    reason: "High query performance due to indexing.",
    contributingFactors: ["B-tree indexes", "Query planner optimization"],
  },
}

describe("MetricCard", () => {
  /** Render with default performance card props. Override via partial. */
  function renderDefault(overrides: Partial<Parameters<typeof MetricCard>[0]> = {}) {
    return render(
      <MetricCard
        categoryId="performance"
        categoryLabel="Performance"
        categoryColor="var(--color-cat-compute)"
        categoryIconName="Cpu"
        metrics={mockMetrics}
        {...overrides}
      />,
    )
  }

  it("renders the category label", () => {
    renderDefault()
    expect(screen.getByText("Performance")).toBeInTheDocument()
  })

  it("renders all metric bars", () => {
    renderDefault()
    const bars = screen.getAllByTestId("metric-bar")
    expect(bars).toHaveLength(3)
  })

  it("renders the category icon", () => {
    const { container } = renderDefault()
    // lucide-react renders as svg
    const svg = container.querySelector("svg")
    expect(svg).toBeInTheDocument()
  })

  it("renders with data-testid", () => {
    renderDefault()
    expect(screen.getByTestId("metric-card-performance")).toBeInTheDocument()
  })

  it("renders metric IDs as labels when name field is absent", () => {
    renderDefault()
    expect(screen.getByText("query-performance")).toBeInTheDocument()
    expect(screen.getByText("write-throughput")).toBeInTheDocument()
    expect(screen.getByText("index-speed")).toBeInTheDocument()
  })

  it("renders without metricExplanations prop (no chevrons shown)", () => {
    renderDefault()
    expect(screen.queryByTestId("metric-explanation-chevron")).not.toBeInTheDocument()
  })

  it("passes explanation to the matching MetricBar when metricExplanations is provided", async () => {
    const user = userEvent.setup()
    renderDefault({ metricExplanations: mockExplanations })
    // query-performance has an explanation — its bar should be expandable
    const bars = screen.getAllByTestId("metric-bar")
    const qpBar = bars.find((b) => b.getAttribute("data-metric-id") === "query-performance")!
    await user.click(qpBar)
    expect(screen.getByTestId("metric-explanation")).toBeInTheDocument()
    expect(screen.getByText("High query performance due to indexing.")).toBeInTheDocument()
  })

  it("does not show explanation for metrics without a matching key", async () => {
    const user = userEvent.setup()
    renderDefault({ metricExplanations: mockExplanations })
    // write-throughput has no explanation entry
    const bars = screen.getAllByTestId("metric-bar")
    const wtBar = bars.find((b) => b.getAttribute("data-metric-id") === "write-throughput")!
    await user.click(wtBar)
    expect(screen.queryByTestId("metric-explanation")).not.toBeInTheDocument()
  })

  // --- Delta map threading tests (Story 4-2a) ---

  it("passes delta from deltaMap to matching MetricBar", () => {
    const deltaMap = new Map([
      ["query-performance", 2],
      ["write-throughput", -1],
    ])
    renderDefault({ deltaMap })
    const deltas = screen.getAllByTestId("metric-bar-delta")
    expect(deltas).toHaveLength(2)
    expect(deltas[0]).toHaveTextContent("+2")
    expect(deltas[1]).toHaveTextContent("-1")
  })

  it("does not show delta indicator when deltaMap is absent", () => {
    renderDefault()
    expect(screen.queryByTestId("metric-bar-delta")).not.toBeInTheDocument()
  })

  it("does not show delta indicator for metrics with delta=0", () => {
    const deltaMap = new Map([["query-performance", 0]])
    renderDefault({ deltaMap })
    expect(screen.queryByTestId("metric-bar-delta")).not.toBeInTheDocument()
  })

  // --- hiddenMetricIds filtering tests (Story 4-2b) ---

  it("renders all metrics when hiddenMetricIds is not provided", () => {
    renderDefault()
    expect(screen.getAllByTestId("metric-bar")).toHaveLength(3)
  })

  it("renders all metrics when hiddenMetricIds is empty", () => {
    renderDefault({ hiddenMetricIds: new Set() })
    expect(screen.getAllByTestId("metric-bar")).toHaveLength(3)
  })

  it("hides metrics whose IDs are in hiddenMetricIds", () => {
    renderDefault({ hiddenMetricIds: new Set(["write-throughput"]) })
    expect(screen.getAllByTestId("metric-bar")).toHaveLength(2)
    expect(screen.queryByText("write-throughput")).not.toBeInTheDocument()
  })

  it("returns null when all metrics are hidden", () => {
    const { container } = renderDefault({
      hiddenMetricIds: new Set(["query-performance", "write-throughput", "index-speed"]),
    })
    expect(container.innerHTML).toBe("")
  })
})
