import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"
import { MemoryRouter, Routes, Route } from "react-router-dom"
import { LoginPage } from "@/components/auth/LoginPage"

const mockSignIn = vi.fn()
const mockUseAuth = vi.fn()

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => mockUseAuth(),
}))

vi.mock("@/lib/firebase", () => ({
  auth: { currentUser: null },
}))

function renderLoginPage() {
  return render(
    <MemoryRouter>
      <LoginPage />
    </MemoryRouter>
  )
}

describe("LoginPage", () => {
  beforeEach(() => {
    vi.resetAllMocks()
    mockUseAuth.mockReturnValue({
      user: null,
      loading: false,
      error: null,
      signIn: mockSignIn,
      signOut: vi.fn(),
    })
  })

  it("renders sign-in button", () => {
    renderLoginPage()
    expect(screen.getByTestId("sign-in-button")).toBeInTheDocument()
    expect(screen.getByText("Sign in with Google")).toBeInTheDocument()
  })

  it("calls signIn when button is clicked", () => {
    renderLoginPage()
    fireEvent.click(screen.getByTestId("sign-in-button"))
    expect(mockSignIn).toHaveBeenCalledTimes(1)
  })

  it("renders Archie branding", () => {
    renderLoginPage()
    expect(screen.getByText("Archie")).toBeInTheDocument()
    expect(screen.getByText("Visual Architecture Simulator")).toBeInTheDocument()
  })

  it("displays error when auth fails", () => {
    mockUseAuth.mockReturnValue({
      user: null,
      loading: false,
      error: "Sign-in was cancelled.",
      signIn: mockSignIn,
      signOut: vi.fn(),
    })

    renderLoginPage()
    expect(screen.getByTestId("auth-error")).toHaveTextContent("Sign-in was cancelled.")
  })

  it("redirects to / when user is authenticated", () => {
    mockUseAuth.mockReturnValue({
      user: { uid: "123", displayName: "Test User" },
      loading: false,
      error: null,
      signIn: mockSignIn,
      signOut: vi.fn(),
    })

    render(
      <MemoryRouter initialEntries={["/login"]}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/" element={<div>Home Page</div>} />
        </Routes>
      </MemoryRouter>
    )

    expect(screen.queryByTestId("sign-in-button")).not.toBeInTheDocument()
    expect(screen.getByText("Home Page")).toBeInTheDocument()
  })

  it("renders nothing while loading", () => {
    mockUseAuth.mockReturnValue({
      user: null,
      loading: true,
      error: null,
      signIn: mockSignIn,
      signOut: vi.fn(),
    })

    const { container } = renderLoginPage()
    expect(container.innerHTML).toBe("")
  })
})
