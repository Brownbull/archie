import { describe, it, expect } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { CategoryBar } from "@/components/dashboard/CategoryBar"

const defaultProps = {
  categoryId: "performance" as const,
  shortName: "Perf",
  iconName: "Gauge",
  categoryColor: "var(--color-metric-performance)",
  score: 7,
}

describe("CategoryBar (star-based)", () => {
  it("renders short name and data-testid", () => {
    render(<CategoryBar {...defaultProps} />)
    expect(screen.getByText("Perf")).toBeInTheDocument()
    expect(screen.getByTestId("category-bar-performance")).toBeInTheDocument()
  })

  it("bar width matches score percentage: score=7 -> 70%", () => {
    render(<CategoryBar {...defaultProps} score={7} />)
    const fill = screen.getByTestId("category-bar-fill-performance")
    expect(fill).toHaveStyle({ width: "70%" })
  })

  it("bar width is 100% when score=10", () => {
    render(<CategoryBar {...defaultProps} score={10} />)
    const fill = screen.getByTestId("category-bar-fill-performance")
    expect(fill).toHaveStyle({ width: "100%" })
  })

  it("bar width is 0% when score=0", () => {
    render(<CategoryBar {...defaultProps} score={0} />)
    const fill = screen.getByTestId("category-bar-fill-performance")
    expect(fill).toHaveStyle({ width: "0%" })
  })

  it("shows a popover with metric info on click", async () => {
    const user = userEvent.setup()
    render(<CategoryBar {...defaultProps} score={8} />)
    await user.click(screen.getByTestId("category-bar-performance"))
    expect(await screen.findByTestId("metric-popover-performance")).toBeInTheDocument()
    expect(screen.getByText("Performance")).toBeInTheDocument()
    expect(screen.getByText("What affects this:")).toBeInTheDocument()
  })

  it("renders weight badge when weight differs from 1.0", () => {
    render(<CategoryBar {...defaultProps} weight={0.5} />)
    expect(screen.getByTestId("weight-badge-performance")).toHaveTextContent("0.5x")
  })

  it("hides weight badge when weight is 1.0", () => {
    render(<CategoryBar {...defaultProps} weight={1.0} />)
    expect(screen.queryByTestId("weight-badge-performance")).not.toBeInTheDocument()
  })
})
