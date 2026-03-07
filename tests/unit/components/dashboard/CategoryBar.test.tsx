import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"
import { CategoryBar } from "@/components/dashboard/CategoryBar"

// Mock categoryIcons to avoid importing Lucide components in test env
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

const defaultProps = {
  categoryId: "performance",
  shortName: "Perf",
  iconName: "Gauge",
  categoryColor: "var(--color-metric-performance)",
  score: 7,
}

describe("CategoryBar", () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it("renders short name and score", () => {
    render(<CategoryBar {...defaultProps} />)

    expect(screen.getByText("Perf")).toBeInTheDocument()
    expect(screen.getByText("7.0")).toBeInTheDocument()
  })

  it("bar width matches score percentage: score=7 -> 70%", () => {
    render(<CategoryBar {...defaultProps} score={7} />)

    const fill = screen.getByTestId("category-bar-fill-performance")
    expect(fill).toHaveStyle({ width: "70%" })
  })

  it("bar width is 100% when score=10", () => {
    render(<CategoryBar {...defaultProps} score={10} />)

    const fill = screen.getByTestId("category-bar-fill-performance")
    expect(fill).toHaveStyle({ width: "100%" })
  })

  it("bar width is 0% when score=0", () => {
    render(<CategoryBar {...defaultProps} score={0} />)

    const fill = screen.getByTestId("category-bar-fill-performance")
    expect(fill).toHaveStyle({ width: "0%" })
  })

  it("applies green color class when score >= 7", () => {
    render(<CategoryBar {...defaultProps} score={7} />)

    const fill = screen.getByTestId("category-bar-fill-performance")
    expect(fill.className).toContain("bg-green-500")
  })

  it("applies yellow color class when score >= 4 and < 7", () => {
    render(<CategoryBar {...defaultProps} score={5} />)

    const fill = screen.getByTestId("category-bar-fill-performance")
    expect(fill.className).toContain("bg-yellow-500")
  })

  it("applies red color class when score < 4", () => {
    render(<CategoryBar {...defaultProps} score={2} />)

    const fill = screen.getByTestId("category-bar-fill-performance")
    expect(fill.className).toContain("bg-red-500")
  })

  it("applies yellow at exact threshold score=4", () => {
    render(<CategoryBar {...defaultProps} score={4} />)

    const fill = screen.getByTestId("category-bar-fill-performance")
    expect(fill.className).toContain("bg-yellow-500")
  })

  it("applies red at score=3.99 (just below yellow threshold)", () => {
    render(<CategoryBar {...defaultProps} score={3.99} />)

    const fill = screen.getByTestId("category-bar-fill-performance")
    expect(fill.className).toContain("bg-red-500")
  })

  it("has role=meter with correct ARIA attributes", () => {
    render(<CategoryBar {...defaultProps} score={7} />)

    const meter = screen.getByRole("meter")
    expect(meter).toHaveAttribute("aria-valuenow", "7")
    expect(meter).toHaveAttribute("aria-valuemin", "0")
    expect(meter).toHaveAttribute("aria-valuemax", "10")
  })

  it("fill element has CSS transition style", () => {
    render(<CategoryBar {...defaultProps} />)

    const fill = screen.getByTestId("category-bar-fill-performance")
    expect(fill).toHaveStyle({
      transition: "width 300ms ease, background-color 300ms ease",
    })
  })

  it("has correct data-testid based on categoryId", () => {
    render(<CategoryBar {...defaultProps} categoryId="reliability" />)

    expect(screen.getByTestId("category-bar-reliability")).toBeInTheDocument()
  })

  it("renders the icon component for the given iconName", () => {
    render(<CategoryBar {...defaultProps} iconName="Gauge" />)

    expect(screen.getByTestId("icon-Gauge")).toBeInTheDocument()
  })

  it("passes categoryColor to icon style", () => {
    render(
      <CategoryBar
        {...defaultProps}
        categoryColor="var(--color-metric-performance)"
      />,
    )

    const icon = screen.getByTestId("icon-Gauge")
    expect(icon).toHaveStyle({ color: "var(--color-metric-performance)" })
  })

  it("clamps fill width to 100% for scores above METRIC_MAX_VALUE", () => {
    render(<CategoryBar {...defaultProps} score={15} />)

    const fill = screen.getByTestId("category-bar-fill-performance")
    expect(fill).toHaveStyle({ width: "100%" })
    const meter = screen.getByRole("meter")
    expect(meter).toHaveAttribute("aria-valuenow", "15")
  })

  it("clamps fill width to 0% for negative scores", () => {
    render(<CategoryBar {...defaultProps} score={-1} />)

    const fill = screen.getByTestId("category-bar-fill-performance")
    expect(fill).toHaveStyle({ width: "0%" })
  })

  // --- onClick handler (AC-FUNC-4) ---

  describe("onClick handler (AC-FUNC-4)", () => {
    it("fires onClick when clicked", () => {
      const handleClick = vi.fn()
      render(<CategoryBar {...defaultProps} onClick={handleClick} />)

      const bar = screen.getByTestId("category-bar-performance")
      fireEvent.click(bar)

      expect(handleClick).toHaveBeenCalledTimes(1)
    })

    it("does not throw when clicked without onClick", () => {
      render(<CategoryBar {...defaultProps} />)

      const bar = screen.getByTestId("category-bar-performance")
      expect(() => fireEvent.click(bar)).not.toThrow()
    })

    it("has cursor-pointer class when onClick is provided", () => {
      const handleClick = vi.fn()
      render(<CategoryBar {...defaultProps} onClick={handleClick} />)

      const bar = screen.getByTestId("category-bar-performance")
      expect(bar.className).toContain("cursor-pointer")
    })

    it("does not have cursor-pointer class when onClick is not provided", () => {
      render(<CategoryBar {...defaultProps} />)

      const bar = screen.getByTestId("category-bar-performance")
      expect(bar.className).not.toContain("cursor-pointer")
    })
  })

  // --- Keyboard accessibility ---

  describe("keyboard accessibility", () => {
    it("triggers onClick on Enter key", () => {
      const handleClick = vi.fn()
      render(<CategoryBar {...defaultProps} onClick={handleClick} />)

      const bar = screen.getByTestId("category-bar-performance")
      fireEvent.keyDown(bar, { key: "Enter" })

      expect(handleClick).toHaveBeenCalledTimes(1)
    })

    it("triggers onClick on Space key", () => {
      const handleClick = vi.fn()
      render(<CategoryBar {...defaultProps} onClick={handleClick} />)

      const bar = screen.getByTestId("category-bar-performance")
      fireEvent.keyDown(bar, { key: " " })

      expect(handleClick).toHaveBeenCalledTimes(1)
    })

    it("does not trigger onClick on other keys", () => {
      const handleClick = vi.fn()
      render(<CategoryBar {...defaultProps} onClick={handleClick} />)

      const bar = screen.getByTestId("category-bar-performance")
      fireEvent.keyDown(bar, { key: "Tab" })

      expect(handleClick).not.toHaveBeenCalled()
    })

    it("has tabIndex=0 when onClick is provided", () => {
      const handleClick = vi.fn()
      render(<CategoryBar {...defaultProps} onClick={handleClick} />)

      const bar = screen.getByTestId("category-bar-performance")
      expect(bar).toHaveAttribute("tabindex", "0")
    })

    it("does not have tabIndex when onClick is not provided", () => {
      render(<CategoryBar {...defaultProps} />)

      const bar = screen.getByTestId("category-bar-performance")
      expect(bar).not.toHaveAttribute("tabindex")
    })
  })

  // --- Weight badge (TD-5-3a AC-4) ---

  describe("weight badge", () => {
    it("renders weight badge when weight is not 1.0", () => {
      render(<CategoryBar {...defaultProps} weight={0.5} />)

      const badge = screen.getByTestId("weight-badge-performance")
      expect(badge).toBeInTheDocument()
      expect(badge).toHaveTextContent("0.5x")
    })

    it("does not render badge when weight is undefined", () => {
      render(<CategoryBar {...defaultProps} />)

      expect(screen.queryByTestId("weight-badge-performance")).not.toBeInTheDocument()
    })

    it("does not render badge when weight is exactly 1.0", () => {
      render(<CategoryBar {...defaultProps} weight={1.0} />)

      expect(screen.queryByTestId("weight-badge-performance")).not.toBeInTheDocument()
    })
  })

  // --- aria-label on role="meter" ---

  describe("aria-label on role='meter'", () => {
    it("has aria-label matching shortName", () => {
      render(<CategoryBar {...defaultProps} shortName="Perf" />)

      const meter = screen.getByRole("meter")
      expect(meter).toHaveAttribute("aria-label", "Perf")
    })

    it("aria-label updates with different shortName", () => {
      render(<CategoryBar {...defaultProps} shortName="Reliability" />)

      const meter = screen.getByRole("meter")
      expect(meter).toHaveAttribute("aria-label", "Reliability")
    })
  })
})
