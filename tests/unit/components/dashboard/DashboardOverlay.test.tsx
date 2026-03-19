import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { DashboardOverlay } from "@/components/dashboard/DashboardOverlay"
import { DEFAULT_WEIGHT_PROFILE } from "@/lib/constants"

vi.mock("@/stores/architectureStore", () => ({
  useArchitectureStore: vi.fn(),
}))

vi.mock("@/services/componentLibrary", () => ({
  componentLibrary: {
    getMetricCategory: vi.fn(() => undefined),
    getAllMetricCategories: vi.fn(() => []),
  },
}))

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

// Mock WeightSliders to keep overlay tests focused
vi.mock("@/components/dashboard/WeightSliders", () => ({
  WeightSliders: () => <div data-testid="weight-sliders-section" />,
}))

// Mock ConstraintPanel to keep overlay tests focused
vi.mock("@/components/dashboard/ConstraintPanel", () => ({
  ConstraintPanel: () => <div data-testid="constraint-panel-section" />,
}))

import { useArchitectureStore } from "@/stores/architectureStore"
import type { RecalculatedMetrics } from "@/engine/recalculator"

const mockUseArchitectureStore = vi.mocked(useArchitectureStore)

function makeMetrics(nodeId: string, numericValue: number): RecalculatedMetrics {
  return {
    nodeId,
    metrics: [
      { id: "latency", value: "medium" as const, numericValue, category: "performance" },
      { id: "uptime", value: "high" as const, numericValue: 8, category: "reliability" },
    ],
    overallScore: numericValue,
  }
}

describe("DashboardOverlay", () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it("shows empty state when no components on canvas", () => {
    mockUseArchitectureStore.mockImplementation((selector) =>
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (selector as (s: any) => any)({
        computedMetrics: new Map(),
        nodes: [],
        weightProfile: { ...DEFAULT_WEIGHT_PROFILE },
        setWeightProfile: vi.fn(),
        setWeightAndRecalculate: vi.fn(),
        constraints: [],
        constraintViolations: [],
      }),
    )

    render(<DashboardOverlay open={true} onOpenChange={vi.fn()} />)

    expect(screen.getByText("No components on canvas")).toBeInTheDocument()
    expect(screen.getByTestId("dashboard-overlay")).toBeInTheDocument()
  })

  it("renders category cards when metrics exist", () => {
    const metricsMap = new Map([
      ["n1", makeMetrics("n1", 7)],
      ["n2", makeMetrics("n2", 5)],
    ])

    mockUseArchitectureStore.mockImplementation((selector) =>
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (selector as (s: any) => any)({
        computedMetrics: metricsMap,
        weightProfile: { ...DEFAULT_WEIGHT_PROFILE },
        setWeightProfile: vi.fn(),
        setWeightAndRecalculate: vi.fn(),
        constraints: [],
        constraintViolations: [],
        nodes: [
          { id: "n1", data: { componentName: "PostgreSQL", archieComponentId: "pg", activeConfigVariantId: "default", componentCategory: "data-storage" } },
          { id: "n2", data: { componentName: "Redis", archieComponentId: "redis", activeConfigVariantId: "default", componentCategory: "caching" } },
        ],
      }),
    )

    render(<DashboardOverlay open={true} onOpenChange={vi.fn()} />)

    expect(screen.getByTestId("overlay-category-performance")).toBeInTheDocument()
    expect(screen.getByTestId("overlay-category-reliability")).toBeInTheDocument()
  })

  it("calls onOpenChange when close button is clicked", async () => {
    const user = userEvent.setup()
    const onOpenChange = vi.fn()

    mockUseArchitectureStore.mockImplementation((selector) =>
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (selector as (s: any) => any)({
        computedMetrics: new Map(),
        nodes: [],
        weightProfile: { ...DEFAULT_WEIGHT_PROFILE },
        setWeightProfile: vi.fn(),
        setWeightAndRecalculate: vi.fn(),
        constraints: [],
        constraintViolations: [],
      }),
    )

    render(<DashboardOverlay open={true} onOpenChange={onOpenChange} />)

    const closeButton = screen.getByRole("button", { name: /close/i })
    await user.click(closeButton)
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it("does not render when open is false", () => {
    mockUseArchitectureStore.mockImplementation((selector) =>
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (selector as (s: any) => any)({
        computedMetrics: new Map(),
        nodes: [],
        weightProfile: { ...DEFAULT_WEIGHT_PROFILE },
        setWeightProfile: vi.fn(),
        setWeightAndRecalculate: vi.fn(),
        constraints: [],
        constraintViolations: [],
      }),
    )

    render(<DashboardOverlay open={false} onOpenChange={vi.fn()} />)

    expect(screen.queryByTestId("dashboard-overlay")).not.toBeInTheDocument()
  })

  it("closes on Escape key (AC-FUNC-3)", async () => {
    const user = userEvent.setup()
    const onOpenChange = vi.fn()

    mockUseArchitectureStore.mockImplementation((selector) =>
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (selector as (s: any) => any)({
        computedMetrics: new Map(),
        nodes: [],
        weightProfile: { ...DEFAULT_WEIGHT_PROFILE },
        setWeightProfile: vi.fn(),
        setWeightAndRecalculate: vi.fn(),
        constraints: [],
        constraintViolations: [],
      }),
    )

    render(<DashboardOverlay open={true} onOpenChange={onOpenChange} />)

    await user.keyboard("{Escape}")
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  // --- Story 5-3: Priority Weights section ---

  describe("priority weights section (AC-ARCH-PATTERN-5)", () => {
    it("renders weight sliders toggle", () => {
      mockUseArchitectureStore.mockImplementation((selector) =>
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (selector as (s: any) => any)({
          computedMetrics: new Map(),
          nodes: [],
          weightProfile: { ...DEFAULT_WEIGHT_PROFILE },
          setWeightProfile: vi.fn(),
          setWeightAndRecalculate: vi.fn(),
          constraints: [],
          constraintViolations: [],
        }),
      )

      render(<DashboardOverlay open={true} onOpenChange={vi.fn()} />)

      expect(screen.getByText("Priority Weights")).toBeInTheDocument()
    })

    it("shows 'Custom' indicator when weights are non-default", () => {
      mockUseArchitectureStore.mockImplementation((selector) =>
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (selector as (s: any) => any)({
          computedMetrics: new Map(),
          nodes: [],
          weightProfile: { ...DEFAULT_WEIGHT_PROFILE, performance: 0.5 },
          setWeightProfile: vi.fn(),
          setWeightAndRecalculate: vi.fn(),
          constraints: [],
          constraintViolations: [],
        }),
      )

      render(<DashboardOverlay open={true} onOpenChange={vi.fn()} />)

      expect(screen.getByTestId("weight-indicator")).toBeInTheDocument()
      expect(screen.getByText("Custom")).toBeInTheDocument()
    })

    it("does not show indicator when weights are default", () => {
      mockUseArchitectureStore.mockImplementation((selector) =>
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (selector as (s: any) => any)({
          computedMetrics: new Map(),
          nodes: [],
          weightProfile: { ...DEFAULT_WEIGHT_PROFILE },
          setWeightProfile: vi.fn(),
          setWeightAndRecalculate: vi.fn(),
          constraints: [],
          constraintViolations: [],
        }),
      )

      render(<DashboardOverlay open={true} onOpenChange={vi.fn()} />)

      expect(screen.queryByTestId("weight-indicator")).not.toBeInTheDocument()
    })
  })

  it("shows weighted score when weights are non-default (TD-5-3a)", () => {
    const metricsMap = new Map([
      ["n1", makeMetrics("n1", 7)],
      ["n2", makeMetrics("n2", 5)],
    ])

    mockUseArchitectureStore.mockImplementation((selector) =>
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (selector as (s: any) => any)({
        computedMetrics: metricsMap,
        weightProfile: { ...DEFAULT_WEIGHT_PROFILE, performance: 0.5 },
        setWeightProfile: vi.fn(),
        setWeightAndRecalculate: vi.fn(),
        constraints: [],
        constraintViolations: [],
        nodes: [
          { id: "n1", data: { componentName: "PostgreSQL", archieComponentId: "pg", activeConfigVariantId: "default", componentCategory: "data-storage" } },
          { id: "n2", data: { componentName: "Redis", archieComponentId: "redis", activeConfigVariantId: "default", componentCategory: "caching" } },
        ],
      }),
    )

    render(<DashboardOverlay open={true} onOpenChange={vi.fn()} />)

    // When weights are non-default, the description should show "Weighted:" prefix
    expect(screen.getByText(/Weighted:/)).toBeInTheDocument()
    expect(screen.getByText(/Balanced:/)).toBeInTheDocument()
  })

  // --- Story 7.5-3: Pathway Guidance section ---

  describe("pathway guidance section (AC-3, AC-6)", () => {
    it("renders pathway guidance collapsible with count badge when suggestions exist (AC-3)", async () => {
      const { usePathwaySuggestions } = await import("@/hooks/usePathwaySuggestions")
      vi.mocked(usePathwaySuggestions).mockReturnValue({
        suggestions: [
          { componentId: "pg", componentName: "PostgreSQL", category: "data-storage", gapClosed: "Add Data Storage", weightedScore: 7.5, isConstraintSafe: true, reason: "test" },
          { componentId: "redis", componentName: "Redis", category: "caching", gapClosed: "Add Caching", weightedScore: 6.0, isConstraintSafe: true, reason: "test" },
        ],
        hasGaps: true,
        nextTierName: "Established",
      })

      mockUseArchitectureStore.mockImplementation((selector) =>
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (selector as (s: any) => any)({
          computedMetrics: new Map(),
          nodes: [],
          weightProfile: { ...DEFAULT_WEIGHT_PROFILE },
          setWeightProfile: vi.fn(),
          setWeightAndRecalculate: vi.fn(),
          constraints: [],
          constraintViolations: [],
        }),
      )

      render(<DashboardOverlay open={true} onOpenChange={vi.fn()} />)

      expect(screen.getByTestId("pathway-guidance-toggle")).toBeInTheDocument()
      expect(screen.getByTestId("pathway-count-badge")).toHaveTextContent("2")
    })

    it("does not show count badge when no suggestions", () => {
      mockUseArchitectureStore.mockImplementation((selector) =>
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (selector as (s: any) => any)({
          computedMetrics: new Map(),
          nodes: [],
          weightProfile: { ...DEFAULT_WEIGHT_PROFILE },
          setWeightProfile: vi.fn(),
          setWeightAndRecalculate: vi.fn(),
          constraints: [],
          constraintViolations: [],
        }),
      )

      render(<DashboardOverlay open={true} onOpenChange={vi.fn()} />)

      expect(screen.getByTestId("pathway-guidance-toggle")).toBeInTheDocument()
      expect(screen.queryByTestId("pathway-count-badge")).not.toBeInTheDocument()
    })

    it("expands pathway section when initialSection='pathway' (AC-6)", async () => {
      const { usePathwaySuggestions } = await import("@/hooks/usePathwaySuggestions")
      vi.mocked(usePathwaySuggestions).mockReturnValue({
        suggestions: [
          { componentId: "pg", componentName: "PostgreSQL", category: "data-storage", gapClosed: "Add Data Storage", weightedScore: 7.5, isConstraintSafe: true, reason: "test" },
        ],
        hasGaps: true,
        nextTierName: "Established",
      })

      mockUseArchitectureStore.mockImplementation((selector) =>
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (selector as (s: any) => any)({
          computedMetrics: new Map(),
          nodes: [],
          weightProfile: { ...DEFAULT_WEIGHT_PROFILE },
          setWeightProfile: vi.fn(),
          setWeightAndRecalculate: vi.fn(),
          constraints: [],
          constraintViolations: [],
        }),
      )

      render(<DashboardOverlay open={true} onOpenChange={vi.fn()} initialSection="pathway" />)

      expect(screen.getByTestId("pathway-guidance-panel-mock")).toBeInTheDocument()
    })
  })

  it("shows aggregate score and component count (AC-FUNC-2)", () => {
    const metricsMap = new Map([
      ["n1", makeMetrics("n1", 7)],
      ["n2", makeMetrics("n2", 5)],
    ])

    mockUseArchitectureStore.mockImplementation((selector) =>
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (selector as (s: any) => any)({
        computedMetrics: metricsMap,
        weightProfile: { ...DEFAULT_WEIGHT_PROFILE },
        setWeightProfile: vi.fn(),
        setWeightAndRecalculate: vi.fn(),
        constraints: [],
        constraintViolations: [],
        nodes: [
          { id: "n1", data: { componentName: "PostgreSQL", archieComponentId: "pg", activeConfigVariantId: "default", componentCategory: "data-storage" } },
          { id: "n2", data: { componentName: "Redis", archieComponentId: "redis", activeConfigVariantId: "default", componentCategory: "caching" } },
        ],
      }),
    )

    render(<DashboardOverlay open={true} onOpenChange={vi.fn()} />)

    // Aggregate score and component count should appear in the description
    expect(screen.getByText(/across 2 components/)).toBeInTheDocument()
  })
})
