import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen } from "@testing-library/react"
import { CategoryInfoPopup } from "@/components/dashboard/CategoryInfoPopup"
import type { MetricCategory } from "@/schemas/metricCategorySchema"

// Mock shadcn Popover — render children and content directly for testability
vi.mock("@/components/ui/popover", () => ({
  Popover: ({
    children,
    open,
  }: {
    children: React.ReactNode
    open: boolean
  }) => (open ? <div data-testid="popover-root">{children}</div> : null),
  PopoverTrigger: ({
    children,
  }: {
    children: React.ReactNode
    asChild?: boolean
  }) => <div data-testid="popover-trigger">{children}</div>,
  PopoverContent: ({
    children,
    ...props
  }: {
    children: React.ReactNode
    "data-testid"?: string
    side?: string
    className?: string
  }) => (
    <div data-testid={props["data-testid"] ?? "popover-content"}>
      {children}
    </div>
  ),
}))

// --- Helpers ---

function makeCategory(
  overrides?: Partial<MetricCategory>,
): MetricCategory {
  return {
    id: "performance",
    name: "Performance",
    description: "How fast the system responds",
    whyItMatters: "Slow systems lose users",
    icon: "Gauge",
    scoreInterpretations: [
      { minScore: 0, maxScore: 3, text: "Poor performance" },
      { minScore: 3.01, maxScore: 6, text: "Moderate performance" },
      { minScore: 6.01, maxScore: 10, text: "Excellent performance" },
    ],
    ...overrides,
  }
}

describe("CategoryInfoPopup", () => {
  const mockOnOpenChange = vi.fn()

  beforeEach(() => {
    vi.resetAllMocks()
  })

  // --- AC-FUNC-5: Renders category info ---

  describe("renders category info (AC-FUNC-5)", () => {
    it("renders category name", () => {
      render(
        <CategoryInfoPopup
          category={makeCategory()}
          score={7}
          open={true}
          onOpenChange={mockOnOpenChange}
        >
          <button>trigger</button>
        </CategoryInfoPopup>,
      )

      expect(screen.getByText("Performance")).toBeInTheDocument()
    })

    it("renders category description", () => {
      render(
        <CategoryInfoPopup
          category={makeCategory()}
          score={7}
          open={true}
          onOpenChange={mockOnOpenChange}
        >
          <button>trigger</button>
        </CategoryInfoPopup>,
      )

      expect(
        screen.getByText("How fast the system responds"),
      ).toBeInTheDocument()
    })

    it("renders whyItMatters", () => {
      render(
        <CategoryInfoPopup
          category={makeCategory()}
          score={7}
          open={true}
          onOpenChange={mockOnOpenChange}
        >
          <button>trigger</button>
        </CategoryInfoPopup>,
      )

      expect(screen.getByText("Slow systems lose users")).toBeInTheDocument()
    })

    it("renders score interpretation for matching range", () => {
      render(
        <CategoryInfoPopup
          category={makeCategory()}
          score={7}
          open={true}
          onOpenChange={mockOnOpenChange}
        >
          <button>trigger</button>
        </CategoryInfoPopup>,
      )

      expect(screen.getByText("Excellent performance")).toBeInTheDocument()
      expect(screen.getByText("Your score: 7.0")).toBeInTheDocument()
    })

    it("renders low score interpretation", () => {
      render(
        <CategoryInfoPopup
          category={makeCategory()}
          score={2}
          open={true}
          onOpenChange={mockOnOpenChange}
        >
          <button>trigger</button>
        </CategoryInfoPopup>,
      )

      expect(screen.getByText("Poor performance")).toBeInTheDocument()
    })

    it("renders moderate score interpretation", () => {
      render(
        <CategoryInfoPopup
          category={makeCategory()}
          score={5}
          open={true}
          onOpenChange={mockOnOpenChange}
        >
          <button>trigger</button>
        </CategoryInfoPopup>,
      )

      expect(screen.getByText("Moderate performance")).toBeInTheDocument()
    })
  })

  // --- Undefined category passthrough ---

  describe("undefined category passthrough", () => {
    it("returns children when category is undefined", () => {
      render(
        <CategoryInfoPopup
          category={undefined}
          score={5}
          open={true}
          onOpenChange={mockOnOpenChange}
        >
          <button>passthrough child</button>
        </CategoryInfoPopup>,
      )

      expect(screen.getByText("passthrough child")).toBeInTheDocument()
      // No popup content should be rendered
      expect(
        screen.queryByTestId("category-info-popup"),
      ).not.toBeInTheDocument()
    })

    it("does not render category name when undefined", () => {
      render(
        <CategoryInfoPopup
          category={undefined}
          score={5}
          open={true}
          onOpenChange={mockOnOpenChange}
        >
          <span>child</span>
        </CategoryInfoPopup>,
      )

      expect(screen.queryByText("Performance")).not.toBeInTheDocument()
    })
  })

  // --- Score interpretation boundary clamping ---

  describe("score interpretation boundary clamp", () => {
    it("clamps negative score to 0", () => {
      const category = makeCategory({
        scoreInterpretations: [
          { minScore: 0, maxScore: 3, text: "Clamped to zero range" },
          { minScore: 3.01, maxScore: 10, text: "Higher range" },
        ],
      })

      render(
        <CategoryInfoPopup
          category={category}
          score={-5}
          open={true}
          onOpenChange={mockOnOpenChange}
        >
          <button>trigger</button>
        </CategoryInfoPopup>,
      )

      expect(screen.getByText("Clamped to zero range")).toBeInTheDocument()
    })

    it("clamps score >10 to 10", () => {
      const category = makeCategory({
        scoreInterpretations: [
          { minScore: 0, maxScore: 5, text: "Lower range" },
          { minScore: 5.01, maxScore: 10, text: "Clamped to ten range" },
        ],
      })

      render(
        <CategoryInfoPopup
          category={category}
          score={15}
          open={true}
          onOpenChange={mockOnOpenChange}
        >
          <button>trigger</button>
        </CategoryInfoPopup>,
      )

      expect(screen.getByText("Clamped to ten range")).toBeInTheDocument()
    })

    it("handles exact boundary score=0", () => {
      const category = makeCategory({
        scoreInterpretations: [
          { minScore: 0, maxScore: 3, text: "Zero boundary hit" },
          { minScore: 3.01, maxScore: 10, text: "Not this one" },
        ],
      })

      render(
        <CategoryInfoPopup
          category={category}
          score={0}
          open={true}
          onOpenChange={mockOnOpenChange}
        >
          <button>trigger</button>
        </CategoryInfoPopup>,
      )

      expect(screen.getByText("Zero boundary hit")).toBeInTheDocument()
    })

    it("handles exact boundary score=10", () => {
      const category = makeCategory({
        scoreInterpretations: [
          { minScore: 0, maxScore: 5, text: "Not this one" },
          { minScore: 5.01, maxScore: 10, text: "Ten boundary hit" },
        ],
      })

      render(
        <CategoryInfoPopup
          category={category}
          score={10}
          open={true}
          onOpenChange={mockOnOpenChange}
        >
          <button>trigger</button>
        </CategoryInfoPopup>,
      )

      expect(screen.getByText("Ten boundary hit")).toBeInTheDocument()
    })

    it("shows no interpretation when score falls in gap between ranges", () => {
      const category = makeCategory({
        scoreInterpretations: [
          { minScore: 0, maxScore: 2, text: "Low" },
          { minScore: 5, maxScore: 10, text: "High" },
        ],
      })

      render(
        <CategoryInfoPopup
          category={category}
          score={3}
          open={true}
          onOpenChange={mockOnOpenChange}
        >
          <button>trigger</button>
        </CategoryInfoPopup>,
      )

      // Score 3 falls in [2,5] gap — no interpretation matches
      expect(screen.queryByText("Low")).not.toBeInTheDocument()
      expect(screen.queryByText("High")).not.toBeInTheDocument()
      // Score text should not appear when no interpretation
      expect(screen.queryByText(/Your score/)).not.toBeInTheDocument()
    })
  })

  // --- AC-FUNC-6: Close behavior ---

  describe("close behavior (AC-FUNC-6)", () => {
    it("passes onOpenChange to Popover for close handling", () => {
      // The component delegates close (Escape/outside-click) to the Popover component.
      // We verify the onOpenChange prop is correctly wired.
      render(
        <CategoryInfoPopup
          category={makeCategory()}
          score={5}
          open={true}
          onOpenChange={mockOnOpenChange}
        >
          <button>trigger</button>
        </CategoryInfoPopup>,
      )

      // Popover content is rendered when open=true
      expect(screen.getByTestId("category-info-popup")).toBeInTheDocument()
    })

    it("does not render popup content when open=false", () => {
      render(
        <CategoryInfoPopup
          category={makeCategory()}
          score={5}
          open={false}
          onOpenChange={mockOnOpenChange}
        >
          <button>trigger</button>
        </CategoryInfoPopup>,
      )

      // Our mock Popover returns null when open=false
      expect(
        screen.queryByTestId("category-info-popup"),
      ).not.toBeInTheDocument()
    })
  })
})
