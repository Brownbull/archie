import { useCallback } from "react"
import { toast } from "sonner"
import { FileText } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useArchitectureStore } from "@/stores/architectureStore"
import { generateArchitectureReport } from "@/services/reportGenerator"
import { downloadMarkdown, sanitizeFilename } from "@/lib/downloadUtils"
import { computeCategoryScores, computeWeightedAggregateScore } from "@/engine/dashboardCalculator"
import { getScenarioPreset } from "@/services/scenarioLoader"
import { getFailurePreset } from "@/services/failureLoader"
import type { ReportData, ReportComponentData, ReportViolation, ReportScenarioComparison } from "@/services/reportGenerator"
import type { RecalculatedMetrics } from "@/engine/recalculator"
import type { HeatmapStatus } from "@/engine/heatmapCalculator"
import type { ConstraintViolation } from "@/engine/constraintEvaluator"
import type { ArchieNode } from "@/stores/architectureStore"
import { METRIC_CATEGORIES } from "@/lib/constants"
import type { WeightProfile } from "@/lib/constants"

/** AC-1: Report requires at least 3 components to be meaningful */
const MIN_COMPONENTS_FOR_REPORT = 3

/**
 * Export Report button — generates a markdown architecture assessment and triggers download.
 * AC-ARCH-PATTERN-3: Collects data from architectureStore + computedMetrics at call time.
 * AC-ARCH-NO-2: Synchronous — no async operations.
 */
export function ExportReportButton() {
  const nodeCount = useArchitectureStore((s) => s.nodes.length)
  const isEmpty = nodeCount < MIN_COMPONENTS_FOR_REPORT

  const handleExport = useCallback(() => {
    const state = useArchitectureStore.getState()

    // Belt-and-suspenders guard (button is already disabled below threshold)
    if (state.nodes.length < MIN_COMPONENTS_FOR_REPORT) return

    try {
      const reportData = collectReportData(state)
      const markdown = generateArchitectureReport(reportData)
      const filename = `${sanitizeFilename(reportData.architectureName)}-report.md`
      downloadMarkdown(markdown, filename)
    } catch (error) {
      const detail = error instanceof Error ? error.message : "Unknown error"
      toast.error("Report generation failed", { description: detail })
    }
  }, [])

  return (
    <Button
      data-testid="export-report-button"
      variant="ghost"
      size="sm"
      onClick={handleExport}
      disabled={isEmpty}
      className="gap-1.5"
    >
      <FileText className="h-3.5 w-3.5" />
      Report
    </Button>
  )
}

// --- Data Collection (private) ---

interface StoreSnapshot {
  nodes: ArchieNode[]
  edges: Array<{ id: string }>
  computedMetrics: Map<string, RecalculatedMetrics>
  heatmapColors: Map<string, HeatmapStatus>
  currentTier: { tierName: string } | null
  weightProfile: WeightProfile
  constraintViolations: ConstraintViolation[]
  constraints: Array<{ id: string; categoryId: string; label: string }>
  activeScenarioId: string | null
  activeFailureScenarioId: string | null
}

function collectReportData(state: StoreSnapshot): ReportData {
  // Resolve scenario names
  const activeScenarioName = state.activeScenarioId
    ? getScenarioPreset(state.activeScenarioId)?.name ?? state.activeScenarioId
    : null
  const activeFailureScenarioName = state.activeFailureScenarioId
    ? getFailurePreset(state.activeFailureScenarioId)?.name ?? state.activeFailureScenarioId
    : null

  // Compute aggregate score
  const categoryScores = computeCategoryScores(state.computedMetrics)
  const overallScore = computeWeightedAggregateScore(categoryScores, state.weightProfile)

  // Shared lookups (built once, used by components + violations)
  const categoryLookup = Object.fromEntries(
    METRIC_CATEGORIES.map((c) => [c.id, c.name]),
  )
  const nodeNameMap = new Map(state.nodes.map((n) => [n.id, n.data.componentName]))

  // Build per-component data
  const components: ReportComponentData[] = state.nodes.map((node) => {
    const nodeMetrics = state.computedMetrics.get(node.id)
    const heatmapStatus = state.heatmapColors.get(node.id) ?? "healthy"

    // Get top 3 metrics by numeric value (descending)
    const sortedMetrics = [...(nodeMetrics?.metrics ?? [])]
      .sort((a, b) => b.numericValue - a.numericValue)
      .slice(0, 3)

    return {
      nodeId: node.id,
      componentName: node.data.componentName,
      category: categoryLookup[node.data.componentCategory] ?? node.data.componentCategory,
      activeVariantId: node.data.activeConfigVariantId,
      overallScore: nodeMetrics?.overallScore ?? 0,
      heatmapStatus,
      topMetrics: sortedMetrics.map((m) => ({
        name: m.name ?? m.id,
        category: categoryLookup[m.category] ?? m.category,
        numericValue: m.numericValue,
      })),
    }
  })

  // Build violation data

  const violations: ReportViolation[] = state.constraintViolations.map((v) => {
    const constraint = state.constraints.find((c) => c.id === v.constraintId)
    return {
      constraintLabel: constraint?.label ?? v.constraintId,
      nodeComponentName: nodeNameMap.get(v.nodeId) ?? v.nodeId,
      categoryName: categoryLookup[v.categoryId] ?? v.categoryId,
      operator: v.operator,
      actualScore: v.actualScore,
      threshold: v.threshold,
    }
  })

  // Build scenario comparison (all components — generator owns sort + slice to top 5)
  const scenarioComparison: ReportScenarioComparison[] =
    (activeScenarioName || activeFailureScenarioName)
      ? components.map((comp) => ({
          componentName: comp.componentName,
          overallScore: comp.overallScore,
          heatmapStatus: comp.heatmapStatus,
        }))
      : []

  return {
    // TODO: read from store when architectureName field is added (future story)
    architectureName: "Archie Architecture",
    componentCount: state.nodes.length,
    connectionCount: state.edges.length,
    tierName: state.currentTier?.tierName ?? null,
    overallScore,
    activeScenarioName,
    activeFailureScenarioName,
    components,
    violations,
    scenarioComparison,
    generatedAt: new Date(),
  }
}
