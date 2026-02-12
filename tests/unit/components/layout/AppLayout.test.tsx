import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen } from "@testing-library/react"
import { MemoryRouter } from "react-router-dom"
import { AppLayout } from "@/components/layout/AppLayout"
import {
  TOOLBOX_WIDTH,
  INSPECTOR_WIDTH,
  DASHBOARD_HEIGHT,
} from "@/lib/constants"

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
  })

  it("renders the toolbar region", () => {
    renderAppLayout()
    expect(screen.getByTestId("toolbar")).toBeInTheDocument()
  })

  it("renders the toolbox region", () => {
    renderAppLayout()
    expect(screen.getByTestId("toolbox")).toBeInTheDocument()
    expect(screen.getByText("Toolbox")).toBeInTheDocument()
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
})
