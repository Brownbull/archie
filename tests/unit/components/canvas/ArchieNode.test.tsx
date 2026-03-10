import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen } from "@testing-library/react"
import { ArchieNode } from "@/components/canvas/ArchieNode"
import { HEATMAP_COLORS, NODE_WIDTH, type Constraint } from "@/lib/constants"
import type { HeatmapStatus } from "@/engine/heatmapCalculator"
import type { ConstraintViolation } from "@/engine/constraintEvaluator"

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

// Mock Zustand stores for heatmap + constraint integration
const mockHeatmapColors = new Map<string, HeatmapStatus>()
let mockHeatmapEnabled = false
let mockViolationsByNodeId = new Map<string, ConstraintViolation[]>()
let mockConstraints: Constraint[] = []

vi.mock("@/stores/architectureStore", () => ({
  useArchitectureStore: vi.fn((selector: (s: Record<string, unknown>) => unknown) =>
    selector({
      heatmapColors: mockHeatmapColors,
      violationsByNodeId: mockViolationsByNodeId,
      constraints: mockConstraints,
    }),
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
    mockViolationsByNodeId = new Map()
    mockConstraints = []
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

  describe("constraint violation badge (Story 6-3)", () => {
    it("does not render badge when no violations for this node", () => {
      render(<ArchieNode {...defaultProps} />)
      expect(screen.queryByTestId("constraint-violation-badge")).not.toBeInTheDocument()
    })

    it("does not render badge for violations belonging to other nodes", () => {
      mockViolationsByNodeId = new Map([
        ["other-node", [{ constraintId: "c1", nodeId: "other-node", categoryId: "performance", actualScore: 7, threshold: 5, operator: "lte" }]],
      ])
      mockConstraints = [{ id: "c1", categoryId: "performance", operator: "lte", threshold: 5, label: "Perf cap" }]
      render(<ArchieNode {...defaultProps} />)
      expect(screen.queryByTestId("constraint-violation-badge")).not.toBeInTheDocument()
    })

    it("renders badge with violation count for this node", () => {
      mockViolationsByNodeId = new Map([
        ["node-1", [
          { constraintId: "c1", nodeId: "node-1", categoryId: "performance", actualScore: 7, threshold: 5, operator: "lte" },
          { constraintId: "c2", nodeId: "node-1", categoryId: "security", actualScore: 3, threshold: 5, operator: "gte" },
        ]],
      ])
      mockConstraints = [
        { id: "c1", categoryId: "performance", operator: "lte", threshold: 5, label: "Perf cap" },
        { id: "c2", categoryId: "security", operator: "gte", threshold: 5, label: "Sec floor" },
      ]
      render(<ArchieNode {...defaultProps} />)
      const badge = screen.getByTestId("constraint-violation-badge")
      expect(badge).toBeInTheDocument()
      expect(badge).toHaveTextContent("2")
    })

    it("badge tooltip lists violated constraint labels", () => {
      mockViolationsByNodeId = new Map([
        ["node-1", [{ constraintId: "c1", nodeId: "node-1", categoryId: "performance", actualScore: 7, threshold: 5, operator: "lte" }]],
      ])
      mockConstraints = [{ id: "c1", categoryId: "performance", operator: "lte", threshold: 5, label: "Perf cap" }]
      render(<ArchieNode {...defaultProps} />)
      const badge = screen.getByTestId("constraint-violation-badge")
      expect(badge).toHaveAttribute("title", "Perf cap")
    })

    it("badge tooltip falls back to categoryId when constraint not found", () => {
      mockViolationsByNodeId = new Map([
        ["node-1", [{ constraintId: "unknown-id", nodeId: "node-1", categoryId: "security", actualScore: 3, threshold: 5, operator: "gte" }]],
      ])
      mockConstraints = []
      render(<ArchieNode {...defaultProps} />)
      const badge = screen.getByTestId("constraint-violation-badge")
      expect(badge).toHaveAttribute("title", "security constraint")
    })
  })
})
