import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"
import { RadialMenu } from "@/components/canvas/RadialMenu"
import { useUiStore } from "@/stores/uiStore"
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
      if (id === "postgresql") return { id: "postgresql", name: "PostgreSQL", category: "data-storage" }
      return undefined
    }),
    getAllComponents: () => [],
    getComponentsByCategory: vi.fn(() => []),
    searchComponents: vi.fn(() => []),
    reset: vi.fn(),
  },
}))

function seedNode() {
  useArchitectureStore.setState({
    nodes: [{
      id: "node-1",
      type: "archie-component",
      position: { x: 100, y: 100 },
      data: {
        archieComponentId: "postgresql",
        componentName: "PostgreSQL",
        componentCategory: "data-storage",
        activeConfigVariantId: "default",
      },
    }],
  } as Partial<ReturnType<typeof useArchitectureStore.getState>> as never)
}

describe("RadialMenu", () => {
  beforeEach(() => {
    useUiStore.setState({ contextMenu: null, selectedNodeId: null })
    seedNode()
  })

  it("renders nothing when contextMenu is null", () => {
    render(<RadialMenu />)
    expect(screen.queryByTestId("radial-menu")).not.toBeInTheDocument()
  })

  it("renders the radial menu when contextMenu is set", () => {
    useUiStore.setState({ contextMenu: { nodeId: "node-1", x: 200, y: 200 } })
    render(<RadialMenu />)
    expect(screen.getByTestId("radial-menu")).toBeInTheDocument()
  })

  it("renders all 6 action items", () => {
    useUiStore.setState({ contextMenu: { nodeId: "node-1", x: 200, y: 200 } })
    render(<RadialMenu />)
    expect(screen.getByTestId("radial-item-inspect")).toBeInTheDocument()
    expect(screen.getByTestId("radial-item-duplicate")).toBeInTheDocument()
    expect(screen.getByTestId("radial-item-swap")).toBeInTheDocument()
    expect(screen.getByTestId("radial-item-trade-offs")).toBeInTheDocument()
    expect(screen.getByTestId("radial-item-connect")).toBeInTheDocument()
    expect(screen.getByTestId("radial-item-delete")).toBeInTheDocument()
  })

  it("displays component name in center label", () => {
    useUiStore.setState({ contextMenu: { nodeId: "node-1", x: 200, y: 200 } })
    render(<RadialMenu />)
    expect(screen.getByText("PostgreSQL")).toBeInTheDocument()
  })

  it("connect button is disabled", () => {
    useUiStore.setState({ contextMenu: { nodeId: "node-1", x: 200, y: 200 } })
    render(<RadialMenu />)
    const connectBtn = screen.getByTestId("radial-item-connect")
    expect(connectBtn).toBeDisabled()
  })

  it("has correct ARIA role and label", () => {
    useUiStore.setState({ contextMenu: { nodeId: "node-1", x: 200, y: 200 } })
    render(<RadialMenu />)
    const menu = screen.getByTestId("radial-menu")
    expect(menu).toHaveAttribute("role", "menu")
    expect(menu).toHaveAttribute("aria-label", "Actions for PostgreSQL")
  })

  describe("actions", () => {
    it("inspect selects node and closes menu", () => {
      useUiStore.setState({ contextMenu: { nodeId: "node-1", x: 200, y: 200 } })
      render(<RadialMenu />)
      fireEvent.click(screen.getByTestId("radial-item-inspect"))
      expect(useUiStore.getState().selectedNodeId).toBe("node-1")
      expect(useUiStore.getState().contextMenu).toBeNull()
    })

    it("delete removes node and closes menu", () => {
      useUiStore.setState({ contextMenu: { nodeId: "node-1", x: 200, y: 200 } })
      render(<RadialMenu />)
      fireEvent.click(screen.getByTestId("radial-item-delete"))
      expect(useArchitectureStore.getState().nodes).toHaveLength(0)
      expect(useUiStore.getState().contextMenu).toBeNull()
    })

    it("duplicate creates a new node and closes menu", () => {
      useUiStore.setState({ contextMenu: { nodeId: "node-1", x: 200, y: 200 } })
      render(<RadialMenu />)
      fireEvent.click(screen.getByTestId("radial-item-duplicate"))
      expect(useArchitectureStore.getState().nodes).toHaveLength(2)
      const newNode = useArchitectureStore.getState().nodes[1]
      expect(newNode.data.archieComponentId).toBe("postgresql")
      expect(newNode.position.x).toBeGreaterThan(100)
      expect(useUiStore.getState().contextMenu).toBeNull()
    })
  })

  describe("keyboard navigation", () => {
    it("Escape closes the menu", () => {
      useUiStore.setState({ contextMenu: { nodeId: "node-1", x: 200, y: 200 } })
      render(<RadialMenu />)
      fireEvent.keyDown(document, { key: "Escape" })
      expect(useUiStore.getState().contextMenu).toBeNull()
    })

    it("ArrowDown cycles focus forward", () => {
      useUiStore.setState({ contextMenu: { nodeId: "node-1", x: 200, y: 200 } })
      render(<RadialMenu />)
      fireEvent.keyDown(document, { key: "ArrowDown" })
      const inspectBtn = screen.getByTestId("radial-item-inspect")
      expect(inspectBtn).toHaveAttribute("tabindex", "0")
    })

    it("ArrowUp cycles focus backward (wraps to last)", () => {
      useUiStore.setState({ contextMenu: { nodeId: "node-1", x: 200, y: 200 } })
      render(<RadialMenu />)
      fireEvent.keyDown(document, { key: "ArrowUp" })
      const deleteBtn = screen.getByTestId("radial-item-delete")
      expect(deleteBtn).toHaveAttribute("tabindex", "0")
    })

    it("Enter activates focused item", () => {
      useUiStore.setState({ contextMenu: { nodeId: "node-1", x: 200, y: 200 } })
      render(<RadialMenu />)
      fireEvent.keyDown(document, { key: "ArrowDown" })
      fireEvent.keyDown(document, { key: "Enter" })
      expect(useUiStore.getState().selectedNodeId).toBe("node-1")
      expect(useUiStore.getState().contextMenu).toBeNull()
    })

    it("Space activates focused item", () => {
      useUiStore.setState({ contextMenu: { nodeId: "node-1", x: 200, y: 200 } })
      render(<RadialMenu />)
      fireEvent.keyDown(document, { key: "ArrowDown" })
      fireEvent.keyDown(document, { key: " " })
      expect(useUiStore.getState().selectedNodeId).toBe("node-1")
      expect(useUiStore.getState().contextMenu).toBeNull()
    })

    it("Enter on disabled item does nothing", () => {
      useUiStore.setState({ contextMenu: { nodeId: "node-1", x: 200, y: 200 } })
      render(<RadialMenu />)
      // Navigate to connect (index 4): 5 ArrowDown presses from -1
      for (let i = 0; i < 5; i++) fireEvent.keyDown(document, { key: "ArrowDown" })
      const connectBtn = screen.getByTestId("radial-item-connect")
      expect(connectBtn).toHaveAttribute("tabindex", "0")
      fireEvent.keyDown(document, { key: "Enter" })
      expect(useUiStore.getState().contextMenu).not.toBeNull()
    })
  })
})

describe("uiStore contextMenu", () => {
  beforeEach(() => {
    useUiStore.setState({ contextMenu: null })
  })

  it("openContextMenu sets context menu state", () => {
    useUiStore.getState().openContextMenu({ nodeId: "node-1", x: 100, y: 200 })
    expect(useUiStore.getState().contextMenu).toEqual({ nodeId: "node-1", x: 100, y: 200 })
  })

  it("closeContextMenu clears context menu", () => {
    useUiStore.getState().openContextMenu({ nodeId: "node-1", x: 100, y: 200 })
    useUiStore.getState().closeContextMenu()
    expect(useUiStore.getState().contextMenu).toBeNull()
  })
})

describe("architectureStore.duplicateNode", () => {
  beforeEach(() => {
    seedNode()
  })

  it("creates a duplicate with offset position", () => {
    const newId = useArchitectureStore.getState().duplicateNode("node-1")
    expect(newId).toBeTruthy()
    const nodes = useArchitectureStore.getState().nodes
    expect(nodes).toHaveLength(2)
    const dup = nodes.find((n) => n.id === newId)
    expect(dup).toBeDefined()
    expect(dup!.data.archieComponentId).toBe("postgresql")
    expect(dup!.data.componentCategory).toBe("data-storage")
    expect(dup!.position.x).toBeGreaterThan(100)
  })

  it("returns null for nonexistent node", () => {
    const result = useArchitectureStore.getState().duplicateNode("nonexistent")
    expect(result).toBeNull()
  })
})
