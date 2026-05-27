import { describe, it, expect, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import { StatusDot } from "@/components/canvas/StatusDot"

vi.mock("@/lib/firebase", () => ({
  auth: { currentUser: null },
  db: {},
}))

describe("StatusDot", () => {
  it("renders with healthy status", () => {
    render(<StatusDot status="healthy" />)
    const dot = screen.getByTestId("status-dot")
    expect(dot).toBeInTheDocument()
    expect(dot).toHaveAttribute("data-status", "healthy")
    expect(dot).toHaveAttribute("aria-label", "Connection health: healthy")
  })

  it("renders with warning status", () => {
    render(<StatusDot status="warning" />)
    const dot = screen.getByTestId("status-dot")
    expect(dot).toHaveAttribute("data-status", "warning")
  })

  it("renders with bottleneck status", () => {
    render(<StatusDot status="bottleneck" />)
    const dot = screen.getByTestId("status-dot")
    expect(dot).toHaveAttribute("data-status", "bottleneck")
  })

  it("applies pulse animation when animate=true and status=bottleneck", () => {
    render(<StatusDot status="bottleneck" animate />)
    const dot = screen.getByTestId("status-dot")
    expect(dot.className).toContain("animate-pulse")
  })

  it("does not apply pulse animation for healthy status even with animate=true", () => {
    render(<StatusDot status="healthy" animate />)
    const dot = screen.getByTestId("status-dot")
    expect(dot.className).not.toContain("animate-pulse")
  })

  it("does not apply pulse animation when animate=false", () => {
    render(<StatusDot status="bottleneck" animate={false} />)
    const dot = screen.getByTestId("status-dot")
    expect(dot.className).not.toContain("animate-pulse")
  })

  it("has role=status for accessibility", () => {
    render(<StatusDot status="healthy" />)
    expect(screen.getByRole("status")).toBeInTheDocument()
  })
})
