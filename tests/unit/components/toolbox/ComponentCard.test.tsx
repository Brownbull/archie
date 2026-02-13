import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"
import { ComponentCard } from "@/components/toolbox/ComponentCard"
import type { Component } from "@/schemas/componentSchema"
import { useArchitectureStore } from "@/stores/architectureStore"

vi.mock("@/lib/firebase", () => ({
  auth: { currentUser: null },
  db: {},
}))

vi.mock("@/services/componentLibrary", () => ({
  componentLibrary: {
    getComponent: vi.fn(),
    isInitialized: () => true,
    reset: vi.fn(),
  },
}))

const mockComponent: Component = {
  id: "postgresql",
  name: "PostgreSQL",
  category: "data-storage",
  description: "Relational database",
  is: "An open-source relational database",
  gain: ["ACID compliance", "Extensible"],
  cost: ["Higher memory usage"],
  tags: ["database", "sql"],
  baseMetrics: [{ id: "latency", value: "medium", numericValue: 5, category: "performance" }],
  configVariants: [
    { id: "default", name: "Default", metrics: [{ id: "latency", value: "low", numericValue: 3, category: "performance" }] },
  ],
}

describe("ComponentCard", () => {
  it("renders component name", () => {
    render(<ComponentCard component={mockComponent} />)
    expect(screen.getByText("PostgreSQL")).toBeInTheDocument()
  })

  it("renders IS section", () => {
    render(<ComponentCard component={mockComponent} />)
    expect(screen.getByText("An open-source relational database")).toBeInTheDocument()
  })

  it("renders GAIN items", () => {
    render(<ComponentCard component={mockComponent} />)
    expect(screen.getByText("ACID compliance")).toBeInTheDocument()
    expect(screen.getByText("Extensible")).toBeInTheDocument()
  })

  it("renders COST items", () => {
    render(<ComponentCard component={mockComponent} />)
    expect(screen.getByText("Higher memory usage")).toBeInTheDocument()
  })

  it("renders tags as badges", () => {
    render(<ComponentCard component={mockComponent} />)
    expect(screen.getByText("database")).toBeInTheDocument()
    expect(screen.getByText("sql")).toBeInTheDocument()
  })

  it("has correct test id", () => {
    render(<ComponentCard component={mockComponent} />)
    expect(screen.getByTestId("component-card-postgresql")).toBeInTheDocument()
  })

  it("has draggable attribute", () => {
    render(<ComponentCard component={mockComponent} />)
    const card = screen.getByTestId("component-card-postgresql")
    expect(card).toHaveAttribute("draggable", "true")
  })

  it("sets correct drag data on dragStart", () => {
    render(<ComponentCard component={mockComponent} />)
    const card = screen.getByTestId("component-card-postgresql")

    const mockSetData = vi.fn()
    const dragEvent = new Event("dragstart", { bubbles: true }) as unknown as DragEvent
    Object.defineProperty(dragEvent, "dataTransfer", {
      value: {
        setData: mockSetData,
        effectAllowed: "",
      },
    })

    fireEvent(card, dragEvent)

    expect(mockSetData).toHaveBeenCalledWith("application/archie-component", "postgresql")
    expect((dragEvent as unknown as DragEvent).dataTransfer.effectAllowed).toBe("move")
  })

  describe("Add to Canvas button", () => {
    beforeEach(() => {
      useArchitectureStore.setState({ nodes: [], edges: [] })
    })

    it("renders add-to-canvas button with correct test id", () => {
      render(<ComponentCard component={mockComponent} />)
      expect(screen.getByTestId("add-to-canvas-postgresql")).toBeInTheDocument()
    })

    it("button has title 'Add to canvas'", () => {
      render(<ComponentCard component={mockComponent} />)
      const btn = screen.getByTestId("add-to-canvas-postgresql")
      expect(btn).toHaveAttribute("title", "Add to canvas")
    })

    it("button is not draggable", () => {
      render(<ComponentCard component={mockComponent} />)
      const btn = screen.getByTestId("add-to-canvas-postgresql")
      expect(btn).toHaveAttribute("draggable", "false")
    })

    it("calls addNodeSmartPosition on click", () => {
      const spy = vi.spyOn(useArchitectureStore.getState(), "addNodeSmartPosition")
      render(<ComponentCard component={mockComponent} />)
      fireEvent.click(screen.getByTestId("add-to-canvas-postgresql"))
      expect(spy).toHaveBeenCalledWith("postgresql")
      spy.mockRestore()
    })
  })
})
