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

  it("minimize toggle hides the legend body but keeps the title and is independent of dismiss", () => {
    render(<CanvasLegend />)
    // Expanded by default: body content visible.
    expect(screen.getByText("Healthy")).toBeInTheDocument()

    fireEvent.click(screen.getByTestId("legend-collapse-toggle"))

    // Minimized: body hidden, title + panel still mounted, dismiss still available.
    expect(screen.queryByText("Healthy")).not.toBeInTheDocument()
    expect(screen.getByText("Heatmap Legend")).toBeInTheDocument()
    expect(screen.getByTestId("canvas-legend-dismiss")).toBeInTheDocument()
    expect(useUiStore.getState().legendDismissed).toBe(false)

    // Toggle again to expand.
    fireEvent.click(screen.getByTestId("legend-collapse-toggle"))
    expect(screen.getByText("Healthy")).toBeInTheDocument()
  })

  it("toggleHeatmap resets legendDismissed when re-enabling heatmap (AC-FUNC-6)", () => {
    // Dismiss the legend
    useUiStore.setState({ legendDismissed: true })
    expect(useUiStore.getState().legendDismissed).toBe(true)

    // Turn heatmap off then back on — legendDismissed should reset to false
    useUiStore.getState().toggleHeatmap() // off
    expect(useUiStore.getState().heatmapEnabled).toBe(false)

    useUiStore.getState().toggleHeatmap() // on again
    expect(useUiStore.getState().heatmapEnabled).toBe(true)
    expect(useUiStore.getState().legendDismissed).toBe(false)
  })
})
