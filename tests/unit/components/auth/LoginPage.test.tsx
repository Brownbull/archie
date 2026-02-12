import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"
import { MemoryRouter } from "react-router-dom"
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
})
