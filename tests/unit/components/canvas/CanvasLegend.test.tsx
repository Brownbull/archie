import { describe, it, expect, beforeEach } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"
import { CanvasLegend } from "@/components/canvas/CanvasLegend"
import { useUiStore } from "@/stores/uiStore"

describe("CanvasLegend", () => {
  beforeEach(() => {
    useUiStore.setState({
      heatmapEnabled: true,
      legendDismissed: false,
    })
  })

  it("renders when heatmap enabled and not dismissed", () => {
    render(<CanvasLegend />)
    expect(screen.getByTestId("canvas-legend")).toBeInTheDocument()
  })

  it("does NOT render when heatmap disabled", () => {
    useUiStore.setState({ heatmapEnabled: false })
    render(<CanvasLegend />)
    expect(screen.queryByTestId("canvas-legend")).not.toBeInTheDocument()
  })

  it("does NOT render when legendDismissed is true", () => {
    useUiStore.setState({ legendDismissed: true })
    render(<CanvasLegend />)
    expect(screen.queryByTestId("canvas-legend")).not.toBeInTheDocument()
  })

  it("does NOT render when heatmap disabled AND legendDismissed", () => {
    useUiStore.setState({ heatmapEnabled: false, legendDismissed: true })
    render(<CanvasLegend />)
    expect(screen.queryByTestId("canvas-legend")).not.toBeInTheDocument()
  })

  it("clicking dismiss button sets legendDismissed to true", () => {
    render(<CanvasLegend />)
    fireEvent.click(screen.getByTestId("canvas-legend-dismiss"))
    expect(useUiStore.getState().legendDismissed).toBe(true)
  })

  it("displays three heatmap color swatches", () => {
    render(<CanvasLegend />)
    expect(screen.getByText("Healthy")).toBeInTheDocument()
    expect(screen.getByText("Warning")).toBeInTheDocument()
    expect(screen.getByText("Bottleneck")).toBeInTheDocument()
  })

  it("displays particle speed explanation", () => {
    render(<CanvasLegend />)
    expect(screen.getByText(/fast.*healthy/i)).toBeInTheDocument()
  })

  it("outer container has pointer-events-none class", () => {
    render(<CanvasLegend />)
    const container = screen.getByTestId("canvas-legend-container")
    expect(container.getAttribute("class")).toContain("pointer-events-none")
  })

  it("inner panel has pointer-events-auto class", () => {
    render(<CanvasLegend />)
    const panel = screen.getByTestId("canvas-legend")
    expect(panel.getAttribute("class")).toContain("pointer-events-auto")
  })
})
