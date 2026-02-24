import type { VariantRecommendation as RecommendationData } from "@/engine/recommendationEngine"

interface VariantRecommendationProps {
  recommendation: RecommendationData
}

export function VariantRecommendation({
  recommendation,
}: VariantRecommendationProps) {
  const hasTradeCost =
    recommendation.tradeCostDelta < 0 &&
    recommendation.tradeCostMetricId !== "" &&
    recommendation.tradeCostMetricName !== ""

  return (
    <div
      data-testid="variant-recommendation"
      className="rounded-md border border-archie-border bg-surface-secondary p-2"
    >
      <p className="text-xs font-medium text-text-primary">
        Consider <span className="font-semibold">{recommendation.improvedVariantName}</span>
      </p>
      <div className="mt-1 flex items-center gap-3 text-xs">
        <span
          data-testid="recommendation-improvement"
          className="text-green-500"
        >
          {recommendation.weakMetricName} +{recommendation.improvementDelta}
        </span>
        {hasTradeCost && (
          <span
            data-testid="recommendation-tradeoff"
            className="text-red-500"
          >
            {recommendation.tradeCostMetricName} {recommendation.tradeCostDelta}
          </span>
        )}
      </div>
    </div>
  )
}
