import type { MetricValue, MetricExplanation } from "@/types"
import { CATEGORY_ICONS } from "@/lib/categoryIcons"
import { MetricBar } from "@/components/inspector/MetricBar"

interface MetricCardProps {
  categoryId: string
  categoryLabel: string
  categoryColor: string
  categoryIconName: string
  metrics: MetricValue[]
  metricExplanations?: Record<string, MetricExplanation>
  deltaMap?: Map<string, number>
  hiddenMetricIds?: Set<string>
}

export function MetricCard({
  categoryId,
  categoryLabel,
  categoryColor,
  categoryIconName,
  metrics,
  metricExplanations,
  deltaMap,
  hiddenMetricIds,
}: MetricCardProps) {
  const IconComponent = CATEGORY_ICONS[categoryIconName as keyof typeof CATEGORY_ICONS]
  const visibleMetrics = hiddenMetricIds
    ? metrics.filter((m) => !hiddenMetricIds.has(m.id))
    : metrics

  if (visibleMetrics.length === 0) return null

  return (
    <div
      className="rounded-md border border-archie-border"
      data-testid={`metric-card-${categoryId}`}
    >
      <div
        className="flex items-center gap-1.5 border-b border-archie-border px-2 py-1.5"
        style={{ borderLeftWidth: 3, borderLeftColor: categoryColor }}
      >
        {IconComponent && (
          <IconComponent className="h-3.5 w-3.5 text-text-secondary" />
        )}
        <span className="text-xs font-medium text-text-primary">
          {categoryLabel}
        </span>
      </div>
      <div className="space-y-0.5 px-2 py-1.5">
        {visibleMetrics.map((metric) => (
          <MetricBar
            key={metric.id}
            metric={metric}
            explanation={metricExplanations?.[metric.id]}
            delta={deltaMap?.get(metric.id)}
          />
        ))}
      </div>
    </div>
  )
}
