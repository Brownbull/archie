import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import type { Component } from "@/types"
import { useArchitectureStore } from "@/stores/architectureStore"

// Mock useLibrary hook (used by ComponentSwapper internally)
const mockGetComponentsByCategory = vi.fn()
vi.mock("@/hooks/useLibrary", () => ({
  useLibrary: () => ({
    isReady: true,
    components: [],
    getComponentById: vi.fn(),
    getComponentsByCategory: mockGetComponentsByCategory,
    searchComponents: vi.fn(),
  }),
}))

// Import after mocks are set up
const { ComponentDetail } = await import(
  "@/components/inspector/ComponentDetail"
)

const mockComponent: Component = {
  id: "postgresql",
  name: "PostgreSQL",
  category: "data-storage",
  description: "Open-source relational database management system",
  is: "A powerful, open source object-relational database system",
  gain: ["ACID compliance", "Complex query support", "Extensibility"],
  cost: ["Higher memory usage", "Complex configuration"],
  tags: ["database", "relational", "sql"],
  baseMetrics: [],
  configVariants: [
    {
      id: "standard",
      name: "Standard",
      metrics: [
        { id: "query-perf", value: "high", numericValue: 8, category: "performance" },
        { id: "write-throughput", value: "medium", numericValue: 5, category: "performance" },
        { id: "scalability", value: "medium", numericValue: 6, category: "scalability" },
        { id: "memory", value: "low", numericValue: 3, category: "resource" },
      ],
    },
    {
      id: "high-perf",
      name: "High Performance",
      metrics: [
        { id: "query-perf", value: "high", numericValue: 10, category: "performance" },
        { id: "write-throughput", value: "high", numericValue: 8, category: "performance" },
        { id: "scalability", value: "high", numericValue: 9, category: "scalability" },
        { id: "memory", value: "medium", numericValue: 5, category: "resource" },
      ],
    },
  ],
}

const componentWithNoVariants: Component = {
  id: "simple",
  name: "Simple Component",
  category: "compute",
  description: "A simple component",
  is: "A simple test component",
  gain: ["Fast"],
  cost: ["Limited"],
  tags: [],
  baseMetrics: [],
  configVariants: [],
}

// Shared props for all renders
const defaultSwapperProps = {
  currentCategory: "data-storage",
  onSwapComponent: vi.fn(),
}

// Multiple components for swapper visibility
const multipleComponentsInCategory = [
  mockComponent,
  {
    id: "mongodb",
    name: "MongoDB",
    category: "data-storage",
    description: "Document database",
    is: "A NoSQL database",
    gain: ["Schema flexibility"],
    cost: ["Eventual consistency"],
    tags: ["database"],
    baseMetrics: [],
    configVariants: [{ id: "default", name: "Default", metrics: [] }],
  },
]

describe("ComponentDetail", () => {
  beforeEach(() => {
    vi.resetAllMocks()
    // Default: single component in category (swapper hidden)
    mockGetComponentsByCategory.mockReturnValue([mockComponent])
  })

  /** Render with default props (mockComponent, standard variant). Override via partial. */
  function renderDefault(overrides: Partial<Parameters<typeof ComponentDetail>[0]> = {}) {
    return render(
      <ComponentDetail
        component={mockComponent}
        activeVariantId="standard"
        onVariantChange={vi.fn()}
        {...defaultSwapperProps}
        {...overrides}
      />,
    )
  }

  it("renders the component name", () => {
    renderDefault()
    expect(screen.getByText("PostgreSQL")).toBeInTheDocument()
  })

  it("renders the category badge", () => {
    renderDefault()
    expect(screen.getByText("Data Storage")).toBeInTheDocument()
  })

  it("renders the description", () => {
    renderDefault()
    expect(screen.getByText("Open-source relational database management system")).toBeInTheDocument()
  })

  it("renders the 'is' text", () => {
    renderDefault()
    expect(screen.getByText("A powerful, open source object-relational database system")).toBeInTheDocument()
  })

  it("renders all gain items", () => {
    renderDefault()
    expect(screen.getByText("ACID compliance")).toBeInTheDocument()
    expect(screen.getByText("Complex query support")).toBeInTheDocument()
    expect(screen.getByText("Extensibility")).toBeInTheDocument()
  })

  it("renders all cost items", () => {
    renderDefault()
    expect(screen.getByText("Higher memory usage")).toBeInTheDocument()
    expect(screen.getByText("Complex configuration")).toBeInTheDocument()
  })

  it("renders ConfigSelector when variants exist", () => {
    renderDefault()
    expect(screen.getByTestId("config-selector")).toBeInTheDocument()
  })

  it("hides ConfigSelector when no variants", () => {
    renderDefault({
      component: componentWithNoVariants,
      activeVariantId: "",
      currentCategory: "compute",
    })
    expect(screen.queryByTestId("config-selector")).not.toBeInTheDocument()
  })

  it("renders metric cards grouped by category", () => {
    renderDefault()
    expect(screen.getByTestId("metric-card-performance")).toBeInTheDocument()
    expect(screen.getByTestId("metric-card-scalability")).toBeInTheDocument()
    expect(screen.getByTestId("metric-card-resource")).toBeInTheDocument()
  })

  it("renders correct number of metric bars for each category", () => {
    renderDefault()
    const allBars = screen.getAllByTestId("metric-bar")
    expect(allBars).toHaveLength(4)
  })

  it("does not render metrics section when no active variant found", () => {
    renderDefault({ activeVariantId: "nonexistent" })
    expect(screen.queryByTestId("metric-card-performance")).not.toBeInTheDocument()
  })

  it("renders metrics from unknown categories with fallback styling", () => {
    const componentWithUnknownCategoryMetric: Component = {
      ...mockComponent,
      configVariants: [
        {
          id: "variant1",
          name: "Variant 1",
          metrics: [
            { id: "custom-metric", value: "high", numericValue: 8, category: "unknown-category" },
          ],
        },
      ],
    }

    renderDefault({
      component: componentWithUnknownCategoryMetric,
      activeVariantId: "variant1",
    })
    expect(screen.getByTestId("metric-card-unknown-category")).toBeInTheDocument()
    expect(screen.getByText("unknown-category")).toBeInTheDocument()
  })

  it("does not render category badge when category is unknown", () => {
    renderDefault({
      component: { ...mockComponent, category: "unknown-category" },
      currentCategory: "unknown-category",
    })
    expect(screen.queryByText("Data Storage")).not.toBeInTheDocument()
    expect(screen.queryByText("Compute")).not.toBeInTheDocument()
  })

  // ComponentSwapper integration tests
  it("renders ComponentSwapper when multiple components in category", () => {
    mockGetComponentsByCategory.mockReturnValue(multipleComponentsInCategory)
    renderDefault()
    expect(screen.getByTestId("component-swapper")).toBeInTheDocument()
  })

  it("does not render ComponentSwapper when single component in category", () => {
    mockGetComponentsByCategory.mockReturnValue([mockComponent])
    renderDefault()
    expect(screen.queryByTestId("component-swapper")).not.toBeInTheDocument()
  })

  // --- Delta indicator tests (Story 4-2a) ---

  describe("delta indicators", () => {
    afterEach(() => {
      // Reset store state to defaults after delta tests
      useArchitectureStore.setState({
        computedMetrics: new Map(),
        previousMetrics: new Map(),
      })
    })

    it("shows no delta indicators when previousMetrics is empty for the node", () => {
      const nodeId = "node-1"
      useArchitectureStore.setState({
        computedMetrics: new Map([
          [nodeId, {
            nodeId,
            overallScore: 7,
            metrics: [
              { id: "query-perf", value: "high" as const, numericValue: 8, category: "performance" },
            ],
          }],
        ]),
        previousMetrics: new Map(),
      })
      renderDefault({ nodeId })
      expect(screen.queryByTestId("metric-bar-delta")).not.toBeInTheDocument()
    })

    it("shows delta indicators when previousMetrics has data for the node", () => {
      const nodeId = "node-1"
      useArchitectureStore.setState({
        computedMetrics: new Map([
          [nodeId, {
            nodeId,
            overallScore: 7,
            metrics: [
              { id: "query-perf", value: "high" as const, numericValue: 10, category: "performance" },
            ],
          }],
        ]),
        previousMetrics: new Map([
          [nodeId, {
            nodeId,
            overallScore: 5,
            metrics: [
              { id: "query-perf", value: "high" as const, numericValue: 8, category: "performance" },
            ],
          }],
        ]),
      })
      renderDefault({ nodeId })
      // delta = 10 - 8 = +2
      const delta = screen.getByTestId("metric-bar-delta")
      expect(delta).toHaveTextContent("+2")
      expect(delta).toHaveClass("text-green-500")
    })

    it("shows no delta indicators when nodeId is not provided", () => {
      useArchitectureStore.setState({
        computedMetrics: new Map([
          ["node-1", {
            nodeId: "node-1",
            overallScore: 7,
            metrics: [
              { id: "query-perf", value: "high" as const, numericValue: 10, category: "performance" },
            ],
          }],
        ]),
        previousMetrics: new Map([
          ["node-1", {
            nodeId: "node-1",
            overallScore: 5,
            metrics: [
              { id: "query-perf", value: "high" as const, numericValue: 8, category: "performance" },
            ],
          }],
        ]),
      })
      // No nodeId prop → no delta
      renderDefault()
      expect(screen.queryByTestId("metric-bar-delta")).not.toBeInTheDocument()
    })

    it("shows negative delta in red", () => {
      const nodeId = "node-1"
      useArchitectureStore.setState({
        computedMetrics: new Map([
          [nodeId, {
            nodeId,
            overallScore: 4,
            metrics: [
              { id: "query-perf", value: "medium" as const, numericValue: 5, category: "performance" },
            ],
          }],
        ]),
        previousMetrics: new Map([
          [nodeId, {
            nodeId,
            overallScore: 6,
            metrics: [
              { id: "query-perf", value: "high" as const, numericValue: 8, category: "performance" },
            ],
          }],
        ]),
      })
      renderDefault({ nodeId })
      // delta = 5 - 8 = -3
      const delta = screen.getByTestId("metric-bar-delta")
      expect(delta).toHaveTextContent("-3")
      expect(delta).toHaveClass("text-red-500")
    })
  })

  // --- Metric filter integration tests (Story 4-2b) ---

  describe("metric filter", () => {
    it("renders the metric filter panel", () => {
      renderDefault()
      expect(screen.getByTestId("metric-filter")).toBeInTheDocument()
    })

    it("hides metrics when filter checkbox is unchecked", async () => {
      const user = userEvent.setup()
      renderDefault()
      // Initially 4 metric bars visible
      expect(screen.getAllByTestId("metric-bar")).toHaveLength(4)
      // Expand filter
      await user.click(screen.getByTestId("metric-filter-expand"))
      // Toggle off "memory" metric
      await user.click(screen.getByTestId("metric-filter-toggle-memory"))
      // Now 3 metric bars visible
      expect(screen.getAllByTestId("metric-bar")).toHaveLength(3)
    })

    it("restores hidden metrics when toggled back on", async () => {
      const user = userEvent.setup()
      renderDefault()
      await user.click(screen.getByTestId("metric-filter-expand"))
      // Hide and re-show
      await user.click(screen.getByTestId("metric-filter-toggle-memory"))
      expect(screen.getAllByTestId("metric-bar")).toHaveLength(3)
      await user.click(screen.getByTestId("metric-filter-toggle-memory"))
      expect(screen.getAllByTestId("metric-bar")).toHaveLength(4)
    })

    it("resets filter state when nodeId changes (AC-FUNC-3)", async () => {
      const user = userEvent.setup()
      const { rerender } = render(
        <ComponentDetail
          component={mockComponent}
          activeVariantId="standard"
          onVariantChange={vi.fn()}
          nodeId="node-A"
          {...defaultSwapperProps}
        />,
      )
      // Hide a metric
      await user.click(screen.getByTestId("metric-filter-expand"))
      await user.click(screen.getByTestId("metric-filter-toggle-memory"))
      expect(screen.getAllByTestId("metric-bar")).toHaveLength(3)
      // Switch to a different node — filter should reset
      rerender(
        <ComponentDetail
          component={mockComponent}
          activeVariantId="standard"
          onVariantChange={vi.fn()}
          nodeId="node-B"
          {...defaultSwapperProps}
        />,
      )
      expect(screen.getAllByTestId("metric-bar")).toHaveLength(4)
    })

    it("does not store filter state in Zustand (AC-ARCH-NO-1)", async () => {
      const user = userEvent.setup()
      renderDefault()
      const storeBefore = useArchitectureStore.getState()
      await user.click(screen.getByTestId("metric-filter-expand"))
      await user.click(screen.getByTestId("metric-filter-toggle-memory"))
      const storeAfter = useArchitectureStore.getState()
      // Store state should be unchanged after toggling filter
      expect(storeAfter).toEqual(storeBefore)
    })
  })

  // --- Recommendation integration tests (Story 4-2b) ---

  describe("recommendations", () => {
    it("renders recommendation cards when weak metrics exist", () => {
      // mockComponent "standard" has memory=3 (< RECOMMENDATION_THRESHOLD=5)
      // "high-perf" has memory=5 — improvement exists
      renderDefault()
      expect(screen.getByTestId("recommendations-section")).toBeInTheDocument()
      expect(screen.getAllByTestId("variant-recommendation").length).toBeGreaterThanOrEqual(1)
    })

    it("shows recommended variant name in the card", () => {
      renderDefault()
      expect(screen.getByText(/High Performance/)).toBeInTheDocument()
    })

    it("does not render recommendations for single-variant component", () => {
      const singleVariant: Component = {
        ...mockComponent,
        configVariants: [mockComponent.configVariants[0]],
      }
      renderDefault({ component: singleVariant })
      expect(screen.queryByTestId("recommendations-section")).not.toBeInTheDocument()
    })

    it("does not render recommendations when all metrics are healthy", () => {
      // All metrics above threshold (5)
      const healthyComponent: Component = {
        ...mockComponent,
        configVariants: [
          {
            id: "standard",
            name: "Standard",
            metrics: [
              { id: "query-perf", value: "high", numericValue: 8, category: "performance" },
              { id: "scalability", value: "high", numericValue: 7, category: "scalability" },
            ],
          },
          {
            id: "alt",
            name: "Alt",
            metrics: [
              { id: "query-perf", value: "medium", numericValue: 6, category: "performance" },
              { id: "scalability", value: "medium", numericValue: 6, category: "scalability" },
            ],
          },
        ],
      }
      renderDefault({ component: healthyComponent })
      expect(screen.queryByTestId("recommendations-section")).not.toBeInTheDocument()
    })
  })
})
