import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { IssuesSummary } from "@/components/layout/IssuesSummary"

vi.mock("@/stores/architectureStore", () => ({
  useArchitectureStore: vi.fn(),
}))

vi.mock("@/stores/uiStore", () => ({
  useUiStore: Object.assign(vi.fn(), {
    getState: vi.fn(() => ({
      setPendingNavNodeId: vi.fn(),
    })),
  }),
}))

import { useArchitectureStore } from "@/stores/architectureStore"
import { useUiStore } from "@/stores/uiStore"
import type { HeatmapStatus } from "@/engine/heatmapCalculator"

const mockUseArchitectureStore = vi.mocked(useArchitectureStore)
const mockUseUiStore = vi.mocked(useUiStore)

function mockStore(options: {
  heatmapColors: Map<string, HeatmapStatus>
  heatmapEnabled: boolean
  nodes?: Array<{ id: string; data: { componentName: string; archieComponentId: string; activeConfigVariantId: string; componentCategory: string } }>
}) {
  mockUseArchitectureStore.mockImplementation((selector: unknown) => {
    const state = {
      heatmapColors: options.heatmapColors,
      nodes: options.nodes ?? [],
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (selector as (s: any) => any)(state)
  })
  mockUseUiStore.mockImplementation((selector: unknown) => {
    const state = { heatmapEnabled: options.heatmapEnabled }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (selector as (s: any) => any)(state)
  })
}

describe("IssuesSummary", () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it("returns null when heatmap is disabled", () => {
    mockStore({
      heatmapColors: new Map([["n1", "bottleneck"]]),
      heatmapEnabled: false,
    })

    const { container } = render(<IssuesSummary />)
    expect(container.firstChild).toBeNull()
  })

  it("returns null when zero issues exist", () => {
    mockStore({
      heatmapColors: new Map([["n1", "healthy"]]),
      heatmapEnabled: true,
    })

    const { container } = render(<IssuesSummary />)
    expect(container.firstChild).toBeNull()
  })

  it("renders badge with bottleneck and warning counts", () => {
    mockStore({
      heatmapColors: new Map<string, HeatmapStatus>([
        ["n1", "bottleneck"],
        ["n2", "warning"],
        ["n3", "bottleneck"],
        ["n4", "healthy"],
      ]),
      heatmapEnabled: true,
      nodes: [
        { id: "n1", data: { componentName: "PostgreSQL", archieComponentId: "pg", activeConfigVariantId: "default", componentCategory: "data-storage" } },
        { id: "n2", data: { componentName: "Redis", archieComponentId: "redis", activeConfigVariantId: "default", componentCategory: "caching" } },
        { id: "n3", data: { componentName: "Kafka", archieComponentId: "kafka", activeConfigVariantId: "default", componentCategory: "messaging" } },
        { id: "n4", data: { componentName: "Nginx", archieComponentId: "nginx", activeConfigVariantId: "default", componentCategory: "delivery-network" } },
      ],
    })

    render(<IssuesSummary />)

    const badge = screen.getByTestId("issues-summary")
    expect(badge).toBeInTheDocument()

    // 2 bottleneck (red), 1 warning (yellow)
    expect(screen.getByText("2")).toBeInTheDocument()
    expect(screen.getByText("1")).toBeInTheDocument()
  })

  it("clicking an issue sets pendingNavNodeId", async () => {
    const user = userEvent.setup()
    const mockSetPendingNav = vi.fn()

    mockStore({
      heatmapColors: new Map<string, HeatmapStatus>([["n1", "bottleneck"]]),
      heatmapEnabled: true,
      nodes: [
        { id: "n1", data: { componentName: "PostgreSQL", archieComponentId: "pg", activeConfigVariantId: "default", componentCategory: "data-storage" } },
      ],
    })

    vi.mocked(useUiStore.getState).mockReturnValue({
      setPendingNavNodeId: mockSetPendingNav,
    } as ReturnType<typeof useUiStore.getState>)

    render(<IssuesSummary />)

    // Open dropdown
    await user.click(screen.getByTestId("issues-summary"))

    // Click issue item
    const issueItem = screen.getByTestId("issue-item-n1")
    await user.click(issueItem)

    expect(mockSetPendingNav).toHaveBeenCalledWith("n1")
  })

  it("sorts bottlenecks before warnings in dropdown", async () => {
    const user = userEvent.setup()

    mockStore({
      heatmapColors: new Map<string, HeatmapStatus>([
        ["n1", "warning"],
        ["n2", "bottleneck"],
        ["n3", "warning"],
      ]),
      heatmapEnabled: true,
      nodes: [
        { id: "n1", data: { componentName: "Redis", archieComponentId: "redis", activeConfigVariantId: "default", componentCategory: "caching" } },
        { id: "n2", data: { componentName: "PostgreSQL", archieComponentId: "pg", activeConfigVariantId: "default", componentCategory: "data-storage" } },
        { id: "n3", data: { componentName: "Kafka", archieComponentId: "kafka", activeConfigVariantId: "default", componentCategory: "messaging" } },
      ],
    })

    render(<IssuesSummary />)

    // Open dropdown
    await user.click(screen.getByTestId("issues-summary"))

    const items = screen.getAllByTestId(/^issue-item-/)
    // Bottleneck (n2) should appear first, then warnings (n1, n3)
    expect(items[0]).toHaveAttribute("data-testid", "issue-item-n2")
  })
})
