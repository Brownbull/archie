import { METRIC_MAX_VALUE } from "@/lib/constants"

interface InlineMetricBarProps {
  abbreviation: string
  value: number
  maxValue?: number
  color: string
}

export function InlineMetricBar({ abbreviation, value, maxValue = METRIC_MAX_VALUE, color }: InlineMetricBarProps) {
  const safeValue = Number.isFinite(value) ? value : 0
  const safeMax = maxValue > 0 ? maxValue : METRIC_MAX_VALUE
  const widthPercent = Math.max(0, Math.min(100, (safeValue / safeMax) * 100))
  const displayValue = safeValue.toFixed(1)

  return (
    <div data-testid="inline-metric-bar" className="flex items-center gap-1.5 px-3 text-[10px] leading-4">
      <span className="w-8 shrink-0 text-text-secondary font-medium">{abbreviation}</span>
      <div
        role="meter"
        aria-valuenow={safeValue}
        aria-valuemin={0}
        aria-valuemax={safeMax}
        aria-label={`${abbreviation}: ${displayValue}`}
        className="relative h-1 flex-1 rounded-full bg-surface-elevated"
      >
        <div
          data-testid="inline-metric-bar-fill"
          className="absolute inset-y-0 left-0 rounded-full"
          style={{ width: `${widthPercent}%`, backgroundColor: color }}
        />
      </div>
      <span className="w-6 shrink-0 text-right text-text-secondary tabular-nums">{displayValue}</span>
    </div>
  )
}
