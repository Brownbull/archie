import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, it, expect, vi, beforeEach } from "vitest"
import { useArchitectureStore } from "@/stores/architectureStore"
import type { DataContextItem } from "@/lib/constants"

// Mock evaluateFitBatch — we test the engine separately
vi.mock("@/engine/fitEvaluator", () => ({
  evaluateFitBatch: vi.fn().mockReturnValue([]),
  evaluateFit: vi.fn().mockReturnValue({
    level: "trade-off",
    explanation: "No compatibility data",
    factors: [],
  }),
}))

const { evaluateFitBatch } = await import("@/engine/fitEvaluator")
const mockedEvaluateFitBatch = vi.mocked(evaluateFitBatch)

const { DataContextPanel } = await import("@/components/inspector/DataContextPanel")

const sampleItem: DataContextItem = {
  id: "dci-1",
  name: "User Profile",
  accessPattern: "read-heavy",
  averageSize: "small",
  structureType: "nested-json",
}

const sampleItem2: DataContextItem = {
  id: "dci-2",
  name: "Session Cache",
  accessPattern: "write-heavy",
  averageSize: "medium",
  structureType: "simple-kv",
}

function setStoreItems(nodeId: string, items: DataContextItem[]) {
  const map = new Map<string, DataContextItem[]>()
  map.set(nodeId, items)
  useArchitectureStore.setState({ dataContextItems: map })
}

describe("DataContextPanel", () => {
  beforeEach(() => {
    vi.resetAllMocks()
    mockedEvaluateFitBatch.mockReturnValue([])
    useArchitectureStore.setState({
      dataContextItems: new Map(),
      addDataContextItem: vi.fn(),
      updateDataContextItem: vi.fn(),
      removeDataContextItem: vi.fn(),
    })
  })

  it("renders data-testid", () => {
    render(<DataContextPanel nodeId="node-1" dataFitProfile={undefined} />)
    expect(screen.getByTestId("data-context-panel")).toBeInTheDocument()
  })

  it("renders empty state when no items", () => {
    render(<DataContextPanel nodeId="node-1" dataFitProfile={undefined} />)
    expect(screen.getByText("No data context items. Add one to see fit analysis.")).toBeInTheDocument()
  })

  it("renders add button", () => {
    render(<DataContextPanel nodeId="node-1" dataFitProfile={undefined} />)
    expect(screen.getByTestId("data-context-add-button")).toBeInTheDocument()
  })

  it("renders item list with names", () => {
    setStoreItems("node-1", [sampleItem, sampleItem2])
    mockedEvaluateFitBatch.mockReturnValue([
      { level: "great-fit", explanation: "all good", factors: [] },
      { level: "poor-fit", explanation: "not great", factors: [] },
    ])

    render(<DataContextPanel nodeId="node-1" dataFitProfile={{ "read-heavy": "great" }} />)
    expect(screen.getByText("User Profile")).toBeInTheDocument()
    expect(screen.getByText("Session Cache")).toBeInTheDocument()
  })

  it("renders data-testid per item", () => {
    setStoreItems("node-1", [sampleItem])
    mockedEvaluateFitBatch.mockReturnValue([
      { level: "trade-off", explanation: "ok", factors: [] },
    ])

    render(<DataContextPanel nodeId="node-1" dataFitProfile={undefined} />)
    expect(screen.getByTestId("data-context-item-dci-1")).toBeInTheDocument()
  })

  it("renders FitIndicator for each item", () => {
    setStoreItems("node-1", [sampleItem])
    mockedEvaluateFitBatch.mockReturnValue([
      { level: "great-fit", explanation: "all good", factors: [] },
    ])

    render(<DataContextPanel nodeId="node-1" dataFitProfile={{ "read-heavy": "great" }} />)
    expect(screen.getByTestId("fit-indicator-dci-1")).toBeInTheDocument()
  })

  it("shows add form when add button clicked", async () => {
    const user = userEvent.setup()
    render(<DataContextPanel nodeId="node-1" dataFitProfile={undefined} />)
    await user.click(screen.getByTestId("data-context-add-button"))
    expect(screen.getByTestId("data-context-form")).toBeInTheDocument()
    expect(screen.getByPlaceholderText("Data item name")).toBeInTheDocument()
  })

  it("dispatches addDataContextItem on form submit", async () => {
    const user = userEvent.setup()
    const addFn = vi.fn()
    useArchitectureStore.setState({ addDataContextItem: addFn })

    render(<DataContextPanel nodeId="node-1" dataFitProfile={undefined} />)
    await user.click(screen.getByTestId("data-context-add-button"))

    const nameInput = screen.getByPlaceholderText("Data item name")
    await user.clear(nameInput)
    await user.type(nameInput, "Orders Table")
    await user.click(screen.getByTestId("data-context-form-submit"))

    expect(addFn).toHaveBeenCalledWith("node-1", expect.objectContaining({
      name: "Orders Table",
    }))
  })

  it("dispatches removeDataContextItem when delete clicked", async () => {
    const user = userEvent.setup()
    const removeFn = vi.fn()
    useArchitectureStore.setState({ removeDataContextItem: removeFn })
    setStoreItems("node-1", [sampleItem])
    mockedEvaluateFitBatch.mockReturnValue([
      { level: "trade-off", explanation: "ok", factors: [] },
    ])

    render(<DataContextPanel nodeId="node-1" dataFitProfile={undefined} />)
    await user.click(screen.getByTestId("data-context-delete-dci-1"))

    expect(removeFn).toHaveBeenCalledWith("node-1", "dci-1")
  })

  it("disables add button at 10-item limit", () => {
    const items = Array.from({ length: 10 }, (_, i) => ({
      ...sampleItem,
      id: `dci-${i}`,
      name: `Item ${i}`,
    }))
    setStoreItems("node-1", items)
    mockedEvaluateFitBatch.mockReturnValue(
      items.map(() => ({ level: "trade-off" as const, explanation: "ok", factors: [] })),
    )

    render(<DataContextPanel nodeId="node-1" dataFitProfile={undefined} />)
    const addBtn = screen.getByTestId("data-context-add-button")
    expect(addBtn).toBeDisabled()
  })

  it("shows limit warning at 10 items", () => {
    const items = Array.from({ length: 10 }, (_, i) => ({
      ...sampleItem,
      id: `dci-${i}`,
      name: `Item ${i}`,
    }))
    setStoreItems("node-1", items)
    mockedEvaluateFitBatch.mockReturnValue(
      items.map(() => ({ level: "trade-off" as const, explanation: "ok", factors: [] })),
    )

    render(<DataContextPanel nodeId="node-1" dataFitProfile={undefined} />)
    expect(screen.getByText(/10\/10 max/)).toBeInTheDocument()
  })

  it("calls evaluateFitBatch with items and dataFitProfile", () => {
    const profile = { "read-heavy": "great", "write-heavy": "poor" }
    setStoreItems("node-1", [sampleItem])
    mockedEvaluateFitBatch.mockReturnValue([
      { level: "great-fit", explanation: "all good", factors: [] },
    ])

    render(<DataContextPanel nodeId="node-1" dataFitProfile={profile} />)
    expect(mockedEvaluateFitBatch).toHaveBeenCalledWith([sampleItem], profile)
  })

  it("shows item details: access pattern, size, structure", () => {
    setStoreItems("node-1", [sampleItem])
    mockedEvaluateFitBatch.mockReturnValue([
      { level: "trade-off", explanation: "ok", factors: [] },
    ])

    render(<DataContextPanel nodeId="node-1" dataFitProfile={undefined} />)
    expect(screen.getByText("read-heavy")).toBeInTheDocument()
    expect(screen.getByText("small")).toBeInTheDocument()
    expect(screen.getByText("nested-json")).toBeInTheDocument()
  })

  it("shows edit form when edit button clicked", async () => {
    const user = userEvent.setup()
    setStoreItems("node-1", [sampleItem])
    mockedEvaluateFitBatch.mockReturnValue([
      { level: "trade-off", explanation: "ok", factors: [] },
    ])

    render(<DataContextPanel nodeId="node-1" dataFitProfile={undefined} />)
    await user.click(screen.getByTestId("data-context-edit-dci-1"))
    expect(screen.getByTestId("data-context-form")).toBeInTheDocument()
  })

  it("hides form when cancel clicked", async () => {
    const user = userEvent.setup()
    render(<DataContextPanel nodeId="node-1" dataFitProfile={undefined} />)
    await user.click(screen.getByTestId("data-context-add-button"))
    expect(screen.getByTestId("data-context-form")).toBeInTheDocument()
    await user.click(screen.getByTestId("data-context-form-cancel"))
    expect(screen.queryByTestId("data-context-form")).not.toBeInTheDocument()
  })
})
