import { useState } from "react"
import { Star } from "lucide-react"
import { type MetricCategoryId } from "@/lib/constants"
import { getCategoryIcon } from "@/lib/categoryIcons"
import { scoreToStars, scoreToStarPercent, starColor, METRIC_INFO } from "@/lib/metricStars"
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover"

interface CategoryBarProps {
  categoryId: MetricCategoryId
  shortName: string
  iconName: string
  categoryColor: string
  score: number
  weight?: number
  onClick?: () => void
}

function StarDisplay({ count }: { count: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          className={`h-2.5 w-2.5 ${n <= count ? "fill-current" : ""}`}
          style={{ color: n <= count ? starColor(count) : "#374151" }}
        />
      ))}
    </div>
  )
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
  const stars = scoreToStars(score)
  const widthPercent = scoreToStarPercent(score)
  const color = starColor(stars)
  const IconComponent = getCategoryIcon(iconName)
  const info = METRIC_INFO[categoryId]
  const [popoverOpen, setPopoverOpen] = useState(false)

  const bar = (
    <div
      data-testid={`category-bar-${categoryId}`}
      role="meter"
      aria-valuenow={score}
      aria-valuemin={0}
      aria-valuemax={10}
      aria-label={shortName}
      className="flex min-w-[120px] flex-1 cursor-pointer flex-col justify-center gap-1 rounded px-2 hover:bg-muted/50"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={onClick ? (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onClick() } } : undefined}
    >
      <div className="flex items-center gap-1.5">
        {IconComponent && (
          <IconComponent className="h-3.5 w-3.5 shrink-0" style={{ color: categoryColor }} />
        )}
        <span className="truncate text-xs text-text-secondary">{shortName}</span>
        <span className="ml-auto shrink-0">
          <StarDisplay count={stars} />
        </span>
        {weight !== undefined && weight !== 1.0 && (
          <span
            data-testid={`weight-badge-${categoryId}`}
            className="shrink-0 rounded bg-primary/15 px-1 text-[0.625rem] font-medium text-primary"
          >
            {weight.toFixed(1)}x
          </span>
        )}
      </div>
      <div className="h-1.5 w-full rounded-full bg-muted">
        <div
          data-testid={`category-bar-fill-${categoryId}`}
          className="h-full rounded-full"
          style={{
            width: `${widthPercent}%`,
            backgroundColor: color,
            transition: "width 300ms ease, background-color 300ms ease",
          }}
        />
      </div>
    </div>
  )

  // With an onClick the caller owns the interaction (e.g. the footer deep-links into the overlay's
  // per-component breakdown) — don't ALSO open the generic internal popover. Without one, the bar
  // keeps its self-contained info popover (StackCard et al).
  if (onClick) return bar

  return (
    <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
      <PopoverTrigger asChild>{bar}</PopoverTrigger>
      {info && (
        <PopoverContent side="top" className="w-64 p-3" data-testid={`metric-popover-${categoryId}`}>
          <h4 className="text-sm font-bold text-text-primary">{info.name}</h4>
          <p className="mt-1 text-[0.6875rem] text-text-secondary">{info.description}</p>
          <div className="mt-2 flex items-center gap-1.5">
            <StarDisplay count={stars} />
            <span className="text-xs font-medium" style={{ color }}>{stars}/5</span>
            <span className="text-[0.5625rem] text-text-secondary">({score.toFixed(1)}/10)</span>
          </div>
          <div className="mt-2">
            <span className="text-[0.625rem] font-medium text-text-secondary">What affects this:</span>
            <ul className="mt-0.5 flex flex-col gap-0.5">
              {info.factors.map((f) => (
                <li key={f} className="text-[0.5625rem] text-text-secondary">• {f}</li>
              ))}
            </ul>
          </div>
        </PopoverContent>
      )}
    </Popover>
  )
}
