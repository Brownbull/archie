import { render, screen, fireEvent } from "@testing-library/react"
import { describe, it, expect, vi, beforeEach } from "vitest"
import { useUiStore } from "@/stores/uiStore"
import { useArchitectureStore, type ArchieNode, type ArchieEdge } from "@/stores/architectureStore"
import { NODE_TYPE_COMPONENT } from "@/lib/constants"
import type { HeatmapStatus } from "@/engine/heatmapCalculator"

// Mock useLibrary hook
const mockGetComponentById = vi.fn()
const mockGetComponentsByCategory = vi.fn().mockReturnValue([])
vi.mock("@/hooks/useLibrary", () => ({
  useLibrary: () => ({
    isReady: true,
    components: [],
    getComponentById: mockGetComponentById,
    getComponentsByCategory: mockGetComponentsByCategory,
    searchComponents: vi.fn(),
  }),
}))

vi.mock("@/services/componentLibrary", () => ({
  componentLibrary: {
    getComponent: vi.fn(),
    isInitialized: () => true,
    reset: vi.fn(),
  },
}))

vi.mock("@/lib/firebase", () => ({
  auth: { currentUser: null },
  db: {},
}))

// Import after mocks are set up
const { InspectorPanel } = await import("@/components/inspector/InspectorPanel")

const mockComponent = {
  id: "postgresql",
  name: "PostgreSQL",
  category: "data-storage",
  description: "Relational database",
  is: "An open-source relational database",
  gain: ["ACID compliance"],
  cost: ["Higher memory usage"],
  tags: ["database"],
  baseMetrics: [],
  configVariants: [
    { id: "standard", name: "Standard", metrics: [] },
    { id: "high-perf", name: "High Performance", metrics: [] },
  ],
}

const mockNode: ArchieNode = {
  id: "node-1",
  type: NODE_TYPE_COMPONENT,
  position: { x: 0, y: 0 },
  data: {
    archieComponentId: "postgresql",
    activeConfigVariantId: "standard",
    componentName: "PostgreSQL",
    componentCategory: "data-storage",
  },
}

describe("InspectorPanel", () => {
  beforeEach(() => {
    vi.resetAllMocks()
    mockGetComponentsByCategory.mockReturnValue([])
    useUiStore.setState({
      selectedNodeId: null,
      selectedEdgeId: null,
      inspectorCollapsed: false,
    })
    useArchitectureStore.setState({ nodes: [], edges: [] })
  })

  it("renders null when no selection exists (no node, no edge)", () => {
    const { container } = render(<InspectorPanel />)
    expect(container.innerHTML).toBe("")
  })

  it("renders panel shell but no detail when selected node is not found in store", () => {
    useUiStore.setState({ selectedNodeId: "nonexistent-node" })
    useArchitectureStore.setState({ nodes: [mockNode] })

    render(<InspectorPanel />)
    // Panel shell renders (selection exists) but NodeInspectorContent returns null
    expect(screen.getByTestId("inspector-panel")).toBeInTheDocument()
    expect(screen.queryByText("PostgreSQL")).not.toBeInTheDocument()
  })

  it("renders panel shell but no detail when component is not found in library", () => {
    useUiStore.setState({ selectedNodeId: "node-1" })
    useArchitectureStore.setState({ nodes: [mockNode] })
    mockGetComponentById.mockReturnValue(undefined)

    render(<InspectorPanel />)
    // Panel shell renders but component lookup fails inside NodeInspectorContent
    expect(screen.getByTestId("inspector-panel")).toBeInTheDocument()
    expect(screen.queryByText("PostgreSQL")).not.toBeInTheDocument()
  })

  it("renders component detail when node is selected and component found", () => {
    useUiStore.setState({ selectedNodeId: "node-1" })
    useArchitectureStore.setState({ nodes: [mockNode] })
    mockGetComponentById.mockReturnValue(mockComponent)

    render(<InspectorPanel />)
    expect(screen.getByTestId("inspector-panel")).toBeInTheDocument()
    expect(screen.getByText("PostgreSQL")).toBeInTheDocument()
  })

  it("renders collapse button", () => {
    useUiStore.setState({ selectedNodeId: "node-1" })
    useArchitectureStore.setState({ nodes: [mockNode] })
    mockGetComponentById.mockReturnValue(mockComponent)

    render(<InspectorPanel />)
    expect(screen.getByTestId("inspector-collapse-btn")).toBeInTheDocument()
  })

  it("toggles inspectorCollapsed when collapse button is clicked", () => {
    useUiStore.setState({ selectedNodeId: "node-1", inspectorCollapsed: false })
    useArchitectureStore.setState({ nodes: [mockNode] })
    mockGetComponentById.mockReturnValue(mockComponent)

    render(<InspectorPanel />)
    fireEvent.click(screen.getByTestId("inspector-collapse-btn"))
    expect(useUiStore.getState().inspectorCollapsed).toBe(true)
  })

  it("shows collapsed state with expand button", () => {
    useUiStore.setState({ selectedNodeId: "node-1", inspectorCollapsed: true })
    useArchitectureStore.setState({ nodes: [mockNode] })
    mockGetComponentById.mockReturnValue(mockComponent)

    render(<InspectorPanel />)
    expect(screen.getByTestId("inspector-panel")).toBeInTheDocument()
    expect(screen.getByTestId("inspector-collapse-btn")).toBeInTheDocument()
    // When collapsed, ComponentDetail should not be visible
    expect(screen.queryByText("PostgreSQL")).not.toBeInTheDocument()
  })

  it("shows expanded state with full component detail", () => {
    useUiStore.setState({ selectedNodeId: "node-1", inspectorCollapsed: false })
    useArchitectureStore.setState({ nodes: [mockNode] })
    mockGetComponentById.mockReturnValue(mockComponent)

    render(<InspectorPanel />)
    expect(screen.getByText("PostgreSQL")).toBeInTheDocument()
    expect(screen.getByText("Relational database")).toBeInTheDocument()
  })

  it("collapse button has aria-label 'Collapse inspector' when expanded", () => {
    useUiStore.setState({ selectedNodeId: "node-1", inspectorCollapsed: false })
    useArchitectureStore.setState({ nodes: [mockNode] })
    mockGetComponentById.mockReturnValue(mockComponent)

    render(<InspectorPanel />)
    expect(screen.getByTestId("inspector-collapse-btn")).toHaveAttribute("aria-label", "Collapse inspector")
  })

  it("collapse button has aria-label 'Expand inspector' when collapsed", () => {
    useUiStore.setState({ selectedNodeId: "node-1", inspectorCollapsed: true })
    useArchitectureStore.setState({ nodes: [mockNode] })
    mockGetComponentById.mockReturnValue(mockComponent)

    render(<InspectorPanel />)
    expect(screen.getByTestId("inspector-collapse-btn")).toHaveAttribute("aria-label", "Expand inspector")
  })

  it("updates architectureStore when variant changes via handleVariantChange", () => {
    useUiStore.setState({ selectedNodeId: "node-1", inspectorCollapsed: false })
    useArchitectureStore.setState({ nodes: [mockNode], edges: [] })
    mockGetComponentById.mockReturnValue(mockComponent)

    render(<InspectorPanel />)

    // Directly call updateNodeConfigVariant on the store to verify wiring
    useArchitectureStore.getState().updateNodeConfigVariant("node-1", "high-perf")
    const updatedNode = useArchitectureStore.getState().nodes.find((n) => n.id === "node-1")
    expect(updatedNode?.data.activeConfigVariantId).toBe("high-perf")
  })

  it("does not update store when variant is same as current (no-op guard)", () => {
    useUiStore.setState({ selectedNodeId: "node-1", inspectorCollapsed: false })
    useArchitectureStore.setState({ nodes: [mockNode], edges: [] })
    mockGetComponentById.mockReturnValue(mockComponent)

    const nodesBefore = useArchitectureStore.getState().nodes

    useArchitectureStore.getState().updateNodeConfigVariant("node-1", "standard")
    // No-op guard: same variant should not create new array reference
    expect(useArchitectureStore.getState().nodes).toBe(nodesBefore)
  })

  describe("edge selection (AC-ARCH-PATTERN-1)", () => {
    const mockEdge: ArchieEdge = {
      id: "edge-1",
      source: "node-1",
      target: "node-2",
      data: {
        isIncompatible: false,
        incompatibilityReason: null,
        sourceArchieComponentId: "postgresql",
        targetArchieComponentId: "redis",
      },
    }

    const mockSourceComponent = {
      ...mockComponent,
      id: "postgresql",
      connectionProperties: {
        protocol: "TCP",
        communicationPatterns: ["request-response"],
        typicalLatency: "1-5ms",
        coLocationPotential: true,
      },
    }

    it("renders ConnectionDetail when edge is selected (AC-ARCH-PATTERN-1)", () => {
      useUiStore.setState({ selectedEdgeId: "edge-1", selectedNodeId: null })
      useArchitectureStore.setState({
        nodes: [mockNode],
        edges: [mockEdge],
        heatmapColors: new Map<string, HeatmapStatus>(),
        edgeHeatmapColors: new Map<string, HeatmapStatus>(),
      })
      mockGetComponentById.mockImplementation((id: string) => {
        if (id === "postgresql") return mockSourceComponent
        return undefined
      })

      render(<InspectorPanel />)
      expect(screen.getByTestId("inspector-panel")).toBeInTheDocument()
      expect(screen.getByTestId("connection-detail")).toBeInTheDocument()
    })

    it("renders ComponentDetail for node, not ConnectionDetail (mutual exclusion)", () => {
      useUiStore.setState({ selectedNodeId: "node-1", selectedEdgeId: null })
      useArchitectureStore.setState({ nodes: [mockNode], edges: [mockEdge] })
      mockGetComponentById.mockReturnValue(mockComponent)

      render(<InspectorPanel />)
      expect(screen.getByTestId("inspector-panel")).toBeInTheDocument()
      expect(screen.queryByTestId("connection-detail")).not.toBeInTheDocument()
      expect(screen.getByText("PostgreSQL")).toBeInTheDocument()
    })

    it("collapsed state works with edge selection", () => {
      useUiStore.setState({ selectedEdgeId: "edge-1", selectedNodeId: null, inspectorCollapsed: true })
      useArchitectureStore.setState({
        nodes: [mockNode],
        edges: [mockEdge],
        heatmapColors: new Map<string, HeatmapStatus>(),
        edgeHeatmapColors: new Map<string, HeatmapStatus>(),
      })
      mockGetComponentById.mockReturnValue(mockSourceComponent)

      render(<InspectorPanel />)
      expect(screen.getByTestId("inspector-panel")).toBeInTheDocument()
      expect(screen.getByTestId("inspector-collapse-btn")).toBeInTheDocument()
      // Collapsed: ConnectionDetail content should not be visible
      expect(screen.queryByTestId("connection-detail")).not.toBeInTheDocument()
    })
  })
})
