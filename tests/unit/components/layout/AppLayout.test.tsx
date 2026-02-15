import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import { MemoryRouter } from "react-router-dom"
import { AppLayout } from "@/components/layout/AppLayout"
import { useUiStore } from "@/stores/uiStore"
import {
  TOOLBOX_WIDTH,
  INSPECTOR_WIDTH,
  INSPECTOR_COLLAPSED_WIDTH,
  DASHBOARD_HEIGHT,
} from "@/lib/constants"

const { mockInitialize } = vi.hoisted(() => ({
  mockInitialize: vi.fn(),
}))

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({
    user: { uid: "123", displayName: "Test User" },
    loading: false,
    error: null,
    signIn: vi.fn(),
    signOut: vi.fn(),
  }),
}))

vi.mock("@/lib/firebase", () => ({
  auth: { currentUser: null },
  db: {},
}))

vi.mock("@/services/componentLibrary", () => ({
  componentLibrary: {
    initialize: (...args: unknown[]) => mockInitialize(...args),
    isInitialized: () => true,
    getAllComponents: () => [],
    getComponent: vi.fn(),
    getComponentsByCategory: vi.fn(() => []),
    searchComponents: vi.fn(() => []),
    reset: vi.fn(),
  },
}))

vi.mock("@/hooks/useLibrary", () => ({
  useLibrary: () => ({
    isReady: true,
    components: [],
    getComponentById: vi.fn(),
    getComponentsByCategory: vi.fn(() => []),
    searchComponents: vi.fn(() => []),
  }),
}))

vi.mock("@xyflow/react", () => ({
  ReactFlow: ({ children }: { children?: React.ReactNode }) => (
    <div data-testid="react-flow-mock">{children}</div>
  ),
  ReactFlowProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  Background: () => <div data-testid="react-flow-background" />,
  MiniMap: () => <div data-testid="react-flow-minimap" />,
  Controls: () => <div data-testid="react-flow-controls" />,
  useReactFlow: () => ({ screenToFlowPosition: vi.fn((pos: unknown) => pos) }),
  BackgroundVariant: { Dots: "dots" },
  Position: { Left: "left", Right: "right" },
  Handle: (props: Record<string, unknown>) => <div {...props} />,
  applyNodeChanges: vi.fn((_changes: unknown, nodes: unknown) => nodes),
}))

function renderAppLayout() {
  return render(
    <MemoryRouter>
      <AppLayout />
    </MemoryRouter>
  )
}

describe("AppLayout", () => {
  beforeEach(() => {
    vi.resetAllMocks()
    mockInitialize.mockResolvedValue(undefined)
    useUiStore.setState({
      selectedNodeId: null,
      selectedEdgeId: null,
      inspectorCollapsed: false,
    })
  })

  it("renders the toolbar region", () => {
    renderAppLayout()
    expect(screen.getByTestId("toolbar")).toBeInTheDocument()
  })

  it("renders the toolbox region", () => {
    renderAppLayout()
    expect(screen.getByTestId("toolbox")).toBeInTheDocument()
  })

  it("shows loading skeleton initially then toolbox panel", async () => {
    renderAppLayout()
    // After initialize resolves, the toolbox panel should appear
    await waitFor(() => {
      expect(screen.getByTestId("toolbox-panel")).toBeInTheDocument()
    })
  })

  it("renders the canvas region with CanvasView", () => {
    renderAppLayout()
    expect(screen.getByTestId("canvas")).toBeInTheDocument()
    expect(screen.getByTestId("canvas-panel")).toBeInTheDocument()
  })

  it("renders the inspector region", () => {
    renderAppLayout()
    expect(screen.getByTestId("inspector")).toBeInTheDocument()
  })

  it("renders the dashboard region with DashboardPanel", () => {
    renderAppLayout()
    expect(screen.getByTestId("dashboard")).toBeInTheDocument()
    expect(screen.getByTestId("dashboard-panel")).toBeInTheDocument()
  })

  it("applies correct dimensions from constants", () => {
    renderAppLayout()
    expect(screen.getByTestId("toolbox")).toHaveStyle({ width: `${TOOLBOX_WIDTH}px` })
    // Inspector is 0px when no node is selected
    expect(screen.getByTestId("inspector")).toHaveStyle({ width: "0px" })
    expect(screen.getByTestId("dashboard")).toHaveStyle({ height: `${DASHBOARD_HEIGHT}px` })
  })

  it("shows inspector with INSPECTOR_WIDTH when node selected", () => {
    useUiStore.setState({ selectedNodeId: "some-node" })
    renderAppLayout()
    expect(screen.getByTestId("inspector")).toHaveStyle({ width: `${INSPECTOR_WIDTH}px` })
  })

  it("shows inspector with INSPECTOR_COLLAPSED_WIDTH when collapsed", () => {
    useUiStore.setState({ selectedNodeId: "some-node", inspectorCollapsed: true })
    renderAppLayout()
    expect(screen.getByTestId("inspector")).toHaveStyle({ width: `${INSPECTOR_COLLAPSED_WIDTH}px` })
  })

  it("inspector aside has transition class", () => {
    renderAppLayout()
    const inspector = screen.getByTestId("inspector")
    expect(inspector.className).toContain("transition-[width]")
  })

  it("calls componentLibrary.initialize on mount", () => {
    renderAppLayout()
    expect(mockInitialize).toHaveBeenCalledTimes(1)
  })
})
