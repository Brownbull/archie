import { render, screen } from "@testing-library/react"
import { describe, it, expect, vi, beforeEach } from "vitest"
import { useArchitectureStore, type ArchieEdge } from "@/stores/architectureStore"
import type { HeatmapStatus } from "@/engine/heatmapCalculator"

// Mock useLibrary hook
const mockGetComponentById = vi.fn()
vi.mock("@/hooks/useLibrary", () => ({
  useLibrary: () => ({
    isReady: true,
    components: [],
    getComponentById: mockGetComponentById,
    getComponentsByCategory: vi.fn().mockReturnValue([]),
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

// Import after mocks
const { ConnectionDetail } = await import("@/components/inspector/ConnectionDetail")

const mockEdge: ArchieEdge = {
  id: "edge-1",
  source: "node-1",
  target: "node-2",
  data: {
    isIncompatible: false,
    incompatibilityReason: null,
    sourceArchieComponentId: "comp-source",
    targetArchieComponentId: "comp-target",
  },
}

const mockSourceComponent = {
  id: "comp-source",
  name: "API Gateway",
  category: "compute",
  description: "API gateway service",
  is: "An API gateway",
  gain: ["Unified entry point"],
  cost: ["Single point of failure"],
  tags: ["gateway"],
  baseMetrics: [],
  configVariants: [{ id: "standard", name: "Standard", metrics: [] }],
  connectionProperties: {
    protocol: "gRPC",
    communicationPatterns: ["request-response", "streaming"],
    typicalLatency: "1-5ms",
    coLocationPotential: true,
  },
}

const mockTargetComponent = {
  id: "comp-target",
  name: "PostgreSQL",
  category: "data-storage",
  description: "Relational database",
  is: "A relational database",
  gain: ["ACID"],
  cost: ["Memory"],
  tags: ["database"],
  baseMetrics: [],
  configVariants: [{ id: "standard", name: "Standard", metrics: [] }],
}

const mockSourceWithoutConnectionProps = {
  ...mockSourceComponent,
  connectionProperties: undefined,
}

describe("ConnectionDetail", () => {
  beforeEach(() => {
    vi.resetAllMocks()
    useArchitectureStore.setState({
      edges: [],
      heatmapColors: new Map<string, HeatmapStatus>(),
      edgeHeatmapColors: new Map<string, HeatmapStatus>(),
    })
  })

  it("returns null when edge is not found in store", () => {
    useArchitectureStore.setState({ edges: [] })
    const { container } = render(<ConnectionDetail edgeId="nonexistent" />)
    expect(container.innerHTML).toBe("")
  })

  it("renders connection properties when connectionProperties exists", () => {
    useArchitectureStore.setState({ edges: [mockEdge] })
    mockGetComponentById.mockImplementation((id: string) => {
      if (id === "comp-source") return mockSourceComponent
      if (id === "comp-target") return mockTargetComponent
      return undefined
    })

    render(<ConnectionDetail edgeId="edge-1" />)

    expect(screen.getByTestId("connection-detail")).toBeInTheDocument()
    expect(screen.getByTestId("connection-properties")).toBeInTheDocument()
    expect(screen.getByText("gRPC")).toBeInTheDocument()
    expect(screen.getByText("1-5ms")).toBeInTheDocument()
    expect(screen.getByText(/request-response/)).toBeInTheDocument()
    expect(screen.getByText(/streaming/)).toBeInTheDocument()
  })

  it("renders 'No connection properties available' when connectionProperties is undefined", () => {
    useArchitectureStore.setState({ edges: [mockEdge] })
    mockGetComponentById.mockImplementation((id: string) => {
      if (id === "comp-source") return mockSourceWithoutConnectionProps
      if (id === "comp-target") return mockTargetComponent
      return undefined
    })

    render(<ConnectionDetail edgeId="edge-1" />)

    expect(screen.getByTestId("no-connection-properties")).toBeInTheDocument()
    expect(screen.queryByTestId("connection-properties")).not.toBeInTheDocument()
  })

  it("renders source and target component names", () => {
    useArchitectureStore.setState({ edges: [mockEdge] })
    mockGetComponentById.mockImplementation((id: string) => {
      if (id === "comp-source") return mockSourceComponent
      if (id === "comp-target") return mockTargetComponent
      return undefined
    })

    render(<ConnectionDetail edgeId="edge-1" />)

    // Names appear in header and endpoint health section
    expect(screen.getAllByText("API Gateway").length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText("PostgreSQL").length).toBeGreaterThanOrEqual(1)
  })

  it("renders endpoint health badges", () => {
    const heatmapColors = new Map<string, HeatmapStatus>([
      ["node-1", "healthy"],
      ["node-2", "warning"],
    ])
    useArchitectureStore.setState({ edges: [mockEdge], heatmapColors })
    mockGetComponentById.mockImplementation((id: string) => {
      if (id === "comp-source") return mockSourceComponent
      if (id === "comp-target") return mockTargetComponent
      return undefined
    })

    render(<ConnectionDetail edgeId="edge-1" />)

    expect(screen.getByTestId("endpoint-health")).toBeInTheDocument()
  })

  it("renders overall connection heatmap status", () => {
    const edgeHeatmapColors = new Map<string, HeatmapStatus>([
      ["edge-1", "bottleneck"],
    ])
    useArchitectureStore.setState({ edges: [mockEdge], edgeHeatmapColors })
    mockGetComponentById.mockImplementation((id: string) => {
      if (id === "comp-source") return mockSourceComponent
      if (id === "comp-target") return mockTargetComponent
      return undefined
    })

    render(<ConnectionDetail edgeId="edge-1" />)

    expect(screen.getByTestId("connection-heatmap")).toBeInTheDocument()
  })

  it("shows co-location potential as Yes when true", () => {
    useArchitectureStore.setState({ edges: [mockEdge] })
    mockGetComponentById.mockImplementation((id: string) => {
      if (id === "comp-source") return mockSourceComponent
      if (id === "comp-target") return mockTargetComponent
      return undefined
    })

    render(<ConnectionDetail edgeId="edge-1" />)

    expect(screen.getByText("Yes")).toBeInTheDocument()
  })

  it("handles case where source component is not found in library", () => {
    useArchitectureStore.setState({ edges: [mockEdge] })
    mockGetComponentById.mockReturnValue(undefined)

    render(<ConnectionDetail edgeId="edge-1" />)

    expect(screen.getByTestId("connection-detail")).toBeInTheDocument()
    expect(screen.getByTestId("no-connection-properties")).toBeInTheDocument()
  })
})
