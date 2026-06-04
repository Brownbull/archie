import { describe, it, expect, beforeEach, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { AppMenuBar } from "@/components/layout/AppMenuBar"
import { useUiStore } from "@/stores/uiStore"
import { useArchitectureStore } from "@/stores/architectureStore"
import { useHistoryStore } from "@/services/canvasHistory"

vi.mock("@/lib/firebase", () => ({ auth: { currentUser: null }, db: {} }))
vi.mock("@/components/challenges/ChallengeTreeView", () => ({ ChallengeTreeView: () => null }))
// AppMenuBar reads useAuth to gate the Save/Load items; provide a signed-in stub (no AuthProvider here).
vi.mock("@/hooks/useAuth", () => ({ useAuth: () => ({ user: { uid: "u1" } }) }))

describe("AppMenuBar (P95)", () => {
  beforeEach(() => {
    useUiStore.setState({ promptOpen: false, challengesOpen: false, resetCanvasOpen: false })
    useArchitectureStore.setState({ nodes: [] } as never)
    useHistoryStore.setState({ canUndo: false, canRedo: false } as never)
  })

  it("renders File / Edit / Build menu triggers", () => {
    render(<AppMenuBar />)
    expect(screen.getByTestId("menu-file")).toBeInTheDocument()
    expect(screen.getByTestId("menu-edit")).toBeInTheDocument()
    expect(screen.getByTestId("menu-build")).toBeInTheDocument()
  })

  it("File menu exposes import, exports and reset", async () => {
    const user = userEvent.setup()
    render(<AppMenuBar />)
    await user.click(screen.getByTestId("menu-file"))
    expect(await screen.findByTestId("menu-import")).toBeInTheDocument()
    expect(screen.getByTestId("export-button")).toBeInTheDocument()
    expect(screen.getByTestId("export-report-button")).toBeInTheDocument()
    expect(screen.getByTestId("menu-reset")).toBeInTheDocument()
  })

  it("Reset is disabled when the canvas is empty", async () => {
    const user = userEvent.setup()
    render(<AppMenuBar />)
    await user.click(screen.getByTestId("menu-file"))
    expect(await screen.findByTestId("menu-reset")).toHaveAttribute("aria-disabled", "true")
  })

  it("Build menu opens the Challenges picker via uiStore", async () => {
    const user = userEvent.setup()
    render(<AppMenuBar />)
    await user.click(screen.getByTestId("menu-build"))
    await user.click(await screen.findByTestId("menu-challenges"))
    expect(useUiStore.getState().challengesOpen).toBe(true)
  })

  it("Build menu opens the AI Prompt dialog via uiStore", async () => {
    const user = userEvent.setup()
    render(<AppMenuBar />)
    await user.click(screen.getByTestId("menu-build"))
    await user.click(await screen.findByTestId("menu-ai-prompt"))
    expect(useUiStore.getState().promptOpen).toBe(true)
  })

  it("Edit menu undo/redo are disabled when there is no history", async () => {
    const user = userEvent.setup()
    render(<AppMenuBar />)
    await user.click(screen.getByTestId("menu-edit"))
    expect(await screen.findByTestId("menu-undo")).toHaveAttribute("aria-disabled", "true")
    expect(screen.getByTestId("menu-redo")).toHaveAttribute("aria-disabled", "true")
  })
})
