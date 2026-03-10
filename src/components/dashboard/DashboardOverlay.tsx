import { useMemo, useState } from "react"
import { useShallow } from "zustand/react/shallow"
import { useArchitectureStore } from "@/stores/architectureStore"
import {
  computeCategoryBreakdown,
  getScoreColor,
} from "@/engine/dashboardCalculator"
import { METRIC_MAX_VALUE, type MetricCategoryId } from "@/lib/constants"
import { CATEGORY_LOOKUP } from "@/lib/categoryLookup"
import { getCategoryIcon } from "@/lib/categoryIcons"
import { componentLibrary } from "@/services/componentLibrary"
import { useDashboardWeights } from "@/hooks/useDashboardWeights"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { CategoryInfoPopup } from "@/components/dashboard/CategoryInfoPopup"
import { WeightSliders } from "@/components/dashboard/WeightSliders"
import { ConstraintPanel } from "@/components/dashboard/ConstraintPanel"
import { ChevronDown, AlertTriangle } from "lucide-react"

interface DashboardOverlayProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function DashboardOverlay({ open, onOpenChange }: DashboardOverlayProps) {
  const computedMetrics = useArchitectureStore((s) => s.computedMetrics)
  const nodes = useArchitectureStore(useShallow((s) => s.nodes))
  const {
    categoryScores,
    aggregateScore,
    weightedAggregateScore,
    isNonDefaultWeights,
  } = useDashboardWeights()
  const constraintViolations = useArchitectureStore((s) => s.constraintViolations)
  const constraintCount = useArchitectureStore((s) => s.constraints.length)
  const [infoCategoryId, setInfoCategoryId] = useState<MetricCategoryId | null>(null)
  const [weightsOpen, setWeightsOpen] = useState(false)
  const [constraintsOpen, setConstraintsOpen] = useState(false)

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
              : isNonDefaultWeights
                ? `Weighted: ${weightedAggregateScore.toFixed(1)} | Balanced: ${aggregateScore.toFixed(1)} across ${computedMetrics.size} components`
                : `Aggregate score: ${aggregateScore.toFixed(1)} across ${computedMetrics.size} components`}
          </DialogDescription>
        </DialogHeader>

        <Collapsible open={weightsOpen} onOpenChange={setWeightsOpen}>
          <CollapsibleTrigger
            data-testid="weight-sliders-toggle"
            className="flex w-full items-center justify-between rounded-lg border border-archie-border px-3 py-2 text-sm font-medium hover:bg-muted/30"
          >
            <span className="flex items-center gap-2">
              Priority Weights
              {isNonDefaultWeights && (
                <span
                  data-testid="weight-indicator"
                  className="rounded-full bg-primary/15 px-1.5 py-0.5 text-xs text-primary"
                >
                  Custom
                </span>
              )}
            </span>
            <ChevronDown
              className={`h-4 w-4 transition-transform ${weightsOpen ? "rotate-180" : ""}`}
            />
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-3">
            <WeightSliders />
          </CollapsibleContent>
        </Collapsible>

        <Collapsible open={constraintsOpen} onOpenChange={setConstraintsOpen}>
          <CollapsibleTrigger
            data-testid="constraint-guardrails-toggle"
            className="flex w-full items-center justify-between rounded-lg border border-archie-border px-3 py-2 text-sm font-medium hover:bg-muted/30"
          >
            <span className="flex items-center gap-2">
              Constraint Guardrails
              {constraintViolations.length > 0 && (
                <span
                  data-testid="constraint-violation-indicator"
                  className="flex items-center gap-1 rounded-full bg-red-500/15 px-1.5 py-0.5 text-xs text-red-600"
                >
                  <AlertTriangle className="h-3 w-3" />
                  {constraintViolations.length}
                </span>
              )}
              {constraintCount > 0 && constraintViolations.length === 0 && (
                <span className="rounded-full bg-green-500/15 px-1.5 py-0.5 text-xs text-green-600">
                  All clear
                </span>
              )}
            </span>
            <ChevronDown
              className={`h-4 w-4 transition-transform ${constraintsOpen ? "rotate-180" : ""}`}
            />
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-3">
            <ConstraintPanel onCloseOverlay={() => onOpenChange(false)} />
          </CollapsibleContent>
        </Collapsible>

        {isEmpty ? (
          <p className="py-8 text-center text-sm text-text-secondary">
            Add components to the canvas to see detailed architecture scores.
          </p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {categoryScores.map((cs) => {
              const catMeta = CATEGORY_LOOKUP.get(cs.categoryId)
              if (!catMeta) return null

              const IconComponent = getCategoryIcon(catMeta.iconName)
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
