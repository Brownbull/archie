import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen } from "@testing-library/react"
import { METRIC_BAR_TRANSITION_MS } from "@/lib/constants"

let mockAnimationsEnabled = true
vi.mock("@/stores/preferencesStore", () => ({
  usePreferencesStore: vi.fn((selector: (s: Record<string, unknown>) => unknown) =>
    selector({ animationsEnabled: mockAnimationsEnabled }),
  ),
}))

import { InlineMetricBar } from "@/components/canvas/InlineMetricBar"

describe("InlineMetricBar", () => {
  beforeEach(() => {
    mockAnimationsEnabled = true
  })

  it("renders abbreviation and star icons", () => {
    render(<InlineMetricBar abbreviation="Perf" value={7.5} color="var(--color-metric-performance)" />)
    expect(screen.getByText("Perf")).toBeInTheDocument()
    expect(screen.getByTestId("inline-metric-bar")).toBeInTheDocument()
  })

  it("renders bar with proportional width", () => {
    const { container } = render(
      <InlineMetricBar abbreviation="Rel" value={6.0} color="var(--color-metric-reliability)" />,
    )
    const bar = container.querySelector("[data-testid='inline-metric-bar-fill']")
    expect(bar).toHaveStyle({ width: "60%" })
  })

  it("handles max value of 10 (100% bar, 5 stars)", () => {
    const { container } = render(
      <InlineMetricBar abbreviation="Sec" value={10} color="var(--color-metric-security)" />,
    )
    const bar = container.querySelector("[data-testid='inline-metric-bar-fill']")
    expect(bar).toHaveStyle({ width: "100%" })
  })

  it("handles zero value (0% bar)", () => {
    const { container } = render(
      <InlineMetricBar abbreviation="DX" value={0} color="var(--color-metric-dx)" />,
    )
    const bar = container.querySelector("[data-testid='inline-metric-bar-fill']")
    expect(bar).toHaveStyle({ width: "0%" })
  })

  it("uses star-derived color (not the passed color prop)", () => {
    const { container } = render(
      <InlineMetricBar abbreviation="Ops" value={8} color="var(--color-metric-ops)" />,
    )
    const bar = container.querySelector("[data-testid='inline-metric-bar-fill']")
    expect(bar).toHaveStyle({ backgroundColor: "#b06bff" })
  })

  it("has correct data-testid on root element", () => {
    render(<InlineMetricBar abbreviation="Perf" value={8} color="var(--color-metric-performance)" />)
    expect(screen.getByTestId("inline-metric-bar")).toBeInTheDocument()
  })

  describe("animation transitions", () => {
    it("has CSS transition on fill bar when animations enabled", () => {
      mockAnimationsEnabled = true
      const { container } = render(
        <InlineMetricBar abbreviation="Perf" value={7} color="var(--color-metric-performance)" />,
      )
      const bar = container.querySelector("[data-testid='inline-metric-bar-fill']")
      expect(bar).toHaveStyle({ transition: `width ${METRIC_BAR_TRANSITION_MS}ms ease-out` })
    })

    it("has no CSS transition when animations disabled", () => {
      mockAnimationsEnabled = false
      const { container } = render(
        <InlineMetricBar abbreviation="Perf" value={7} color="var(--color-metric-performance)" />,
      )
      const bar = container.querySelector("[data-testid='inline-metric-bar-fill']")
      expect(bar).toHaveStyle({ transition: "none" })
    })
  })
})
