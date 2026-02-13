import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { CommandPalette } from "@/components/toolbox/CommandPalette"
import { useUiStore } from "@/stores/uiStore"

vi.mock("@/hooks/useLibrary", () => ({
  useLibrary: () => ({
    isReady: true,
    components: [
      {
        id: "postgresql",
        name: "PostgreSQL",
        category: "data-storage",
        description: "A relational database",
        is: "A database",
        gain: ["ACID"],
        cost: ["Memory"],
        tags: ["db"],
        baseMetrics: [],
        configVariants: [{ id: "default", name: "Default", metrics: [] }],
      },
    ],
    getComponentById: vi.fn(),
    getComponentsByCategory: vi.fn(() => []),
    searchComponents: vi.fn(() => []),
  }),
}))

vi.mock("@/lib/firebase", () => ({
  auth: { currentUser: null },
  db: {},
}))

vi.mock("@/services/componentLibrary", () => ({
  componentLibrary: {
    isInitialized: () => true,
    getAllComponents: () => [],
    getComponent: vi.fn(),
    getComponentsByCategory: vi.fn(() => []),
    searchComponents: vi.fn(() => []),
    reset: vi.fn(),
  },
}))

describe("CommandPalette", () => {
  beforeEach(() => {
    useUiStore.setState({
      toolboxTab: "components",
      searchQuery: "",
      commandPaletteOpen: false,
    })
  })

  it("is not visible when closed", () => {
    render(<CommandPalette />)
    expect(screen.queryByPlaceholderText("Search components...")).not.toBeInTheDocument()
  })

  it("opens when commandPaletteOpen is true", () => {
    useUiStore.setState({ commandPaletteOpen: true })
    render(<CommandPalette />)
    expect(screen.getByPlaceholderText("Search components...")).toBeInTheDocument()
  })

  it("opens with Ctrl+K keyboard shortcut", async () => {
    render(<CommandPalette />)
    await userEvent.keyboard("{Control>}k{/Control}")
    expect(screen.getByPlaceholderText("Search components...")).toBeInTheDocument()
  })

  it("shows component in the palette when open", () => {
    useUiStore.setState({ commandPaletteOpen: true })
    render(<CommandPalette />)
    expect(screen.getByText("PostgreSQL")).toBeInTheDocument()
  })

  it("selects a component and updates toolbox tab and search query", async () => {
    useUiStore.setState({ commandPaletteOpen: true })
    render(<CommandPalette />)
    await userEvent.click(screen.getByText("PostgreSQL"))
    const state = useUiStore.getState()
    expect(state.toolboxTab).toBe("components")
    expect(state.searchQuery).toBe("PostgreSQL")
    expect(state.commandPaletteOpen).toBe(false)
  })
})
