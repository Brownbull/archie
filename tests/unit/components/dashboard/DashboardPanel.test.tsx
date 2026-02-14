import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen } from "@testing-library/react"
import { DashboardPanel } from "@/components/dashboard/DashboardPanel"

// Mock architectureStore -- selector pattern (component calls useArchitectureStore(selector))
vi.mock("@/stores/architectureStore", () => ({
  useArchitectureStore: vi.fn(),
}))

// Mock categoryIcons to avoid importing Lucide components in test env
vi.mock("@/lib/categoryIcons", () => ({
  CATEGORY_ICONS: new Proxy(
    {},
    {
      get: (_, key) => {
        const IconMock = ({
          className,
          style,
        }: {
          className?: string
          style?: React.CSSProperties
        }) => (
          <span
            data-testid={`icon-${String(key)}`}
            className={className}
            style={style}
          />
        )
        IconMock.displayName = String(key)
        return IconMock
      },
    },
  ),
}))

import { useArchitectureStore } from "@/stores/architectureStore"
import type { RecalculatedMetrics } from "@/engine/recalculator"
import type { MetricValue } from "@/schemas/metricSchema"

const mockUseArchitectureStore = vi.mocked(useArchitectureStore)

// --- Helpers ---

function mockEmptyStore() {
  mockUseArchitectureStore.mockImplementation((selector: unknown) => {
    const state = { computedMetrics: new Map() }
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
) {
  mockUseArchitectureStore.mockImplementation((selector: unknown) => {
    const state = { computedMetrics: metricsMap }
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

  // --- data-testid ---

  it("has data-testid dashboard-panel on root", () => {
    mockEmptyStore()
    render(<DashboardPanel />)

    expect(screen.getByTestId("dashboard-panel")).toBeInTheDocument()
  })
})
