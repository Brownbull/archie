import { describe, it, expect, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import { MemoryRouter } from "react-router-dom"
import { AuthGuard } from "@/components/auth/AuthGuard"

const mockUseAuth = vi.fn()

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => mockUseAuth(),
}))

vi.mock("@/lib/firebase", () => ({
  auth: { currentUser: null },
}))

function renderWithRouter(ui: React.ReactElement, initialEntries = ["/"]) {
  return render(
    <MemoryRouter initialEntries={initialEntries}>{ui}</MemoryRouter>
  )
}

describe("AuthGuard", () => {
  it("renders skeleton loading state (not a spinner)", () => {
    mockUseAuth.mockReturnValue({ user: null, loading: true })

    renderWithRouter(
      <AuthGuard>
        <div>Protected Content</div>
      </AuthGuard>
    )

    expect(screen.getByTestId("auth-loading")).toBeInTheDocument()
    expect(screen.queryByText("Protected Content")).not.toBeInTheDocument()
  })

  it("renders children when authenticated", () => {
    mockUseAuth.mockReturnValue({
      user: { uid: "123", displayName: "Test" },
      loading: false,
    })

    renderWithRouter(
      <AuthGuard>
        <div>Protected Content</div>
      </AuthGuard>
    )

    expect(screen.getByText("Protected Content")).toBeInTheDocument()
  })

  it("redirects to /login when unauthenticated", () => {
    mockUseAuth.mockReturnValue({ user: null, loading: false })

    renderWithRouter(
      <AuthGuard>
        <div>Protected Content</div>
      </AuthGuard>
    )

    expect(screen.queryByText("Protected Content")).not.toBeInTheDocument()
  })
})
