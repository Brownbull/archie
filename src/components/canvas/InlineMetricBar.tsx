import { Star } from "lucide-react"
import { METRIC_MAX_VALUE, METRIC_BAR_TRANSITION_MS } from "@/lib/constants"
import { usePreferencesStore } from "@/stores/preferencesStore"
import { scoreToStars, scoreToStarPercent, starColor } from "@/lib/metricStars"

interface InlineMetricBarProps {
  abbreviation: string
  value: number
  maxValue?: number
  color: string
}

export function InlineMetricBar({ abbreviation, value, maxValue = METRIC_MAX_VALUE }: InlineMetricBarProps) {
  const animationsEnabled = usePreferencesStore((s) => s.animationsEnabled)
  const safeValue = Number.isFinite(value) ? value : 0
  const stars = scoreToStars(safeValue)
  const widthPercent = scoreToStarPercent(safeValue)
  const color = starColor(stars)

  return (
    <div data-testid="inline-metric-bar" className="flex items-center gap-1.5 px-3 text-[0.625rem] leading-4">
      <span className="w-8 shrink-0 font-medium text-text-secondary">{abbreviation}</span>
      <div
        role="meter"
        aria-valuenow={safeValue}
        aria-valuemin={0}
        aria-valuemax={maxValue}
        aria-label={`${abbreviation}: ${stars}/5`}
        className="relative h-1 flex-1 rounded-full bg-surface-elevated"
      >
        <div
          data-testid="inline-metric-bar-fill"
          className="absolute inset-y-0 left-0 rounded-full"
          style={{
            width: `${widthPercent}%`,
            backgroundColor: color,
            transition: animationsEnabled ? `width ${METRIC_BAR_TRANSITION_MS}ms ease-out` : "none",
          }}
        />
      </div>
      <div className="flex gap-px">
        {[1, 2, 3, 4, 5].map((n) => (
          <Star
            key={n}
            className={`h-2 w-2 ${n <= stars ? "fill-current" : ""}`}
            style={{ color: n <= stars ? color : "#374151" }}
          />
        ))}
      </div>
    </div>
  )
}
