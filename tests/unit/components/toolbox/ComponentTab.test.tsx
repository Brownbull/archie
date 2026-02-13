import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen } from "@testing-library/react"
import { ComponentTab } from "@/components/toolbox/ComponentTab"
import { useUiStore } from "@/stores/uiStore"
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

describe("ComponentTab", () => {
  beforeEach(() => {
    useUiStore.setState({ searchQuery: "" })
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
})
