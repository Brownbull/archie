import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"
import { PathwayGuidancePanel } from "@/components/dashboard/PathwayGuidancePanel"
import { useArchitectureStore } from "@/stores/architectureStore"
import type { PathwaySuggestionsResult } from "@/hooks/usePathwaySuggestions"
import type { PathwaySuggestion } from "@/engine/pathwayEngine"

vi.mock("@/hooks/usePathwaySuggestions", () => ({
  usePathwaySuggestions: vi.fn(),
}))

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

import { usePathwaySuggestions } from "@/hooks/usePathwaySuggestions"

const mockUsePathwaySuggestions = vi.mocked(usePathwaySuggestions)

function makeSuggestion(overrides: Partial<PathwaySuggestion> = {}): PathwaySuggestion {
  return {
    componentId: "comp-1",
    componentName: "PostgreSQL",
    category: "data-storage",
    gapClosed: "Add a Data Storage component",
    weightedScore: 7.5,
    isConstraintSafe: true,
    reason: "Adding PostgreSQL provides the required data-storage component",
    ...overrides,
  }
}

function mockSuggestions(result: Partial<PathwaySuggestionsResult>) {
  mockUsePathwaySuggestions.mockReturnValue({
    suggestions: [],
    hasGaps: false,
    nextTierName: null,
    ...result,
  })
}

describe("PathwayGuidancePanel", () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  describe("actionable suggestions (decision support)", () => {
    it("Add button places the suggested component on the canvas", () => {
      mockSuggestions({ suggestions: [makeSuggestion({ componentId: "redis", componentName: "Redis" })], hasGaps: true })
      const addSpy = vi
        .spyOn(useArchitectureStore.getState(), "addNodeSmartPosition")
        .mockImplementation(() => {})

      render(<PathwayGuidancePanel />)
      fireEvent.click(screen.getByTestId("pathway-add-redis"))

      expect(addSpy).toHaveBeenCalledWith("redis")
    })

    it("renders nothing when empty and hideWhenEmpty is set", () => {
      mockSuggestions({ suggestions: [] })
      const { container } = render(<PathwayGuidancePanel hideWhenEmpty />)
      expect(container).toBeEmptyDOMElement()
    })

    it("caps the list to maxItems", () => {
      mockSuggestions({
        suggestions: [
          makeSuggestion({ componentId: "a", componentName: "Alpha" }),
          makeSuggestion({ componentId: "b", componentName: "Bravo" }),
          makeSuggestion({ componentId: "c", componentName: "Charlie" }),
        ],
        hasGaps: true,
      })
      render(<PathwayGuidancePanel maxItems={2} />)
      expect(screen.getByTestId("pathway-add-a")).toBeInTheDocument()
      expect(screen.getByTestId("pathway-add-b")).toBeInTheDocument()
      expect(screen.queryByTestId("pathway-add-c")).toBeNull()
    })
  })

  // AC-4: Suggestion card content
  describe("suggestion cards (AC-4)", () => {
    it("renders suggestion cards with correct content", () => {
      const suggestions = [
        makeSuggestion({ componentId: "pg", componentName: "PostgreSQL", category: "data-storage", gapClosed: "Add a Data Storage component", weightedScore: 7.5 }),
        makeSuggestion({ componentId: "redis", componentName: "Redis", category: "caching", gapClosed: "Add a Caching component", weightedScore: 6.2 }),
      ]
      mockSuggestions({ suggestions, hasGaps: true, nextTierName: "Established" })

      render(<PathwayGuidancePanel />)

      expect(screen.getByText("PostgreSQL")).toBeInTheDocument()
      expect(screen.getByText("Redis")).toBeInTheDocument()
      expect(screen.getByText("Add a Data Storage component")).toBeInTheDocument()
      expect(screen.getByText("Add a Caching component")).toBeInTheDocument()
      expect(screen.getByText("7.5")).toBeInTheDocument()
      expect(screen.getByText("6.2")).toBeInTheDocument()
    })

    it("renders constraint safe indicator (green) for safe suggestions", () => {
      mockSuggestions({
        suggestions: [makeSuggestion({ isConstraintSafe: true })],
        hasGaps: true,
      })

      render(<PathwayGuidancePanel />)

      expect(screen.getByTestId("constraint-safe-comp-1")).toBeInTheDocument()
    })

    it("renders constraint warning indicator (amber) for unsafe suggestions (AC-ARCH-PATTERN-3)", () => {
      mockSuggestions({
        suggestions: [makeSuggestion({
          componentId: "risky-comp",
          isConstraintSafe: false,
          constraintWarning: "Cost must stay low",
        })],
        hasGaps: true,
      })

      render(<PathwayGuidancePanel />)

      const warning = screen.getByTestId("constraint-warning-risky-comp")
      expect(warning).toBeInTheDocument()
      expect(screen.getByText("Cost must stay low")).toBeInTheDocument()
    })

    it("renders fit level indicator when fitLevel is defined", () => {
      mockSuggestions({
        suggestions: [makeSuggestion({
          fitLevel: "great-fit",
          fitExplanation: "great fit across 2 data context items",
        })],
        hasGaps: true,
      })

      render(<PathwayGuidancePanel />)

      expect(screen.getByTestId("fit-level-comp-1")).toBeInTheDocument()
      expect(screen.getByText("great fit")).toBeInTheDocument()
    })

    it("does not render fit level indicator when fitLevel is undefined", () => {
      mockSuggestions({
        suggestions: [makeSuggestion({ fitLevel: undefined })],
        hasGaps: true,
      })

      render(<PathwayGuidancePanel />)

      expect(screen.queryByTestId("fit-level-comp-1")).not.toBeInTheDocument()
    })
  })

  // AC-5: Empty state
  describe("empty state (AC-5)", () => {
    it("renders empty state message when no suggestions", () => {
      mockSuggestions({ suggestions: [], hasGaps: false, nextTierName: null })

      render(<PathwayGuidancePanel />)

      expect(screen.getByTestId("pathway-empty-state")).toBeInTheDocument()
    })
  })

  // data-testid
  it("has data-testid pathway-guidance-panel on root", () => {
    mockSuggestions({ suggestions: [], hasGaps: false })

    render(<PathwayGuidancePanel />)

    expect(screen.getByTestId("pathway-guidance-panel")).toBeInTheDocument()
  })
})
