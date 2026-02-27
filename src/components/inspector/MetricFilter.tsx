import { useState } from "react"
import { ChevronDown, ChevronUp } from "lucide-react"
import { sanitizeDisplayString } from "@/lib/sanitize"

interface MetricFilterProps {
  allMetricIds: Array<{ id: string; name: string }>
  hiddenMetricIds: Set<string>
  onToggleMetric: (metricId: string) => void
}

export function MetricFilter({
  allMetricIds,
  hiddenMetricIds,
  onToggleMetric,
}: MetricFilterProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  return (
    <div data-testid="metric-filter">
      <button
        type="button"
        data-testid="metric-filter-expand"
        className="flex w-full items-center justify-between py-1 text-xs font-medium text-text-secondary hover:text-text-primary"
        onClick={() => setIsExpanded((prev) => !prev)}
      >
        <span>Filter Metrics</span>
        {isExpanded ? (
          <ChevronUp className="h-3 w-3" />
        ) : (
          <ChevronDown className="h-3 w-3" />
        )}
      </button>

      {isExpanded && (
        <div className="space-y-1 pb-2">
          {allMetricIds.map((metric) => (
            <label
              key={metric.id}
              className="flex cursor-pointer items-center gap-1.5 text-xs text-text-secondary hover:text-text-primary"
            >
              <input
                type="checkbox"
                data-testid={`metric-filter-toggle-${metric.id}`}
                className="h-3.5 w-3.5 accent-primary"
                checked={!hiddenMetricIds.has(metric.id)}
                onChange={() => onToggleMetric(metric.id)}
              />
              {sanitizeDisplayString(metric.name, 100)}
            </label>
          ))}
        </div>
      )}
    </div>
  )
}
