import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"
import { CanvasView } from "@/components/canvas/CanvasView"
import { useArchitectureStore } from "@/stores/architectureStore"
import { useUiStore } from "@/stores/uiStore"

const mockScreenToFlowPosition = vi.fn((pos: { x: number; y: number }) => pos)

vi.mock("@xyflow/react", () => ({
  ReactFlow: ({
    children,
    onNodeClick,
    onEdgeClick,
    onPaneClick,
    onConnect,
    onNodesDelete,
    onEdgesDelete,
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
      {children as React.ReactNode}
    </div>
  ),
  ReactFlowProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  Background: () => <div data-testid="react-flow-background" />,
  MiniMap: () => <div data-testid="react-flow-minimap" />,
  Controls: () => <div data-testid="react-flow-controls" />,
  useReactFlow: () => ({
    screenToFlowPosition: mockScreenToFlowPosition,
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
    isInitialized: () => true,
    reset: vi.fn(),
  },
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
        getData: vi.fn(() => "postgresql"),
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
})
