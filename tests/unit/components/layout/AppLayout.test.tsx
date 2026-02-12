import { describe, it, expect, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import { MemoryRouter } from "react-router-dom"
import { AppLayout } from "@/components/layout/AppLayout"

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
})
