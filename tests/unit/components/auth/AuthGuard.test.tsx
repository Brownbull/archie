import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { render, screen } from "@testing-library/react"
import { MemoryRouter, Routes, Route } from "react-router-dom"
import { AuthGuard } from "@/components/auth/AuthGuard"
import { useGuestStore } from "@/stores/guestStore"

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
    useGuestStore.getState().exitGuest()
  })

  afterEach(() => {
    useGuestStore.getState().exitGuest()
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

  it("redirects to the landing (/) when unauthenticated and not a guest", () => {
    mockUseAuth.mockReturnValue({ user: null, loading: false })

    render(
      <MemoryRouter initialEntries={["/app"]}>
        <Routes>
          <Route
            path="/app"
            element={
              <AuthGuard>
                <div>Protected Content</div>
              </AuthGuard>
            }
          />
          <Route path="/" element={<div>Landing Page</div>} />
        </Routes>
      </MemoryRouter>
    )

    expect(screen.queryByText("Protected Content")).not.toBeInTheDocument()
    expect(screen.getByText("Landing Page")).toBeInTheDocument()
  })

  it("renders children for a guest (no Firebase user) without redirecting", () => {
    mockUseAuth.mockReturnValue({ user: null, loading: false })
    useGuestStore.getState().enterGuest()

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

    expect(screen.getByText("Protected Content")).toBeInTheDocument()
    expect(screen.queryByText("Login Page")).not.toBeInTheDocument()
  })
})
