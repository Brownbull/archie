import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"
import { SwapPopover } from "@/components/canvas/SwapPopover"

vi.mock("@/lib/firebase", () => ({
  auth: { currentUser: null },
  db: {},
}))

let mockSwapTarget: string | null = null
const mockClearSwapTarget = vi.fn()
const mockSwapNodeComponent = vi.fn()

let mockNodes: Array<{
  id: string
  data: { componentCategory: string; archieComponentId: string }
}> = []

vi.mock("@/stores/uiStore", () => {
  const fn = Object.assign(
    vi.fn((selector: (s: Record<string, unknown>) => unknown) =>
      selector({
        swapTargetNodeId: mockSwapTarget,
        clearSwapTarget: mockClearSwapTarget,
      }),
    ),
    { getState: vi.fn(), setState: vi.fn(), subscribe: vi.fn() },
  )
  return { useUiStore: fn }
})

vi.mock("@/stores/architectureStore", () => {
  const fn = Object.assign(
    vi.fn((selector: (s: Record<string, unknown>) => unknown) =>
      selector({
        swapNodeComponent: mockSwapNodeComponent,
        nodes: mockNodes,
      }),
    ),
    { getState: vi.fn(), setState: vi.fn(), subscribe: vi.fn() },
  )
  return { useArchitectureStore: fn }
})

const mockAlternatives = [
  { id: "alt-1", name: "Redis", category: "caching", configVariants: [{ id: "v1" }], compatibility: {} },
  { id: "alt-2", name: "Memcached", category: "caching", configVariants: [{ id: "v1" }], compatibility: {} },
]

vi.mock("@/services/componentLibrary", () => ({
  componentLibrary: {
    getComponentsByCategory: vi.fn(() => mockAlternatives),
  },
}))

vi.mock("lucide-react", () => ({
  ArrowRightLeft: (props: Record<string, unknown>) => <svg data-testid="swap-icon" {...props} />,
}))

function mockDomElements() {
  const nodeEl = document.createElement("div")
  nodeEl.setAttribute("data-id", "node-42")
  nodeEl.getBoundingClientRect = () => ({
    left: 100, top: 200, right: 260, bottom: 280,
    width: 160, height: 80, x: 100, y: 200, toJSON: () => {},
  })
  document.body.appendChild(nodeEl)

  const panelEl = document.createElement("div")
  panelEl.setAttribute("data-testid", "canvas-panel")
  panelEl.getBoundingClientRect = () => ({
    left: 0, top: 0, right: 800, bottom: 600,
    width: 800, height: 600, x: 0, y: 0, toJSON: () => {},
  })
  document.body.appendChild(panelEl)

  return { nodeEl, panelEl }
}

describe("SwapPopover", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockSwapTarget = null
    mockNodes = []
    document.body.innerHTML = ""
  })

  it("renders nothing when swapTargetNodeId is null", () => {
    mockSwapTarget = null
    const { container } = render(<SwapPopover />)
    expect(container.innerHTML).toBe("")
  })

  it("renders nothing when target node not found", () => {
    mockSwapTarget = "node-999"
    mockNodes = [{ id: "node-1", data: { componentCategory: "caching", archieComponentId: "redis" } }]
    const { container } = render(<SwapPopover />)
    expect(container.innerHTML).toBe("")
  })

  it("renders nothing when DOM elements are missing", () => {
    mockSwapTarget = "node-42"
    mockNodes = [{ id: "node-42", data: { componentCategory: "caching", archieComponentId: "current-comp" } }]
    const { container } = render(<SwapPopover />)
    expect(container.innerHTML).toBe("")
  })

  it("renders popover with alternatives when all conditions met", () => {
    mockSwapTarget = "node-42"
    mockNodes = [{ id: "node-42", data: { componentCategory: "caching", archieComponentId: "current-comp" } }]
    mockDomElements()

    render(<SwapPopover />)

    expect(screen.getByTestId("swap-popover")).toBeInTheDocument()
    expect(screen.getByText("Quick Replace")).toBeInTheDocument()
    expect(screen.getByText("Redis")).toBeInTheDocument()
    expect(screen.getByText("Memcached")).toBeInTheDocument()
    expect(screen.getByText("Cancel")).toBeInTheDocument()
  })

  it("positions relative to node and canvas panel", () => {
    mockSwapTarget = "node-42"
    mockNodes = [{ id: "node-42", data: { componentCategory: "caching", archieComponentId: "current-comp" } }]
    mockDomElements()

    render(<SwapPopover />)

    const popover = screen.getByTestId("swap-popover")
    expect(popover.style.left).toBe("268px") // 100 - 0 + 160 + 8
    expect(popover.style.top).toBe("200px")  // 200 - 0
  })

  it("calls swapNodeComponent and clearSwapTarget on option click", () => {
    mockSwapTarget = "node-42"
    mockNodes = [{ id: "node-42", data: { componentCategory: "caching", archieComponentId: "current-comp" } }]
    mockDomElements()

    render(<SwapPopover />)

    fireEvent.click(screen.getByTestId("swap-option-alt-1"))

    expect(mockSwapNodeComponent).toHaveBeenCalledWith("node-42", "alt-1")
    expect(mockClearSwapTarget).toHaveBeenCalled()
  })

  it("calls clearSwapTarget on Cancel click", () => {
    mockSwapTarget = "node-42"
    mockNodes = [{ id: "node-42", data: { componentCategory: "caching", archieComponentId: "current-comp" } }]
    mockDomElements()

    render(<SwapPopover />)

    fireEvent.click(screen.getByText("Cancel"))

    expect(mockClearSwapTarget).toHaveBeenCalled()
    expect(mockSwapNodeComponent).not.toHaveBeenCalled()
  })

  it("shows swap icon in header", () => {
    mockSwapTarget = "node-42"
    mockNodes = [{ id: "node-42", data: { componentCategory: "caching", archieComponentId: "current-comp" } }]
    mockDomElements()

    render(<SwapPopover />)

    expect(screen.getByTestId("swap-icon")).toBeInTheDocument()
  })
})
