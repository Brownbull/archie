import type { MetricValue } from "@/types"
import { CATEGORY_ICONS } from "@/lib/categoryIcons"
import { MetricBar } from "@/components/inspector/MetricBar"

interface MetricCardProps {
  categoryId: string
  categoryLabel: string
  categoryColor: string
  categoryIconName: string
  metrics: MetricValue[]
}

export function MetricCard({
  categoryId,
  categoryLabel,
  categoryColor,
  categoryIconName,
  metrics,
}: MetricCardProps) {
  const IconComponent = CATEGORY_ICONS[categoryIconName as keyof typeof CATEGORY_ICONS]

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
        {metrics.map((metric) => (
          <MetricBar key={metric.id} metric={metric} />
        ))}
      </div>
    </div>
  )
}
