import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import { MemoryRouter } from "react-router-dom"
import { AppLayout } from "@/components/layout/AppLayout"
import {
  TOOLBOX_WIDTH,
  INSPECTOR_WIDTH,
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

  it("renders the canvas region", () => {
    renderAppLayout()
    expect(screen.getByTestId("canvas")).toBeInTheDocument()
    expect(screen.getByText("Canvas")).toBeInTheDocument()
  })

  it("renders the inspector region", () => {
    renderAppLayout()
    expect(screen.getByTestId("inspector")).toBeInTheDocument()
    expect(screen.getByText("Inspector")).toBeInTheDocument()
  })

  it("renders the dashboard region", () => {
    renderAppLayout()
    expect(screen.getByTestId("dashboard")).toBeInTheDocument()
    expect(screen.getByText("Dashboard")).toBeInTheDocument()
  })

  it("applies correct dimensions from constants", () => {
    renderAppLayout()
    expect(screen.getByTestId("toolbox")).toHaveStyle({ width: `${TOOLBOX_WIDTH}px` })
    expect(screen.getByTestId("inspector")).toHaveStyle({ width: `${INSPECTOR_WIDTH}px` })
    expect(screen.getByTestId("dashboard")).toHaveStyle({ height: `${DASHBOARD_HEIGHT}px` })
  })

  it("calls componentLibrary.initialize on mount", () => {
    renderAppLayout()
    expect(mockInitialize).toHaveBeenCalledTimes(1)
  })
})
