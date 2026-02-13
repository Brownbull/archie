import { render, screen } from "@testing-library/react"
import { describe, it, expect } from "vitest"
import { MetricBar } from "@/components/inspector/MetricBar"
import type { MetricValue } from "@/types"

const highMetric: MetricValue = {
  id: "query-performance",
  value: "high",
  numericValue: 9,
  category: "performance",
}

const mediumMetric: MetricValue = {
  id: "write-throughput",
  value: "medium",
  numericValue: 5,
  category: "performance",
}

const lowMetric: MetricValue = {
  id: "memory-usage",
  value: "low",
  numericValue: 2,
  category: "resource",
}

describe("MetricBar", () => {
  it("renders the metric id as label", () => {
    render(<MetricBar metric={highMetric} />)
    expect(screen.getByText("query-performance")).toBeInTheDocument()
  })

  it("renders the directional rating text", () => {
    render(<MetricBar metric={highMetric} />)
    expect(screen.getByText("high")).toBeInTheDocument()
  })

  it("renders data-testid with metric id", () => {
    render(<MetricBar metric={highMetric} />)
    expect(screen.getByTestId("metric-bar")).toBeInTheDocument()
    expect(screen.getByTestId("metric-bar").getAttribute("data-metric-id")).toBe("query-performance")
  })

  it("renders green bar for numericValue 7-10", () => {
    const { container } = render(<MetricBar metric={highMetric} />)
    const bar = container.querySelector("[data-testid='metric-bar-fill']")
    expect(bar).toHaveClass("bg-green-500")
  })

  it("renders yellow bar for numericValue 4-6", () => {
    const { container } = render(<MetricBar metric={mediumMetric} />)
    const bar = container.querySelector("[data-testid='metric-bar-fill']")
    expect(bar).toHaveClass("bg-yellow-500")
  })

  it("renders red bar for numericValue 1-3", () => {
    const { container } = render(<MetricBar metric={lowMetric} />)
    const bar = container.querySelector("[data-testid='metric-bar-fill']")
    expect(bar).toHaveClass("bg-red-500")
  })

  it("sets bar width proportional to numericValue", () => {
    const { container } = render(<MetricBar metric={highMetric} />)
    const bar = container.querySelector("[data-testid='metric-bar-fill']") as HTMLElement
    expect(bar.style.width).toBe("90%")
  })

  it("sets bar width for low value", () => {
    const { container } = render(<MetricBar metric={lowMetric} />)
    const bar = container.querySelector("[data-testid='metric-bar-fill']") as HTMLElement
    expect(bar.style.width).toBe("20%")
  })

  it("renders green for boundary value 7", () => {
    const metric: MetricValue = { id: "test", value: "high", numericValue: 7, category: "test" }
    const { container } = render(<MetricBar metric={metric} />)
    const bar = container.querySelector("[data-testid='metric-bar-fill']")
    expect(bar).toHaveClass("bg-green-500")
  })

  it("renders yellow for boundary value 4", () => {
    const metric: MetricValue = { id: "test", value: "medium", numericValue: 4, category: "test" }
    const { container } = render(<MetricBar metric={metric} />)
    const bar = container.querySelector("[data-testid='metric-bar-fill']")
    expect(bar).toHaveClass("bg-yellow-500")
  })

  it("renders red for boundary value 3", () => {
    const metric: MetricValue = { id: "test", value: "low", numericValue: 3, category: "test" }
    const { container } = render(<MetricBar metric={metric} />)
    const bar = container.querySelector("[data-testid='metric-bar-fill']")
    expect(bar).toHaveClass("bg-red-500")
  })

  it("renders yellow for boundary value 6", () => {
    const metric: MetricValue = { id: "test", value: "medium", numericValue: 6, category: "test" }
    const { container } = render(<MetricBar metric={metric} />)
    const bar = container.querySelector("[data-testid='metric-bar-fill']")
    expect(bar).toHaveClass("bg-yellow-500")
  })

  it("renders green for max value 10 with 100% width", () => {
    const metric: MetricValue = { id: "test", value: "high", numericValue: 10, category: "test" }
    const { container } = render(<MetricBar metric={metric} />)
    const bar = container.querySelector("[data-testid='metric-bar-fill']") as HTMLElement
    expect(bar).toHaveClass("bg-green-500")
    expect(bar.style.width).toBe("100%")
  })

  it("renders red for min value 1", () => {
    const metric: MetricValue = { id: "test", value: "low", numericValue: 1, category: "test" }
    const { container } = render(<MetricBar metric={metric} />)
    const bar = container.querySelector("[data-testid='metric-bar-fill']") as HTMLElement
    expect(bar).toHaveClass("bg-red-500")
    expect(bar.style.width).toBe("10%")
  })
})
