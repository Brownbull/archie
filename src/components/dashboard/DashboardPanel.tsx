import { useCallback, useMemo, useState } from "react"
import { useArchitectureStore } from "@/stores/architectureStore"
import { type MetricCategoryId } from "@/lib/constants"
import { CATEGORY_LOOKUP } from "@/lib/categoryLookup"
import { useDashboardWeights } from "@/hooks/useDashboardWeights"
import { computeTotalArchitectureCost } from "@/stores/architectureStoreHelpers"
import { AggregateScore } from "@/components/dashboard/AggregateScore"
import { BudgetHud } from "@/components/dashboard/BudgetHud"
import { CategoryBar } from "@/components/dashboard/CategoryBar"
import { DashboardOverlay } from "@/components/dashboard/DashboardOverlay"
import { TierBadge } from "@/components/dashboard/TierBadge"
import { Button } from "@/components/ui/button"
import { AlertTriangle, Maximize2 } from "lucide-react"

export function DashboardPanel() {
  const nodes = useArchitectureStore((s) => s.nodes)
  const edges = useArchitectureStore((s) => s.edges)
  const computedMetrics = useArchitectureStore((s) => s.computedMetrics)
  const constraintViolationCount = useArchitectureStore((s) => s.constraintViolations).length
  // D74: on-path cost — a placed-then-disconnected block shouldn't inflate the preview budget either.
  const totalCost = useMemo(() => computeTotalArchitectureCost(nodes, edges), [nodes, edges])
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

  // Fluidity P2 (D80): the footer shows only the WEAKEST category inline — the single most actionable
  // "where to improve next" signal — instead of cramming all 7 bars into a 100px strip. The full
  // per-category breakdown lives one click away in the expand overlay.
  const weakest = useMemo(() => {
    if (categoriesWithData.length === 0) return null
    const lowest = categoriesWithData.reduce((min, cs) => (cs.score < min.score ? cs : min), categoriesWithData[0])
    const meta = CATEGORY_LOOKUP.get(lowest.categoryId)
    return meta ? { cs: lowest, meta } : null
  }, [categoriesWithData])

  const [isOverlayOpen, setIsOverlayOpen] = useState(false)
  const [overlayInitialSection, setOverlayInitialSection] = useState<"pathway" | null>(null)
  // Deep-link target for the overlay's per-category breakdown (P1/T4): clicking the weakest bar in
  // the footer opens the overlay scrolled to that category with its info popup open — the trace the
  // footer itself can't carry.
  const [overlayInitialCategory, setOverlayInitialCategory] = useState<MetricCategoryId | null>(null)

  const handleOpenPathway = useCallback(() => {
    setOverlayInitialSection("pathway")
    setIsOverlayOpen(true)
  }, [])

  const handleOpenCategory = useCallback((categoryId: MetricCategoryId) => {
    setOverlayInitialCategory(categoryId)
    setIsOverlayOpen(true)
  }, [])

  const handleOverlayOpenChange = useCallback((o: boolean) => {
    setIsOverlayOpen(o)
    if (!o) {
      setOverlayInitialSection(null)
      setOverlayInitialCategory(null)
    }
  }, [])

  const isEmpty = computedMetrics.size === 0

  return (
    <div
      data-testid="dashboard-panel"
      role="region"
      aria-label="Architecture scoring dashboard"
      className="flex h-full items-center"
    >
      <TierBadge onOpenPathway={handleOpenPathway} />

      <BudgetHud totalCost={totalCost} nodeCount={nodes.length} />

      <div className="self-stretch border-r border-archie-border" />

      {isEmpty ? (
        <p className="w-full text-center text-sm text-text-secondary">
          Add components to see architecture scores
        </p>
      ) : (
        <>
          {/* Clicking the score opens the full breakdown — the footer's most prominent element was inert. */}
          <button
            type="button"
            data-testid="aggregate-score-button"
            className="shrink-0 rounded hover:bg-muted/50"
            onClick={() => setIsOverlayOpen(true)}
            aria-label="Open the full score breakdown"
          >
            <AggregateScore
              score={weightedAggregateScore}
              balancedScore={isNonDefaultWeights ? aggregateScore : undefined}
            />
          </button>

          <div className="self-stretch border-r border-archie-border" />

          <div data-testid="dashboard-weakest" className="flex flex-1 items-center gap-1.5 overflow-hidden px-2">
            {weakest && (
              <>
                <span className="shrink-0 text-[0.625rem] font-medium uppercase tracking-wide text-text-secondary/70">
                  Weakest
                </span>
                <CategoryBar
                  categoryId={weakest.cs.categoryId}
                  shortName={weakest.meta.shortName}
                  iconName={weakest.meta.iconName}
                  categoryColor={weakest.meta.color}
                  score={weakest.cs.score}
                  weight={weightProfile[weakest.cs.categoryId]}
                  onClick={() => handleOpenCategory(weakest.cs.categoryId)}
                />
              </>
            )}
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

          {/* The "more" affordance (D80): opens the full per-category breakdown overlay. Labeled with the
              category count so it's clear the rest of the scores live behind it. */}
          <Button
            data-testid="dashboard-expand-button"
            variant="ghost"
            size="sm"
            className="mx-1 shrink-0 gap-1 text-xs"
            onClick={() => setIsOverlayOpen(true)}
            aria-label="Open the full score breakdown"
          >
            <Maximize2 className="h-3.5 w-3.5" />
            All {categoriesWithData.length}
          </Button>
        </>
      )}

      <DashboardOverlay
        open={isOverlayOpen}
        onOpenChange={handleOverlayOpenChange}
        initialSection={overlayInitialSection}
        initialCategory={overlayInitialCategory}
      />
    </div>
  )
}
