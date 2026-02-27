import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, it, expect, vi } from "vitest"
import { MetricFilter } from "@/components/inspector/MetricFilter"

const mockMetricIds = [
  { id: "query-perf", name: "Query Performance" },
  { id: "write-throughput", name: "Write Throughput" },
  { id: "scalability", name: "Scalability" },
]

describe("MetricFilter", () => {
  function renderDefault(
    overrides: Partial<Parameters<typeof MetricFilter>[0]> = {},
  ) {
    const defaultProps = {
      allMetricIds: mockMetricIds,
      hiddenMetricIds: new Set<string>(),
      onToggleMetric: vi.fn(),
    }
    return { ...render(<MetricFilter {...defaultProps} {...overrides} />), props: { ...defaultProps, ...overrides } }
  }

  it("renders the metric filter container with data-testid", () => {
    renderDefault()
    expect(screen.getByTestId("metric-filter")).toBeInTheDocument()
  })

  it("starts collapsed by default", () => {
    renderDefault()
    // Checkboxes should not be visible when collapsed
    expect(screen.queryByTestId("metric-filter-toggle-query-perf")).not.toBeInTheDocument()
  })

  it("expands on header click to show checkboxes", async () => {
    const user = userEvent.setup()
    renderDefault()
    await user.click(screen.getByTestId("metric-filter-expand"))
    expect(screen.getByTestId("metric-filter-toggle-query-perf")).toBeInTheDocument()
    expect(screen.getByTestId("metric-filter-toggle-write-throughput")).toBeInTheDocument()
    expect(screen.getByTestId("metric-filter-toggle-scalability")).toBeInTheDocument()
  })

  it("shows all metrics as checked when hiddenMetricIds is empty", async () => {
    const user = userEvent.setup()
    renderDefault()
    await user.click(screen.getByTestId("metric-filter-expand"))
    const checkboxes = screen.getAllByRole("checkbox") as HTMLInputElement[]
    expect(checkboxes).toHaveLength(3)
    for (const cb of checkboxes) {
      expect(cb.checked).toBe(true)
    }
  })

  it("shows checkbox as unchecked when metric is in hiddenMetricIds", async () => {
    const user = userEvent.setup()
    renderDefault({ hiddenMetricIds: new Set(["write-throughput"]) })
    await user.click(screen.getByTestId("metric-filter-expand"))
    const hidden = screen.getByTestId("metric-filter-toggle-write-throughput") as HTMLInputElement
    expect(hidden.checked).toBe(false)
    // Others still checked
    const visible = screen.getByTestId("metric-filter-toggle-query-perf") as HTMLInputElement
    expect(visible.checked).toBe(true)
  })

  it("calls onToggleMetric with metric id when checkbox is toggled", async () => {
    const user = userEvent.setup()
    const onToggle = vi.fn()
    renderDefault({ onToggleMetric: onToggle })
    await user.click(screen.getByTestId("metric-filter-expand"))
    await user.click(screen.getByTestId("metric-filter-toggle-query-perf"))
    expect(onToggle).toHaveBeenCalledWith("query-perf")
  })

  it("displays metric names as checkbox labels", async () => {
    const user = userEvent.setup()
    renderDefault()
    await user.click(screen.getByTestId("metric-filter-expand"))
    expect(screen.getByText("Query Performance")).toBeInTheDocument()
    expect(screen.getByText("Write Throughput")).toBeInTheDocument()
    expect(screen.getByText("Scalability")).toBeInTheDocument()
  })

  it("renders no checkboxes when allMetricIds is empty", async () => {
    const user = userEvent.setup()
    renderDefault({ allMetricIds: [] })
    // The expand button should still exist
    await user.click(screen.getByTestId("metric-filter-expand"))
    expect(screen.queryByRole("checkbox")).not.toBeInTheDocument()
  })

  it("collapses back on second header click", async () => {
    const user = userEvent.setup()
    renderDefault()
    await user.click(screen.getByTestId("metric-filter-expand"))
    expect(screen.getByTestId("metric-filter-toggle-query-perf")).toBeInTheDocument()
    await user.click(screen.getByTestId("metric-filter-expand"))
    expect(screen.queryByTestId("metric-filter-toggle-query-perf")).not.toBeInTheDocument()
  })
})
