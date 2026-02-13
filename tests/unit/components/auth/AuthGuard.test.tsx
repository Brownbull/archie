import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen } from "@testing-library/react"
import { MemoryRouter, Routes, Route } from "react-router-dom"
import { AuthGuard } from "@/components/auth/AuthGuard"

const mockUseAuth = vi.fn()

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => mockUseAuth(),
}))

vi.mock("@/lib/firebase", () => ({
  auth: { currentUser: null },
}))

describe("AuthGuard", () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it("renders skeleton loading state (not a spinner)", () => {
    mockUseAuth.mockReturnValue({ user: null, loading: true })

    render(
      <MemoryRouter>
        <AuthGuard>
          <div>Protected Content</div>
        </AuthGuard>
      </MemoryRouter>
    )

    expect(screen.getByTestId("auth-loading")).toBeInTheDocument()
    expect(screen.queryByText("Protected Content")).not.toBeInTheDocument()
  })

  it("renders children when authenticated", () => {
    mockUseAuth.mockReturnValue({
      user: { uid: "123", displayName: "Test" },
      loading: false,
    })

    render(
      <MemoryRouter>
        <AuthGuard>
          <div>Protected Content</div>
        </AuthGuard>
      </MemoryRouter>
    )

    expect(screen.getByText("Protected Content")).toBeInTheDocument()
  })

  it("redirects to /login when unauthenticated", () => {
    mockUseAuth.mockReturnValue({ user: null, loading: false })

    render(
      <MemoryRouter initialEntries={["/"]}>
        <Routes>
          <Route
            path="/"
            element={
              <AuthGuard>
                <div>Protected Content</div>
              </AuthGuard>
            }
          />
          <Route path="/login" element={<div>Login Page</div>} />
        </Routes>
      </MemoryRouter>
    )

    expect(screen.queryByText("Protected Content")).not.toBeInTheDocument()
    expect(screen.getByText("Login Page")).toBeInTheDocument()
  })
})
