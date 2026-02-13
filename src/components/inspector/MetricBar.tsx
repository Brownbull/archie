import type { MetricValue } from "@/types"
import { METRIC_MAX_VALUE } from "@/lib/constants"

function getBarColor(numericValue: number): string {
  if (numericValue >= 7) return "bg-green-500"
  if (numericValue >= 4) return "bg-yellow-500"
  return "bg-red-500"
}

interface MetricBarProps {
  metric: MetricValue
}

export function MetricBar({ metric }: MetricBarProps) {
  const clamped = Math.max(0, Math.min(METRIC_MAX_VALUE, metric.numericValue))
  const widthPercent = (clamped / METRIC_MAX_VALUE) * 100
  const barColor = getBarColor(clamped)

  return (
    <div
      className="flex items-center gap-2 py-0.5"
      data-testid="metric-bar"
      data-metric-id={metric.id}
    >
      <span className="w-28 shrink-0 truncate text-xs text-text-secondary">
        {metric.name ?? metric.id}
      </span>
      <div className="h-2 flex-1 rounded-full bg-muted">
        <div
          data-testid="metric-bar-fill"
          className={`h-full rounded-full ${barColor}`}
          style={{ width: `${widthPercent}%` }}
        />
      </div>
      <span className="w-12 shrink-0 text-right text-xs text-text-secondary">
        {metric.value}
      </span>
    </div>
  )
}
