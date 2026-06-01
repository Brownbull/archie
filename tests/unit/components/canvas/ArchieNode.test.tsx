import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"
import { ArchieNode } from "@/components/canvas/ArchieNode"
import { useSimulationStore } from "@/stores/simulationStore"
import { HEATMAP_COLORS, NODE_WIDTH, MAX_REPLICAS, type Constraint } from "@/lib/constants"
import type { HeatmapStatus } from "@/engine/heatmapCalculator"
import type { ConstraintViolation } from "@/engine/constraintEvaluator"
import type { TopMetric } from "@/hooks/useTopMetrics"

vi.mock("@xyflow/react", () => ({
  Handle: ({ type, position, ...props }: Record<string, unknown>) => (
    <div data-testid={`handle-${type}`} data-position={position} {...props} />
  ),
  Position: { Left: "left", Right: "right", Top: "top" },
  // NodeActionToolbar (mounted inside ArchieNode) renders through NodeToolbar; stub it to
  // mirror `isVisible` so unselected nodes don't leak toolbar buttons into these tests.
  NodeToolbar: ({ children, isVisible }: { children: React.ReactNode; isVisible?: boolean }) =>
    isVisible ? <div data-testid="node-toolbar-portal">{children}</div> : null,
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
    useSimulationStore.getState().reset()
  })

  describe("simulation telemetry (Epic 15)", () => {
    it("renders no telemetry strip when no simulation is running", () => {
      render(<ArchieNode {...defaultProps} />)
      expect(screen.queryByTestId("sim-telemetry")).not.toBeInTheDocument()
    })

    it("renders live RPS/latency + an overloaded (red) capacity bar during a run", () => {
      useSimulationStore.setState({
        status: "running",
        currentTick: 0,
        ticks: [{
          tick: 0,
          targetRps: 100,
          nodes: [{ nodeId: "node-1", incomingRps: 90, servedRps: 80, failedRps: 10, latencyMs: 30, capacityPercent: 1.1, overloaded: true }],
          totalServedRps: 80,
          totalFailedRps: 10,
        }],
      })
      render(<ArchieNode {...defaultProps} />)
      expect(screen.getByTestId("sim-telemetry")).toBeInTheDocument()
      expect(screen.getByTestId("sim-rps")).toHaveTextContent("90 rps")
      expect(screen.getByTestId("sim-latency")).toHaveTextContent("30ms")
      const bar = screen.getByTestId("sim-capacity-bar")
      expect(bar).toHaveAttribute("data-overloaded", "true")
      expect(bar.className).toContain("bg-red-500")
      // P3: per-node utilization % readout, flagged overloaded (>100%) in red.
      const util = screen.getByTestId("sim-utilization")
      expect(util).toHaveTextContent("110%")
      expect(util).toHaveAttribute("data-overloaded", "true")
      expect(util.className).toContain("text-red-400")
    })
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

  describe("complexity indicator", () => {
    function componentWith(complexity: "low" | "medium" | "high", variantOverride?: "low" | "medium" | "high") {
      return {
        configVariants: [
          {
            id: "default",
            name: "Default",
            metrics: variantOverride
              ? [{ id: "operational-complexity", value: variantOverride, numericValue: 5, category: "operational-complexity" }]
              : [],
          },
        ],
        baseMetrics: [{ id: "operational-complexity", value: complexity, numericValue: 5, category: "operational-complexity" }],
      }
    }

    it("renders the operational-complexity badge from the base metric", () => {
      mockGetComponent.mockReturnValue(componentWith("medium"))
      render(<ArchieNode {...defaultProps} />)
      const badge = screen.getByTestId("archie-node-complexity")
      expect(badge).toHaveAttribute("data-complexity", "medium")
      expect(badge).toHaveTextContent("Med")
    })

    it("prefers the active variant's complexity override over the base metric", () => {
      mockGetComponent.mockReturnValue(componentWith("low", "high"))
      render(<ArchieNode {...defaultProps} />)
      const badge = screen.getByTestId("archie-node-complexity")
      expect(badge).toHaveAttribute("data-complexity", "high")
      expect(badge).toHaveTextContent("High")
    })

    it("renders no complexity badge when the component is unknown", () => {
      mockGetComponent.mockReturnValue(undefined)
      render(<ArchieNode {...defaultProps} />)
      expect(screen.queryByTestId("archie-node-complexity")).not.toBeInTheDocument()
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

  it("renders the component's pixel icon when one exists (postgresql)", () => {
    render(<ArchieNode {...defaultProps} />)
    expect(screen.getByTestId("component-pixel-icon")).toHaveAttribute("src", "/icons/postgresql.png")
  })

  it("falls back to the lucide category icon for a component without a pixel icon", () => {
    render(<ArchieNode {...defaultProps} data={{ ...defaultProps.data, archieComponentId: "no-icon-component" }} />)
    const node = screen.getByTestId("archie-node")
    expect(node.querySelector("svg")).toBeInTheDocument()
    expect(screen.queryByTestId("component-pixel-icon")).not.toBeInTheDocument()
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

    it("shows throughput (rps) on the left of the stats row", () => {
      mockGetComponent.mockReturnValue({
        id: "node-express",
        configVariants: [{ id: "default", name: "Standard", monthlyCost: 20, maxRPS: 20000, baseLatencyMs: 5 }],
      })
      render(<ArchieNode {...defaultProps} />)
      expect(screen.getByTestId("archie-node-rps")).toHaveTextContent("20k rps")
      expect(screen.getByTestId("archie-node-cost")).toHaveTextContent("$20/mo")
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

  describe("port labels (hover affordance)", () => {
    it("renders a label per port so the connector's purpose is legible", () => {
      mockNodePorts = {
        hasPorts: true,
        inputs: [{ id: "db-in", type: "database", direction: "in", label: "Database", color: "#7C3AED", sortIndex: 0 }],
        outputs: [{ id: "monitor-out", type: "monitor", direction: "out", label: "Monitor", color: "#059669", sortIndex: 0 }],
      }
      render(<ArchieNode {...defaultProps} />)
      expect(screen.getByTestId("port-label-db-in")).toHaveTextContent("Database in")
      expect(screen.getByTestId("port-label-monitor-out")).toHaveTextContent("Monitor out")
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

})
