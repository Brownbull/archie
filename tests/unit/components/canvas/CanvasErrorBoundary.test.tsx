import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"
import { CanvasErrorBoundary } from "@/components/canvas/CanvasErrorBoundary"
import { useArchitectureStore } from "@/stores/architectureStore"
import { useUiStore } from "@/stores/uiStore"

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

function ThrowingChild({ shouldThrow }: { shouldThrow: boolean }) {
  if (shouldThrow) throw new Error("Canvas exploded")
  return <div data-testid="canvas-child">Canvas content</div>
}

describe("CanvasErrorBoundary", () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    // Most tests trigger React error boundary which logs to console.error.
    // Mock globally to avoid noisy test output; individual tests assert on it as needed.
    vi.spyOn(console, "error").mockImplementation(() => {})
    useArchitectureStore.setState({ nodes: [], edges: [] })
    useUiStore.setState({ selectedNodeId: null, selectedEdgeId: null })
  })

  it("renders children when no error occurs", () => {
    render(
      <CanvasErrorBoundary>
        <ThrowingChild shouldThrow={false} />
      </CanvasErrorBoundary>
    )
    expect(screen.getByTestId("canvas-child")).toBeInTheDocument()
  })

  it("shows fallback UI when a child throws", () => {
    render(
      <CanvasErrorBoundary>
        <ThrowingChild shouldThrow={true} />
      </CanvasErrorBoundary>
    )
    expect(screen.getByTestId("canvas-error-fallback")).toBeInTheDocument()
    expect(screen.queryByTestId("canvas-child")).not.toBeInTheDocument()
  })

  it("shows Reset Canvas button in fallback", () => {
    render(
      <CanvasErrorBoundary>
        <ThrowingChild shouldThrow={true} />
      </CanvasErrorBoundary>
    )
    expect(screen.getByTestId("canvas-error-reset-button")).toBeInTheDocument()
  })

  it("clears architectureStore nodes and edges on reset", () => {
    useArchitectureStore.setState({
      nodes: [{ id: "n1", type: "archie-component" as const, position: { x: 0, y: 0 }, data: { archieComponentId: "pg", activeConfigVariantId: "default", componentName: "PG", componentCategory: "data-storage" as const } }],
      edges: [{ id: "e1", source: "n1", target: "n2", data: { isIncompatible: false, incompatibilityReason: null, sourceArchieComponentId: "pg", targetArchieComponentId: "pg" } }],
    })

    render(
      <CanvasErrorBoundary>
        <ThrowingChild shouldThrow={true} />
      </CanvasErrorBoundary>
    )
    fireEvent.click(screen.getByTestId("canvas-error-reset-button"))

    expect(useArchitectureStore.getState().nodes).toEqual([])
    expect(useArchitectureStore.getState().edges).toEqual([])
  })

  it("clears uiStore selection on reset", () => {
    useUiStore.setState({ selectedNodeId: "n1", selectedEdgeId: "e1" })

    render(
      <CanvasErrorBoundary>
        <ThrowingChild shouldThrow={true} />
      </CanvasErrorBoundary>
    )
    fireEvent.click(screen.getByTestId("canvas-error-reset-button"))

    expect(useUiStore.getState().selectedNodeId).toBeNull()
    expect(useUiStore.getState().selectedEdgeId).toBeNull()
  })

  it("recovers from error state after reset", () => {
    // Use a mutable flag so the child stops throwing before reset re-renders it
    let shouldThrow = true
    function ConditionalThrow() {
      if (shouldThrow) throw new Error("Canvas exploded")
      return <div data-testid="canvas-child">Canvas content</div>
    }

    render(
      <CanvasErrorBoundary>
        <ConditionalThrow />
      </CanvasErrorBoundary>
    )
    expect(screen.getByTestId("canvas-error-fallback")).toBeInTheDocument()

    // Stop throwing before reset triggers re-render of children
    shouldThrow = false
    fireEvent.click(screen.getByTestId("canvas-error-reset-button"))

    expect(screen.getByTestId("canvas-child")).toBeInTheDocument()
    expect(screen.queryByTestId("canvas-error-fallback")).not.toBeInTheDocument()
  })

  it("logs error to console.error", () => {
    render(
      <CanvasErrorBoundary>
        <ThrowingChild shouldThrow={true} />
      </CanvasErrorBoundary>
    )
    expect(console.error).toHaveBeenCalledWith(
      "Canvas error caught by boundary:",
      expect.any(Error),
      expect.objectContaining({ componentStack: expect.any(String) }),
    )
  })
})
