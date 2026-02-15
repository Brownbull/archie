import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen } from "@testing-library/react"
import { ArchieNode } from "@/components/canvas/ArchieNode"
import { HEATMAP_COLORS, NODE_WIDTH } from "@/lib/constants"
import type { HeatmapStatus } from "@/engine/heatmapCalculator"

vi.mock("@xyflow/react", () => ({
  Handle: ({ type, position, ...props }: Record<string, unknown>) => (
    <div data-testid={`handle-${type}`} data-position={position} {...props} />
  ),
  Position: { Left: "left", Right: "right" },
}))

vi.mock("@/lib/firebase", () => ({
  auth: { currentUser: null },
  db: {},
}))

// Mock Zustand stores for heatmap integration
const mockHeatmapColors = new Map<string, HeatmapStatus>()
let mockHeatmapEnabled = false

vi.mock("@/stores/architectureStore", () => ({
  useArchitectureStore: vi.fn((selector: (s: Record<string, unknown>) => unknown) =>
    selector({ heatmapColors: mockHeatmapColors }),
  ),
}))

vi.mock("@/stores/uiStore", () => ({
  useUiStore: vi.fn((selector: (s: Record<string, unknown>) => unknown) =>
    selector({ heatmapEnabled: mockHeatmapEnabled }),
  ),
}))

const defaultProps = {
  id: "node-1",
  data: {
    archieComponentId: "postgresql",
    activeConfigVariantId: "default",
    componentName: "PostgreSQL",
    componentCategory: "data-storage" as const,
  },
  type: "archie-component" as const,
} as Parameters<typeof ArchieNode>[0]

describe("ArchieNode", () => {
  beforeEach(() => {
    mockHeatmapColors.clear()
    mockHeatmapEnabled = false
  })

  it("renders component name", () => {
    render(<ArchieNode {...defaultProps} />)
    expect(screen.getByText("PostgreSQL")).toBeInTheDocument()
  })

  it("has data-testid archie-node", () => {
    render(<ArchieNode {...defaultProps} />)
    expect(screen.getByTestId("archie-node")).toBeInTheDocument()
  })

  it("renders category color stripe", () => {
    render(<ArchieNode {...defaultProps} />)
    const stripe = screen.getByTestId("archie-node-stripe")
    expect(stripe).toHaveStyle({ backgroundColor: "var(--color-cat-data-storage)" })
  })

  it("renders category icon", () => {
    render(<ArchieNode {...defaultProps} />)
    const node = screen.getByTestId("archie-node")
    const svg = node.querySelector("svg")
    expect(svg).toBeInTheDocument()
  })

  it("has correct width", () => {
    render(<ArchieNode {...defaultProps} />)
    const node = screen.getByTestId("archie-node")
    expect(node).toHaveStyle({ width: `${NODE_WIDTH}px` })
  })

  it("renders target handle", () => {
    render(<ArchieNode {...defaultProps} />)
    expect(screen.getByTestId("archie-node-handle-target")).toBeInTheDocument()
  })

  it("renders source handle", () => {
    render(<ArchieNode {...defaultProps} />)
    expect(screen.getByTestId("archie-node-handle-source")).toBeInTheDocument()
  })

  it("truncates long component names with CSS class", () => {
    render(<ArchieNode {...defaultProps} />)
    const nameEl = screen.getByText("PostgreSQL")
    expect(nameEl.className).toContain("truncate")
  })

  it("does NOT render description or metrics", () => {
    render(<ArchieNode {...defaultProps} />)
    const node = screen.getByTestId("archie-node")
    expect(node.textContent).toBe("PostgreSQL")
  })

  describe("heatmap glow", () => {
    it("renders box-shadow glow when heatmap enabled and status is healthy", () => {
      mockHeatmapEnabled = true
      mockHeatmapColors.set("node-1", "healthy")
      render(<ArchieNode {...defaultProps} />)
      const node = screen.getByTestId("archie-node")
      expect(node.style.boxShadow).toBe(`0 0 8px 2px ${HEATMAP_COLORS.healthy}`)
    })

    it("renders box-shadow glow when heatmap enabled and status is warning", () => {
      mockHeatmapEnabled = true
      mockHeatmapColors.set("node-1", "warning")
      render(<ArchieNode {...defaultProps} />)
      const node = screen.getByTestId("archie-node")
      expect(node.style.boxShadow).toBe(`0 0 8px 2px ${HEATMAP_COLORS.warning}`)
    })

    it("renders box-shadow glow when heatmap enabled and status is bottleneck", () => {
      mockHeatmapEnabled = true
      mockHeatmapColors.set("node-1", "bottleneck")
      render(<ArchieNode {...defaultProps} />)
      const node = screen.getByTestId("archie-node")
      expect(node.style.boxShadow).toBe(`0 0 8px 2px ${HEATMAP_COLORS.bottleneck}`)
    })

    it("renders no box-shadow when heatmap disabled", () => {
      mockHeatmapEnabled = false
      mockHeatmapColors.set("node-1", "healthy")
      render(<ArchieNode {...defaultProps} />)
      const node = screen.getByTestId("archie-node")
      expect(node.style.boxShadow).toBe("")
    })

    it("renders no box-shadow when status is undefined (no metrics yet)", () => {
      mockHeatmapEnabled = true
      // Don't set any heatmap color for node-1
      render(<ArchieNode {...defaultProps} />)
      const node = screen.getByTestId("archie-node")
      expect(node.style.boxShadow).toBe("")
    })

    it("sets aria-label with heatmap status when heatmap enabled", () => {
      mockHeatmapEnabled = true
      mockHeatmapColors.set("node-1", "warning")
      render(<ArchieNode {...defaultProps} />)
      const node = screen.getByTestId("archie-node")
      expect(node).toHaveAttribute("aria-label", "PostgreSQL — warning")
    })

    it("sets aria-label without heatmap status when heatmap disabled", () => {
      mockHeatmapEnabled = false
      mockHeatmapColors.set("node-1", "warning")
      render(<ArchieNode {...defaultProps} />)
      const node = screen.getByTestId("archie-node")
      expect(node).toHaveAttribute("aria-label", "PostgreSQL")
    })

    it("sets aria-label without heatmap status when no heatmap data", () => {
      mockHeatmapEnabled = true
      // Don't set any heatmap color for node-1
      render(<ArchieNode {...defaultProps} />)
      const node = screen.getByTestId("archie-node")
      expect(node).toHaveAttribute("aria-label", "PostgreSQL")
    })

    it("category stripe backgroundColor unchanged when heatmap active", () => {
      mockHeatmapEnabled = true
      mockHeatmapColors.set("node-1", "bottleneck")
      render(<ArchieNode {...defaultProps} />)
      const stripe = screen.getByTestId("archie-node-stripe")
      expect(stripe).toHaveStyle({ backgroundColor: "var(--color-cat-data-storage)" })
    })
  })
})
