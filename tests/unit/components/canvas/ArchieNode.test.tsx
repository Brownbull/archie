import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen } from "@testing-library/react"
import { ArchieNode } from "@/components/canvas/ArchieNode"
import { HEATMAP_COLORS, NODE_WIDTH, type Constraint } from "@/lib/constants"
import type { HeatmapStatus } from "@/engine/heatmapCalculator"
import type { ConstraintViolation } from "@/engine/constraintEvaluator"
import type { TopMetric } from "@/hooks/useTopMetrics"

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

let mockTopMetrics: TopMetric[] = []
vi.mock("@/hooks/useTopMetrics", () => ({
  useTopMetrics: () => mockTopMetrics,
}))

const mockGetComponent = vi.fn()
vi.mock("@/services/componentLibrary", () => ({
  componentLibrary: {
    getComponent: (...args: unknown[]) => mockGetComponent(...args),
  },
}))

const mockCheckCompatibility = vi.fn(() => ({ isCompatible: true, reason: "" }))
vi.mock("@/engine/compatibilityChecker", () => ({
  checkCompatibility: (...args: unknown[]) => mockCheckCompatibility(...args),
}))

// Mock Zustand stores for heatmap + constraint + compatibility integration
const mockHeatmapColors = new Map<string, HeatmapStatus>()
let mockHeatmapEnabled = false
let mockViolationsByNodeId = new Map<string, ConstraintViolation[]>()
let mockConstraints: Constraint[] = []

type MockDragSource =
  | { kind: "toolbox"; componentId: string; componentCategory: string }
  | { kind: "connection"; sourceNodeId: string; sourceCategory: string }
let mockActiveDrag: MockDragSource | null = null
let mockArchNodes: Array<{ id: string; data: { archieComponentId: string; componentCategory: string } }> = []

vi.mock("@/stores/architectureStore", () => {
  const fn = Object.assign(
    vi.fn((selector: (s: Record<string, unknown>) => unknown) =>
      selector({
        heatmapColors: mockHeatmapColors,
        violationsByNodeId: mockViolationsByNodeId,
        constraints: mockConstraints,
      }),
    ),
    { getState: () => ({ nodes: mockArchNodes }) },
  )
  return { useArchitectureStore: fn }
})

vi.mock("@/stores/uiStore", () => ({
  useUiStore: vi.fn((selector: (s: Record<string, unknown>) => unknown) =>
    selector({ heatmapEnabled: mockHeatmapEnabled, activeDrag: mockActiveDrag }),
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
    mockTopMetrics = []
    mockGetComponent.mockReturnValue(undefined)
    mockActiveDrag = null
    mockArchNodes = []
    mockCheckCompatibility.mockReturnValue({ isCompatible: true, reason: "" })
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

  it("renders only component name when no metrics and no variant lookup", () => {
    render(<ArchieNode {...defaultProps} />)
    expect(screen.getByText("PostgreSQL")).toBeInTheDocument()
    expect(screen.queryByTestId("inline-metric-bar")).not.toBeInTheDocument()
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

  describe("inline metrics (Story 10-1)", () => {
    it("renders active variant name when component found", () => {
      mockGetComponent.mockReturnValue({
        id: "postgresql",
        configVariants: [{ id: "default", name: "Standard" }, { id: "event-driven", name: "Event-Driven" }],
      })
      render(<ArchieNode {...defaultProps} />)
      expect(screen.getByText("Standard")).toBeInTheDocument()
    })

    it("does not render variant name when component not found", () => {
      mockGetComponent.mockReturnValue(undefined)
      render(<ArchieNode {...defaultProps} />)
      expect(screen.queryByTestId("archie-node-variant")).not.toBeInTheDocument()
    })

    it("renders 2 inline metric bars when metrics available", () => {
      mockTopMetrics = [
        { categoryId: "performance", shortName: "Perf", value: 8.0, color: "var(--color-metric-performance)" },
        { categoryId: "scalability", shortName: "Scale", value: 4.0, color: "var(--color-metric-scalability)" },
      ]
      render(<ArchieNode {...defaultProps} />)
      const bars = screen.getAllByTestId("inline-metric-bar")
      expect(bars).toHaveLength(2)
      expect(screen.getByText("Perf")).toBeInTheDocument()
      expect(screen.getByText("Scale")).toBeInTheDocument()
      expect(screen.getByText("8.0")).toBeInTheDocument()
      expect(screen.getByText("4.0")).toBeInTheDocument()
    })

    it("does not render metric bars when no metrics", () => {
      mockTopMetrics = []
      render(<ArchieNode {...defaultProps} />)
      expect(screen.queryByTestId("inline-metric-bar")).not.toBeInTheDocument()
    })

    it("renders variant name and metrics together", () => {
      mockGetComponent.mockReturnValue({
        id: "postgresql",
        configVariants: [{ id: "default", name: "Standard" }],
      })
      mockTopMetrics = [
        { categoryId: "performance", shortName: "Perf", value: 7.5, color: "var(--color-metric-performance)" },
      ]
      render(<ArchieNode {...defaultProps} />)
      expect(screen.getByText("Standard")).toBeInTheDocument()
      expect(screen.getByText("Perf")).toBeInTheDocument()
    })

    it("renders constraint badge alongside inline metrics without overlap", () => {
      mockViolationsByNodeId = new Map([
        ["node-1", [{ constraintId: "c1", nodeId: "node-1", categoryId: "performance", actualScore: 7, threshold: 5, operator: "lte" }]],
      ])
      mockConstraints = [{ id: "c1", categoryId: "performance", operator: "lte", threshold: 5, label: "Perf cap" }]
      mockTopMetrics = [
        { categoryId: "performance", shortName: "Perf", value: 8.0, color: "var(--color-metric-performance)" },
        { categoryId: "reliability", shortName: "Rel", value: 6.0, color: "var(--color-metric-reliability)" },
      ]
      render(<ArchieNode {...defaultProps} />)
      expect(screen.getByTestId("constraint-violation-badge")).toBeInTheDocument()
      expect(screen.getAllByTestId("inline-metric-bar")).toHaveLength(2)
    })

    it("does not render variant name when activeConfigVariantId does not match any variant", () => {
      mockGetComponent.mockReturnValue({
        id: "postgresql",
        configVariants: [{ id: "event-driven", name: "Event-Driven" }],
      })
      const props = {
        ...defaultProps,
        data: { ...defaultProps.data, activeConfigVariantId: "nonexistent-variant" },
      } as Parameters<typeof ArchieNode>[0]
      render(<ArchieNode {...props} />)
      expect(screen.queryByTestId("archie-node-variant")).not.toBeInTheDocument()
    })
  })

  describe("compatibility dimming (Phase 1)", () => {
    const setupComponentMocks = () => {
      mockGetComponent.mockImplementation((id: string) => {
        if (id === "redis") return { id: "redis", category: "caching", compatibility: {}, configVariants: [] }
        if (id === "postgresql") return { id: "postgresql", category: "data-storage", compatibility: {}, configVariants: [{ id: "default", name: "Standard" }] }
        return undefined
      })
    }

    it("no dimming or highlighting when no active drag", () => {
      mockActiveDrag = null
      render(<ArchieNode {...defaultProps} />)
      const node = screen.getByTestId("archie-node")
      expect(node).not.toHaveAttribute("data-compat-dimmed")
      expect(node).not.toHaveAttribute("data-compat-highlighted")
    })

    it("highlights compatible node during toolbox drag", () => {
      mockActiveDrag = { kind: "toolbox", componentId: "redis", componentCategory: "caching" }
      setupComponentMocks()
      mockCheckCompatibility.mockReturnValue({ isCompatible: true, reason: "" })
      render(<ArchieNode {...defaultProps} />)
      const node = screen.getByTestId("archie-node")
      expect(node).toHaveAttribute("data-compat-highlighted")
      expect(node).not.toHaveAttribute("data-compat-dimmed")
    })

    it("dims incompatible node during toolbox drag", () => {
      mockActiveDrag = { kind: "toolbox", componentId: "redis", componentCategory: "caching" }
      setupComponentMocks()
      mockCheckCompatibility.mockReturnValue({ isCompatible: false, reason: "Incompatible storage type" })
      render(<ArchieNode {...defaultProps} />)
      const node = screen.getByTestId("archie-node")
      expect(node).toHaveAttribute("data-compat-dimmed")
      expect(node).not.toHaveAttribute("data-compat-highlighted")
    })

    it("shows incompatibility reason as tooltip on dimmed node", () => {
      mockActiveDrag = { kind: "toolbox", componentId: "redis", componentCategory: "caching" }
      setupComponentMocks()
      mockCheckCompatibility.mockReturnValue({ isCompatible: false, reason: "Incompatible storage" })
      render(<ArchieNode {...defaultProps} />)
      const node = screen.getByTestId("archie-node")
      expect(node).toHaveAttribute("title", "⚠ Incompatible storage")
    })

    it("does not dim or highlight the drag source node during connection drag", () => {
      mockActiveDrag = { kind: "connection", sourceNodeId: "node-1", sourceCategory: "data-storage" }
      render(<ArchieNode {...defaultProps} />)
      const node = screen.getByTestId("archie-node")
      expect(node).not.toHaveAttribute("data-compat-dimmed")
      expect(node).not.toHaveAttribute("data-compat-highlighted")
    })

    it("highlighted node gets green glow box-shadow", () => {
      mockActiveDrag = { kind: "toolbox", componentId: "redis", componentCategory: "caching" }
      setupComponentMocks()
      mockCheckCompatibility.mockReturnValue({ isCompatible: true, reason: "" })
      render(<ArchieNode {...defaultProps} />)
      const node = screen.getByTestId("archie-node")
      expect(node.style.boxShadow).toBe("0 0 12px 3px var(--color-heatmap-green)")
    })

    it("dims node during connection drag from another node", () => {
      mockActiveDrag = { kind: "connection", sourceNodeId: "other-node", sourceCategory: "caching" }
      mockArchNodes = [
        { id: "other-node", data: { archieComponentId: "redis", componentCategory: "caching" } },
        { id: "node-1", data: { archieComponentId: "postgresql", componentCategory: "data-storage" } },
      ]
      setupComponentMocks()
      mockCheckCompatibility.mockReturnValue({ isCompatible: false, reason: "Wrong type" })
      render(<ArchieNode {...defaultProps} />)
      const node = screen.getByTestId("archie-node")
      expect(node).toHaveAttribute("data-compat-dimmed")
    })
  })
})
