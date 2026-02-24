import type { Component } from "@/schemas/componentSchema"
import type { MetricValue } from "@/schemas/metricSchema"
import { RECOMMENDATION_THRESHOLD } from "@/lib/constants"

// --- Types ---

export interface VariantRecommendation {
  weakMetricId: string
  weakMetricName: string
  improvedVariantId: string
  improvedVariantName: string
  improvementDelta: number
  tradeCostMetricId: string
  tradeCostMetricName: string
  tradeCostDelta: number
}

// --- Pure Functions ---

/**
 * Computes variant recommendations for a component based on metrics below
 * RECOMMENDATION_THRESHOLD. For each weak metric, identifies the other variant
 * that offers the best improvement and captures the worst trade-off cost.
 *
 * Returns one recommendation per unique weak metric.
 * Pure function — no React hooks, no Zustand, no Firestore.
 */
export function computeRecommendations(
  component: Component,
  activeVariantId: string,
): VariantRecommendation[] {
  if (component.configVariants.length < 2) return []

  const activeVariant = component.configVariants.find(
    (v) => v.id === activeVariantId,
  )
  if (!activeVariant) return []

  const weakMetrics = activeVariant.metrics.filter(
    (m) => m.numericValue < RECOMMENDATION_THRESHOLD,
  )
  if (weakMetrics.length === 0) return []

  const otherVariants = component.configVariants.filter(
    (v) => v.id !== activeVariantId,
  )

  const recommendations: VariantRecommendation[] = []

  for (const weakMetric of weakMetrics) {
    let bestRec: VariantRecommendation | null = null

    for (const candidate of otherVariants) {
      const candidateMetricMap = new Map<string, MetricValue>(
        candidate.metrics.map((m) => [m.id, m]),
      )

      const candidateWeak = candidateMetricMap.get(weakMetric.id)
      if (
        !candidateWeak ||
        candidateWeak.numericValue <= weakMetric.numericValue
      ) {
        continue
      }

      const improvementDelta =
        candidateWeak.numericValue - weakMetric.numericValue

      // Find the metric with the worst regression (trade-off cost)
      let worstTradeMetric: MetricValue | null = null
      let worstTradeDelta = 0

      for (const activeMetric of activeVariant.metrics) {
        if (activeMetric.id === weakMetric.id) continue
        const candidateOther = candidateMetricMap.get(activeMetric.id)
        if (!candidateOther) continue
        const delta = candidateOther.numericValue - activeMetric.numericValue
        if (delta < worstTradeDelta) {
          worstTradeDelta = delta
          worstTradeMetric = activeMetric
        }
      }

      const rec: VariantRecommendation = {
        weakMetricId: weakMetric.id,
        weakMetricName: weakMetric.name ?? weakMetric.id,
        improvedVariantId: candidate.id,
        improvedVariantName: candidate.name,
        improvementDelta,
        tradeCostMetricId: worstTradeMetric?.id ?? "",
        tradeCostMetricName:
          worstTradeMetric?.name ?? worstTradeMetric?.id ?? "",
        tradeCostDelta: worstTradeDelta,
      }

      if (!bestRec || improvementDelta > bestRec.improvementDelta) {
        bestRec = rec
      }
    }

    if (bestRec) {
      recommendations.push(bestRec)
    }
  }

  return recommendations
}
