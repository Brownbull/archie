import { getScoreColor } from "@/engine/dashboardCalculator"
import { METRIC_MAX_VALUE, type MetricCategoryId } from "@/lib/constants"
import { getCategoryIcon } from "@/lib/categoryIcons"

interface CategoryBarProps {
  categoryId: MetricCategoryId
  shortName: string
  iconName: string
  categoryColor: string
  score: number
  /** Weight multiplier in [WEIGHT_MIN, WEIGHT_MAX] range (0-1). */
  weight?: number
  onClick?: () => void
}

export function CategoryBar({
  categoryId,
  shortName,
  iconName,
  categoryColor,
  score,
  weight,
  onClick,
}: CategoryBarProps) {
  const widthPercent = Math.max(0, Math.min(100, (score / METRIC_MAX_VALUE) * 100))
  const fillColor = getScoreColor(score)
  const IconComponent = getCategoryIcon(iconName)

  return (
    <div
      data-testid={`category-bar-${categoryId}`}
      role="meter"
      aria-valuenow={score}
      aria-valuemin={0}
      aria-valuemax={METRIC_MAX_VALUE}
      aria-label={shortName}
      className={`flex min-w-[120px] flex-1 flex-col justify-center gap-1 px-2${onClick ? " cursor-pointer rounded hover:bg-muted/50" : ""}`}
      onClick={onClick}
      onKeyDown={onClick ? (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onClick() } } : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      <div className="flex items-center gap-1.5">
        {IconComponent && (
          <IconComponent
            className="h-3.5 w-3.5 shrink-0"
            style={{ color: categoryColor }}
          />
        )}
        <span className="truncate text-xs text-text-secondary">{shortName}</span>
        <span className="ml-auto shrink-0 text-xs font-medium text-text-primary">
          {score.toFixed(1)}
        </span>
        {weight !== undefined && weight !== 1.0 && (
          <span
            data-testid={`weight-badge-${categoryId}`}
            className="shrink-0 rounded bg-primary/15 px-1 text-[10px] font-medium text-primary"
          >
            {weight.toFixed(1)}x
          </span>
        )}
      </div>
      <div className="h-2 w-full rounded-full bg-muted">
        <div
          data-testid={`category-bar-fill-${categoryId}`}
          className={`h-full rounded-full ${fillColor}`}
          style={{
            width: `${widthPercent}%`,
            transition: "width 300ms ease, background-color 300ms ease",
          }}
        />
      </div>
    </div>
  )
}
