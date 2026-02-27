import type { MetricCategory } from "@/schemas/metricCategorySchema"
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover"

interface CategoryInfoPopupProps {
  category: MetricCategory | undefined
  score: number
  open: boolean
  onOpenChange: (open: boolean) => void
  children: React.ReactNode
}

function getScoreInterpretation(
  category: MetricCategory,
  score: number,
): string | undefined {
  const clamped = Math.max(0, Math.min(10, score))
  return category.scoreInterpretations.find(
    (si) => clamped >= si.minScore && clamped <= si.maxScore,
  )?.text
}

export function CategoryInfoPopup({
  category,
  score,
  open,
  onOpenChange,
  children,
}: CategoryInfoPopupProps) {
  if (!category) return <>{children}</>

  const interpretation = getScoreInterpretation(category, score)

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent
        data-testid="category-info-popup"
        side="top"
        className="w-80"
      >
        <div className="space-y-2">
          <h4 className="text-sm font-semibold text-text-primary">
            {category.name}
          </h4>
          <p className="text-xs text-text-secondary">{category.description}</p>
          <div className="border-t border-archie-border pt-2">
            <p className="text-xs font-medium text-text-primary">
              Why it matters
            </p>
            <p className="text-xs text-text-secondary">
              {category.whyItMatters}
            </p>
          </div>
          {interpretation && (
            <div className="border-t border-archie-border pt-2">
              <p className="text-xs font-medium text-text-primary">
                Your score: {score.toFixed(1)}
              </p>
              <p className="text-xs text-text-secondary">{interpretation}</p>
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}
