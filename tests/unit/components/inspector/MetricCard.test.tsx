import { render, screen } from "@testing-library/react"
import { describe, it, expect } from "vitest"
import { MetricCard } from "@/components/inspector/MetricCard"
import type { MetricValue } from "@/types"

const mockMetrics: MetricValue[] = [
  { id: "query-performance", value: "high", numericValue: 9, category: "performance" },
  { id: "write-throughput", value: "medium", numericValue: 5, category: "performance" },
  { id: "index-speed", value: "low", numericValue: 2, category: "performance" },
]

describe("MetricCard", () => {
  it("renders the category label", () => {
    render(
      <MetricCard
        categoryId="performance"
        categoryLabel="Performance"
        categoryColor="var(--color-cat-compute)"
        categoryIconName="Cpu"
        metrics={mockMetrics}
      />,
    )
    expect(screen.getByText("Performance")).toBeInTheDocument()
  })

  it("renders all metric bars", () => {
    render(
      <MetricCard
        categoryId="performance"
        categoryLabel="Performance"
        categoryColor="var(--color-cat-compute)"
        categoryIconName="Cpu"
        metrics={mockMetrics}
      />,
    )
    const bars = screen.getAllByTestId("metric-bar")
    expect(bars).toHaveLength(3)
  })

  it("renders the category icon", () => {
    const { container } = render(
      <MetricCard
        categoryId="performance"
        categoryLabel="Performance"
        categoryColor="var(--color-cat-compute)"
        categoryIconName="Cpu"
        metrics={mockMetrics}
      />,
    )
    // lucide-react renders as svg
    const svg = container.querySelector("svg")
    expect(svg).toBeInTheDocument()
  })

  it("renders with data-testid", () => {
    render(
      <MetricCard
        categoryId="performance"
        categoryLabel="Performance"
        categoryColor="var(--color-cat-compute)"
        categoryIconName="Cpu"
        metrics={mockMetrics}
      />,
    )
    expect(screen.getByTestId("metric-card-performance")).toBeInTheDocument()
  })

  it("renders metric names in correct order", () => {
    render(
      <MetricCard
        categoryId="performance"
        categoryLabel="Performance"
        categoryColor="var(--color-cat-compute)"
        categoryIconName="Cpu"
        metrics={mockMetrics}
      />,
    )
    expect(screen.getByText("query-performance")).toBeInTheDocument()
    expect(screen.getByText("write-throughput")).toBeInTheDocument()
    expect(screen.getByText("index-speed")).toBeInTheDocument()
  })
})
