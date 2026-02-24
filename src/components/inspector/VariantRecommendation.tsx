import type { VariantRecommendation as RecommendationData } from "@/engine/recommendationEngine"
import { sanitizeDisplayString } from "@/lib/sanitize"

interface VariantRecommendationProps {
  recommendation: RecommendationData
}

export function VariantRecommendation({
  recommendation,
}: VariantRecommendationProps) {
  // Zero delta means no visible cost; negative delta means a real trade-off
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
        Consider <span className="font-semibold">{sanitizeDisplayString(recommendation.improvedVariantName, 100)}</span>
      </p>
      <div className="mt-1 flex items-center gap-3 text-xs">
        <span
          data-testid="recommendation-improvement"
          className="text-green-500"
        >
          {sanitizeDisplayString(recommendation.weakMetricName, 100)} +{Math.round(recommendation.improvementDelta)}
        </span>
        {hasTradeCost && (
          <span
            data-testid="recommendation-tradeoff"
            className="text-red-500"
          >
            {sanitizeDisplayString(recommendation.tradeCostMetricName, 100)} {Math.round(recommendation.tradeCostDelta)}
          </span>
        )}
      </div>
    </div>
  )
}
