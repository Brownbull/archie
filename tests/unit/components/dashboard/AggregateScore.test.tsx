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
    mockGetScoreColor.mockReturnValue("bg-[#3fcf6a]")
  })

  // --- AC-2: bgToTextColor mapping (tested indirectly via rendered className) ---

  describe("text color mapping", () => {
    it("applies text-[#3fcf6a] when getScoreColor returns bg-[#3fcf6a]", () => {
      mockGetScoreColor.mockReturnValue("bg-[#3fcf6a]")
      render(<AggregateScore score={8} />)

      const scoreSpan = screen.getByText("8.0")
      expect(scoreSpan.className).toContain("text-[#3fcf6a]")
    })

    it("applies text-[#3b9dff] when getScoreColor returns bg-[#3b9dff]", () => {
      mockGetScoreColor.mockReturnValue("bg-[#3b9dff]")
      render(<AggregateScore score={5} />)

      const scoreSpan = screen.getByText("5.0")
      expect(scoreSpan.className).toContain("text-[#3b9dff]")
    })

    it("applies text-[#ff8a3d] when getScoreColor returns bg-[#ff8a3d]", () => {
      mockGetScoreColor.mockReturnValue("bg-[#ff8a3d]")
      render(<AggregateScore score={2} />)

      const scoreSpan = screen.getByText("2.0")
      expect(scoreSpan.className).toContain("text-[#ff8a3d]")
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

  // --- AC-4 (Story 5-3): Dual score display ---

  describe("dual score display (AC-4)", () => {
    it("shows single score when balancedScore is undefined", () => {
      render(<AggregateScore score={7.5} />)

      expect(screen.getByText("7.5")).toBeInTheDocument()
      expect(screen.getByText("Overall")).toBeInTheDocument()
      expect(screen.queryByTestId("aggregate-score-weighted")).not.toBeInTheDocument()
      expect(screen.queryByTestId("aggregate-score-balanced")).not.toBeInTheDocument()
    })

    it("shows single score when balancedScore equals score", () => {
      render(<AggregateScore score={7.5} balancedScore={7.5} />)

      expect(screen.getByText("7.5")).toBeInTheDocument()
      expect(screen.getByText("Overall")).toBeInTheDocument()
      expect(screen.queryByTestId("aggregate-score-weighted")).not.toBeInTheDocument()
    })

    it("shows dual scores when balancedScore differs from score", () => {
      render(<AggregateScore score={5.2} balancedScore={7.5} />)

      expect(screen.getByTestId("aggregate-score-weighted")).toHaveTextContent("5.2")
      expect(screen.getByTestId("aggregate-score-balanced")).toHaveTextContent("7.5")
      expect(screen.getByText("Weighted | Balanced")).toBeInTheDocument()
    })

    it("shows dual scores when rounding differs", () => {
      render(<AggregateScore score={7.0} balancedScore={7.1} />)

      expect(screen.getByTestId("aggregate-score-weighted")).toHaveTextContent("7.0")
      expect(screen.getByTestId("aggregate-score-balanced")).toHaveTextContent("7.1")
    })

    it("shows single score when scores round to same value", () => {
      render(<AggregateScore score={7.01} balancedScore={7.04} />)

      // Both round to "7.0" — show single
      expect(screen.getByText("7.0")).toBeInTheDocument()
      expect(screen.getByText("Overall")).toBeInTheDocument()
    })
  })
})
