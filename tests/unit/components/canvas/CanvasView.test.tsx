import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react"
import { CanvasView } from "@/components/canvas/CanvasView"
import { useArchitectureStore } from "@/stores/architectureStore"
import { useUiStore } from "@/stores/uiStore"
import { componentLibrary } from "@/services/componentLibrary"
import { resolveStackPlacement } from "@/services/stackPlacement"
import { CANVAS_FIT_PADDING } from "@/lib/constants"

// ChallengeResultsModal (mounted by CanvasView) runs the persistence hook, which needs auth
// context; it has its own unit test + E2E, so stub it here to keep CanvasView isolated.
vi.mock("@/hooks/useAttemptPersistence", () => ({ useAttemptPersistence: () => undefined }))
vi.mock("@/hooks/useProgressPersistence", () => ({ useProgressPersistence: () => undefined }))
vi.mock("@/hooks/useBreakCollection", () => ({ useBreakCollection: () => null }))
vi.mock("@/hooks/useResilienceClears", () => ({ useResilienceClears: () => null }))
vi.mock("@/hooks/useAttemptComparison", () => ({ useAttemptComparison: () => null }))

const mockScreenToFlowPosition = vi.fn((pos: { x: number; y: number }) => pos)
const mockFitView = vi.fn()

vi.mock("@xyflow/react", () => ({
  ReactFlow: ({
    children,
    onNodeClick,
    onEdgeClick,
    onPaneClick,
    onConnect,
    onNodesDelete,
    onEdgesDelete,
    onNodeContextMenu,
    ...props
  }: Record<string, unknown>) => (
    <div data-testid="react-flow-mock" data-props={JSON.stringify(props)}>
      <button data-testid="mock-node-click" onClick={() => (onNodeClick as CallableFunction)?.({}, { id: "node-1" })} />
      <button data-testid="mock-edge-click" onClick={() => (onEdgeClick as CallableFunction)?.({}, { id: "edge-1" })} />
      <button data-testid="mock-pane-click" onClick={() => (onPaneClick as CallableFunction)?.()} />
      <button
        data-testid="mock-connect"
        onClick={() =>
          (onConnect as CallableFunction)?.({
            source: "node-1",
            target: "node-2",
            sourceHandle: null,
            targetHandle: null,
          })
        }
      />
      <button
        data-testid="mock-nodes-delete"
        onClick={() => (onNodesDelete as CallableFunction)?.([{ id: "node-1" }])}
      />
      <button
        data-testid="mock-edges-delete"
        onClick={() => (onEdgesDelete as CallableFunction)?.([{ id: "edge-1" }])}
      />
      <button
        data-testid="mock-node-context-menu"
        onClick={() =>
          (onNodeContextMenu as CallableFunction)?.({ preventDefault: vi.fn(), clientX: 300, clientY: 400 }, { id: "node-1" })
        }
      />
      {children as React.ReactNode}
    </div>
  ),
  ReactFlowProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  Background: () => <div data-testid="react-flow-background" />,
  MiniMap: () => <div data-testid="react-flow-minimap" />,
  Controls: () => <div data-testid="react-flow-controls" />,
  useReactFlow: () => ({
    screenToFlowPosition: mockScreenToFlowPosition,
    fitView: mockFitView,
  }),
  BackgroundVariant: { Dots: "dots" },
  Position: { Left: "left", Right: "right" },
  Handle: ({ type, ...props }: Record<string, unknown>) => <div data-testid={`handle-${type}`} {...props} />,
  applyNodeChanges: vi.fn((_changes: unknown, nodes: unknown) => nodes),
  applyEdgeChanges: vi.fn((_changes: unknown, edges: unknown) => edges),
}))

vi.mock("@/services/componentLibrary", () => ({
  componentLibrary: {
    getComponent: vi.fn((id: string) => {
      if (id === "postgresql") {
        return {
          id: "postgresql",
          name: "PostgreSQL",
          category: "data-storage",
          description: "DB",
          is: "DB",
          gain: ["G"],
          cost: ["C"],
          tags: [],
          baseMetrics: [],
          configVariants: [{ id: "default", name: "Default", metrics: [] }],
        }
      }
      return undefined
    }),
    getStackById: vi.fn(),
    getComponentsByCategory: vi.fn(() => []),
    isInitialized: () => true,
    reset: vi.fn(),
  },
}))

vi.mock("@/services/stackPlacement", () => ({
  resolveStackPlacement: vi.fn(),
}))

vi.mock("@/lib/firebase", () => ({
  auth: { currentUser: null },
  db: {},
}))

describe("CanvasView", () => {
  beforeEach(() => {
    vi.resetAllMocks()
    useArchitectureStore.setState({ nodes: [], edges: [] })
    useUiStore.setState({ selectedNodeId: null, selectedEdgeId: null })
  })

  it("renders canvas-panel testid", () => {
    render(<CanvasView />)
    expect(screen.getByTestId("canvas-panel")).toBeInTheDocument()
  })

  it("renders React Flow with Background, MiniMap, Controls", () => {
    render(<CanvasView />)
    expect(screen.getByTestId("react-flow-mock")).toBeInTheDocument()
    expect(screen.getByTestId("react-flow-background")).toBeInTheDocument()
    expect(screen.getByTestId("react-flow-minimap")).toBeInTheDocument()
    expect(screen.getByTestId("react-flow-controls")).toBeInTheDocument()
  })

  it("shows EmptyCanvasState when nodes are empty", () => {
    render(<CanvasView />)
    expect(screen.getByTestId("canvas-empty-state")).toBeInTheDocument()
  })

  it("hides EmptyCanvasState when nodes exist", () => {
    useArchitectureStore.setState({
      nodes: [
        {
          id: "n1",
          type: "archie-component" as const,
          position: { x: 0, y: 0 },
          data: {
            archieComponentId: "pg",
            activeConfigVariantId: "default",
            componentName: "PG",
            componentCategory: "data-storage" as const,
          },
        },
      ],
    })
    render(<CanvasView />)
    expect(screen.queryByTestId("canvas-empty-state")).not.toBeInTheDocument()
  })

  it("onNodeClick sets selectedNodeId in uiStore", () => {
    render(<CanvasView />)
    fireEvent.click(screen.getByTestId("mock-node-click"))
    expect(useUiStore.getState().selectedNodeId).toBe("node-1")
  })

  it("onEdgeClick sets selectedEdgeId in uiStore", () => {
    render(<CanvasView />)
    fireEvent.click(screen.getByTestId("mock-edge-click"))
    expect(useUiStore.getState().selectedEdgeId).toBe("edge-1")
  })

  it("onEdgeClick clears selectedNodeId (mutual exclusion)", () => {
    useUiStore.setState({ selectedNodeId: "node-1" })
    render(<CanvasView />)
    fireEvent.click(screen.getByTestId("mock-edge-click"))
    expect(useUiStore.getState().selectedNodeId).toBeNull()
    expect(useUiStore.getState().selectedEdgeId).toBe("edge-1")
  })

  it("onPaneClick clears both selections", () => {
    useUiStore.setState({ selectedNodeId: "node-1", selectedEdgeId: "edge-1" })
    render(<CanvasView />)
    fireEvent.click(screen.getByTestId("mock-pane-click"))
    expect(useUiStore.getState().selectedNodeId).toBeNull()
    expect(useUiStore.getState().selectedEdgeId).toBeNull()
  })

  it("onConnect calls addEdge on architectureStore", () => {
    const addEdgeSpy = vi.spyOn(useArchitectureStore.getState(), "addEdge")
    render(<CanvasView />)
    fireEvent.click(screen.getByTestId("mock-connect"))
    expect(addEdgeSpy).toHaveBeenCalledWith({
      source: "node-1",
      target: "node-2",
      sourceHandle: null,
      targetHandle: null,
    })
  })

  it("onNodesDelete calls removeNodes (batch) on architectureStore", () => {
    const removeNodesSpy = vi.spyOn(useArchitectureStore.getState(), "removeNodes")
    render(<CanvasView />)
    fireEvent.click(screen.getByTestId("mock-nodes-delete"))
    expect(removeNodesSpy).toHaveBeenCalledWith(["node-1"])
  })

  it("onEdgesDelete calls removeEdges on architectureStore", () => {
    const removeEdgesSpy = vi.spyOn(useArchitectureStore.getState(), "removeEdges")
    render(<CanvasView />)
    fireEvent.click(screen.getByTestId("mock-edges-delete"))
    expect(removeEdgesSpy).toHaveBeenCalledWith(["edge-1"])
  })

  it("Escape key calls clearSelection", () => {
    useUiStore.setState({ selectedNodeId: "node-1" })
    render(<CanvasView />)
    const panel = screen.getByTestId("canvas-panel")
    fireEvent.keyDown(panel, { key: "Escape" })
    expect(useUiStore.getState().selectedNodeId).toBeNull()
    expect(useUiStore.getState().selectedEdgeId).toBeNull()
  })

  it("canvas panel has tabIndex for keyboard focus", () => {
    render(<CanvasView />)
    const panel = screen.getByTestId("canvas-panel")
    expect(panel).toHaveAttribute("tabindex", "-1")
  })

  it("onDrop calls addNode with componentId and position", () => {
    const addNodeSpy = vi.spyOn(useArchitectureStore.getState(), "addNode")
    mockScreenToFlowPosition.mockReturnValueOnce({ x: 100, y: 200 })

    render(<CanvasView />)
    const panel = screen.getByTestId("canvas-panel")

    const dropEvent = new Event("drop", { bubbles: true }) as unknown as DragEvent
    Object.defineProperty(dropEvent, "dataTransfer", {
      value: {
        getData: vi.fn((type: string) =>
          type === "application/archie-component" ? "postgresql" : "",
        ),
      },
    })
    Object.defineProperty(dropEvent, "clientX", { value: 100 })
    Object.defineProperty(dropEvent, "clientY", { value: 200 })
    Object.defineProperty(dropEvent, "preventDefault", { value: vi.fn() })

    fireEvent(panel, dropEvent)

    expect(addNodeSpy).toHaveBeenCalledWith("postgresql", { x: 100, y: 200 })
  })

  it("onDragOver prevents default", () => {
    render(<CanvasView />)
    const panel = screen.getByTestId("canvas-panel")

    const dragOverEvent = new Event("dragover", { bubbles: true })
    Object.defineProperty(dragOverEvent, "preventDefault", { value: vi.fn() })
    Object.defineProperty(dragOverEvent, "dataTransfer", { value: { dropEffect: "" } })

    fireEvent(panel, dragOverEvent)
    expect(dragOverEvent.preventDefault).toHaveBeenCalledWith()
  })

  it("passes deleteKeyCode to ReactFlow", () => {
    render(<CanvasView />)
    const rfMock = screen.getByTestId("react-flow-mock")
    const props = JSON.parse(rfMock.getAttribute("data-props") ?? "{}")
    expect(props.deleteKeyCode).toEqual(["Backspace", "Delete"])
  })

  it("enables forgiving wiring (connectOnClick + enlarged connectionRadius)", () => {
    render(<CanvasView />)
    const rfMock = screen.getByTestId("react-flow-mock")
    const props = JSON.parse(rfMock.getAttribute("data-props") ?? "{}")
    expect(props.connectOnClick).toBe(true)
    expect(props.connectionRadius).toBe(40)
  })

  it("auto-fits the viewport when an architecture is loaded (loadNonce bump)", async () => {
    useArchitectureStore.setState({ loadNonce: 0 })
    render(<CanvasView />)
    // Initial mount (loadNonce 0) must NOT auto-fit.
    expect(mockFitView).not.toHaveBeenCalled()

    act(() => {
      useArchitectureStore.getState().loadArchitecture([], [])
    })

    await waitFor(() =>
      expect(mockFitView).toHaveBeenCalledWith({ duration: 400, padding: CANVAS_FIT_PADDING }),
    )
  })

  describe("H key heatmap toggle", () => {
    it("H key triggers toggleHeatmap on canvas container", () => {
      useUiStore.setState({ heatmapEnabled: false })
      render(<CanvasView />)
      const panel = screen.getByTestId("canvas-panel")
      fireEvent.keyDown(panel, { key: "h" })
      expect(useUiStore.getState().heatmapEnabled).toBe(true)
    })

    it("uppercase H key also triggers toggleHeatmap", () => {
      useUiStore.setState({ heatmapEnabled: false })
      render(<CanvasView />)
      const panel = screen.getByTestId("canvas-panel")
      fireEvent.keyDown(panel, { key: "H" })
      expect(useUiStore.getState().heatmapEnabled).toBe(true)
    })

    it("H key ignored with Ctrl modifier", () => {
      useUiStore.setState({ heatmapEnabled: false })
      render(<CanvasView />)
      const panel = screen.getByTestId("canvas-panel")
      fireEvent.keyDown(panel, { key: "h", ctrlKey: true })
      expect(useUiStore.getState().heatmapEnabled).toBe(false)
    })

    it("H key ignored with Alt modifier", () => {
      useUiStore.setState({ heatmapEnabled: false })
      render(<CanvasView />)
      const panel = screen.getByTestId("canvas-panel")
      fireEvent.keyDown(panel, { key: "h", altKey: true })
      expect(useUiStore.getState().heatmapEnabled).toBe(false)
    })

    it("H key ignored with Meta modifier", () => {
      useUiStore.setState({ heatmapEnabled: false })
      render(<CanvasView />)
      const panel = screen.getByTestId("canvas-panel")
      fireEvent.keyDown(panel, { key: "h", metaKey: true })
      expect(useUiStore.getState().heatmapEnabled).toBe(false)
    })

    it("H key ignored when target is INPUT element", () => {
      useUiStore.setState({ heatmapEnabled: false })
      render(<CanvasView />)
      const panel = screen.getByTestId("canvas-panel")

      const input = document.createElement("input")
      panel.appendChild(input)
      fireEvent.keyDown(input, { key: "h", bubbles: true })

      expect(useUiStore.getState().heatmapEnabled).toBe(false)
    })

    it("H key ignored when target is TEXTAREA element", () => {
      useUiStore.setState({ heatmapEnabled: false })
      render(<CanvasView />)
      const panel = screen.getByTestId("canvas-panel")

      const textarea = document.createElement("textarea")
      panel.appendChild(textarea)
      fireEvent.keyDown(textarea, { key: "h", bubbles: true })

      expect(useUiStore.getState().heatmapEnabled).toBe(false)
    })
  })

  it("pendingNavNodeId selects node and calls fitView", () => {
    useUiStore.setState({ pendingNavNodeId: "node-42" })
    render(<CanvasView />)
    expect(useUiStore.getState().selectedNodeId).toBe("node-42")
    expect(mockFitView).toHaveBeenCalledWith({
      nodes: [{ id: "node-42" }],
      duration: 400,
      padding: 0.5,
    })
    expect(useUiStore.getState().pendingNavNodeId).toBeNull()
  })

  it("onConnect creates edge but onEdgesChange does not", () => {
    // Verify the architectural invariant: edge creation only via onConnect, not onEdgesChange
    const addEdgeSpy = vi.spyOn(useArchitectureStore.getState(), "addEdge")
    const setEdgesSpy = vi.spyOn(useArchitectureStore.getState(), "setEdges")

    render(<CanvasView />)

    // onConnect creates edges
    fireEvent.click(screen.getByTestId("mock-connect"))
    expect(addEdgeSpy).toHaveBeenCalledTimes(1)

    // setEdges is NOT called by onConnect (addEdge uses its own set() internally)
    expect(setEdgesSpy).not.toHaveBeenCalled()
  })

  it("onNodeContextMenu selects node and opens context menu", () => {
    render(<CanvasView />)
    fireEvent.click(screen.getByTestId("mock-node-context-menu"))
    expect(useUiStore.getState().selectedNodeId).toBe("node-1")
    expect(useUiStore.getState().contextMenu).toEqual({ nodeId: "node-1", x: 300, y: 400 })
  })

  it("onPaneClick closes context menu", () => {
    useUiStore.setState({ contextMenu: { nodeId: "node-1", x: 100, y: 100 } })
    render(<CanvasView />)
    fireEvent.click(screen.getByTestId("mock-pane-click"))
    expect(useUiStore.getState().contextMenu).toBeNull()
  })

  it("onDrop with stack returning no valid components does not call placeStack", () => {
    const mockStackDef = { id: "empty-stack", name: "Empty", description: "", components: [], connections: [], tradeOffProfile: [] }
    vi.mocked(componentLibrary.getStackById).mockReturnValueOnce(mockStackDef)
    vi.mocked(resolveStackPlacement).mockReturnValueOnce({ nodes: [], edges: [] })
    mockScreenToFlowPosition.mockReturnValueOnce({ x: 100, y: 200 })
    const placeStackSpy = vi.spyOn(useArchitectureStore.getState(), "placeStack")

    render(<CanvasView />)
    const panel = screen.getByTestId("canvas-panel")

    const dropEvent = new Event("drop", { bubbles: true }) as unknown as DragEvent
    Object.defineProperty(dropEvent, "dataTransfer", {
      value: {
        getData: vi.fn((type: string) =>
          type === "application/archie-stack" ? "empty-stack" : "",
        ),
        files: [],
      },
    })
    Object.defineProperty(dropEvent, "clientX", { value: 100 })
    Object.defineProperty(dropEvent, "clientY", { value: 200 })
    Object.defineProperty(dropEvent, "preventDefault", { value: vi.fn() })

    fireEvent(panel, dropEvent)
    expect(placeStackSpy).not.toHaveBeenCalled()
  })

  describe("Alt+N overlay shortcuts", () => {
    it("Alt+1 sets overlay to compatibility", () => {
      useUiStore.setState({ overlayMode: "none" })
      render(<CanvasView />)
      const panel = screen.getByTestId("canvas-panel")
      fireEvent.keyDown(panel, { key: "1", altKey: true })
      expect(useUiStore.getState().overlayMode).toBe("compatibility")
    })

    it("Alt+2 sets overlay to performance", () => {
      useUiStore.setState({ overlayMode: "none" })
      render(<CanvasView />)
      const panel = screen.getByTestId("canvas-panel")
      fireEvent.keyDown(panel, { key: "2", altKey: true })
      expect(useUiStore.getState().overlayMode).toBe("performance")
    })

    it("Alt+0 sets overlay to none", () => {
      useUiStore.setState({ overlayMode: "performance" })
      render(<CanvasView />)
      const panel = screen.getByTestId("canvas-panel")
      fireEvent.keyDown(panel, { key: "0", altKey: true })
      expect(useUiStore.getState().overlayMode).toBe("none")
    })

    it("Alt+number ignored when Ctrl also pressed", () => {
      useUiStore.setState({ overlayMode: "none" })
      render(<CanvasView />)
      const panel = screen.getByTestId("canvas-panel")
      fireEvent.keyDown(panel, { key: "1", altKey: true, ctrlKey: true })
      expect(useUiStore.getState().overlayMode).toBe("none")
    })

    it("Alt+number ignored in INPUT element", () => {
      useUiStore.setState({ overlayMode: "none" })
      render(<CanvasView />)
      const panel = screen.getByTestId("canvas-panel")
      const input = document.createElement("input")
      panel.appendChild(input)
      fireEvent.keyDown(input, { key: "1", altKey: true, bubbles: true })
      expect(useUiStore.getState().overlayMode).toBe("none")
    })
  })

  it("onDrop with stack ID calls placeStack via resolveStackPlacement", () => {
    const mockNode = {
      id: "stack-node-1",
      type: "archie-component" as const,
      position: { x: 0, y: 0 },
      data: {
        archieComponentId: "postgresql",
        activeConfigVariantId: "default",
        componentName: "PostgreSQL",
        componentCategory: "data-storage" as const,
      },
    }
    const mockStackDef = { id: "test-stack", name: "Test", description: "", components: [], connections: [], tradeOffProfile: [] }

    vi.mocked(componentLibrary.getStackById).mockReturnValueOnce(mockStackDef)
    vi.mocked(resolveStackPlacement).mockReturnValueOnce({ nodes: [mockNode], edges: [] })
    mockScreenToFlowPosition.mockReturnValueOnce({ x: 100, y: 200 })

    const placeStackSpy = vi.spyOn(useArchitectureStore.getState(), "placeStack")

    render(<CanvasView />)
    const panel = screen.getByTestId("canvas-panel")

    const dropEvent = new Event("drop", { bubbles: true }) as unknown as DragEvent
    Object.defineProperty(dropEvent, "dataTransfer", {
      value: {
        getData: vi.fn((type: string) =>
          type === "application/archie-stack" ? "test-stack" : "",
        ),
        files: [],
      },
    })
    Object.defineProperty(dropEvent, "clientX", { value: 100 })
    Object.defineProperty(dropEvent, "clientY", { value: 200 })
    Object.defineProperty(dropEvent, "preventDefault", { value: vi.fn() })

    fireEvent(panel, dropEvent)

    expect(placeStackSpy).toHaveBeenCalledWith([mockNode], [])
  })
})
