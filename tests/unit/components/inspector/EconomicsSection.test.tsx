import { describe, it, expect, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import { EconomicsSection } from "@/components/inspector/EconomicsSection"
import type { NodeCostInfo } from "@/stores/architectureStoreHelpers"

vi.mock("@/lib/firebase", () => ({
  auth: { currentUser: null },
  db: {},
}))

const fullEcon: NodeCostInfo = { monthlyCost: 45, maxRPS: 500, baseLatencyMs: 5 }
const upgradedEcon: NodeCostInfo = { monthlyCost: 120, maxRPS: 2000, baseLatencyMs: 3 }
const freeEcon: NodeCostInfo = { monthlyCost: 0, maxRPS: 100000, baseLatencyMs: 20 }
const emptyEcon: NodeCostInfo = { monthlyCost: undefined, maxRPS: undefined, baseLatencyMs: undefined }

describe("EconomicsSection", () => {
  it("renders all three economics fields", () => {
    render(<EconomicsSection current={fullEcon} />)
    const section = screen.getByTestId("economics-section")
    expect(section).toBeInTheDocument()
    expect(section).toHaveTextContent("$45/mo")
    expect(section).toHaveTextContent("500 RPS")
    expect(section).toHaveTextContent("5ms")
  })

  it("renders 'Free' for zero monthlyCost", () => {
    render(<EconomicsSection current={freeEcon} />)
    expect(screen.getByTestId("economics-section")).toHaveTextContent("Free")
  })

  it("formats large RPS with K suffix", () => {
    render(<EconomicsSection current={{ ...fullEcon, maxRPS: 50000 }} />)
    expect(screen.getByTestId("economics-section")).toHaveTextContent("50K RPS")
  })

  it("does not render when all economics fields are undefined", () => {
    const { container } = render(<EconomicsSection current={emptyEcon} />)
    expect(container.firstChild).toBeNull()
  })

  it("renders partial economics (only monthlyCost)", () => {
    render(<EconomicsSection current={{ monthlyCost: 45, maxRPS: undefined, baseLatencyMs: undefined }} />)
    expect(screen.getByTestId("economics-section")).toHaveTextContent("$45/mo")
    expect(screen.getByTestId("economics-section")).not.toHaveTextContent("RPS")
  })

  it("shows cost delta on variant switch (cost increase = red)", () => {
    render(<EconomicsSection current={upgradedEcon} previous={fullEcon} />)
    const delta = screen.getByTestId("econ-delta-cost")
    expect(delta).toHaveTextContent("+75")
    expect(delta.className).toContain("red")
  })

  it("shows RPS delta on variant switch (increase = green)", () => {
    render(<EconomicsSection current={upgradedEcon} previous={fullEcon} />)
    const delta = screen.getByTestId("econ-delta-throughput")
    expect(delta).toHaveTextContent("+1500")
    expect(delta.className).toContain("emerald")
  })

  it("shows latency delta on variant switch (decrease = green)", () => {
    render(<EconomicsSection current={upgradedEcon} previous={fullEcon} />)
    const delta = screen.getByTestId("econ-delta-latency")
    expect(delta).toHaveTextContent("-2ms")
    expect(delta.className).toContain("emerald")
  })

  it("shows no deltas on first render (no previous)", () => {
    render(<EconomicsSection current={fullEcon} />)
    expect(screen.queryByTestId("econ-delta-cost")).not.toBeInTheDocument()
    expect(screen.queryByTestId("econ-delta-throughput")).not.toBeInTheDocument()
    expect(screen.queryByTestId("econ-delta-latency")).not.toBeInTheDocument()
  })

  it("shows no deltas when previous equals current", () => {
    render(<EconomicsSection current={fullEcon} previous={fullEcon} />)
    expect(screen.queryByTestId("econ-delta-cost")).not.toBeInTheDocument()
  })

  it("shows disclaimer in title attribute", () => {
    render(<EconomicsSection current={fullEcon} />)
    expect(screen.getByTestId("economics-section").title).toContain("Approximate")
  })

  it("handles sub-millisecond latency display", () => {
    render(<EconomicsSection current={{ ...fullEcon, baseLatencyMs: 0.5 }} />)
    expect(screen.getByTestId("economics-section")).toHaveTextContent("0.5ms")
  })
})
