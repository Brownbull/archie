import { describe, it, expect, vi } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"
import { SpotlightTour, type TourStep } from "@/components/onboarding/SpotlightTour"

const STEPS: TourStep[] = [
  { title: "Step one", body: "first" },
  { title: "Step two", body: "second" },
  { title: "Step three", body: "third" },
]

describe("SpotlightTour (P89/Phase B)", () => {
  it("renders the first step with no Back button", () => {
    render(<SpotlightTour steps={STEPS} onClose={vi.fn()} />)
    expect(screen.getByTestId("tour-title")).toHaveTextContent("Step one")
    expect(screen.queryByTestId("tour-back")).toBeNull()
  })

  it("advances and rewinds through steps", () => {
    render(<SpotlightTour steps={STEPS} onClose={vi.fn()} />)
    fireEvent.click(screen.getByTestId("tour-next"))
    expect(screen.getByTestId("tour-title")).toHaveTextContent("Step two")
    fireEvent.click(screen.getByTestId("tour-back"))
    expect(screen.getByTestId("tour-title")).toHaveTextContent("Step one")
  })

  it("shows Done on the last step and calls onClose", () => {
    const onClose = vi.fn()
    render(<SpotlightTour steps={STEPS} onClose={onClose} />)
    fireEvent.click(screen.getByTestId("tour-next"))
    fireEvent.click(screen.getByTestId("tour-next"))
    expect(screen.queryByTestId("tour-next")).toBeNull()
    fireEvent.click(screen.getByTestId("tour-done"))
    expect(onClose).toHaveBeenCalledOnce()
  })

  it("Skip calls onClose", () => {
    const onClose = vi.fn()
    render(<SpotlightTour steps={STEPS} onClose={onClose} />)
    fireEvent.click(screen.getByTestId("tour-skip"))
    expect(onClose).toHaveBeenCalledOnce()
  })

  it("renders nothing for empty steps", () => {
    const { container } = render(<SpotlightTour steps={[]} onClose={vi.fn()} />)
    expect(container).toBeEmptyDOMElement()
  })
})
