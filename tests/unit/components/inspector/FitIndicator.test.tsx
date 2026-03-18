import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, it, expect } from "vitest"
import { FitIndicator } from "@/components/inspector/FitIndicator"
import type { FitResult, FitLevel } from "@/lib/constants"

function makeFitResult(overrides: Partial<FitResult> = {}): FitResult {
  return {
    level: "trade-off",
    explanation: "trade off — Access Pattern: neutral (No data available); Data Size: neutral (No data available); Structure Type: neutral (No data available)",
    factors: [
      { dimension: "Access Pattern", compatibility: "neutral", detail: "No data available" },
      { dimension: "Data Size", compatibility: "neutral", detail: "No data available" },
      { dimension: "Structure Type", compatibility: "neutral", detail: "No data available" },
    ],
    ...overrides,
  }
}

describe("FitIndicator", () => {
  it("renders data-testid with itemId", () => {
    render(<FitIndicator itemId="item-1" fitResult={makeFitResult()} />)
    expect(screen.getByTestId("fit-indicator-item-1")).toBeInTheDocument()
  })

  it.each<[FitLevel, string]>([
    ["great-fit", "Great Fit"],
    ["good-fit", "Good Fit"],
    ["trade-off", "Trade-off"],
    ["poor-fit", "Poor Fit"],
    ["risky", "Risky"],
  ])("renders badge text '%s' as '%s'", (level, expected) => {
    render(<FitIndicator itemId="item-1" fitResult={makeFitResult({ level })} />)
    expect(screen.getByText(expected)).toBeInTheDocument()
  })

  it.each<[FitLevel, string]>([
    ["great-fit", "text-emerald-500"],
    ["good-fit", "text-green-500"],
    ["trade-off", "text-amber-500"],
    ["poor-fit", "text-orange-500"],
    ["risky", "text-red-500"],
  ])("renders correct color class for level '%s'", (level, expectedClass) => {
    render(<FitIndicator itemId="item-1" fitResult={makeFitResult({ level })} />)
    expect(screen.getByTestId("fit-badge-item-1")).toHaveClass(expectedClass)
  })

  it("does not show explanation by default", () => {
    render(<FitIndicator itemId="item-1" fitResult={makeFitResult()} />)
    expect(screen.queryByTestId("fit-explanation-item-1")).not.toBeInTheDocument()
  })

  it("shows explanation after click", async () => {
    const user = userEvent.setup()
    render(<FitIndicator itemId="item-1" fitResult={makeFitResult()} />)
    await user.click(screen.getByTestId("fit-indicator-item-1"))
    expect(screen.getByTestId("fit-explanation-item-1")).toBeInTheDocument()
  })

  it("hides explanation on second click", async () => {
    const user = userEvent.setup()
    render(<FitIndicator itemId="item-1" fitResult={makeFitResult()} />)
    await user.click(screen.getByTestId("fit-indicator-item-1"))
    expect(screen.getByTestId("fit-explanation-item-1")).toBeInTheDocument()
    await user.click(screen.getByTestId("fit-indicator-item-1"))
    expect(screen.queryByTestId("fit-explanation-item-1")).not.toBeInTheDocument()
  })

  it("shows explanation text when expanded", async () => {
    const user = userEvent.setup()
    const result = makeFitResult({ explanation: "great fit — all dimensions compatible" })
    render(<FitIndicator itemId="item-1" fitResult={result} />)
    await user.click(screen.getByTestId("fit-indicator-item-1"))
    expect(screen.getByText("great fit — all dimensions compatible")).toBeInTheDocument()
  })

  it("shows factor list when expanded", async () => {
    const user = userEvent.setup()
    const result = makeFitResult({
      factors: [
        { dimension: "Access Pattern", compatibility: "positive", detail: "great" },
        { dimension: "Data Size", compatibility: "negative", detail: "poor" },
        { dimension: "Structure Type", compatibility: "neutral", detail: "No data available" },
      ],
    })
    render(<FitIndicator itemId="item-1" fitResult={result} />)
    await user.click(screen.getByTestId("fit-indicator-item-1"))
    expect(screen.getByText("Access Pattern")).toBeInTheDocument()
    expect(screen.getByText("Data Size")).toBeInTheDocument()
    expect(screen.getByText("Structure Type")).toBeInTheDocument()
  })

  it("shows compatibility icons for factors", async () => {
    const user = userEvent.setup()
    const result = makeFitResult({
      factors: [
        { dimension: "Access Pattern", compatibility: "positive", detail: "great" },
        { dimension: "Data Size", compatibility: "negative", detail: "poor" },
        { dimension: "Structure Type", compatibility: "neutral", detail: "neutral" },
      ],
    })
    render(<FitIndicator itemId="item-1" fitResult={result} />)
    await user.click(screen.getByTestId("fit-indicator-item-1"))
    expect(screen.getByTestId("factor-icon-positive-Access Pattern")).toBeInTheDocument()
    expect(screen.getByTestId("factor-icon-negative-Data Size")).toBeInTheDocument()
    expect(screen.getByTestId("factor-icon-neutral-Structure Type")).toBeInTheDocument()
  })

  it("shows empty factors list gracefully", async () => {
    const user = userEvent.setup()
    const result = makeFitResult({ factors: [] })
    render(<FitIndicator itemId="item-1" fitResult={result} />)
    await user.click(screen.getByTestId("fit-indicator-item-1"))
    expect(screen.getByTestId("fit-explanation-item-1")).toBeInTheDocument()
  })
})
