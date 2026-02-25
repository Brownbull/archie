import { useMemo, useState } from "react"
import { useShallow } from "zustand/react/shallow"
import { useArchitectureStore } from "@/stores/architectureStore"
import {
  computeCategoryScores,
  computeAggregateScore,
  computeCategoryBreakdown,
  getScoreColor,
} from "@/engine/dashboardCalculator"
import { METRIC_CATEGORIES, METRIC_MAX_VALUE } from "@/lib/constants"
import { CATEGORY_ICONS } from "@/lib/categoryIcons"
import { componentLibrary } from "@/services/componentLibrary"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { CategoryInfoPopup } from "@/components/dashboard/CategoryInfoPopup"

interface DashboardOverlayProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function DashboardOverlay({ open, onOpenChange }: DashboardOverlayProps) {
  const computedMetrics = useArchitectureStore((s) => s.computedMetrics)
  const nodes = useArchitectureStore(useShallow((s) => s.nodes))
  const [infoCategoryId, setInfoCategoryId] = useState<string | null>(null)

  const categoryScores = useMemo(
    () => computeCategoryScores(computedMetrics),
    [computedMetrics],
  )

  const aggregateScore = useMemo(
    () => computeAggregateScore(categoryScores),
    [categoryScores],
  )

  const breakdowns = useMemo(
    () =>
      new Map(
        categoryScores.map((cs) => [
          cs.categoryId,
          computeCategoryBreakdown(computedMetrics, cs.categoryId),
        ]),
      ),
    [computedMetrics, categoryScores],
  )

  const isEmpty = computedMetrics.size === 0

  // Build a nodeId → componentName lookup from architecture nodes
  const nodeNameMap = useMemo(() => {
    const map = new Map<string, string>()
    for (const node of nodes) {
      map.set(node.id, node.data.componentName)
    }
    return map
  }, [nodes])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        data-testid="dashboard-overlay"
        className="sm:max-w-4xl max-h-[90vh] overflow-y-auto"
      >
        <DialogHeader>
          <DialogTitle>Architecture Scores</DialogTitle>
          <DialogDescription>
            {isEmpty
              ? "No components on canvas"
              : `Aggregate score: ${aggregateScore.toFixed(1)} across ${computedMetrics.size} components`}
          </DialogDescription>
        </DialogHeader>

        {isEmpty ? (
          <p className="py-8 text-center text-sm text-text-secondary">
            Add components to the canvas to see detailed architecture scores.
          </p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {categoryScores.map((cs) => {
              const catMeta = METRIC_CATEGORIES.find((c) => c.id === cs.categoryId)
              if (!catMeta) return null

              const IconComponent = CATEGORY_ICONS[catMeta.iconName as keyof typeof CATEGORY_ICONS]
              const breakdown = breakdowns.get(cs.categoryId)!
              const fillColor = cs.hasData ? getScoreColor(cs.score) : "bg-muted"
              const widthPercent = cs.hasData
                ? Math.min(100, (cs.score / METRIC_MAX_VALUE) * 100)
                : 0

              return (
                <CategoryInfoPopup
                  key={cs.categoryId}
                  category={componentLibrary.getMetricCategory(cs.categoryId)}
                  score={cs.score}
                  open={infoCategoryId === cs.categoryId}
                  onOpenChange={(popOpen) =>
                    setInfoCategoryId(popOpen ? cs.categoryId : null)
                  }
                >
                  <div
                    data-testid={`overlay-category-${cs.categoryId}`}
                    className="cursor-pointer rounded-lg border border-archie-border p-3 hover:bg-muted/30"
                    onClick={() => setInfoCategoryId(cs.categoryId)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault()
                        setInfoCategoryId(cs.categoryId)
                      }
                    }}
                    tabIndex={0}
                    role="button"
                  >
                    <div className="mb-2 flex items-center gap-2">
                      {IconComponent && (
                        <IconComponent
                          className="h-4 w-4 shrink-0"
                          style={{ color: catMeta.color }}
                        />
                      )}
                      <span className="text-sm font-medium text-text-primary">
                        {catMeta.name}
                      </span>
                      <span className="ml-auto text-sm font-semibold text-text-primary">
                        {cs.hasData ? cs.score.toFixed(1) : "—"}
                      </span>
                    </div>

                    {/* Score bar */}
                    <div className="mb-2 h-2 w-full rounded-full bg-muted">
                      <div
                        className={`h-full rounded-full ${fillColor}`}
                        style={{
                          width: `${widthPercent}%`,
                          transition: "width 300ms ease",
                        }}
                      />
                    </div>

                    {/* Component count */}
                    <p className="mb-1 text-xs text-text-secondary">
                      {breakdown.totalComponents} component{breakdown.totalComponents !== 1 ? "s" : ""}
                    </p>

                    {/* Breakdown: best & worst */}
                    {breakdown.totalComponents > 0 && (
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <p className="mb-0.5 font-medium text-green-600">Best</p>
                          {breakdown.best.map((b) => (
                            <p key={b.nodeId} className="truncate text-text-secondary">
                              {nodeNameMap.get(b.nodeId) ?? b.nodeId}: {b.averageScore.toFixed(1)}
                            </p>
                          ))}
                        </div>
                        <div>
                          <p className="mb-0.5 font-medium text-red-600">Worst</p>
                          {breakdown.worst.map((w) => (
                            <p key={w.nodeId} className="truncate text-text-secondary">
                              {nodeNameMap.get(w.nodeId) ?? w.nodeId}: {w.averageScore.toFixed(1)}
                            </p>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </CategoryInfoPopup>
              )
            })}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
