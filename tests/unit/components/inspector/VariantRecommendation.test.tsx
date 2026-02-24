import { render, screen } from "@testing-library/react"
import { describe, it, expect } from "vitest"
import { VariantRecommendation } from "@/components/inspector/VariantRecommendation"
import type { VariantRecommendation as RecommendationData } from "@/engine/recommendationEngine"

const baseRecommendation: RecommendationData = {
  weakMetricId: "perf",
  weakMetricName: "Performance",
  improvedVariantId: "v2",
  improvedVariantName: "High Performance",
  improvementDelta: 4,
  tradeCostMetricId: "scale",
  tradeCostMetricName: "Scalability",
  tradeCostDelta: -2,
}

describe("VariantRecommendation", () => {
  function renderDefault(rec: RecommendationData = baseRecommendation) {
    return render(<VariantRecommendation recommendation={rec} />)
  }

  it("renders with correct data-testid", () => {
    renderDefault()
    expect(screen.getByTestId("variant-recommendation")).toBeInTheDocument()
  })

  it("renders the variant name in the recommendation", () => {
    renderDefault()
    expect(screen.getByText(/High Performance/)).toBeInTheDocument()
  })

  it("shows improvement amount with positive indicator", () => {
    renderDefault()
    const improvement = screen.getByTestId("recommendation-improvement")
    expect(improvement).toHaveTextContent("+4")
  })

  it("displays the weak metric name in the improvement", () => {
    renderDefault()
    const improvement = screen.getByTestId("recommendation-improvement")
    expect(improvement).toHaveTextContent("Performance")
  })

  it("shows trade-off cost with negative indicator", () => {
    renderDefault()
    const tradeoff = screen.getByTestId("recommendation-tradeoff")
    expect(tradeoff).toHaveTextContent("-2")
  })

  it("displays the trade-off metric name", () => {
    renderDefault()
    const tradeoff = screen.getByTestId("recommendation-tradeoff")
    expect(tradeoff).toHaveTextContent("Scalability")
  })

  it("hides trade-off section when tradeCostDelta is 0", () => {
    renderDefault({
      ...baseRecommendation,
      tradeCostDelta: 0,
      tradeCostMetricId: "",
      tradeCostMetricName: "",
    })
    expect(screen.queryByTestId("recommendation-tradeoff")).not.toBeInTheDocument()
  })

  it("hides trade-off section when tradeCostMetricId is empty", () => {
    renderDefault({
      ...baseRecommendation,
      tradeCostDelta: -1,
      tradeCostMetricId: "",
      tradeCostMetricName: "",
    })
    expect(screen.queryByTestId("recommendation-tradeoff")).not.toBeInTheDocument()
  })

  it("renders the 'Consider' framing text per AC-FUNC-1", () => {
    renderDefault()
    expect(screen.getByText(/^Consider/)).toBeInTheDocument()
  })
})
