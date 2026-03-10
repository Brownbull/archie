import { describe, it, expect } from "vitest"
import { render, screen } from "@testing-library/react"
import { ConstraintViolationBadge } from "@/components/canvas/ConstraintViolationBadge"

describe("ConstraintViolationBadge", () => {
  it("renders with data-testid when violationCount > 0", () => {
    render(<ConstraintViolationBadge violationCount={3} />)
    expect(screen.getByTestId("constraint-violation-badge")).toBeInTheDocument()
  })

  it("displays the violation count number", () => {
    render(<ConstraintViolationBadge violationCount={5} />)
    expect(screen.getByText("5")).toBeInTheDocument()
  })

  it("does not render when violationCount is 0", () => {
    const { container } = render(<ConstraintViolationBadge violationCount={0} />)
    expect(container.innerHTML).toBe("")
  })

  it("does not render when violationCount is negative", () => {
    const { container } = render(<ConstraintViolationBadge violationCount={-1} />)
    expect(container.innerHTML).toBe("")
  })

  it("renders AlertTriangle icon (SVG element)", () => {
    render(<ConstraintViolationBadge violationCount={2} />)
    const badge = screen.getByTestId("constraint-violation-badge")
    const svg = badge.querySelector("svg")
    expect(svg).toBeInTheDocument()
  })

  it("displays tooltip text via title attribute", () => {
    render(
      <ConstraintViolationBadge
        violationCount={2}
        tooltipText="Performance at most 5, Security at least 7"
      />,
    )
    const badge = screen.getByTestId("constraint-violation-badge")
    expect(badge).toHaveAttribute(
      "title",
      "Performance at most 5, Security at least 7",
    )
  })

  it("uses role=status for accessibility", () => {
    render(<ConstraintViolationBadge violationCount={1} />)
    expect(screen.getByRole("status")).toBeInTheDocument()
  })

  it("has aria-label with violation count", () => {
    render(<ConstraintViolationBadge violationCount={3} />)
    const badge = screen.getByRole("status")
    expect(badge).toHaveAttribute("aria-label", "3 constraint violations")
  })

  it("uses singular form for 1 violation", () => {
    render(<ConstraintViolationBadge violationCount={1} />)
    const badge = screen.getByRole("status")
    expect(badge).toHaveAttribute("aria-label", "1 constraint violation")
  })

  it("uses absolute positioning for top-right corner placement", () => {
    render(<ConstraintViolationBadge violationCount={1} />)
    const badge = screen.getByTestId("constraint-violation-badge")
    expect(badge.className).toContain("absolute")
  })
})
