import { describe, it, expect, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import { CategoryBar } from "@/components/dashboard/CategoryBar"

// Mock categoryIcons to avoid importing Lucide components in test env
vi.mock("@/lib/categoryIcons", () => ({
  CATEGORY_ICONS: new Proxy(
    {},
    {
      get: (_, key) => {
        const IconMock = ({
          className,
          style,
        }: {
          className?: string
          style?: React.CSSProperties
        }) => (
          <span
            data-testid={`icon-${String(key)}`}
            className={className}
            style={style}
          />
        )
        IconMock.displayName = String(key)
        return IconMock
      },
    },
  ),
}))

const defaultProps = {
  categoryId: "performance",
  shortName: "Perf",
  iconName: "Gauge",
  categoryColor: "var(--color-metric-performance)",
  score: 7,
}

describe("CategoryBar", () => {
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
})
