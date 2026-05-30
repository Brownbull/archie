import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen } from "@testing-library/react"
import { ArchieNode } from "@/components/canvas/ArchieNode"
import { useSimulationStore } from "@/stores/simulationStore"
import { type Constraint } from "@/lib/constants"
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


describe("ArchieNode — port handles (Epic 12)", () => {
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
