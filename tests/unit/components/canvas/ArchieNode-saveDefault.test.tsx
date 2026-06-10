import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen } from "@testing-library/react"
import { ArchieNode } from "@/components/canvas/ArchieNode"
import { useSimulationStore } from "@/stores/simulationStore"
import type { TopMetric } from "@/hooks/useTopMetrics"
import type { NodePorts } from "@/hooks/useNodePorts"

vi.mock("@xyflow/react", () => ({
  Handle: ({ type, position, ...props }: Record<string, unknown>) => (
    <div data-testid={`handle-${type}`} data-position={position} {...props} />
  ),
  Position: { Left: "left", Right: "right", Top: "top" },
  NodeToolbar: ({ children, isVisible }: { children: React.ReactNode; isVisible?: boolean }) =>
    isVisible ? <div data-testid="node-toolbar-portal">{children}</div> : null,
}))

vi.mock("@/lib/firebase", () => ({ auth: { currentUser: null }, db: {} }))

// The button's own behavior is covered by SaveBlockDefaultButton.test.tsx — here we only assert
// WHERE ArchieNode renders it, so stub it to a marker.
vi.mock("@/components/canvas/SaveBlockDefaultButton", () => ({
  SaveBlockDefaultButton: () => <div data-testid="save-block-default" />,
}))

let mockTopMetrics: TopMetric[] = []
vi.mock("@/hooks/useTopMetrics", () => ({ useTopMetrics: () => mockTopMetrics }))

const mockGetComponent = vi.fn()
vi.mock("@/services/componentLibrary", () => ({
  componentLibrary: {
    getComponent: (...args: unknown[]) => mockGetComponent(...args),
    // NodeProviderSelect (mounted for typed blocks) enumerates same-type providers.
    getAllComponents: vi.fn(() => []),
  },
}))

vi.mock("@/engine/compatibilityChecker", () => ({
  checkCompatibility: vi.fn(() => ({ isCompatible: true, reason: "" })),
}))

let mockNodePorts: NodePorts = { inputs: [], outputs: [], hasPorts: false }
vi.mock("@/hooks/useNodePorts", () => ({ useNodePorts: () => mockNodePorts }))

vi.mock("@/stores/architectureStore", () => {
  const fn = Object.assign(
    vi.fn((selector: (s: Record<string, unknown>) => unknown) =>
      selector({
        heatmapColors: new Map(),
        violationsByNodeId: new Map(),
        constraints: [],
        rippleActiveNodeIds: new Set(),
        topologyIssuesByNodeId: new Map(),
        setNodeReplicaCount: vi.fn(),
        edges: [],
        computedMetrics: new Map(),
        weightProfile: {},
      }),
    ),
    { getState: () => ({ nodes: [] }) },
  )
  return { useArchitectureStore: fn }
})

vi.mock("@/stores/preferencesStore", () => ({
  usePreferencesStore: vi.fn((selector: (s: Record<string, unknown>) => unknown) =>
    selector({ animationsEnabled: false, experienceLevel: "advanced" }),
  ),
}))

vi.mock("@/stores/uiStore", () => ({
  useUiStore: vi.fn((selector: (s: Record<string, unknown>) => unknown) =>
    selector({ heatmapEnabled: false, activeDrag: null }),
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

describe("ArchieNode — save-as-default button placement (P1/T3)", () => {
  beforeEach(() => {
    mockTopMetrics = []
    mockNodePorts = { inputs: [], outputs: [], hasPorts: false }
    mockGetComponent.mockReturnValue(undefined)
    useSimulationStore.getState().reset()
  })

  it("renders the button on a typed non-traffic block", () => {
    mockGetComponent.mockReturnValue({ typeId: "relational-db", configVariants: [] })
    render(<ArchieNode {...defaultProps} />)
    expect(screen.getByTestId("save-block-default")).toBeInTheDocument()
  })

  it("does NOT render the button on a traffic source (demand is per-challenge, never a saved default)", () => {
    mockGetComponent.mockReturnValue({ typeId: "traffic-source", configVariants: [] })
    render(
      <ArchieNode
        {...defaultProps}
        data={{
          ...defaultProps.data,
          archieComponentId: "web-users",
          componentName: "Web Users",
          componentCategory: "traffic" as const,
        }}
      />,
    )
    expect(screen.queryByTestId("save-block-default")).not.toBeInTheDocument()
  })

  it("does NOT render the button on pre-P5 typeless blocks (unchanged behavior)", () => {
    mockGetComponent.mockReturnValue({ typeId: undefined, configVariants: [] })
    render(<ArchieNode {...defaultProps} />)
    expect(screen.queryByTestId("save-block-default")).not.toBeInTheDocument()
  })
})
