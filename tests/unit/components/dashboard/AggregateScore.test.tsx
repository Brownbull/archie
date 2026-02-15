import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen } from "@testing-library/react"

vi.mock("@/engine/dashboardCalculator", () => ({
  getScoreColor: vi.fn(),
}))

vi.mock("@/lib/constants", () => ({
  METRIC_MAX_VALUE: 10,
}))

import { AggregateScore } from "@/components/dashboard/AggregateScore"
import { getScoreColor } from "@/engine/dashboardCalculator"

const mockGetScoreColor = vi.mocked(getScoreColor)

describe("AggregateScore", () => {
  beforeEach(() => {
    vi.resetAllMocks()
    mockGetScoreColor.mockReturnValue("bg-green-500")
  })

  // --- AC-2: bgToTextColor mapping (tested indirectly via rendered className) ---

  describe("text color mapping", () => {
    it("applies text-green-500 when getScoreColor returns bg-green-500", () => {
      mockGetScoreColor.mockReturnValue("bg-green-500")
      render(<AggregateScore score={8} />)

      const scoreSpan = screen.getByText("8.0")
      expect(scoreSpan.className).toContain("text-green-500")
    })

    it("applies text-yellow-500 when getScoreColor returns bg-yellow-500", () => {
      mockGetScoreColor.mockReturnValue("bg-yellow-500")
      render(<AggregateScore score={5} />)

      const scoreSpan = screen.getByText("5.0")
      expect(scoreSpan.className).toContain("text-yellow-500")
    })

    it("applies text-red-500 when getScoreColor returns bg-red-500", () => {
      mockGetScoreColor.mockReturnValue("bg-red-500")
      render(<AggregateScore score={2} />)

      const scoreSpan = screen.getByText("2.0")
      expect(scoreSpan.className).toContain("text-red-500")
    })

    it("applies text-text-primary as fallback for unknown color", () => {
      mockGetScoreColor.mockReturnValue("bg-unknown-999")
      render(<AggregateScore score={5} />)

      const scoreSpan = screen.getByText("5.0")
      expect(scoreSpan.className).toContain("text-text-primary")
    })
  })

  // --- AC-3: Score display format ---

  describe("score display format", () => {
    it("formats whole number with one decimal place: 8 -> 8.0", () => {
      render(<AggregateScore score={8} />)

      expect(screen.getByText("8.0")).toBeInTheDocument()
    })

    it("formats decimal score correctly: 5.3 -> 5.3", () => {
      render(<AggregateScore score={5.3} />)

      expect(screen.getByText("5.3")).toBeInTheDocument()
    })

    it("formats zero as 0.0", () => {
      render(<AggregateScore score={0} />)

      expect(screen.getByText("0.0")).toBeInTheDocument()
    })
  })

  // --- AC-4: ARIA attributes ---

  describe("ARIA attributes", () => {
    it("has role=meter with correct aria-valuenow, aria-valuemin, and aria-valuemax", () => {
      render(<AggregateScore score={7.5} />)

      const meter = screen.getByRole("meter")
      expect(meter).toHaveAttribute("aria-valuenow", "7.5")
      expect(meter).toHaveAttribute("aria-valuemin", "0")
      expect(meter).toHaveAttribute("aria-valuemax", "10")
    })
  })

  // --- AC-5: Label + testid ---

  describe("label and testid", () => {
    it("renders 'Overall' label text", () => {
      render(<AggregateScore score={6} />)

      expect(screen.getByText("Overall")).toBeInTheDocument()
    })

    it("has data-testid='aggregate-score'", () => {
      render(<AggregateScore score={6} />)

      expect(screen.getByTestId("aggregate-score")).toBeInTheDocument()
    })
  })

  // --- getScoreColor delegation ---

  describe("getScoreColor delegation", () => {
    it("passes the score prop to getScoreColor", () => {
      render(<AggregateScore score={3.7} />)

      expect(mockGetScoreColor).toHaveBeenCalledWith(3.7)
    })
  })
})
