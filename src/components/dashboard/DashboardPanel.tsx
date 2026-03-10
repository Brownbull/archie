import { useMemo, useState } from "react"
import { useArchitectureStore } from "@/stores/architectureStore"
import { type MetricCategoryId } from "@/lib/constants"
import { CATEGORY_LOOKUP } from "@/lib/categoryLookup"
import { componentLibrary } from "@/services/componentLibrary"
import { useDashboardWeights } from "@/hooks/useDashboardWeights"
import { AggregateScore } from "@/components/dashboard/AggregateScore"
import { CategoryBar } from "@/components/dashboard/CategoryBar"
import { CategoryInfoPopup } from "@/components/dashboard/CategoryInfoPopup"
import { DashboardOverlay } from "@/components/dashboard/DashboardOverlay"
import { TierBadge } from "@/components/dashboard/TierBadge"
import { Button } from "@/components/ui/button"
import { AlertTriangle, Maximize2 } from "lucide-react"

export function DashboardPanel() {
  const computedMetrics = useArchitectureStore((s) => s.computedMetrics)
  const constraintViolationCount = useArchitectureStore((s) => s.constraintViolations).length
  const {
    categoryScores,
    aggregateScore,
    weightedAggregateScore,
    isNonDefaultWeights,
    weightProfile,
  } = useDashboardWeights()

  // AC-ARCH-PATTERN-7: only render categories with data
  const categoriesWithData = useMemo(
    () => categoryScores.filter((cs) => cs.hasData),
    [categoryScores],
  )

  const [infoCategoryId, setInfoCategoryId] = useState<MetricCategoryId | null>(null)
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
          <AggregateScore
            score={weightedAggregateScore}
            balancedScore={isNonDefaultWeights ? aggregateScore : undefined}
          />

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
                    weight={weightProfile[cs.categoryId]}
                    onClick={() => setInfoCategoryId(cs.categoryId)}
                  />
                </CategoryInfoPopup>
              )
            })}
          </div>

          <div className="self-stretch border-r border-archie-border" />

          {constraintViolationCount > 0 && (
            <span
              data-testid="constraint-status-badge"
              className="mx-1 flex shrink-0 items-center gap-1 rounded-full bg-red-500/15 px-1.5 py-0.5 text-xs font-medium text-red-600"
              title={`${constraintViolationCount} constraint violation${constraintViolationCount !== 1 ? "s" : ""}`}
            >
              <AlertTriangle className="h-3 w-3" />
              {constraintViolationCount}
            </span>
          )}

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
