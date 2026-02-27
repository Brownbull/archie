import { useMemo, useState } from "react"
import { useArchitectureStore } from "@/stores/architectureStore"
import {
  computeCategoryScores,
  computeAggregateScore,
} from "@/engine/dashboardCalculator"
import { METRIC_CATEGORIES } from "@/lib/constants"
import { componentLibrary } from "@/services/componentLibrary"
import { AggregateScore } from "@/components/dashboard/AggregateScore"
import { CategoryBar } from "@/components/dashboard/CategoryBar"
import { CategoryInfoPopup } from "@/components/dashboard/CategoryInfoPopup"
import { DashboardOverlay } from "@/components/dashboard/DashboardOverlay"
import { TierBadge } from "@/components/dashboard/TierBadge"
import { Button } from "@/components/ui/button"
import { Maximize2 } from "lucide-react"

/** Lookup from categoryId to METRIC_CATEGORIES entry for icon/color/shortName. */
const CATEGORY_LOOKUP = new Map<string, (typeof METRIC_CATEGORIES)[number]>(
  METRIC_CATEGORIES.map((cat) => [cat.id, cat]),
)

export function DashboardPanel() {
  const computedMetrics = useArchitectureStore((s) => s.computedMetrics)

  // AC-ARCH-NO-1: scores MUST be computed inside useMemo, not in render body
  const categoryScores = useMemo(
    () => computeCategoryScores(computedMetrics),
    [computedMetrics],
  )

  const aggregateScore = useMemo(
    () => computeAggregateScore(categoryScores),
    [categoryScores],
  )

  // AC-ARCH-PATTERN-7: only render categories with data
  const categoriesWithData = useMemo(
    () => categoryScores.filter((cs) => cs.hasData),
    [categoryScores],
  )

  const [infoCategoryId, setInfoCategoryId] = useState<string | null>(null)
  const [isOverlayOpen, setIsOverlayOpen] = useState(false)

  const isEmpty = computedMetrics.size === 0

  return (
    <div
      data-testid="dashboard-panel"
      role="region"
      aria-label="Architecture scoring dashboard"
      className="flex h-full items-center"
    >
      <TierBadge />

      <div className="self-stretch border-r border-archie-border" />

      {isEmpty ? (
        <p className="w-full text-center text-sm text-text-secondary">
          Add components to see architecture scores
        </p>
      ) : (
        <>
          <AggregateScore score={aggregateScore} />

          <div className="self-stretch border-r border-archie-border" />

          <div className="flex flex-1 items-center overflow-x-auto px-2">
            {categoriesWithData.map((cs) => {
              const catMeta = CATEGORY_LOOKUP.get(cs.categoryId)
              if (!catMeta) return null

              return (
                <CategoryInfoPopup
                  key={cs.categoryId}
                  category={componentLibrary.getMetricCategory(cs.categoryId)}
                  score={cs.score}
                  open={infoCategoryId === cs.categoryId}
                  onOpenChange={(open) =>
                    setInfoCategoryId(open ? cs.categoryId : null)
                  }
                >
                  <CategoryBar
                    categoryId={cs.categoryId}
                    shortName={catMeta.shortName}
                    iconName={catMeta.iconName}
                    categoryColor={catMeta.color}
                    score={cs.score}
                    onClick={() => setInfoCategoryId(cs.categoryId)}
                  />
                </CategoryInfoPopup>
              )
            })}
          </div>

          <div className="self-stretch border-r border-archie-border" />

          <Button
            data-testid="dashboard-expand-button"
            variant="ghost"
            size="sm"
            className="mx-1 shrink-0"
            onClick={() => setIsOverlayOpen(true)}
            aria-label="Expand dashboard"
          >
            <Maximize2 className="h-3.5 w-3.5" />
          </Button>
        </>
      )}

      <DashboardOverlay open={isOverlayOpen} onOpenChange={setIsOverlayOpen} />
    </div>
  )
}
