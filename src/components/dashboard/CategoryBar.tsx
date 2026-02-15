import { getScoreColor } from "@/engine/dashboardCalculator"
import { METRIC_MAX_VALUE } from "@/lib/constants"
import { CATEGORY_ICONS } from "@/lib/categoryIcons"

interface CategoryBarProps {
  categoryId: string
  shortName: string
  iconName: string
  categoryColor: string
  score: number
}

export function CategoryBar({
  categoryId,
  shortName,
  iconName,
  categoryColor,
  score,
}: CategoryBarProps) {
  const widthPercent = Math.min(100, (score / METRIC_MAX_VALUE) * 100)
  const fillColor = getScoreColor(score)
  const IconComponent = CATEGORY_ICONS[iconName as keyof typeof CATEGORY_ICONS]

  return (
    <div
      data-testid={`category-bar-${categoryId}`}
      role="meter"
      aria-valuenow={score}
      aria-valuemin={0}
      aria-valuemax={METRIC_MAX_VALUE}
      className="flex min-w-[120px] flex-1 flex-col justify-center gap-1 px-2"
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
