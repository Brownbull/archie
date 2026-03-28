import { describe, it, expect } from "vitest"
import { render, screen } from "@testing-library/react"
import { InlineMetricBar } from "@/components/canvas/InlineMetricBar"

describe("InlineMetricBar", () => {
  it("renders abbreviation and numeric value", () => {
    render(<InlineMetricBar abbreviation="Perf" value={7.5} color="var(--color-metric-performance)" />)

    expect(screen.getByText("Perf")).toBeInTheDocument()
    expect(screen.getByText("7.5")).toBeInTheDocument()
  })

  it("renders bar with proportional width", () => {
    const { container } = render(
      <InlineMetricBar abbreviation="Rel" value={6.0} color="var(--color-metric-reliability)" />,
    )

    const bar = container.querySelector("[data-testid='inline-metric-bar-fill']")
    expect(bar).toBeInTheDocument()
    // 6.0 / 10 = 60%
    expect(bar).toHaveStyle({ width: "60%" })
  })

  it("handles max value of 10", () => {
    const { container } = render(
      <InlineMetricBar abbreviation="Sec" value={10} color="var(--color-metric-security)" />,
    )

    const bar = container.querySelector("[data-testid='inline-metric-bar-fill']")
    expect(bar).toHaveStyle({ width: "100%" })
  })

  it("handles min value of 1", () => {
    const { container } = render(
      <InlineMetricBar abbreviation="Cost" value={1} color="var(--color-metric-cost)" />,
    )

    const bar = container.querySelector("[data-testid='inline-metric-bar-fill']")
    expect(bar).toHaveStyle({ width: "10%" })
  })

  it("handles zero value", () => {
    const { container } = render(
      <InlineMetricBar abbreviation="DX" value={0} color="var(--color-metric-dx)" />,
    )

    const bar = container.querySelector("[data-testid='inline-metric-bar-fill']")
    expect(bar).toHaveStyle({ width: "0%" })
  })

  it("applies color to bar fill", () => {
    const { container } = render(
      <InlineMetricBar abbreviation="Ops" value={5} color="var(--color-metric-ops)" />,
    )

    const bar = container.querySelector("[data-testid='inline-metric-bar-fill']")
    expect(bar).toHaveStyle({ backgroundColor: "var(--color-metric-ops)" })
  })

  it("has correct data-testid on root element", () => {
    render(<InlineMetricBar abbreviation="Perf" value={8} color="var(--color-metric-performance)" />)

    expect(screen.getByTestId("inline-metric-bar")).toBeInTheDocument()
  })

  it("respects custom maxValue", () => {
    const { container } = render(
      <InlineMetricBar abbreviation="Perf" value={5} maxValue={20} color="var(--color-metric-performance)" />,
    )

    const bar = container.querySelector("[data-testid='inline-metric-bar-fill']")
    // 5 / 20 = 25%
    expect(bar).toHaveStyle({ width: "25%" })
  })
})
