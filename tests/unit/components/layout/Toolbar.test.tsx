import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"
import { MemoryRouter } from "react-router-dom"
import { Toolbar } from "@/components/layout/Toolbar"
import { TOOLBAR_HEIGHT } from "@/lib/constants"

const mockSignOut = vi.fn()
const mockUseAuth = vi.fn()

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => mockUseAuth(),
}))

vi.mock("@/lib/firebase", () => ({
  auth: { currentUser: null },
}))

function renderToolbar() {
  return render(
    <MemoryRouter>
      <Toolbar />
    </MemoryRouter>
  )
}

describe("Toolbar", () => {
  beforeEach(() => {
    vi.resetAllMocks()
    mockUseAuth.mockReturnValue({
      user: { uid: "123", displayName: "Test User" },
      loading: false,
      error: null,
      signIn: vi.fn(),
      signOut: mockSignOut,
    })
  })

  it("renders with correct height from constants", () => {
    renderToolbar()
    expect(screen.getByTestId("toolbar")).toHaveStyle({ height: `${TOOLBAR_HEIGHT}px` })
  })

  it("renders user display name", () => {
    renderToolbar()
    expect(screen.getByText("Test User")).toBeInTheDocument()
  })

  it("calls signOut when Sign out button is clicked", () => {
    renderToolbar()
    fireEvent.click(screen.getByText("Sign out"))
    expect(mockSignOut).toHaveBeenCalledTimes(1)
  })

  it("renders Archie branding", () => {
    renderToolbar()
    expect(screen.getByText("Archie")).toBeInTheDocument()
  })

  it("does not render display name when user has none", () => {
    mockUseAuth.mockReturnValue({
      user: { uid: "123", displayName: null },
      loading: false,
      error: null,
      signIn: vi.fn(),
      signOut: mockSignOut,
    })

    renderToolbar()
    expect(screen.queryByText("Test User")).not.toBeInTheDocument()
  })
})
