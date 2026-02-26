import { render, screen, fireEvent } from "@testing-library/react"
import { describe, it, expect, vi, beforeEach } from "vitest"
import { useUiStore } from "@/stores/uiStore"

vi.mock("@/lib/firebase", () => ({
  auth: { currentUser: null },
  db: {},
}))

const { InspectorOverlay } = await import(
  "@/components/inspector/InspectorOverlay"
)

describe("InspectorOverlay", () => {
  beforeEach(() => {
    vi.resetAllMocks()
    useUiStore.setState({ inspectorOverlay: false, inspectorWidth: 300 })
  })

  it("renders nothing when inspectorOverlay is false", () => {
    render(<InspectorOverlay><div>Content</div></InspectorOverlay>)
    expect(screen.queryByTestId("inspector-overlay")).not.toBeInTheDocument()
  })

  it("renders portal overlay when inspectorOverlay is true (AC-4)", () => {
    useUiStore.setState({ inspectorOverlay: true })
    render(<InspectorOverlay><div>Content</div></InspectorOverlay>)
    expect(screen.getByTestId("inspector-overlay")).toBeInTheDocument()
    expect(screen.getByText("Content")).toBeInTheDocument()
  })

  it("renders close button (AC-5)", () => {
    useUiStore.setState({ inspectorOverlay: true })
    render(<InspectorOverlay><div>Content</div></InspectorOverlay>)
    expect(screen.getByTestId("inspector-overlay-close")).toBeInTheDocument()
  })

  it("clicking close button sets inspectorOverlay to false (AC-5)", () => {
    useUiStore.setState({ inspectorOverlay: true })
    render(<InspectorOverlay><div>Content</div></InspectorOverlay>)

    fireEvent.click(screen.getByTestId("inspector-overlay-close"))
    expect(useUiStore.getState().inspectorOverlay).toBe(false)
  })

  it("Escape key closes overlay (AC-5)", () => {
    useUiStore.setState({ inspectorOverlay: true })
    render(<InspectorOverlay><div>Content</div></InspectorOverlay>)

    fireEvent.keyDown(document, { key: "Escape" })
    expect(useUiStore.getState().inspectorOverlay).toBe(false)
  })

  it("preserves inspectorWidth after closing overlay (AC-7)", () => {
    useUiStore.setState({ inspectorOverlay: true, inspectorWidth: 450 })
    render(<InspectorOverlay><div>Content</div></InspectorOverlay>)

    fireEvent.click(screen.getByTestId("inspector-overlay-close"))
    expect(useUiStore.getState().inspectorWidth).toBe(450)
  })

  it("clicking backdrop closes overlay (AC-5)", () => {
    useUiStore.setState({ inspectorOverlay: true })
    render(<InspectorOverlay><div>Content</div></InspectorOverlay>)

    // The backdrop is the first child div inside the overlay (aria-hidden)
    const overlay = screen.getByTestId("inspector-overlay")
    const backdrop = overlay.querySelector("[aria-hidden='true']")!
    fireEvent.click(backdrop)
    expect(useUiStore.getState().inspectorOverlay).toBe(false)
  })

  it("portal renders as child of document.body (AC-ARCH-PATTERN-4)", () => {
    useUiStore.setState({ inspectorOverlay: true })
    render(<InspectorOverlay><div>Content</div></InspectorOverlay>)

    const overlay = screen.getByTestId("inspector-overlay")
    expect(overlay.parentElement).toBe(document.body)
  })
})
