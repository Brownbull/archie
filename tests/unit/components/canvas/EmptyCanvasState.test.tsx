import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen } from "@testing-library/react"
import { EmptyCanvasState } from "@/components/canvas/EmptyCanvasState"
import { useArchitectureStore } from "@/stores/architectureStore"

vi.mock("@/services/componentLibrary", () => ({
  componentLibrary: {
    getComponent: vi.fn(),
    isInitialized: () => true,
    reset: vi.fn(),
  },
}))

vi.mock("@/lib/firebase", () => ({
  auth: { currentUser: null },
  db: {},
}))

describe("EmptyCanvasState", () => {
  beforeEach(() => {
    useArchitectureStore.setState({ nodes: [], edges: [] })
  })

  it("renders when nodes array is empty", () => {
    render(<EmptyCanvasState />)
    expect(screen.getByTestId("canvas-empty-state")).toBeInTheDocument()
  })

  it("does NOT render when nodes exist", () => {
    useArchitectureStore.setState({
      nodes: [
        {
          id: "n1",
          type: "archie-component" as const,
          position: { x: 0, y: 0 },
          data: {
            archieComponentId: "pg",
            activeConfigVariantId: "default",
            componentName: "PG",
            componentCategory: "data-storage" as const,
          },
        },
      ],
    })
    render(<EmptyCanvasState />)
    expect(screen.queryByTestId("canvas-empty-state")).not.toBeInTheDocument()
  })

  it("renders all three suggestion items", () => {
    render(<EmptyCanvasState />)
    expect(screen.getByTestId("suggestion-import")).toBeInTheDocument()
    expect(screen.getByTestId("suggestion-example")).toBeInTheDocument()
    expect(screen.getByTestId("suggestion-drag")).toBeInTheDocument()
  })

  it("contains correct suggestion text", () => {
    render(<EmptyCanvasState />)
    expect(screen.getByText("Import a YAML file")).toBeInTheDocument()
    expect(screen.getByText("Try an example from Blueprints")).toBeInTheDocument()
    expect(screen.getByText("Drag a component from the toolbox")).toBeInTheDocument()
  })

  it("overlay has pointer-events-none class", () => {
    render(<EmptyCanvasState />)
    const overlay = screen.getByTestId("canvas-empty-state")
    expect(overlay.className).toContain("pointer-events-none")
  })

  it("inner card has pointer-events-auto class", () => {
    render(<EmptyCanvasState />)
    const overlay = screen.getByTestId("canvas-empty-state")
    const card = overlay.firstElementChild
    expect(card?.className).toContain("pointer-events-auto")
  })
})
