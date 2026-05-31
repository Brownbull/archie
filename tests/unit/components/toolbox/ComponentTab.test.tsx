import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, fireEvent, act } from "@testing-library/react"
import { ComponentTab } from "@/components/toolbox/ComponentTab"
import { useUiStore } from "@/stores/uiStore"
import { useArchitectureStore } from "@/stores/architectureStore"
import { componentLibrary } from "@/services/componentLibrary"
import { checkCompatibility } from "@/engine/compatibilityChecker"
import type { Component } from "@/schemas/componentSchema"

const mockComponents: Component[] = [
  {
    id: "postgresql",
    name: "PostgreSQL",
    category: "data-storage",
    description: "Relational database",
    is: "An open-source relational database",
    gain: ["ACID compliance"],
    cost: ["Higher memory"],
    tags: ["database", "sql"],
    baseMetrics: [{ id: "latency", value: "medium", numericValue: 5, category: "performance" }],
    configVariants: [
      { id: "default", name: "Default", metrics: [{ id: "latency", value: "low", numericValue: 3, category: "performance" }] },
    ],
  },
  {
    id: "redis",
    name: "Redis",
    category: "caching",
    description: "In-memory data store",
    is: "A fast key-value store",
    gain: ["Sub-ms latency"],
    cost: ["Memory-bound"],
    tags: ["cache"],
    baseMetrics: [{ id: "latency", value: "low", numericValue: 2, category: "performance" }],
    configVariants: [
      { id: "default", name: "Default", metrics: [{ id: "latency", value: "low", numericValue: 2, category: "performance" }] },
    ],
  },
]

vi.mock("@/hooks/useLibrary", () => ({
  useLibrary: vi.fn(() => ({
    isReady: true,
    components: mockComponents,
    getComponentById: vi.fn(),
    getComponentsByCategory: vi.fn(() => []),
    searchComponents: vi.fn((query: string) => {
      const lower = query.toLowerCase()
      return mockComponents.filter(
        (c) => c.name.toLowerCase().includes(lower) || c.tags.some((t) => t.toLowerCase().includes(lower)),
      )
    }),
  })),
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

vi.mock("@/engine/compatibilityChecker", () => ({
  checkCompatibility: vi.fn(() => ({ isCompatible: true, reason: "" })),
}))

describe("ComponentTab", () => {
  beforeEach(() => {
    useUiStore.setState({ searchQuery: "", selectedNodeId: null })
    vi.mocked(componentLibrary.getComponent).mockReturnValue(undefined)
    vi.mocked(checkCompatibility).mockReturnValue({ isCompatible: true, reason: "" })
  })

  it("renders component cards for all components", () => {
    render(<ComponentTab />)
    expect(screen.getByTestId("component-card-postgresql")).toBeInTheDocument()
    expect(screen.getByTestId("component-card-redis")).toBeInTheDocument()
  })

  it("renders category headings", () => {
    render(<ComponentTab />)
    expect(screen.getByTestId("category-data-storage")).toBeInTheDocument()
    expect(screen.getByTestId("category-caching")).toBeInTheDocument()
  })

  describe("collapsible categories (P3)", () => {
    it("renders categories expanded by default", () => {
      render(<ComponentTab />)
      expect(screen.getByTestId("category-toggle-data-storage")).toHaveAttribute("aria-expanded", "true")
      expect(screen.getByTestId("component-card-postgresql")).toBeInTheDocument()
    })

    it("collapsing a category hides its cards but keeps others", () => {
      render(<ComponentTab />)
      fireEvent.click(screen.getByTestId("category-toggle-data-storage"))
      expect(screen.getByTestId("category-toggle-data-storage")).toHaveAttribute("aria-expanded", "false")
      expect(screen.queryByTestId("component-card-postgresql")).toBeNull()
      // Other categories remain expanded.
      expect(screen.getByTestId("component-card-redis")).toBeInTheDocument()
    })

    it("an active search force-expands all categories", () => {
      useUiStore.setState({ searchQuery: "" })
      render(<ComponentTab />)
      fireEvent.click(screen.getByTestId("category-toggle-data-storage"))
      expect(screen.queryByTestId("component-card-postgresql")).toBeNull()
      // Searching overrides the collapse so matches aren't hidden.
      act(() => {
        useUiStore.setState({ searchQuery: "postgre" })
      })
      expect(screen.getByTestId("component-card-postgresql")).toBeInTheDocument()
    })
  })

  it("shows empty state when no components loaded", async () => {
    const { useLibrary } = await import("@/hooks/useLibrary")
    vi.mocked(useLibrary).mockReturnValueOnce({
      isReady: true,
      components: [],
      getComponentById: vi.fn(),
      getComponentsByCategory: vi.fn(() => []),
      searchComponents: vi.fn(() => []),
    })
    render(<ComponentTab />)
    expect(screen.getByTestId("component-tab-empty")).toBeInTheDocument()
    expect(screen.getByText("No components loaded")).toBeInTheDocument()
  })

  it("shows 'No matching components' when search has no results", async () => {
    useUiStore.setState({ searchQuery: "nonexistent" })
    const { useLibrary } = await import("@/hooks/useLibrary")
    vi.mocked(useLibrary).mockReturnValueOnce({
      isReady: true,
      components: mockComponents,
      getComponentById: vi.fn(),
      getComponentsByCategory: vi.fn(() => []),
      searchComponents: vi.fn(() => []),
    })
    render(<ComponentTab />)
    expect(screen.getByText("No matching components")).toBeInTheDocument()
  })

  it("displays component count per category", () => {
    render(<ComponentTab />)
    const counts = screen.getAllByText("(1)")
    expect(counts).toHaveLength(2) // One per category (data-storage, caching)
  })

  describe("compatibility filtering", () => {
    it("no cards are dimmed when no node is selected", () => {
      useUiStore.setState({ selectedNodeId: null })
      render(<ComponentTab />)
      const pgCard = screen.getByTestId("component-card-postgresql")
      const redisCard = screen.getByTestId("component-card-redis")
      expect(pgCard.className).toContain("opacity-100")
      expect(redisCard.className).toContain("opacity-100")
    })

    it("dims incompatible cards when a node is selected", () => {
      useUiStore.setState({ selectedNodeId: "node-1" })
      useArchitectureStore.setState({
        nodes: [{
          id: "node-1",
          type: "archie-component",
          position: { x: 0, y: 0 },
          data: {
            archieComponentId: "postgresql",
            componentName: "PostgreSQL",
            componentCategory: "data-storage",
            activeConfigVariantId: "default",
          },
        }],
      } as Partial<ReturnType<typeof useArchitectureStore.getState>> as never)
      vi.mocked(componentLibrary.getComponent).mockImplementation((id: string) => {
        if (id === "postgresql") return { id: "postgresql", category: "data-storage", compatibility: { caching: "Not recommended" } } as never
        return undefined
      })
      vi.mocked(checkCompatibility).mockImplementation((_source, target) => {
        if ((target as { category: string } | undefined)?.category === "caching") return { isCompatible: false, reason: "Not recommended" }
        return { isCompatible: true, reason: "" }
      })

      render(<ComponentTab />)
      const redisCard = screen.getByTestId("component-card-redis")
      expect(redisCard.className).toContain("opacity-40")

      const pgCard = screen.getByTestId("component-card-postgresql")
      expect(pgCard.className).toContain("opacity-100")
    })

    it("all cards are full opacity when selected node has no compatibility restrictions", () => {
      useUiStore.setState({ selectedNodeId: "node-1" })
      useArchitectureStore.setState({
        nodes: [{
          id: "node-1",
          type: "archie-component",
          position: { x: 0, y: 0 },
          data: {
            archieComponentId: "postgresql",
            componentName: "PostgreSQL",
            componentCategory: "data-storage",
            activeConfigVariantId: "default",
          },
        }],
      } as Partial<ReturnType<typeof useArchitectureStore.getState>> as never)
      vi.mocked(componentLibrary.getComponent).mockReturnValue({ id: "postgresql", category: "data-storage", compatibility: {} } as never)
      vi.mocked(checkCompatibility).mockReturnValue({ isCompatible: true, reason: "" })

      render(<ComponentTab />)
      const pgCard = screen.getByTestId("component-card-postgresql")
      const redisCard = screen.getByTestId("component-card-redis")
      expect(pgCard.className).toContain("opacity-100")
      expect(redisCard.className).toContain("opacity-100")
    })
  })
})
