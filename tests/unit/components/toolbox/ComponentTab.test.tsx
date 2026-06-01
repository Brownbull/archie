import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, fireEvent, act } from "@testing-library/react"
import { ComponentTab } from "@/components/toolbox/ComponentTab"
import { useUiStore } from "@/stores/uiStore"
import { useArchitectureStore } from "@/stores/architectureStore"
import { useChallengeStore } from "@/stores/challengeStore"
import { usePathwaySuggestions } from "@/hooks/usePathwaySuggestions"
import { componentLibrary } from "@/services/componentLibrary"
import { checkCompatibility } from "@/engine/compatibilityChecker"
import type { Component } from "@/schemas/componentSchema"
import type { Challenge } from "@/lib/challengeTypes"

function makeChallenge(over: Partial<Challenge> = {}): Challenge {
  return {
    id: "c1", title: "Test Challenge", brief: "brief", difficulty: "beginner",
    budgetCap: 100, durationSeconds: 60, trafficCurve: [{ t: 0, rps: 0 }],
    requiredComponents: ["compute"], targetMetrics: { uptimePercent: 99, p99LatencyMs: 200 },
    scheduledEvents: [], hints: [], ...over,
  }
}

const mockComponents: Component[] = [
  {
    id: "postgresql",
    name: "PostgreSQL",
    category: "data-storage",
    typeId: "relational-db",
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
    typeId: "cache",
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

// usePathwaySuggestions drives the inline "Suggested next" panel. Default: no suggestions
// (so existing tests are unaffected); a specific test overrides it.
vi.mock("@/hooks/usePathwaySuggestions", () => ({
  usePathwaySuggestions: vi.fn(() => ({ suggestions: [], hasGaps: false, nextTierName: null })),
}))

describe("ComponentTab", () => {
  beforeEach(() => {
    useUiStore.setState({ searchQuery: "", selectedNodeId: null })
    useChallengeStore.setState({ activeChallenge: null })
    vi.mocked(componentLibrary.getComponent).mockReturnValue(undefined)
    vi.mocked(checkCompatibility).mockReturnValue({ isCompatible: true, reason: "" })
    vi.mocked(usePathwaySuggestions).mockReturnValue({ suggestions: [], hasGaps: false, nextTierName: null })
  })

  describe("inline pathway suggestions (item 1c)", () => {
    const sampleSuggestion = {
      componentId: "redis",
      componentName: "Redis",
      category: "caching",
      gapClosed: "Add a caching layer",
      weightedScore: 7.2,
      isConstraintSafe: true,
      reason: "caching improves read latency",
    }

    it("shows the 'Suggested next' panel inline when suggestions exist (free build)", () => {
      vi.mocked(usePathwaySuggestions).mockReturnValue({ suggestions: [sampleSuggestion], hasGaps: true, nextTierName: "Established" })
      render(<ComponentTab />)
      expect(screen.getByTestId("component-tab-pathway")).toBeInTheDocument()
      expect(screen.getByTestId("pathway-add-redis")).toBeInTheDocument()
    })

    it("hides the inline pathway during a challenge", () => {
      vi.mocked(usePathwaySuggestions).mockReturnValue({ suggestions: [sampleSuggestion], hasGaps: true, nextTierName: "Established" })
      useChallengeStore.setState({ activeChallenge: makeChallenge() })
      render(<ComponentTab />)
      expect(screen.queryByTestId("component-tab-pathway")).toBeNull()
    })

    it("hides the inline pathway while searching", () => {
      vi.mocked(usePathwaySuggestions).mockReturnValue({ suggestions: [sampleSuggestion], hasGaps: true, nextTierName: "Established" })
      useUiStore.setState({ searchQuery: "redis" })
      render(<ComponentTab />)
      expect(screen.queryByTestId("component-tab-pathway")).toBeNull()
    })
  })

  it("renders one logical-block card per fundamental type", () => {
    render(<ComponentTab />)
    expect(screen.getByTestId("type-block-relational-db")).toBeInTheDocument()
    expect(screen.getByTestId("type-block-cache")).toBeInTheDocument()
    // Blocks show the logical type label, not the vendor name.
    expect(screen.getByText("SQL Database")).toBeInTheDocument()
    expect(screen.getByText("Cache")).toBeInTheDocument()
    // Vendors are NOT listed in the toolbox anymore.
    expect(screen.queryByTestId("component-card-postgresql")).toBeNull()
  })

  it("groups the logical blocks under their visual category", () => {
    render(<ComponentTab />)
    expect(screen.getByTestId("category-group-data-storage")).toBeInTheDocument()
    expect(screen.getByTestId("category-group-caching")).toBeInTheDocument()
  })

  describe("collapsible category sections", () => {
    it("renders categories expanded by default", () => {
      render(<ComponentTab />)
      expect(screen.getByTestId("category-toggle-data-storage")).toHaveAttribute("aria-expanded", "true")
      expect(screen.getByTestId("type-block-relational-db")).toBeInTheDocument()
    })

    it("collapsing a category hides its blocks but keeps others", () => {
      render(<ComponentTab />)
      fireEvent.click(screen.getByTestId("category-toggle-data-storage"))
      expect(screen.getByTestId("category-toggle-data-storage")).toHaveAttribute("aria-expanded", "false")
      expect(screen.queryByTestId("type-block-relational-db")).toBeNull()
      expect(screen.getByTestId("type-block-cache")).toBeInTheDocument()
    })

    it("an active search force-expands all categories and matches by concept synonym", () => {
      useUiStore.setState({ searchQuery: "" })
      render(<ComponentTab />)
      fireEvent.click(screen.getByTestId("category-toggle-data-storage"))
      expect(screen.queryByTestId("type-block-relational-db")).toBeNull()
      // "sql" is a synonym of the relational-db type → surfaces the block even with no name match.
      act(() => {
        useUiStore.setState({ searchQuery: "sql" })
      })
      expect(screen.getByTestId("type-block-relational-db")).toBeInTheDocument()
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

  describe("challenge guidance (item 4b)", () => {
    it("no guidance banner when no challenge is active", () => {
      useChallengeStore.setState({ activeChallenge: null })
      render(<ComponentTab />)
      expect(screen.queryByTestId("challenge-component-guidance")).toBeNull()
    })

    it("shows the guidance banner while a challenge is active", () => {
      useChallengeStore.setState({ activeChallenge: makeChallenge({ requiredComponents: ["data-storage", "caching"] }) })
      render(<ComponentTab />)
      expect(screen.getByTestId("challenge-component-guidance")).toBeInTheDocument()
      // Both blocks still visible — required is guidance, not a restriction.
      expect(screen.getByTestId("type-block-relational-db")).toBeInTheDocument()
      expect(screen.getByTestId("type-block-cache")).toBeInTheDocument()
    })

    it("allowedCategories restricts the palette to those categories", () => {
      useChallengeStore.setState({
        activeChallenge: makeChallenge({ requiredComponents: ["caching"], allowedCategories: ["caching"] }),
      })
      render(<ComponentTab />)
      expect(screen.getByTestId("challenge-component-guidance")).toBeInTheDocument()
      // Only caching shows; data-storage is filtered out.
      expect(screen.getByTestId("type-block-cache")).toBeInTheDocument()
      expect(screen.queryByTestId("type-block-relational-db")).toBeNull()
    })
  })

  describe("compatibility filtering", () => {
    const pgNode = {
      id: "node-1",
      type: "archie-component",
      position: { x: 0, y: 0 },
      data: {
        archieComponentId: "postgresql",
        componentName: "PostgreSQL",
        componentCategory: "data-storage",
        activeConfigVariantId: "default",
      },
    }

    it("no blocks are dimmed when no node is selected", () => {
      useUiStore.setState({ selectedNodeId: null })
      render(<ComponentTab />)
      expect(screen.getByTestId("type-block-relational-db").className).toContain("opacity-100")
      expect(screen.getByTestId("type-block-cache").className).toContain("opacity-100")
    })

    it("dims a logical block when all its vendors are incompatible with the selection", () => {
      useUiStore.setState({ selectedNodeId: "node-1" })
      useArchitectureStore.setState({ nodes: [pgNode] } as Partial<ReturnType<typeof useArchitectureStore.getState>> as never)
      vi.mocked(componentLibrary.getComponent).mockImplementation((id: string) =>
        id === "postgresql" ? ({ id: "postgresql", category: "data-storage", compatibility: { caching: "Not recommended" } } as never) : undefined,
      )
      vi.mocked(checkCompatibility).mockImplementation((_source, target) =>
        (target as { category: string } | undefined)?.category === "caching"
          ? { isCompatible: false, reason: "Not recommended" }
          : { isCompatible: true, reason: "" },
      )

      render(<ComponentTab />)
      // cache's only vendor (redis) is incompatible → the whole Cache block dims.
      expect(screen.getByTestId("type-block-cache").className).toContain("opacity-40")
      expect(screen.getByTestId("type-block-relational-db").className).toContain("opacity-100")
    })

    it("all blocks full opacity when the selection has no restrictions", () => {
      useUiStore.setState({ selectedNodeId: "node-1" })
      useArchitectureStore.setState({ nodes: [pgNode] } as Partial<ReturnType<typeof useArchitectureStore.getState>> as never)
      vi.mocked(componentLibrary.getComponent).mockReturnValue({ id: "postgresql", category: "data-storage", compatibility: {} } as never)
      vi.mocked(checkCompatibility).mockReturnValue({ isCompatible: true, reason: "" })

      render(<ComponentTab />)
      expect(screen.getByTestId("type-block-relational-db").className).toContain("opacity-100")
      expect(screen.getByTestId("type-block-cache").className).toContain("opacity-100")
    })
  })
})
