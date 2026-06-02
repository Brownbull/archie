import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { AccountMenu } from "@/components/layout/AccountMenu"

const mockSignOut = vi.fn()
const mockUseAuth = vi.fn()

vi.mock("@/hooks/useAuth", () => ({ useAuth: () => mockUseAuth() }))
vi.mock("@/components/challenges/MasteryProfilePanel", () => ({
  MasteryProfilePanel: () => null,
}))

describe("AccountMenu (P95)", () => {
  beforeEach(() => {
    vi.resetAllMocks()
    mockUseAuth.mockReturnValue({ user: { uid: "1", displayName: "Ada" }, signOut: mockSignOut })
  })

  it("shows the display name on the trigger", () => {
    render(<AccountMenu />)
    expect(screen.getByTestId("account-menu-trigger")).toHaveTextContent("Ada")
  })

  it("signs out from the menu", async () => {
    const user = userEvent.setup()
    render(<AccountMenu />)
    await user.click(screen.getByTestId("account-menu-trigger"))
    await user.click(await screen.findByTestId("account-sign-out"))
    expect(mockSignOut).toHaveBeenCalledTimes(1)
  })

  it("renders without a name when the user has none", () => {
    mockUseAuth.mockReturnValue({ user: { uid: "1", displayName: null }, signOut: mockSignOut })
    render(<AccountMenu />)
    expect(screen.getByTestId("account-menu-trigger")).toBeInTheDocument()
    expect(screen.queryByText("Ada")).not.toBeInTheDocument()
  })
})
