import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen } from "@testing-library/react"
import { DashboardPanel } from "@/components/dashboard/DashboardPanel"
import { DEFAULT_WEIGHT_PROFILE } from "@/lib/constants"

// Mock architectureStore -- selector pattern (component calls useArchitectureStore(selector))
vi.mock("@/stores/architectureStore", () => ({
  useArchitectureStore: vi.fn(),
}))

// Mock componentLibrary (used by CategoryInfoPopup + DashboardOverlay)
vi.mock("@/services/componentLibrary", () => ({
  componentLibrary: {
    getMetricCategory: vi.fn(() => undefined),
    getAllMetricCategories: vi.fn(() => []),
  },
}))

vi.mock("@/hooks/usePathwaySuggestions", () => ({
  usePathwaySuggestions: vi.fn(() => ({
    suggestions: [],
    hasGaps: false,
    nextTierName: null,
  })),
}))

vi.mock("@/components/dashboard/PathwayGuidancePanel", () => ({
  PathwayGuidancePanel: () => <div data-testid="pathway-guidance-panel-mock" />,
}))

// Mock ConstraintPanel (used by DashboardOverlay child)
vi.mock("@/components/dashboard/ConstraintPanel", () => ({
  ConstraintPanel: () => <div data-testid="constraint-panel-section" />,
}))

// Mock categoryIcons to avoid importing Lucide components in test env
vi.mock("@/lib/categoryIcons", () => {
  const makeIcon = (key: string) => {
    const IconMock = ({ className, style }: { className?: string; style?: React.CSSProperties }) => (
      <span data-testid={`icon-${key}`} className={className} style={style} />
    )
    IconMock.displayName = key
    return IconMock
  }
  const proxy = new Proxy({}, { get: (_, key) => makeIcon(String(key)) })
  return {
    CATEGORY_ICONS: proxy,
    getCategoryIcon: (name: string) => (proxy as Record<string, unknown>)[name],
  }
})

import { useArchitectureStore } from "@/stores/architectureStore"
import type { RecalculatedMetrics } from "@/engine/recalculator"
import type { MetricValue } from "@/schemas/metricSchema"

const mockUseArchitectureStore = vi.mocked(useArchitectureStore)

// --- Helpers ---

function mockEmptyStore() {
  mockUseArchitectureStore.mockImplementation((selector: unknown) => {
    const state = {
      computedMetrics: new Map(),
      currentTier: null,
      nodes: [],
      weightProfile: { ...DEFAULT_WEIGHT_PROFILE },
      constraints: [],
      constraintViolations: [],
    }
    return (selector as (s: typeof state) => unknown)(state)
  })
}

function makeMetric(
  overrides: Partial<MetricValue> & { id: string; category: string },
): MetricValue {
  return {
    value: "medium" as const,
    numericValue: 5,
    ...overrides,
  }
}

function makeNode(
  nodeId: string,
  metrics: MetricValue[],
): RecalculatedMetrics {
  const overallScore =
    metrics.length > 0
      ? metrics.reduce((sum, m) => sum + m.numericValue, 0) / metrics.length
      : 0
  return { nodeId, metrics, overallScore }
}

function mockPopulatedStore(
  metricsMap: Map<string, RecalculatedMetrics>,
  weightProfileOverrides: Record<string, number> = {},
) {
  mockUseArchitectureStore.mockImplementation((selector: unknown) => {
    const state = {
      computedMetrics: metricsMap,
      currentTier: null,
      nodes: [],
      weightProfile: { ...DEFAULT_WEIGHT_PROFILE, ...weightProfileOverrides },
      constraints: [],
      constraintViolations: [],
    }
    return (selector as (s: typeof state) => unknown)(state)
  })
}

describe("DashboardPanel", () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  // --- Empty state ---

  describe("empty state (computedMetrics.size === 0)", () => {
    it("renders empty-state message", () => {
      mockEmptyStore()
      render(<DashboardPanel />)

      expect(
        screen.getByText("Add components to see architecture scores"),
      ).toBeInTheDocument()
    })

    it("does not render any category bars", () => {
      mockEmptyStore()
      render(<DashboardPanel />)

      // There should be no elements matching category-bar-* pattern
      const bars = screen.queryAllByTestId(/^category-bar-/)
      expect(bars).toHaveLength(0)
    })

    it("does not render aggregate score", () => {
      mockEmptyStore()
      render(<DashboardPanel />)

      expect(screen.queryByTestId("aggregate-score")).not.toBeInTheDocument()
    })
  })

  // --- Populated state ---

  describe("populated state", () => {
    const metrics = new Map([
      [
        "node-1",
        makeNode("node-1", [
          makeMetric({
            id: "latency",
            category: "performance",
            numericValue: 8,
          }),
          makeMetric({
            id: "throughput",
            category: "performance",
            numericValue: 6,
          }),
          makeMetric({
            id: "uptime",
            category: "reliability",
            numericValue: 9,
          }),
        ]),
      ],
    ])

    it("renders category bars for categories with data", () => {
      mockPopulatedStore(metrics)
      render(<DashboardPanel />)

      expect(
        screen.getByTestId("category-bar-performance"),
      ).toBeInTheDocument()
      expect(
        screen.getByTestId("category-bar-reliability"),
      ).toBeInTheDocument()
    })

    it("does not render bars for categories without data", () => {
      mockPopulatedStore(metrics)
      render(<DashboardPanel />)

      // These categories have no metrics in our mock data
      expect(
        screen.queryByTestId("category-bar-security"),
      ).not.toBeInTheDocument()
      expect(
        screen.queryByTestId("category-bar-cost-efficiency"),
      ).not.toBeInTheDocument()
      expect(
        screen.queryByTestId("category-bar-scalability"),
      ).not.toBeInTheDocument()
      expect(
        screen.queryByTestId("category-bar-operational-complexity"),
      ).not.toBeInTheDocument()
      expect(
        screen.queryByTestId("category-bar-developer-experience"),
      ).not.toBeInTheDocument()
    })

    it("renders aggregate score with correct value", () => {
      mockPopulatedStore(metrics)
      render(<DashboardPanel />)

      expect(screen.getByTestId("aggregate-score")).toBeInTheDocument()
      // perf=(8+6)/2=7, rel=9/1=9, aggregate=(7+9)/2=8.0
      expect(screen.getByText("8.0")).toBeInTheDocument()
    })
  })

  // --- Accessibility ---

  describe("accessibility", () => {
    it("has role=region with correct aria-label", () => {
      mockEmptyStore()
      render(<DashboardPanel />)

      const region = screen.getByRole("region")
      expect(region).toHaveAttribute(
        "aria-label",
        "Architecture scoring dashboard",
      )
    })
  })

  // --- Expand button ---

  describe("expand button (AC-FUNC-1)", () => {
    it("renders expand button when metrics exist", () => {
      const metrics = new Map([
        ["node-1", makeNode("node-1", [makeMetric({ id: "latency", category: "performance", numericValue: 7 })])],
      ])
      mockPopulatedStore(metrics)
      render(<DashboardPanel />)

      expect(screen.getByTestId("dashboard-expand-button")).toBeInTheDocument()
    })

    it("does not render expand button when empty", () => {
      mockEmptyStore()
      render(<DashboardPanel />)

      expect(screen.queryByTestId("dashboard-expand-button")).not.toBeInTheDocument()
    })
  })

  // --- Story 5-3: Weight badges ---

  describe("weight badges (AC-ARCH-PATTERN-6)", () => {
    const metrics = new Map([
      [
        "node-1",
        makeNode("node-1", [
          makeMetric({ id: "latency", category: "performance", numericValue: 8 }),
          makeMetric({ id: "uptime", category: "reliability", numericValue: 9 }),
        ]),
      ],
    ])

    it("does not show weight badges when all weights are default", () => {
      mockPopulatedStore(metrics)
      render(<DashboardPanel />)

      expect(screen.queryByTestId("weight-badge-performance")).not.toBeInTheDocument()
      expect(screen.queryByTestId("weight-badge-reliability")).not.toBeInTheDocument()
    })

    it("shows weight badge on category with non-default weight", () => {
      mockPopulatedStore(metrics, { performance: 0.5 })
      render(<DashboardPanel />)

      const badge = screen.getByTestId("weight-badge-performance")
      expect(badge).toBeInTheDocument()
      expect(badge).toHaveTextContent("0.5x")
    })

    it("does not show badge on category with default weight", () => {
      mockPopulatedStore(metrics, { performance: 0.5 })
      render(<DashboardPanel />)

      expect(screen.queryByTestId("weight-badge-reliability")).not.toBeInTheDocument()
    })
  })

  // --- data-testid ---

  it("has data-testid dashboard-panel on root", () => {
    mockEmptyStore()
    render(<DashboardPanel />)

    expect(screen.getByTestId("dashboard-panel")).toBeInTheDocument()
  })
})
