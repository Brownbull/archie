import { describe, it, expect } from "vitest"
import { render, screen } from "@testing-library/react"
import { AggregateScore } from "@/components/dashboard/AggregateScore"

describe("AggregateScore", () => {
  it("renders the score with one decimal, a letter grade, and stars", () => {
    render(<AggregateScore score={9} />)
    expect(screen.getByText("9.0")).toBeInTheDocument()
    expect(screen.getByTestId("aggregate-score-grade")).toHaveTextContent("A")
    expect(screen.getByText("Overall")).toBeInTheDocument()
  })

  it("formats zero as 0.0", () => {
    render(<AggregateScore score={0} />)
    expect(screen.getByText("0.0")).toBeInTheDocument()
  })

  it("has role=meter with correct ARIA attributes", () => {
    render(<AggregateScore score={7.5} />)
    const meter = screen.getByRole("meter")
    expect(meter).toHaveAttribute("aria-valuenow", "7.5")
    expect(meter).toHaveAttribute("aria-valuemin", "0")
    expect(meter).toHaveAttribute("aria-valuemax", "10")
  })

  it("has data-testid='aggregate-score'", () => {
    render(<AggregateScore score={6} />)
    expect(screen.getByTestId("aggregate-score")).toBeInTheDocument()
  })

  it("shows balanced score when it differs", () => {
    render(<AggregateScore score={5.2} balancedScore={7.5} />)
    expect(screen.getByTestId("aggregate-score-balanced")).toHaveTextContent("7.5")
  })

  it("hides balanced score when it matches", () => {
    render(<AggregateScore score={7.5} balancedScore={7.5} />)
    expect(screen.queryByTestId("aggregate-score-balanced")).not.toBeInTheDocument()
  })

  it("assigns letter grades correctly (A ≥8.5, B ≥7, C ≥5.5, D ≥4, F below)", () => {
    const { unmount: u1 } = render(<AggregateScore score={9} />)
    expect(screen.getByTestId("aggregate-score-grade")).toHaveTextContent("A")
    u1()

    const { unmount: u2 } = render(<AggregateScore score={7} />)
    expect(screen.getByTestId("aggregate-score-grade")).toHaveTextContent("B")
    u2()

    const { unmount: u3 } = render(<AggregateScore score={5.5} />)
    expect(screen.getByTestId("aggregate-score-grade")).toHaveTextContent("C")
    u3()

    const { unmount: u4 } = render(<AggregateScore score={4} />)
    expect(screen.getByTestId("aggregate-score-grade")).toHaveTextContent("D")
    u4()

    render(<AggregateScore score={2} />)
    expect(screen.getByTestId("aggregate-score-grade")).toHaveTextContent("F")
  })
})
