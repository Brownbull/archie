import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"
import { GhostNode } from "@/components/canvas/GhostNode"
import { useArchitectureStore } from "@/stores/architectureStore"

vi.mock("@/lib/firebase", () => ({
  auth: { currentUser: null },
  db: {},
}))

vi.mock("@/services/recalculationService", () => ({
  recalculationService: {
    run: vi.fn(() => ({ metrics: new Map(), propagationHops: [], edgeHeatmap: new Map() })),
  },
}))

vi.mock("@/services/componentLibrary", () => ({
  componentLibrary: {
    isInitialized: () => true,
    getComponent: vi.fn((id: string) => {
      if (id === "redis") return { id: "redis", name: "Redis", category: "caching", configVariants: [{ id: "default", name: "Default", metrics: [] }] }
      return undefined
    }),
    getAllComponents: () => [],
    getComponentsByCategory: vi.fn(() => []),
    searchComponents: vi.fn(() => []),
    reset: vi.fn(),
  },
}))

vi.mock("@xyflow/react", () => ({
  Handle: ({ type, position }: { type: string; position: string }) => (
    <div data-testid={`handle-${type}`} data-position={position} />
  ),
  Position: { Left: "left", Right: "right", Top: "top", Bottom: "bottom" },
}))

const defaultProps = {
  id: "ghost-n1-redis",
  type: "ghost" as const,
  data: {
    ghostComponentId: "redis",
    ghostComponentName: "Redis",
    ghostCategory: "caching",
    anchorNodeId: "n1",
    reason: "Adding Redis closes a tier gap",
    ghostPosition: { x: 300, y: 100 },
  },
  positionAbsoluteX: 300,
  positionAbsoluteY: 100,
  zIndex: 1,
  isConnectable: false,
  dragging: false,
  selected: false,
  deletable: false,
  parentId: undefined,
  sourcePosition: undefined,
  targetPosition: undefined,
  width: 140,
  height: 80,
  dragHandle: undefined,
} satisfies Parameters<typeof GhostNode>[0]

function seedAnchorNode() {
  useArchitectureStore.setState({
    nodes: [{
      id: "n1",
      type: "archie-component",
      position: { x: 100, y: 100 },
      data: {
        archieComponentId: "postgresql",
        componentName: "PostgreSQL",
        componentCategory: "data-storage",
        activeConfigVariantId: "default",
      },
    }],
    edges: [],
  } as Partial<ReturnType<typeof useArchitectureStore.getState>> as never)
}

describe("GhostNode", () => {
  beforeEach(() => {
    seedAnchorNode()
  })

  it("renders with ghost appearance", () => {
    render(<GhostNode {...defaultProps} />)
    const node = screen.getByTestId("ghost-node")
    expect(node).toBeInTheDocument()
    expect(node).toHaveClass("border-dashed", "opacity-40")
  })

  it("displays component name", () => {
    render(<GhostNode {...defaultProps} />)
    expect(screen.getByText("Redis")).toBeInTheDocument()
  })

  it("displays reason text", () => {
    render(<GhostNode {...defaultProps} />)
    expect(screen.getByText("Adding Redis closes a tier gap")).toBeInTheDocument()
  })

  it("has accessible role and label", () => {
    render(<GhostNode {...defaultProps} />)
    const node = screen.getByTestId("ghost-node")
    expect(node.tagName).toBe("BUTTON")
    expect(node).toHaveAttribute("aria-label", "Add Redis")
  })

  it("click-to-place creates a real node", () => {
    render(<GhostNode {...defaultProps} />)

    fireEvent.click(screen.getByTestId("ghost-node"))

    const nodes = useArchitectureStore.getState().nodes
    const realNode = nodes.find((n) => n.data.archieComponentId === "redis")
    expect(realNode).toBeDefined()
    expect(realNode!.position.x).toBeGreaterThanOrEqual(288)
    expect(realNode!.position.y).toBeGreaterThanOrEqual(80)
  })
})
