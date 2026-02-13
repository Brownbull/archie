import { describe, it, expect } from "vitest"
import { render, screen } from "@testing-library/react"
import { ConnectionWarning } from "@/components/canvas/ConnectionWarning"

describe("ConnectionWarning", () => {
  it("renders with data-testid", () => {
    render(<ConnectionWarning reason="Test reason" />)
    expect(screen.getByTestId("connection-warning")).toBeInTheDocument()
  })

  it("displays reason as title attribute", () => {
    render(<ConnectionWarning reason="Caching layer may cause stale reads" />)
    const el = screen.getByTestId("connection-warning")
    expect(el).toHaveAttribute("title", "Caching layer may cause stale reads")
  })

  it("shows default title when reason is null", () => {
    render(<ConnectionWarning reason={null} />)
    const el = screen.getByTestId("connection-warning")
    expect(el).toHaveAttribute("title", "Incompatible connection")
  })

  it("renders AlertTriangle icon", () => {
    render(<ConnectionWarning reason="Test" />)
    const svg = screen.getByTestId("connection-warning").querySelector("svg")
    expect(svg).toBeInTheDocument()
  })

  it("has aria-label matching reason", () => {
    render(<ConnectionWarning reason="Stale reads risk" />)
    const el = screen.getByTestId("connection-warning")
    expect(el).toHaveAttribute("aria-label", "Stale reads risk")
  })

  it("has role=status for accessibility", () => {
    render(<ConnectionWarning reason="Test" />)
    const el = screen.getByTestId("connection-warning")
    expect(el).toHaveAttribute("role", "status")
  })
})
