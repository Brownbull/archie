import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"
import { ArchieNode } from "@/components/canvas/ArchieNode"
import { HEATMAP_COLORS, NODE_WIDTH, MAX_REPLICAS, type Constraint } from "@/lib/constants"
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

import type { NodePorts } from "@/hooks/useNodePorts"

let mockNodePorts: NodePorts = { inputs: [], outputs: [], hasPorts: false }
vi.mock("@/hooks/useNodePorts", () => ({
  useNodePorts: () => mockNodePorts,
}))

// Mock Zustand stores for heatmap + constraint + compatibility integration
const mockHeatmapColors = new Map<string, HeatmapStatus>()
let mockHeatmapEnabled = false
let mockViolationsByNodeId = new Map<string, ConstraintViolation[]>()
let mockConstraints: Constraint[] = []

type MockDragSource =
  | { kind: "toolbox"; componentId: string; componentCategory: string }
  | { kind: "connection"; sourceNodeId: string; sourceCategory: string; sourceHandle: string | null; sourceComponentId: string }
let mockActiveDrag: MockDragSource | null = null
let mockArchNodes: Array<{ id: string; data: { archieComponentId: string; componentCategory: string } }> = []
let mockArchEdges: Array<{ source: string; target: string }> = []
let mockRippleActiveNodeIds = new Set<string>()
let mockAnimationsEnabled = false
let mockTopologyIssuesByNodeId = new Map<string, Array<{ issueType: string }>>()
const mockSetNodeReplicaCount = vi.fn()

vi.mock("@/stores/architectureStore", () => {
  const fn = Object.assign(
    vi.fn((selector: (s: Record<string, unknown>) => unknown) =>
      selector({
        heatmapColors: mockHeatmapColors,
        violationsByNodeId: mockViolationsByNodeId,
        constraints: mockConstraints,
        rippleActiveNodeIds: mockRippleActiveNodeIds,
        topologyIssuesByNodeId: mockTopologyIssuesByNodeId,
        setNodeReplicaCount: mockSetNodeReplicaCount,
        edges: mockArchEdges,
      }),
    ),
    { getState: () => ({ nodes: mockArchNodes }) },
  )
  return { useArchitectureStore: fn }
})

vi.mock("@/stores/preferencesStore", () => ({
  usePreferencesStore: vi.fn((selector: (s: Record<string, unknown>) => unknown) =>
    selector({ animationsEnabled: mockAnimationsEnabled }),
  ),
}))

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
    mockRippleActiveNodeIds = new Set()
    mockAnimationsEnabled = false
    mockCheckCompatibility.mockReturnValue({ isCompatible: true, reason: "" })
    mockNodePorts = { inputs: [], outputs: [], hasPorts: false }
    mockArchEdges = []
    mockTopologyIssuesByNodeId = new Map()
    mockSetNodeReplicaCount.mockClear()
  })

  describe("replica controls (Epic 14)", () => {
    it("renders the replica stepper for a scalable node showing the current count", () => {
      render(<ArchieNode {...defaultProps} data={{ ...defaultProps.data, replicaCount: 2 }} />)
      expect(screen.getByTestId("archie-node-scaling")).toBeInTheDocument()
      expect(screen.getByTestId("replica-count")).toHaveTextContent("2×")
    })

    it("increments replica count via setNodeReplicaCount on + click", () => {
      render(<ArchieNode {...defaultProps} data={{ ...defaultProps.data, replicaCount: 2 }} />)
      fireEvent.click(screen.getByTestId("replica-increment"))
      expect(mockSetNodeReplicaCount).toHaveBeenCalledWith("node-1", 3)
    })

    it("disables decrement at the minimum replica count", () => {
      render(<ArchieNode {...defaultProps} data={{ ...defaultProps.data, replicaCount: 1 }} />)
      expect(screen.getByTestId("replica-decrement")).toBeDisabled()
    })

    it("shows a 'reads only' badge for replicated read-only (data-storage) nodes", () => {
      render(<ArchieNode {...defaultProps} data={{ ...defaultProps.data, replicaCount: 3 }} />)
      expect(screen.getByTestId("replica-readonly")).toBeInTheDocument()
    })

    it("shows a 'needs LB' badge when topology flags replicas-without-lb", () => {
      mockTopologyIssuesByNodeId = new Map([
        ["node-1", [{ issueType: "replicas-without-lb" }]],
      ])
      render(<ArchieNode {...defaultProps} data={{ ...defaultProps.data, componentCategory: "compute" as const, replicaCount: 3 }} />)
      expect(screen.getByTestId("replica-needs-lb")).toBeInTheDocument()
    })

    it("shows an 'N backends' badge on a load-balancer node with downstream edges", () => {
      mockArchEdges = [
        { source: "node-1", target: "a" },
        { source: "node-1", target: "b" },
      ]
      render(<ArchieNode {...defaultProps} data={{ ...defaultProps.data, componentCategory: "delivery-network" as const }} />)
      expect(screen.getByTestId("replica-backends")).toHaveTextContent("2 backends")
    })

    it("disables increment at the maximum replica count", () => {
      render(<ArchieNode {...defaultProps} data={{ ...defaultProps.data, replicaCount: MAX_REPLICAS }} />)
      expect(screen.getByTestId("replica-increment")).toBeDisabled()
    })

    it("shows a static replica badge (not a stepper) for a non-scalable replicated node", () => {
      render(<ArchieNode {...defaultProps} data={{ ...defaultProps.data, componentCategory: "monitoring" as const, replicaCount: 3 }} />)
      expect(screen.getByTestId("replica-badge")).toHaveTextContent("3×")
      expect(screen.queryByTestId("replica-increment")).not.toBeInTheDocument()
    })
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

  describe("cost badge (Epic 13)", () => {
    it("renders cost badge when variant has monthlyCost", () => {
      mockGetComponent.mockReturnValue({
        id: "postgresql",
        configVariants: [{ id: "default", name: "Standard", monthlyCost: 45, maxRPS: 500, baseLatencyMs: 5 }],
      })
      render(<ArchieNode {...defaultProps} />)
      expect(screen.getByTestId("archie-node-cost")).toHaveTextContent("$45/mo")
    })

    it("renders 'Free' for zero monthlyCost", () => {
      mockGetComponent.mockReturnValue({
        id: "cdn",
        configVariants: [{ id: "default", name: "Free Tier", monthlyCost: 0 }],
      })
      render(<ArchieNode {...defaultProps} />)
      expect(screen.getByTestId("archie-node-cost")).toHaveTextContent("Free")
    })

    it("does not render cost badge when monthlyCost is undefined", () => {
      mockGetComponent.mockReturnValue({
        id: "postgresql",
        configVariants: [{ id: "default", name: "Standard" }],
      })
      render(<ArchieNode {...defaultProps} />)
      expect(screen.queryByTestId("archie-node-cost")).not.toBeInTheDocument()
    })

    it("does not render cost badge when component not found", () => {
      mockGetComponent.mockReturnValue(undefined)
      render(<ArchieNode {...defaultProps} />)
      expect(screen.queryByTestId("archie-node-cost")).not.toBeInTheDocument()
    })

    it("updates cost badge when variant changes", () => {
      mockGetComponent.mockReturnValue({
        id: "postgresql",
        configVariants: [
          { id: "default", name: "Standard", monthlyCost: 45 },
          { id: "replica", name: "Replica", monthlyCost: 120 },
        ],
      })
      const { rerender } = render(<ArchieNode {...defaultProps} />)
      expect(screen.getByTestId("archie-node-cost")).toHaveTextContent("$45/mo")

      const replicaProps = {
        ...defaultProps,
        data: { ...defaultProps.data, activeConfigVariantId: "replica" },
      } as Parameters<typeof ArchieNode>[0]
      rerender(<ArchieNode {...replicaProps} />)
      expect(screen.getByTestId("archie-node-cost")).toHaveTextContent("$120/mo")
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
      mockActiveDrag = { kind: "connection", sourceNodeId: "node-1", sourceCategory: "data-storage", sourceHandle: null, sourceComponentId: "postgresql" }
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
      mockActiveDrag = { kind: "connection", sourceNodeId: "other-node", sourceCategory: "caching", sourceHandle: null, sourceComponentId: "redis" }
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

  describe("port-aware dimming (Phase 3 — Epic 12)", () => {
    const setupPortComponentMocks = () => {
      mockGetComponent.mockImplementation((id: string) => {
        if (id === "nginx") return {
          id: "nginx", category: "networking", compatibility: {},
          configVariants: [], ports: [
            { id: "http-in", type: "http", direction: "in" },
            { id: "http-out", type: "http", direction: "out" },
          ],
        }
        if (id === "postgresql") return {
          id: "postgresql", category: "data-storage", compatibility: {},
          configVariants: [{ id: "default", name: "Standard" }], ports: [
            { id: "db-in", type: "database", direction: "in" },
            { id: "db-out", type: "database", direction: "out" },
          ],
        }
        if (id === "redis") return {
          id: "redis", category: "caching", compatibility: {},
          configVariants: [], ports: [
            { id: "cache-in", type: "cache", direction: "in" },
            { id: "cache-out", type: "cache", direction: "out" },
          ],
        }
        return undefined
      })
    }

    it("highlights node with matching input port when dragging from typed source", () => {
      mockActiveDrag = {
        kind: "connection", sourceNodeId: "nginx-node", sourceCategory: "networking",
        sourceHandle: "http-out", sourceComponentId: "nginx",
      }
      setupPortComponentMocks()
      const props = {
        ...defaultProps,
        id: "nginx-target",
        data: { ...defaultProps.data, archieComponentId: "nginx", componentCategory: "networking" as const },
      } as Parameters<typeof ArchieNode>[0]
      render(<ArchieNode {...props} />)
      const node = screen.getByTestId("archie-node")
      expect(node).toHaveAttribute("data-compat-highlighted")
      expect(node).not.toHaveAttribute("data-compat-dimmed")
    })

    it("dims node without matching input port when dragging from typed source", () => {
      mockActiveDrag = {
        kind: "connection", sourceNodeId: "nginx-node", sourceCategory: "networking",
        sourceHandle: "http-out", sourceComponentId: "nginx",
      }
      setupPortComponentMocks()
      render(<ArchieNode {...defaultProps} />)
      const node = screen.getByTestId("archie-node")
      expect(node).toHaveAttribute("data-compat-dimmed")
      expect(node).toHaveAttribute("title", "⚠ No HTTP input port")
    })

    it("falls back to category check when sourceHandle is null", () => {
      mockActiveDrag = {
        kind: "connection", sourceNodeId: "redis-node", sourceCategory: "caching",
        sourceHandle: null, sourceComponentId: "redis",
      }
      setupPortComponentMocks()
      mockCheckCompatibility.mockReturnValue({ isCompatible: true, reason: "" })
      render(<ArchieNode {...defaultProps} />)
      const node = screen.getByTestId("archie-node")
      expect(node).toHaveAttribute("data-compat-highlighted")
      expect(mockCheckCompatibility).toHaveBeenCalled()
    })
  })

  describe("status dot (Phase 5)", () => {
    it("renders status dot when heatmap enabled and status available", () => {
      mockHeatmapEnabled = true
      mockHeatmapColors.set("node-1", "healthy")
      render(<ArchieNode {...defaultProps} />)
      expect(screen.getByTestId("status-dot")).toBeInTheDocument()
      expect(screen.getByTestId("status-dot")).toHaveAttribute("data-status", "healthy")
    })

    it("does not render status dot when heatmap disabled", () => {
      mockHeatmapEnabled = false
      mockHeatmapColors.set("node-1", "healthy")
      render(<ArchieNode {...defaultProps} />)
      expect(screen.queryByTestId("status-dot")).not.toBeInTheDocument()
    })

    it("does not render status dot when no heatmap data for node", () => {
      mockHeatmapEnabled = true
      render(<ArchieNode {...defaultProps} />)
      expect(screen.queryByTestId("status-dot")).not.toBeInTheDocument()
    })
  })

  describe("ripple animation (Phase 5)", () => {
    it("applies ripple class when node is in rippleActiveNodeIds and animations enabled", () => {
      mockRippleActiveNodeIds = new Set(["node-1"])
      mockAnimationsEnabled = true
      render(<ArchieNode {...defaultProps} />)
      const node = screen.getByTestId("archie-node")
      expect(node.className).toContain("archie-ripple")
    })

    it("does not apply ripple class when animations disabled", () => {
      mockRippleActiveNodeIds = new Set(["node-1"])
      mockAnimationsEnabled = false
      render(<ArchieNode {...defaultProps} />)
      const node = screen.getByTestId("archie-node")
      expect(node.className).not.toContain("archie-ripple")
    })

    it("does not apply ripple class when node is not rippling", () => {
      mockRippleActiveNodeIds = new Set(["other-node"])
      mockAnimationsEnabled = true
      render(<ArchieNode {...defaultProps} />)
      const node = screen.getByTestId("archie-node")
      expect(node.className).not.toContain("archie-ripple")
    })
  })

  describe("port handles (Phase 2 — Epic 12)", () => {
    it("renders generic fallback handles when hasPorts is false", () => {
      mockNodePorts = { inputs: [], outputs: [], hasPorts: false }
      render(<ArchieNode {...defaultProps} />)
      expect(screen.getByTestId("archie-node-handle-target")).toBeInTheDocument()
      expect(screen.getByTestId("archie-node-handle-source")).toBeInTheDocument()
    })

    it("renders port-specific handles when hasPorts is true", () => {
      mockNodePorts = {
        inputs: [
          { id: "http-in", type: "http", direction: "in", label: "HTTP", color: "#2563EB", sortIndex: 0 },
        ],
        outputs: [
          { id: "http-out", type: "http", direction: "out", label: "HTTP", color: "#2563EB", sortIndex: 0 },
        ],
        hasPorts: true,
      }
      render(<ArchieNode {...defaultProps} />)
      expect(screen.getByTestId("port-handle-http-in")).toBeInTheDocument()
      expect(screen.getByTestId("port-handle-http-out")).toBeInTheDocument()
      expect(screen.queryByTestId("archie-node-handle-target")).not.toBeInTheDocument()
      expect(screen.queryByTestId("archie-node-handle-source")).not.toBeInTheDocument()
    })

    it("renders correct data-port-type attribute", () => {
      mockNodePorts = {
        inputs: [
          { id: "db-in", type: "database", direction: "in", label: "Database", color: "#7C3AED", sortIndex: 1 },
        ],
        outputs: [],
        hasPorts: true,
      }
      render(<ArchieNode {...defaultProps} />)
      expect(screen.getByTestId("port-handle-db-in")).toHaveAttribute("data-port-type", "database")
    })

    it("renders port color via inline style", () => {
      mockNodePorts = {
        inputs: [
          { id: "cache-in", type: "cache", direction: "in", label: "Cache", color: "#DC2626", sortIndex: 2 },
        ],
        outputs: [],
        hasPorts: true,
      }
      render(<ArchieNode {...defaultProps} />)
      const handle = screen.getByTestId("port-handle-cache-in")
      expect(handle).toHaveStyle({ backgroundColor: "#DC2626" })
    })

    it("renders tooltip with port label and direction", () => {
      mockNodePorts = {
        inputs: [
          { id: "stream-in", type: "stream", direction: "in", label: "Stream", color: "#D97706", sortIndex: 3 },
        ],
        outputs: [
          { id: "monitor-out", type: "monitor", direction: "out", label: "Monitor", color: "#059669", sortIndex: 4 },
        ],
        hasPorts: true,
      }
      render(<ArchieNode {...defaultProps} />)
      expect(screen.getByTestId("port-handle-stream-in")).toHaveAttribute("title", "Stream In")
      expect(screen.getByTestId("port-handle-monitor-out")).toHaveAttribute("title", "Monitor Out")
    })

    it("renders multiple input and output ports", () => {
      mockNodePorts = {
        inputs: [
          { id: "http-in", type: "http", direction: "in", label: "HTTP", color: "#2563EB", sortIndex: 0 },
          { id: "db-in", type: "database", direction: "in", label: "Database", color: "#7C3AED", sortIndex: 1 },
          { id: "cache-in", type: "cache", direction: "in", label: "Cache", color: "#DC2626", sortIndex: 2 },
        ],
        outputs: [
          { id: "http-out", type: "http", direction: "out", label: "HTTP", color: "#2563EB", sortIndex: 0 },
          { id: "stream-out", type: "stream", direction: "out", label: "Stream", color: "#D97706", sortIndex: 3 },
        ],
        hasPorts: true,
      }
      render(<ArchieNode {...defaultProps} />)
      expect(screen.getByTestId("port-handle-http-in")).toBeInTheDocument()
      expect(screen.getByTestId("port-handle-db-in")).toBeInTheDocument()
      expect(screen.getByTestId("port-handle-cache-in")).toBeInTheDocument()
      expect(screen.getByTestId("port-handle-http-out")).toBeInTheDocument()
      expect(screen.getByTestId("port-handle-stream-out")).toBeInTheDocument()
    })

    it("applies dynamic minHeight when ports > 5 on one side", () => {
      mockNodePorts = {
        inputs: [
          { id: "http-in", type: "http", direction: "in", label: "HTTP", color: "#2563EB", sortIndex: 0 },
          { id: "db-in", type: "database", direction: "in", label: "Database", color: "#7C3AED", sortIndex: 1 },
          { id: "cache-in", type: "cache", direction: "in", label: "Cache", color: "#DC2626", sortIndex: 2 },
          { id: "stream-in", type: "stream", direction: "in", label: "Stream", color: "#D97706", sortIndex: 3 },
          { id: "monitor-in", type: "monitor", direction: "in", label: "Monitor", color: "#059669", sortIndex: 4 },
          { id: "auth-in", type: "auth", direction: "in", label: "Auth", color: "#CA8A04", sortIndex: 5 },
          { id: "cdn-in", type: "cdn", direction: "in", label: "CDN", color: "#0891B2", sortIndex: 6 },
        ],
        outputs: [],
        hasPorts: true,
      }
      render(<ArchieNode {...defaultProps} />)
      const node = screen.getByTestId("archie-node")
      expect(node.style.minHeight).toBeTruthy()
    })

    it("does not apply dynamic minHeight when ports <= 5", () => {
      mockNodePorts = {
        inputs: [
          { id: "http-in", type: "http", direction: "in", label: "HTTP", color: "#2563EB", sortIndex: 0 },
          { id: "db-in", type: "database", direction: "in", label: "Database", color: "#7C3AED", sortIndex: 1 },
        ],
        outputs: [],
        hasPorts: true,
      }
      render(<ArchieNode {...defaultProps} />)
      const node = screen.getByTestId("archie-node")
      expect(node.style.minHeight).toBe("")
    })
  })
})
