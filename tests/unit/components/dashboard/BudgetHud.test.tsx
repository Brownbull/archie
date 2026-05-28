import { describe, it, expect, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import { BudgetHud } from "@/components/dashboard/BudgetHud"

vi.mock("@/lib/firebase", () => ({
  auth: { currentUser: null },
  db: {},
}))

describe("BudgetHud", () => {
  it("renders total cost for nodes with economics", () => {
    render(<BudgetHud totalCost={285} nodeCount={3} />)
    expect(screen.getByTestId("budget-hud")).toBeInTheDocument()
    expect(screen.getByTestId("budget-hud-cost")).toHaveTextContent("$285/mo")
  })

  it("renders 'Free' when total cost is zero", () => {
    render(<BudgetHud totalCost={0} nodeCount={1} />)
    expect(screen.getByTestId("budget-hud-cost")).toHaveTextContent("Free")
  })

  it("does not render when no nodes on canvas", () => {
    const { container } = render(<BudgetHud totalCost={0} nodeCount={0} />)
    expect(container.firstChild).toBeNull()
  })

  it("applies green color for low cost", () => {
    render(<BudgetHud totalCost={100} nodeCount={2} />)
    const cost = screen.getByTestId("budget-hud-cost")
    expect(cost.className).toContain("emerald")
  })

  it("applies yellow color for medium cost", () => {
    render(<BudgetHud totalCost={350} nodeCount={4} />)
    const cost = screen.getByTestId("budget-hud-cost")
    expect(cost.className).toContain("yellow")
  })

  it("applies orange color for high cost", () => {
    render(<BudgetHud totalCost={600} nodeCount={5} />)
    const cost = screen.getByTestId("budget-hud-cost")
    expect(cost.className).toContain("orange")
  })

  it("has accessible aria-label with cost", () => {
    render(<BudgetHud totalCost={45} nodeCount={1} />)
    const hud = screen.getByTestId("budget-hud")
    expect(hud).toHaveAttribute("aria-label", "Total architecture cost: $45/mo")
  })

  it("shows disclaimer in title attribute", () => {
    render(<BudgetHud totalCost={45} nodeCount={1} />)
    const hud = screen.getByTestId("budget-hud")
    expect(hud.title).toContain("Approximate")
  })
})
