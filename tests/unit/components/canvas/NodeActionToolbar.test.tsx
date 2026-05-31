import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"
import { NodeActionToolbar } from "@/components/canvas/NodeActionToolbar"

// NodeToolbar needs the React Flow store/context; stub it to render its children only when
// the node is selected, mirroring the real `isVisible` behavior.
vi.mock("@xyflow/react", () => ({
  NodeToolbar: ({ children, isVisible }: { children: React.ReactNode; isVisible?: boolean }) =>
    isVisible ? <div data-testid="node-toolbar-portal">{children}</div> : null,
  Position: { Top: "top" },
}))

const mockRemoveNode = vi.fn()
const mockDuplicateNode = vi.fn(() => "node-copy")
const mockSetSelectedNodeId = vi.fn()
let mockSelectedNodeId: string | null = null

vi.mock("@/stores/architectureStore", () => ({
  useArchitectureStore: vi.fn((selector: (s: Record<string, unknown>) => unknown) =>
    selector({ removeNode: mockRemoveNode, duplicateNode: mockDuplicateNode }),
  ),
}))

vi.mock("@/stores/uiStore", () => ({
  useUiStore: vi.fn((selector: (s: Record<string, unknown>) => unknown) =>
    selector({ selectedNodeId: mockSelectedNodeId, setSelectedNodeId: mockSetSelectedNodeId }),
  ),
}))

beforeEach(() => {
  vi.clearAllMocks()
  mockSelectedNodeId = null
})

describe("NodeActionToolbar", () => {
  it("is hidden when the node is not the selected node", () => {
    mockSelectedNodeId = "other-node"
    render(<NodeActionToolbar nodeId="node-1" />)
    expect(screen.queryByTestId("node-action-toolbar")).toBeNull()
  })

  it("shows Duplicate + Remove when its node is the selected node", () => {
    mockSelectedNodeId = "node-1"
    render(<NodeActionToolbar nodeId="node-1" />)
    expect(screen.getByTestId("node-action-toolbar")).toBeInTheDocument()
    expect(screen.getByTestId("node-action-toolbar-duplicate")).toBeInTheDocument()
    expect(screen.getByTestId("node-action-toolbar-remove")).toBeInTheDocument()
  })

  it("Remove deletes the node by id", () => {
    mockSelectedNodeId = "node-1"
    render(<NodeActionToolbar nodeId="node-1" />)
    fireEvent.click(screen.getByTestId("node-action-toolbar-remove"))
    expect(mockRemoveNode).toHaveBeenCalledWith("node-1")
  })

  it("Duplicate clones the node and selects the clone", () => {
    mockSelectedNodeId = "node-1"
    render(<NodeActionToolbar nodeId="node-1" />)
    fireEvent.click(screen.getByTestId("node-action-toolbar-duplicate"))
    expect(mockDuplicateNode).toHaveBeenCalledWith("node-1")
    expect(mockSetSelectedNodeId).toHaveBeenCalledWith("node-copy")
  })

  it("does not re-select when duplication fails (returns null)", () => {
    mockDuplicateNode.mockReturnValueOnce(null as unknown as string)
    mockSelectedNodeId = "node-1"
    render(<NodeActionToolbar nodeId="node-1" />)
    fireEvent.click(screen.getByTestId("node-action-toolbar-duplicate"))
    expect(mockDuplicateNode).toHaveBeenCalledWith("node-1")
    expect(mockSetSelectedNodeId).not.toHaveBeenCalled()
  })
})
