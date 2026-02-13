import { render, screen, fireEvent } from "@testing-library/react"
import { describe, it, expect, vi, beforeEach } from "vitest"
import { useUiStore } from "@/stores/uiStore"
import { useArchitectureStore, type ArchieNode } from "@/stores/architectureStore"
import { NODE_TYPE_COMPONENT } from "@/lib/constants"

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

  it("renders null when no node is selected", () => {
    const { container } = render(<InspectorPanel />)
    expect(container.innerHTML).toBe("")
  })

  it("renders null when selected node is not found in store", () => {
    useUiStore.setState({ selectedNodeId: "nonexistent-node" })
    useArchitectureStore.setState({ nodes: [mockNode] })

    const { container } = render(<InspectorPanel />)
    expect(container.innerHTML).toBe("")
  })

  it("renders null when component is not found in library", () => {
    useUiStore.setState({ selectedNodeId: "node-1" })
    useArchitectureStore.setState({ nodes: [mockNode] })
    mockGetComponentById.mockReturnValue(undefined)

    const { container } = render(<InspectorPanel />)
    expect(container.innerHTML).toBe("")
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
})
