import { render, screen } from "@testing-library/react"
import { describe, it, expect, vi, beforeEach } from "vitest"
import type { Component } from "@/types"

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

  it("renders the component name", () => {
    render(
      <ComponentDetail
        component={mockComponent}
        activeVariantId="standard"
        onVariantChange={vi.fn()}
        {...defaultSwapperProps}
      />,
    )
    expect(screen.getByText("PostgreSQL")).toBeInTheDocument()
  })

  it("renders the category badge", () => {
    render(
      <ComponentDetail
        component={mockComponent}
        activeVariantId="standard"
        onVariantChange={vi.fn()}
        {...defaultSwapperProps}
      />,
    )
    expect(screen.getByText("Data Storage")).toBeInTheDocument()
  })

  it("renders the description", () => {
    render(
      <ComponentDetail
        component={mockComponent}
        activeVariantId="standard"
        onVariantChange={vi.fn()}
        {...defaultSwapperProps}
      />,
    )
    expect(screen.getByText("Open-source relational database management system")).toBeInTheDocument()
  })

  it("renders the 'is' text", () => {
    render(
      <ComponentDetail
        component={mockComponent}
        activeVariantId="standard"
        onVariantChange={vi.fn()}
        {...defaultSwapperProps}
      />,
    )
    expect(screen.getByText("A powerful, open source object-relational database system")).toBeInTheDocument()
  })

  it("renders all gain items", () => {
    render(
      <ComponentDetail
        component={mockComponent}
        activeVariantId="standard"
        onVariantChange={vi.fn()}
        {...defaultSwapperProps}
      />,
    )
    expect(screen.getByText("ACID compliance")).toBeInTheDocument()
    expect(screen.getByText("Complex query support")).toBeInTheDocument()
    expect(screen.getByText("Extensibility")).toBeInTheDocument()
  })

  it("renders all cost items", () => {
    render(
      <ComponentDetail
        component={mockComponent}
        activeVariantId="standard"
        onVariantChange={vi.fn()}
        {...defaultSwapperProps}
      />,
    )
    expect(screen.getByText("Higher memory usage")).toBeInTheDocument()
    expect(screen.getByText("Complex configuration")).toBeInTheDocument()
  })

  it("renders ConfigSelector when variants exist", () => {
    render(
      <ComponentDetail
        component={mockComponent}
        activeVariantId="standard"
        onVariantChange={vi.fn()}
        {...defaultSwapperProps}
      />,
    )
    expect(screen.getByTestId("config-selector")).toBeInTheDocument()
  })

  it("hides ConfigSelector when no variants", () => {
    render(
      <ComponentDetail
        component={componentWithNoVariants}
        activeVariantId=""
        onVariantChange={vi.fn()}
        currentCategory="compute"
        onSwapComponent={vi.fn()}
      />,
    )
    expect(screen.queryByTestId("config-selector")).not.toBeInTheDocument()
  })

  it("renders metric cards grouped by category", () => {
    render(
      <ComponentDetail
        component={mockComponent}
        activeVariantId="standard"
        onVariantChange={vi.fn()}
        {...defaultSwapperProps}
      />,
    )
    expect(screen.getByTestId("metric-card-performance")).toBeInTheDocument()
    expect(screen.getByTestId("metric-card-scalability")).toBeInTheDocument()
    expect(screen.getByTestId("metric-card-resource")).toBeInTheDocument()
  })

  it("renders correct number of metric bars for each category", () => {
    render(
      <ComponentDetail
        component={mockComponent}
        activeVariantId="standard"
        onVariantChange={vi.fn()}
        {...defaultSwapperProps}
      />,
    )
    const allBars = screen.getAllByTestId("metric-bar")
    expect(allBars).toHaveLength(4)
  })

  it("does not render metrics section when no active variant found", () => {
    render(
      <ComponentDetail
        component={mockComponent}
        activeVariantId="nonexistent"
        onVariantChange={vi.fn()}
        {...defaultSwapperProps}
      />,
    )
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

    render(
      <ComponentDetail
        component={componentWithUnknownCategoryMetric}
        activeVariantId="variant1"
        onVariantChange={vi.fn()}
        {...defaultSwapperProps}
      />,
    )
    expect(screen.getByTestId("metric-card-unknown-category")).toBeInTheDocument()
    expect(screen.getByText("unknown-category")).toBeInTheDocument()
  })

  it("does not render category badge when category is unknown", () => {
    const componentWithUnknownCategory: Component = {
      ...mockComponent,
      category: "unknown-category",
    }

    render(
      <ComponentDetail
        component={componentWithUnknownCategory}
        activeVariantId="standard"
        onVariantChange={vi.fn()}
        currentCategory="unknown-category"
        onSwapComponent={vi.fn()}
      />,
    )
    expect(screen.queryByText("Data Storage")).not.toBeInTheDocument()
    expect(screen.queryByText("Compute")).not.toBeInTheDocument()
  })

  // ComponentSwapper integration tests
  it("renders ComponentSwapper when multiple components in category", () => {
    mockGetComponentsByCategory.mockReturnValue(multipleComponentsInCategory)
    render(
      <ComponentDetail
        component={mockComponent}
        activeVariantId="standard"
        onVariantChange={vi.fn()}
        {...defaultSwapperProps}
      />,
    )
    expect(screen.getByTestId("component-swapper")).toBeInTheDocument()
  })

  it("does not render ComponentSwapper when single component in category", () => {
    mockGetComponentsByCategory.mockReturnValue([mockComponent])
    render(
      <ComponentDetail
        component={mockComponent}
        activeVariantId="standard"
        onVariantChange={vi.fn()}
        {...defaultSwapperProps}
      />,
    )
    expect(screen.queryByTestId("component-swapper")).not.toBeInTheDocument()
  })
})
