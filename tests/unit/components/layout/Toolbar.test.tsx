import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { MemoryRouter } from "react-router-dom"
import { Toolbar } from "@/components/layout/Toolbar"
import { useUiStore } from "@/stores/uiStore"
import { useChallengeStore } from "@/stores/challengeStore"
import type { Challenge } from "@/lib/challengeTypes"
import { TOOLBAR_HEIGHT } from "@/lib/constants"

const mockSignOut = vi.fn()
const mockUseAuth = vi.fn()

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => mockUseAuth(),
}))

vi.mock("@/lib/firebase", () => ({
  auth: { currentUser: null },
}))

vi.mock("@/data/prompt-template.md?raw", () => ({
  default: "# Archie AI Prompt Template\n\nMock template content.",
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
    useUiStore.setState({ promptOpen: false, challengesOpen: false, resetCanvasOpen: false, questLogOpen: false })
    useChallengeStore.setState({ activeChallenge: null, attemptState: "idle" })
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

  it("renders the File / Edit / Build menu bar", () => {
    renderToolbar()
    expect(screen.getByTestId("menu-file")).toBeInTheDocument()
    expect(screen.getByTestId("menu-edit")).toBeInTheDocument()
    expect(screen.getByTestId("menu-build")).toBeInTheDocument()
  })

  it("shows the user display name in the account menu trigger", () => {
    renderToolbar()
    expect(screen.getByText("Test User")).toBeInTheDocument()
  })

  it("calls signOut from the account menu", async () => {
    const user = userEvent.setup()
    renderToolbar()
    await user.click(screen.getByTestId("account-menu-trigger"))
    await user.click(await screen.findByTestId("account-sign-out"))
    expect(mockSignOut).toHaveBeenCalledTimes(1)
  })

  it("renders Archie branding", () => {
    renderToolbar()
    expect(screen.getByText("Archie")).toBeInTheDocument()
  })

  it("renders SettingsMenu gear icon", () => {
    renderToolbar()
    expect(screen.getByTestId("settings-menu-trigger")).toBeInTheDocument()
  })

  it("renders the experience-level control", () => {
    renderToolbar()
    expect(screen.getByTestId("experience-level-control")).toBeInTheDocument()
  })

  it("does not show a display name when the user has none", () => {
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

  it("opens the AI Prompt dialog from the Build menu", async () => {
    const user = userEvent.setup()
    renderToolbar()
    await user.click(screen.getByTestId("menu-build"))
    await user.click(await screen.findByTestId("menu-ai-prompt"))
    expect(await screen.findByTestId("prompt-template-dialog")).toBeInTheDocument()
  })

  it("exposes the active quest title as a clickable switch-quest button that opens the quest menu", async () => {
    const user = userEvent.setup()
    useChallengeStore.setState({
      activeChallenge: { id: "edge-delivery", title: "Edge Delivery" } as unknown as Challenge,
      attemptState: "building",
    })
    renderToolbar()
    const switchBtn = screen.getByTestId("switch-quest")
    expect(switchBtn).toHaveTextContent("Edge Delivery")
    expect(useUiStore.getState().questLogOpen).toBe(false)
    await user.click(switchBtn)
    expect(useUiStore.getState().questLogOpen).toBe(true) // opens the quest menu so you can switch quests mid-flight
  })

  it("shows no switch-quest button outside an active quest (idle)", () => {
    renderToolbar()
    expect(screen.queryByTestId("switch-quest")).not.toBeInTheDocument()
  })
})
