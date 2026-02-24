import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { ToolboxPanel } from "@/components/toolbox/ToolboxPanel"
import { useUiStore } from "@/stores/uiStore"

vi.mock("@/hooks/useLibrary", () => ({
  useLibrary: () => ({
    isReady: true,
    components: [],
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
    getAllBlueprints: () => [],
    getBlueprint: vi.fn(),
    getComponent: vi.fn(),
    getComponentsByCategory: vi.fn(() => []),
    searchComponents: vi.fn(() => []),
    reset: vi.fn(),
  },
}))

vi.mock("@/services/yamlImporter", () => ({
  hydrateArchitectureSkeleton: vi.fn(),
}))

vi.mock("@/stores/architectureStore", () => ({
  useArchitectureStore: (selector: (s: Record<string, unknown>) => unknown) =>
    selector({ nodes: [], loadArchitecture: vi.fn() }),
}))

describe("ToolboxPanel", () => {
  beforeEach(() => {
    useUiStore.setState({
      toolboxTab: "components",
      searchQuery: "",
      commandPaletteOpen: false,
    })
  })

  it("renders three tabs", () => {
    render(<ToolboxPanel />)
    expect(screen.getByText("Components")).toBeInTheDocument()
    expect(screen.getByText("Stacks")).toBeInTheDocument()
    expect(screen.getByText("Blueprints")).toBeInTheDocument()
  })

  it("renders search filter", () => {
    render(<ToolboxPanel />)
    expect(screen.getByTestId("search-filter")).toBeInTheDocument()
  })

  it("shows stack placeholder when Stacks tab is clicked", async () => {
    render(<ToolboxPanel />)
    await userEvent.click(screen.getByText("Stacks"))
    expect(screen.getByText("Coming in Phase 2")).toBeInTheDocument()
  })

  it("shows blueprint empty state when Blueprints tab is clicked (no blueprints loaded)", async () => {
    render(<ToolboxPanel />)
    await userEvent.click(screen.getByText("Blueprints"))
    expect(screen.getByTestId("blueprint-tab-empty")).toBeInTheDocument()
  })
})
