import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { DashboardOverlay } from "@/components/dashboard/DashboardOverlay"

vi.mock("@/stores/architectureStore", () => ({
  useArchitectureStore: vi.fn(),
}))

vi.mock("@/services/componentLibrary", () => ({
  componentLibrary: {
    getMetricCategory: vi.fn(() => undefined),
    getAllMetricCategories: vi.fn(() => []),
  },
}))

vi.mock("@/lib/categoryIcons", () => ({
  CATEGORY_ICONS: new Proxy(
    {},
    {
      get: (_, key) => {
        const IconMock = ({ className, style }: { className?: string; style?: React.CSSProperties }) => (
          <span data-testid={`icon-${String(key)}`} className={className} style={style} />
        )
        IconMock.displayName = String(key)
        return IconMock
      },
    },
  ),
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
      }),
    )

    render(<DashboardOverlay open={true} onOpenChange={onOpenChange} />)

    await user.keyboard("{Escape}")
    expect(onOpenChange).toHaveBeenCalledWith(false)
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
