import { useState } from "react"
import { ChevronDown, ChevronUp } from "lucide-react"
import type { MetricValue, MetricExplanation } from "@/types"
import { METRIC_MAX_VALUE } from "@/lib/constants"

function getBarColor(numericValue: number): string {
  if (numericValue >= 7) return "bg-green-500"
  if (numericValue >= 4) return "bg-yellow-500"
  return "bg-red-500"
}

interface MetricBarProps {
  metric: MetricValue
  explanation?: MetricExplanation
}

export function MetricBar({ metric, explanation }: MetricBarProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const clamped = Math.max(0, Math.min(METRIC_MAX_VALUE, metric.numericValue))
  const widthPercent = (clamped / METRIC_MAX_VALUE) * 100
  const barColor = getBarColor(clamped)

  return (
    <div
      className={`py-0.5 ${explanation ? "cursor-pointer" : ""}`}
      data-testid="metric-bar"
      data-metric-id={metric.id}
      onClick={explanation ? () => setIsExpanded((prev) => !prev) : undefined}
    >
      <div className="flex items-center gap-2">
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
        {explanation && (
          isExpanded
            ? <ChevronUp data-testid="metric-explanation-chevron" className="h-3 w-3 shrink-0 text-text-secondary" />
            : <ChevronDown data-testid="metric-explanation-chevron" className="h-3 w-3 shrink-0 text-text-secondary" />
        )}
      </div>
      {isExpanded && explanation && (
        <div data-testid="metric-explanation" className="mt-1 space-y-1 text-xs text-text-secondary">
          <p>{explanation.reason}</p>
          {explanation.contributingFactors.length > 0 && (
            <ul className="list-inside list-disc space-y-0.5">
              {explanation.contributingFactors.map((factor) => (
                <li key={factor}>{factor}</li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
