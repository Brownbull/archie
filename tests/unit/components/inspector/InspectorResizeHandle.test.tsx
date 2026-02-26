import { render, screen, fireEvent } from "@testing-library/react"
import { describe, it, expect, vi, beforeEach } from "vitest"
import { useUiStore } from "@/stores/uiStore"

vi.mock("@/lib/firebase", () => ({
  auth: { currentUser: null },
  db: {},
}))

const { InspectorResizeHandle } = await import(
  "@/components/inspector/InspectorResizeHandle"
)

describe("InspectorResizeHandle", () => {
  beforeEach(() => {
    vi.resetAllMocks()
    useUiStore.setState({ inspectorWidth: 300 })
  })

  it("renders with data-testid", () => {
    render(<InspectorResizeHandle />)
    expect(screen.getByTestId("inspector-resize-handle")).toBeInTheDocument()
  })

  it("has cursor-col-resize class (AC-3)", () => {
    render(<InspectorResizeHandle />)
    const handle = screen.getByTestId("inspector-resize-handle")
    expect(handle.className).toContain("cursor-col-resize")
  })

  it("updates store width on pointer drag leftward (wider)", () => {
    render(<InspectorResizeHandle />)
    const handle = screen.getByTestId("inspector-resize-handle")

    // Mock setPointerCapture / hasPointerCapture / releasePointerCapture
    let captured = false
    handle.setPointerCapture = vi.fn(() => { captured = true })
    handle.hasPointerCapture = vi.fn(() => captured)
    handle.releasePointerCapture = vi.fn(() => { captured = false })

    // Start drag at x=500, width=300
    fireEvent.pointerDown(handle, { clientX: 500, pointerId: 1 })

    // Drag left by 150px → width should become 300 + 150 = 450
    fireEvent.pointerMove(handle, { clientX: 350, pointerId: 1 })

    expect(useUiStore.getState().inspectorWidth).toBe(450)

    // Release
    fireEvent.pointerUp(handle, { pointerId: 1 })
  })

  it("clamps to INSPECTOR_MIN_WIDTH (200) on rightward drag", () => {
    render(<InspectorResizeHandle />)
    const handle = screen.getByTestId("inspector-resize-handle")

    let captured = false
    handle.setPointerCapture = vi.fn(() => { captured = true })
    handle.hasPointerCapture = vi.fn(() => captured)
    handle.releasePointerCapture = vi.fn(() => { captured = false })

    fireEvent.pointerDown(handle, { clientX: 500, pointerId: 1 })
    // Drag right by 200px → width = 300 - 200 = 100 → clamped to 200
    fireEvent.pointerMove(handle, { clientX: 700, pointerId: 1 })

    expect(useUiStore.getState().inspectorWidth).toBe(200)
  })

  it("clamps to INSPECTOR_MAX_WIDTH (700) on large leftward drag", () => {
    render(<InspectorResizeHandle />)
    const handle = screen.getByTestId("inspector-resize-handle")

    let captured = false
    handle.setPointerCapture = vi.fn(() => { captured = true })
    handle.hasPointerCapture = vi.fn(() => captured)
    handle.releasePointerCapture = vi.fn(() => { captured = false })

    fireEvent.pointerDown(handle, { clientX: 500, pointerId: 1 })
    // Drag left by 600px → width = 300 + 600 = 900 → clamped to 700
    fireEvent.pointerMove(handle, { clientX: -100, pointerId: 1 })

    expect(useUiStore.getState().inspectorWidth).toBe(700)
  })

  it("ignores pointer move when pointer is not captured", () => {
    render(<InspectorResizeHandle />)
    const handle = screen.getByTestId("inspector-resize-handle")

    handle.hasPointerCapture = vi.fn(() => false)

    // Move without pointerDown — should not change width
    fireEvent.pointerMove(handle, { clientX: 200, pointerId: 1 })
    expect(useUiStore.getState().inspectorWidth).toBe(300)
  })
})
