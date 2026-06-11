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
    id: "ec2",
    name: "EC2",
    category: "compute",
    typeId: "compute",
    description: "Virtual servers",
    is: "Generic compute",
    gain: ["Flexible"],
    cost: ["Ops burden"],
    tags: ["compute"],
    baseMetrics: [{ id: "latency", value: "medium", numericValue: 5, category: "performance" }],
    configVariants: [
      { id: "default", name: "Default", metrics: [{ id: "latency", value: "medium", numericValue: 5, category: "performance" }] },
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
vi.mock("@/hooks/useCurrentUserId", () => ({ useCurrentUserId: () => "u1" }))
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
    expect(counts).toHaveLength(3) // One per category (data-storage, compute, caching)
  })

  describe("challenge guidance (item 4b)", () => {
    it("no guidance banner when no challenge is active", () => {
      useChallengeStore.setState({ activeChallenge: null })
      render(<ComponentTab />)
      expect(screen.queryByTestId("challenge-component-guidance")).toBeNull()
    })

    it("NO required-categories banner — it gave the solution away (2026-06-11 playtest)", () => {
      useChallengeStore.setState({ activeChallenge: makeChallenge({ requiredComponents: ["data-storage", "caching"] }) })
      render(<ComponentTab />)
      expect(screen.queryByTestId("challenge-component-guidance")).toBeNull()
      // Blocks still visible — requirements live in the quest panel's REQUIRED checklist only.
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

  describe("banned-block display (S6b / D89 — shown-but-locked)", () => {
    it("a forbidden type OUTSIDE the palette still renders, locked red, with add disabled + drag off", () => {
      // no-cache-no-mercy shape: cache is banned AND not in available_blocks (Phase 1's guard
      // guarantees forbidden ∩ available_blocks = ∅) — pre-S6b it was simply invisible.
      useChallengeStore.setState({
        activeChallenge: makeChallenge({
          forbiddenTypes: ["cache"],
          availableBlocks: ["relational-db", "compute", "traffic-source"],
        }),
      })
      render(<ComponentTab />)
      const card = screen.getByTestId("type-block-cache")
      expect(card).toBeInTheDocument()
      expect(card).toHaveAttribute("data-lock-reason", "banned")
      expect(card).toHaveAttribute("draggable", "false")
      expect(card).toHaveAttribute("aria-disabled", "true")
      expect(screen.getByTestId("block-lock-cache")).toBeInTheDocument()
      expect(screen.getByTestId("add-type-cache")).toBeDisabled()
      // the in-palette block stays a normal, addable card
      const ok = screen.getByTestId("type-block-relational-db")
      expect(ok).not.toHaveAttribute("data-lock-reason")
      expect(ok).toHaveAttribute("draggable", "true")
      expect(screen.getByTestId("add-type-relational-db")).toBeEnabled()
    })

    it("a banned type also bypasses an allowedCategories restriction (visible-locked, not hidden)", () => {
      useChallengeStore.setState({
        activeChallenge: makeChallenge({
          requiredComponents: ["data-storage"],
          allowedCategories: ["data-storage"],
          forbiddenTypes: ["cache"], // caching category is NOT allowed — banned still shows
        }),
      })
      render(<ComponentTab />)
      expect(screen.getByTestId("type-block-cache")).toHaveAttribute("data-lock-reason", "banned")
      expect(screen.getByTestId("type-block-relational-db")).not.toHaveAttribute("data-lock-reason")
    })

    it("free build never marks a type banned (forbidden_types is a quest rule)", () => {
      useChallengeStore.setState({ activeChallenge: null })
      render(<ComponentTab />)
      expect(screen.getByTestId("type-block-cache")).not.toHaveAttribute("data-lock-reason")
      expect(screen.getByTestId("add-type-cache")).toBeEnabled()
    })
  })
})

describe("toolbox realism + required-blocks filter (P4-S5 / D94)", () => {
  beforeEach(async () => {
    const { useUserProgressStore } = await import("@/stores/userProgressStore")
    useUserProgressStore.setState({ completedChallenges: [], expertCurrency: 0, requiredFilterUnlocked: {} })
  })

  it("an UNLOCKED type outside the quest palette renders gray-locked, not hidden (realism)", () => {
    // compute is base-unlocked (BASE_UNLOCKED_BLOCKS) but NOT in this quest's available_blocks.
    useChallengeStore.setState({
      activeChallenge: makeChallenge({ availableBlocks: ["relational-db", "traffic-source"] }),
    })
    render(<ComponentTab />)
    const card = screen.getByTestId("type-block-compute")
    expect(card).toHaveAttribute("data-lock-reason", "not-in-palette")
    expect(card).toHaveAttribute("draggable", "false")
    expect(screen.getByTestId("add-type-compute")).toBeDisabled()
    // in-palette block unaffected
    expect(screen.getByTestId("type-block-relational-db")).not.toHaveAttribute("data-lock-reason")
  })

  it("a NOT-yet-unlocked type outside the palette stays hidden (realism shows YOUR toolbox, not the catalog)", () => {
    // cache is neither base-unlocked nor granted by completed quests → still invisible.
    useChallengeStore.setState({
      activeChallenge: makeChallenge({ availableBlocks: ["relational-db", "traffic-source"] }),
    })
    render(<ComponentTab />)
    expect(screen.queryByTestId("type-block-cache")).toBeNull()
  })

  it("banned outranks not-in-palette (a banned base block shows the red Ban, not the gray Lock)", () => {
    useChallengeStore.setState({
      activeChallenge: makeChallenge({ availableBlocks: ["relational-db"], forbiddenTypes: ["compute"] }),
    })
    render(<ComponentTab />)
    expect(screen.getByTestId("type-block-compute")).toHaveAttribute("data-lock-reason", "banned")
  })

  it("free build: no gray locks (the palette filters are quest-mode concepts)", () => {
    useChallengeStore.setState({ activeChallenge: null })
    render(<ComponentTab />)
    expect(screen.getByTestId("type-block-compute")).not.toHaveAttribute("data-lock-reason")
  })

  it("filter not owned: unlock button disabled at 0 expert balance, enabled once affordable", async () => {
    const { useUserProgressStore } = await import("@/stores/userProgressStore")
    useChallengeStore.setState({ activeChallenge: makeChallenge({ requiredTypes: ["relational-db"] }) })
    const { unmount } = render(<ComponentTab />)
    expect(screen.getByTestId("required-filter-unlock")).toBeDisabled()
    expect(screen.getByTestId("required-filter-price")).toHaveTextContent("Unlock for 1")
    unmount()
    useUserProgressStore.setState({ expertCurrency: 2 })
    render(<ComponentTab />)
    expect(screen.getByTestId("required-filter-unlock")).toBeEnabled()
  })

  it("clicking unlock spends through the store action (u1, quest id)", async () => {
    const { useUserProgressStore } = await import("@/stores/userProgressStore")
    const spend = vi.fn().mockResolvedValue(true)
    useUserProgressStore.setState({ expertCurrency: 1, unlockRequiredFilter: spend } as never)
    useChallengeStore.setState({ activeChallenge: makeChallenge({ requiredTypes: ["relational-db"] }) })
    render(<ComponentTab />)
    fireEvent.click(screen.getByTestId("required-filter-unlock"))
    expect(spend).toHaveBeenCalledWith("u1", "c1")
  })

  it("owned: the toggle narrows the palette to required types + categories, and back", async () => {
    const { useUserProgressStore } = await import("@/stores/userProgressStore")
    useUserProgressStore.setState({ requiredFilterUnlocked: { c1: true } })
    // cache is in-palette but NOT required; relational-db is required by type, ec2 by category.
    useChallengeStore.setState({
      activeChallenge: makeChallenge({
        requiredTypes: ["relational-db"],
        requiredComponents: ["compute"],
        availableBlocks: ["relational-db", "cache", "compute", "traffic-source"],
      }),
    })
    render(<ComponentTab />)
    expect(screen.getByTestId("type-block-cache")).toBeInTheDocument()
    fireEvent.click(screen.getByTestId("required-filter-toggle"))
    expect(screen.queryByTestId("type-block-cache")).toBeNull()
    expect(screen.getByTestId("type-block-relational-db")).toBeInTheDocument()
    expect(screen.getByTestId("type-block-compute")).toBeInTheDocument()
    fireEvent.click(screen.getByTestId("required-filter-toggle"))
    expect(screen.getByTestId("type-block-cache")).toBeInTheDocument()
  })

  it("no toggle row outside quest mode or when the quest grades nothing", () => {
    useChallengeStore.setState({ activeChallenge: null })
    const { unmount } = render(<ComponentTab />)
    expect(screen.queryByTestId("required-filter-toggle")).toBeNull()
    expect(screen.queryByTestId("required-filter-unlock")).toBeNull()
    unmount()
    useChallengeStore.setState({ activeChallenge: makeChallenge({ requiredComponents: [], requiredTypes: [] }) })
    render(<ComponentTab />)
    expect(screen.queryByTestId("required-filter-unlock")).toBeNull()
  })
})
