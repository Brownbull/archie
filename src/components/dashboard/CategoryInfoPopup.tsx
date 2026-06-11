import type { MetricCategory } from "@/schemas/metricCategorySchema"
import { biggestLever, type CategoryContributor } from "@/lib/categoryContributors"
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover"

interface CategoryInfoPopupProps {
  category: MetricCategory | undefined
  score: number
  /** The trace (Plan-2 P4, D99): which nodes feed this score, worst first. Optional — callers
   *  without canvas context (docs surfaces) omit it and get the classic explainer popup. */
  contributors?: CategoryContributor[]
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
  contributors,
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
          {contributors && contributors.length > 0 && (() => {
            const shown = contributors.slice(0, 4)
            const lever = biggestLever(contributors)
            return (
              <div data-testid="category-trace" className="border-t border-archie-border pt-2">
                <p className="text-xs font-medium text-text-primary">Where it comes from</p>
                <div className="mt-1 space-y-0.5">
                  {shown.map((c) => (
                    <div key={c.nodeId} data-testid={`trace-row-${c.nodeId}`} className="flex items-baseline justify-between gap-2 text-[0.6875rem]">
                      <span className="truncate text-text-primary">{c.name}</span>
                      <span className="shrink-0 text-text-secondary">
                        {c.subScore.toFixed(1)} · dragged by {c.worstMetricId} ({c.worstMetricValue})
                      </span>
                    </div>
                  ))}
                  {contributors.length > shown.length && (
                    <p className="text-[0.625rem] text-text-secondary">… and {contributors.length - shown.length} more</p>
                  )}
                </div>
                {lever && (
                  <p data-testid="category-lever" className="mt-1.5 text-[0.6875rem] text-text-secondary">
                    Biggest lever: <span className="font-medium text-text-primary">{lever.worstMetricId}</span> on{" "}
                    <span className="font-medium text-text-primary">{lever.name}</span> — a higher tier or different
                    vendor there moves this score most.
                  </p>
                )}
              </div>
            )
          })()}
        </div>
      </PopoverContent>
    </Popover>
  )
}
