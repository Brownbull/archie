import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"

// Mock architectureStore
vi.mock("@/stores/architectureStore", () => ({
  useArchitectureStore: vi.fn(),
}))

// Mock Slider to be testable in jsdom (Radix primitives don't render in jsdom)
// Use type="text" to avoid jsdom enforcing range constraints (we test clamping in component)
vi.mock("@/components/ui/slider", () => ({
  Slider: ({
    value,
    onValueChange,
    min,
    max,
    step,
    "data-testid": testId,
  }: {
    value?: number[]
    onValueChange?: (v: number[]) => void
    min?: number
    max?: number
    step?: number
    "data-testid"?: string
    className?: string
  }) => (
    <input
      data-testid={testId}
      data-min={min}
      data-max={max}
      data-step={step}
      value={value?.[0] ?? min}
      onChange={(e) => onValueChange?.([parseFloat(e.target.value)])}
    />
  ),
}))

// Mock categoryIcons
vi.mock("@/lib/categoryIcons", () => {
  const makeIcon = (key: string) => {
    const IconMock = ({ className, style }: { className?: string; style?: React.CSSProperties }) => (
      <span data-testid={`icon-${key}`} className={className} style={style} />
    )
    IconMock.displayName = key
    return IconMock
  }
  const proxy = new Proxy({}, { get: (_, key) => makeIcon(String(key)) })
  return {
    CATEGORY_ICONS: proxy,
    getCategoryIcon: (name: string) => (proxy as Record<string, unknown>)[name],
  }
})

import { useArchitectureStore } from "@/stores/architectureStore"
import { WeightSliders } from "@/components/dashboard/WeightSliders"
import { DEFAULT_WEIGHT_PROFILE, METRIC_CATEGORIES } from "@/lib/constants"

const mockUseArchitectureStore = vi.mocked(useArchitectureStore)

const mockSetWeightProfile = vi.fn()
const mockSetWeightAndRecalculate = vi.fn()

function mockStore(profileOverrides: Record<string, number> = {}) {
  const weightProfile = { ...DEFAULT_WEIGHT_PROFILE, ...profileOverrides }
  const state = {
    weightProfile,
    setWeightProfile: mockSetWeightProfile,
    setWeightAndRecalculate: mockSetWeightAndRecalculate,
  }
  mockUseArchitectureStore.mockImplementation((selector: unknown) => {
    return (selector as (s: typeof state) => unknown)(state)
  })
  // Zustand exposes getState() as a static method on the hook
  ;(mockUseArchitectureStore as unknown as { getState: () => typeof state }).getState = () => state
}

describe("WeightSliders", () => {
  beforeEach(() => {
    vi.resetAllMocks()
    vi.useFakeTimers()
    mockStore()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  // --- AC-1: 7 sliders with correct labels ---

  describe("renders all 7 category sliders (AC-1)", () => {
    it("renders a slider for each metric category", () => {
      render(<WeightSliders />)

      for (const cat of METRIC_CATEGORIES) {
        expect(screen.getByTestId(`weight-slider-${cat.id}`)).toBeInTheDocument()
      }
    })

    it("shows category short names", () => {
      render(<WeightSliders />)

      for (const cat of METRIC_CATEGORIES) {
        expect(screen.getByText(cat.shortName)).toBeInTheDocument()
      }
    })

    it("shows weight values as labels", () => {
      render(<WeightSliders />)

      // All defaults = 1.0, so at least 7 elements showing "1.0"
      const valueDisplays = screen.getAllByText("1.0")
      expect(valueDisplays.length).toBeGreaterThanOrEqual(7)
    })

    it("shows non-default weight values", () => {
      mockStore({ performance: 0.5, security: 0.3 })
      render(<WeightSliders />)

      expect(screen.getByText("0.5")).toBeInTheDocument()
      expect(screen.getByText("0.3")).toBeInTheDocument()
    })
  })

  // --- AC-1 / AC-5: slider range and step ---

  describe("slider configuration (AC-1, AC-5)", () => {
    it("sliders have min=0.1, max=1.0, step=0.1", () => {
      render(<WeightSliders />)

      const slider = screen.getByTestId("weight-slider-performance")
      expect(slider.getAttribute("data-min")).toBe("0.1")
      expect(slider.getAttribute("data-max")).toBe("1")
      expect(slider.getAttribute("data-step")).toBe("0.1")
    })
  })

  // --- AC-2: slider change dispatches store action ---

  describe("slider interaction (AC-2)", () => {
    it("dispatches setWeightProfile immediately on change", () => {
      render(<WeightSliders />)

      const slider = screen.getByTestId("weight-slider-performance")
      fireEvent.change(slider, { target: { value: "0.5" } })

      expect(mockSetWeightProfile).toHaveBeenCalledWith(
        expect.objectContaining({ performance: 0.5 }),
      )
    })

    it("dispatches setWeightAndRecalculate after 100ms debounce", () => {
      render(<WeightSliders />)

      const slider = screen.getByTestId("weight-slider-performance")
      fireEvent.change(slider, { target: { value: "0.5" } })

      // Not called immediately
      expect(mockSetWeightAndRecalculate).not.toHaveBeenCalled()

      // After debounce
      vi.advanceTimersByTime(100)
      expect(mockSetWeightAndRecalculate).toHaveBeenCalled()
    })

    it("debounce cancels previous pending recalculation", () => {
      render(<WeightSliders />)

      const slider = screen.getByTestId("weight-slider-performance")

      // Two rapid changes
      fireEvent.change(slider, { target: { value: "0.5" } })
      vi.advanceTimersByTime(50)
      fireEvent.change(slider, { target: { value: "0.3" } })

      // After first 100ms from second change
      vi.advanceTimersByTime(100)
      // Only called once (second change), not twice
      expect(mockSetWeightAndRecalculate).toHaveBeenCalledTimes(1)
    })

    it("rapid changes to two different sliders both apply via fresh state", () => {
      render(<WeightSliders />)

      const perfSlider = screen.getByTestId("weight-slider-performance")
      const secSlider = screen.getByTestId("weight-slider-security")

      // Rapid changes to two different categories
      fireEvent.change(perfSlider, { target: { value: "0.5" } })
      fireEvent.change(secSlider, { target: { value: "0.3" } })

      // Both immediate updates dispatched
      expect(mockSetWeightProfile).toHaveBeenCalledTimes(2)

      // Only one debounced recalculation after both settle
      vi.advanceTimersByTime(100)
      expect(mockSetWeightAndRecalculate).toHaveBeenCalledTimes(1)
    })
  })

  // --- AC-3: reset restores defaults ---

  describe("reset button (AC-3)", () => {
    it("renders reset button with data-testid", () => {
      render(<WeightSliders />)

      expect(screen.getByTestId("weight-reset-button")).toBeInTheDocument()
    })

    it("shows 'Reset Weights' text", () => {
      render(<WeightSliders />)

      expect(screen.getByText("Reset Weights")).toBeInTheDocument()
    })

    it("calls setWeightAndRecalculate with DEFAULT_WEIGHT_PROFILE on click", () => {
      mockStore({ performance: 0.5 })
      render(<WeightSliders />)

      fireEvent.click(screen.getByTestId("weight-reset-button"))

      expect(mockSetWeightAndRecalculate).toHaveBeenCalledWith(
        DEFAULT_WEIGHT_PROFILE,
      )
    })

    it("cancels pending debounced recalculation on reset", () => {
      render(<WeightSliders />)

      // Change slider (starts debounce)
      const slider = screen.getByTestId("weight-slider-performance")
      fireEvent.change(slider, { target: { value: "0.5" } })

      // Reset before debounce fires
      fireEvent.click(screen.getByTestId("weight-reset-button"))

      // Advance past debounce — should NOT fire old recalculation
      vi.advanceTimersByTime(200)
      // Only the reset call, not the debounced slider change
      expect(mockSetWeightAndRecalculate).toHaveBeenCalledTimes(1)
      expect(mockSetWeightAndRecalculate).toHaveBeenCalledWith(
        DEFAULT_WEIGHT_PROFILE,
      )
    })
  })

  // --- AC-5: value clamping ---

  describe("value clamping (AC-5)", () => {
    it("clamps values below 0.1 to 0.1", () => {
      render(<WeightSliders />)

      const slider = screen.getByTestId("weight-slider-performance")
      fireEvent.change(slider, { target: { value: "0.05" } })

      expect(mockSetWeightProfile).toHaveBeenCalledWith(
        expect.objectContaining({ performance: 0.1 }),
      )
    })

    it("clamps values above 1.0 to 1.0", () => {
      render(<WeightSliders />)

      const slider = screen.getByTestId("weight-slider-performance")
      fireEvent.change(slider, { target: { value: "1.5" } })

      expect(mockSetWeightProfile).toHaveBeenCalledWith(
        expect.objectContaining({ performance: 1.0 }),
      )
    })

    it("snaps 0.15 to nearest 0.1 step (rounds to 0.2)", () => {
      render(<WeightSliders />)

      const slider = screen.getByTestId("weight-slider-performance")
      fireEvent.change(slider, { target: { value: "0.15" } })

      expect(mockSetWeightProfile).toHaveBeenCalledWith(
        expect.objectContaining({ performance: 0.2 }),
      )
    })

    it("handles NaN input by clamping to minimum", () => {
      render(<WeightSliders />)

      const slider = screen.getByTestId("weight-slider-performance")
      fireEvent.change(slider, { target: { value: "abc" } })

      // NaN → Math.round(NaN * 10) / 10 = NaN → Math.max(0.1, NaN) = 0.1
      expect(mockSetWeightProfile).toHaveBeenCalledWith(
        expect.objectContaining({ performance: 0.1 }),
      )
    })
  })

  // --- data-testid ---

  it("has data-testid='weight-sliders-section' on root", () => {
    render(<WeightSliders />)

    expect(screen.getByTestId("weight-sliders-section")).toBeInTheDocument()
  })

  // --- AC-ARCH-NO-1: no engine imports ---
  // This is verified by code review, not runtime test

  // --- AC-ARCH-NO-2: no useState for slider values ---
  // Verified by code review — store is single source of truth
})
