import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, it, expect } from "vitest"
import { MetricBar } from "@/components/inspector/MetricBar"
import type { MetricValue, MetricExplanation } from "@/types"

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

const sampleExplanation: MetricExplanation = {
  reason: "Single-node PostgreSQL has higher read latency due to no read distribution.",
  contributingFactors: [
    "Single server handles all read and write traffic",
    "No read replicas to distribute query load",
  ],
}

describe("MetricBar", () => {
  /** Render with default props (highMetric). Override via partial. */
  function renderDefault(overrides: Partial<Parameters<typeof MetricBar>[0]> = {}) {
    return render(
      <MetricBar
        metric={highMetric}
        {...overrides}
      />,
    )
  }

  it("renders the metric id as label", () => {
    renderDefault()
    expect(screen.getByText("query-performance")).toBeInTheDocument()
  })

  it("renders the directional rating text", () => {
    renderDefault()
    expect(screen.getByText("high")).toBeInTheDocument()
  })

  it("renders data-testid with metric id", () => {
    renderDefault()
    expect(screen.getByTestId("metric-bar")).toBeInTheDocument()
    expect(screen.getByTestId("metric-bar").getAttribute("data-metric-id")).toBe("query-performance")
  })

  it("renders green bar for numericValue 7-10", () => {
    const { container } = renderDefault()
    const bar = container.querySelector("[data-testid='metric-bar-fill']")
    expect(bar).toHaveClass("bg-green-500")
  })

  it("renders yellow bar for numericValue 4-6", () => {
    const { container } = renderDefault({ metric: mediumMetric })
    const bar = container.querySelector("[data-testid='metric-bar-fill']")
    expect(bar).toHaveClass("bg-yellow-500")
  })

  it("renders red bar for numericValue 1-3", () => {
    const { container } = renderDefault({ metric: lowMetric })
    const bar = container.querySelector("[data-testid='metric-bar-fill']")
    expect(bar).toHaveClass("bg-red-500")
  })

  it("sets bar width proportional to numericValue", () => {
    const { container } = renderDefault()
    const bar = container.querySelector("[data-testid='metric-bar-fill']") as HTMLElement
    expect(bar.style.width).toBe("90%")
  })

  it("sets bar width for low value", () => {
    const { container } = renderDefault({ metric: lowMetric })
    const bar = container.querySelector("[data-testid='metric-bar-fill']") as HTMLElement
    expect(bar.style.width).toBe("20%")
  })

  it("renders green for boundary value 7", () => {
    const metric: MetricValue = { id: "test", value: "high", numericValue: 7, category: "test" }
    const { container } = renderDefault({ metric })
    const bar = container.querySelector("[data-testid='metric-bar-fill']")
    expect(bar).toHaveClass("bg-green-500")
  })

  it("renders yellow for boundary value 4", () => {
    const metric: MetricValue = { id: "test", value: "medium", numericValue: 4, category: "test" }
    const { container } = renderDefault({ metric })
    const bar = container.querySelector("[data-testid='metric-bar-fill']")
    expect(bar).toHaveClass("bg-yellow-500")
  })

  it("renders red for boundary value 3", () => {
    const metric: MetricValue = { id: "test", value: "low", numericValue: 3, category: "test" }
    const { container } = renderDefault({ metric })
    const bar = container.querySelector("[data-testid='metric-bar-fill']")
    expect(bar).toHaveClass("bg-red-500")
  })

  it("renders yellow for boundary value 6", () => {
    const metric: MetricValue = { id: "test", value: "medium", numericValue: 6, category: "test" }
    const { container } = renderDefault({ metric })
    const bar = container.querySelector("[data-testid='metric-bar-fill']")
    expect(bar).toHaveClass("bg-yellow-500")
  })

  it("renders green for max value 10 with 100% width", () => {
    const metric: MetricValue = { id: "test", value: "high", numericValue: 10, category: "test" }
    const { container } = renderDefault({ metric })
    const bar = container.querySelector("[data-testid='metric-bar-fill']") as HTMLElement
    expect(bar).toHaveClass("bg-green-500")
    expect(bar.style.width).toBe("100%")
  })

  it("renders red for min value 1", () => {
    const metric: MetricValue = { id: "test", value: "low", numericValue: 1, category: "test" }
    const { container } = renderDefault({ metric })
    const bar = container.querySelector("[data-testid='metric-bar-fill']") as HTMLElement
    expect(bar).toHaveClass("bg-red-500")
    expect(bar.style.width).toBe("10%")
  })

  it("renders display name when name field is present", () => {
    const metric: MetricValue = {
      id: "query-performance",
      name: "Query Performance",
      value: "high",
      numericValue: 9,
      category: "performance",
    }
    renderDefault({ metric })
    expect(screen.getByText("Query Performance")).toBeInTheDocument()
    expect(screen.queryByText("query-performance")).not.toBeInTheDocument()
  })

  it("falls back to metric id when name is undefined", () => {
    const metric: MetricValue = {
      id: "query-performance",
      value: "high",
      numericValue: 9,
      category: "performance",
    }
    renderDefault({ metric })
    expect(screen.getByText("query-performance")).toBeInTheDocument()
  })

  // --- Expandable explanation tests ---

  it("shows no chevron when explanation prop is absent", () => {
    renderDefault()
    expect(screen.queryByTestId("metric-explanation-chevron")).not.toBeInTheDocument()
  })

  it("shows chevron when explanation prop is provided", () => {
    renderDefault({ explanation: sampleExplanation })
    expect(screen.getByTestId("metric-explanation-chevron")).toBeInTheDocument()
  })

  it("does not show explanation panel before clicking", () => {
    renderDefault({ explanation: sampleExplanation })
    expect(screen.queryByTestId("metric-explanation")).not.toBeInTheDocument()
  })

  it("shows explanation panel after clicking the metric row", async () => {
    const user = userEvent.setup()
    renderDefault({ explanation: sampleExplanation })
    await user.click(screen.getByTestId("metric-bar"))
    expect(screen.getByTestId("metric-explanation")).toBeInTheDocument()
  })

  it("shows reason text in expanded explanation", async () => {
    const user = userEvent.setup()
    renderDefault({ explanation: sampleExplanation })
    await user.click(screen.getByTestId("metric-bar"))
    expect(
      screen.getByText("Single-node PostgreSQL has higher read latency due to no read distribution."),
    ).toBeInTheDocument()
  })

  it("shows contributing factors in expanded explanation", async () => {
    const user = userEvent.setup()
    renderDefault({ explanation: sampleExplanation })
    await user.click(screen.getByTestId("metric-bar"))
    expect(screen.getByText("Single server handles all read and write traffic")).toBeInTheDocument()
    expect(screen.getByText("No read replicas to distribute query load")).toBeInTheDocument()
  })

  it("collapses explanation on second click", async () => {
    const user = userEvent.setup()
    renderDefault({ explanation: sampleExplanation })
    await user.click(screen.getByTestId("metric-bar"))
    expect(screen.getByTestId("metric-explanation")).toBeInTheDocument()
    await user.click(screen.getByTestId("metric-bar"))
    expect(screen.queryByTestId("metric-explanation")).not.toBeInTheDocument()
  })

  it("does not expand when explanation is absent and row is clicked", async () => {
    const user = userEvent.setup()
    renderDefault()
    await user.click(screen.getByTestId("metric-bar"))
    expect(screen.queryByTestId("metric-explanation")).not.toBeInTheDocument()
  })
})
