import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"
import { GuidedTour } from "@/components/onboarding/GuidedTour"

let mockTourSeen = false
const mockSetTourSeen = vi.fn()

vi.mock("@/stores/preferencesStore", () => ({
  usePreferencesStore: (sel: (s: { tourSeen: boolean; setTourSeen: (v: boolean) => void }) => unknown) =>
    sel({ tourSeen: mockTourSeen, setTourSeen: mockSetTourSeen }),
}))

beforeEach(() => {
  mockTourSeen = false
  mockSetTourSeen.mockReset()
})

describe("GuidedTour (P6)", () => {
  it("does not render once the tour has been seen", () => {
    mockTourSeen = true
    render(<GuidedTour />)
    expect(screen.queryByTestId("guided-tour")).toBeNull()
  })

  it("auto-shows on first run, starting at the welcome step", () => {
    render(<GuidedTour />)
    expect(screen.getByTestId("guided-tour")).toBeInTheDocument()
    expect(screen.getByTestId("tour-title")).toHaveTextContent("Welcome to Archie")
    expect(screen.queryByTestId("tour-back")).toBeNull() // no Back on the first step
  })

  it("advances and rewinds through steps", () => {
    render(<GuidedTour />)
    fireEvent.click(screen.getByTestId("tour-next"))
    expect(screen.getByTestId("tour-title")).toHaveTextContent("Pick a component type")
    fireEvent.click(screen.getByTestId("tour-back"))
    expect(screen.getByTestId("tour-title")).toHaveTextContent("Welcome to Archie")
  })

  it("Skip marks the tour seen", () => {
    render(<GuidedTour />)
    fireEvent.click(screen.getByTestId("tour-skip"))
    expect(mockSetTourSeen).toHaveBeenCalledWith(true)
  })

  it("Done on the last step marks the tour seen", () => {
    render(<GuidedTour />)
    // Click Next until the final step exposes Done.
    for (let i = 0; i < 10; i++) {
      const next = screen.queryByTestId("tour-next")
      if (!next) break
      fireEvent.click(next)
    }
    fireEvent.click(screen.getByTestId("tour-done"))
    expect(mockSetTourSeen).toHaveBeenCalledWith(true)
  })
})
