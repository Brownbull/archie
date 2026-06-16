import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"
import { EmptyCanvasState } from "@/components/canvas/EmptyCanvasState"
import { useArchitectureStore } from "@/stores/architectureStore"
import { useUiStore } from "@/stores/uiStore"
import { usePreferencesStore } from "@/stores/preferencesStore"

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
    useUiStore.setState({ toolboxTab: "components", challengesOpen: false })
    // S1: the suggestion list only renders once the first-run fork has been answered. These tests
    // assert the returning-user (post-fork) state; the fork itself is covered in FirstRunFork.test.
    usePreferencesStore.setState({ firstRunChoice: "free" })
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

  it("renders all five start options, none disabled", () => {
    render(<EmptyCanvasState />)
    for (const id of [
      "suggestion-blueprints",
      "suggestion-stacks",
      "suggestion-components",
      "suggestion-challenge",
      "suggestion-import",
    ]) {
      const btn = screen.getByTestId(id)
      expect(btn).toBeInTheDocument()
      expect(btn).not.toBeDisabled()
    }
  })

  it("contains the start-option labels", () => {
    render(<EmptyCanvasState />)
    expect(screen.getByText("Start from a Blueprint")).toBeInTheDocument()
    expect(screen.getByText("Drop in a Stack")).toBeInTheDocument()
    expect(screen.getByText("Browse Components")).toBeInTheDocument()
    expect(screen.getByText("Take a Challenge")).toBeInTheDocument()
    expect(screen.getByText("Import a YAML file")).toBeInTheDocument()
  })

  it("routes each option to the right surface", () => {
    render(<EmptyCanvasState />)

    fireEvent.click(screen.getByTestId("suggestion-blueprints"))
    expect(useUiStore.getState().toolboxTab).toBe("blueprints")

    fireEvent.click(screen.getByTestId("suggestion-stacks"))
    expect(useUiStore.getState().toolboxTab).toBe("stacks")

    fireEvent.click(screen.getByTestId("suggestion-components"))
    expect(useUiStore.getState().toolboxTab).toBe("components")

    fireEvent.click(screen.getByTestId("suggestion-challenge"))
    expect(useUiStore.getState().challengesOpen).toBe(true)
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

  it("shows the first-run fork (not the suggestions) when the fork is unanswered", () => {
    usePreferencesStore.setState({ firstRunChoice: null })
    render(<EmptyCanvasState />)
    expect(screen.getByTestId("first-run-fork")).toBeInTheDocument()
    expect(screen.queryByTestId("canvas-empty-state")).not.toBeInTheDocument()
  })

  it("marks the Blueprint option as the recommended primary path (S1c)", () => {
    render(<EmptyCanvasState />)
    const blueprint = screen.getByTestId("suggestion-blueprints")
    expect(blueprint.className).toContain("border-2")
    expect(screen.getByText("Recommended")).toBeInTheDocument()
  })
})
