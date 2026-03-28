interface InlineMetricBarProps {
  abbreviation: string
  value: number
  maxValue?: number
  color: string
}

export function InlineMetricBar({ abbreviation, value, maxValue = 10, color }: InlineMetricBarProps) {
  const safeValue = Number.isFinite(value) ? value : 0
  const widthPercent = Math.max(0, Math.min(100, (safeValue / maxValue) * 100))

  return (
    <div data-testid="inline-metric-bar" className="flex items-center gap-1.5 px-3 text-[10px] leading-4">
      <span className="w-8 shrink-0 text-text-secondary font-medium">{abbreviation}</span>
      <div className="relative h-1 flex-1 rounded-full bg-surface-elevated">
        <div
          data-testid="inline-metric-bar-fill"
          className="absolute inset-y-0 left-0 rounded-full"
          style={{ width: `${widthPercent}%`, backgroundColor: color }}
        />
      </div>
      <span className="w-6 shrink-0 text-right text-text-secondary tabular-nums">{safeValue}</span>
    </div>
  )
}
