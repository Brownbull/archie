import { useState, Component, type ErrorInfo, type ReactNode } from "react"
import { ChevronDown, ChevronRight, Sparkles } from "lucide-react"
import { componentLibrary } from "@/services/componentLibrary"
import { useLibrary } from "@/hooks/useLibrary"
import { useArchitectureStore } from "@/stores/architectureStore"
import { usePreferencesStore } from "@/stores/preferencesStore"
import { maxTypeLevel, levelWithin } from "@/lib/componentTypes"
import { aggregateVariantStats, type AggregatedStats } from "@/lib/aggregateStats"
import { PatternStatsRow } from "@/components/toolbox/PatternStatsRow"
import { hydrateArchitectureSkeleton } from "@/services/yamlImporter"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Skeleton } from "@/components/ui/skeleton"
import { DataSourceNote } from "@/components/common/DataSourceNote"
import { withEntryTrafficSource } from "@/services/trafficSourceInjection"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import type { BlueprintFull } from "@/schemas/blueprintSchema"

/** A blueprint's experience level = the highest level among its skeleton's block types. */
function blueprintLevel(bp: BlueprintFull) {
  return maxTypeLevel(bp.skeleton.nodes.map((n) => componentLibrary.getComponent(n.componentId)?.typeId))
}

/** Default cost · bottleneck throughput · cumulative latency for a blueprint's skeleton nodes. */
function resolveBlueprintStats(bp: BlueprintFull): AggregatedStats {
  return aggregateVariantStats(
    bp.skeleton.nodes.map((n) => {
      const comp = componentLibrary.getComponent(n.componentId)
      const v = comp?.configVariants.find((cv) => cv.id === n.configVariantId) ?? comp?.configVariants[0]
      return { monthlyCost: v?.monthlyCost, maxRPS: v?.maxRPS, baseLatencyMs: v?.baseLatencyMs }
    }),
  )
}

// --- ErrorBoundary ---

interface ErrorBoundaryState {
  hasError: boolean
}

// exported for testing — allows direct unit testing of the error state
export class BlueprintErrorBoundary extends Component<{ children: ReactNode }, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    if (import.meta.env.DEV) {
      console.error("BlueprintTab error:", error, info)
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          data-testid="blueprint-tab-error"
          className="flex items-center justify-center p-6 text-sm text-text-secondary"
        >
          Could not load blueprints. Try refreshing the page.
        </div>
      )
    }
    return this.props.children
  }
}

// --- BlueprintCard ---

interface BlueprintCardProps {
  blueprint: BlueprintFull
  stats: AggregatedStats
  onLoad: (blueprint: BlueprintFull) => void
}

function BlueprintCard({ blueprint, stats, onLoad }: BlueprintCardProps) {
  const nodeCount = blueprint.skeleton.nodes.length
  return (
    <div
      data-testid="blueprint-card"
      className="rounded-md border border-border bg-surface-secondary p-3 space-y-2"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p data-testid="blueprint-card-name" className="text-sm font-medium text-text-primary truncate">{blueprint.name}</p>
          <p data-testid="blueprint-card-description" className="text-xs text-text-secondary line-clamp-2 mt-0.5">{blueprint.description}</p>
        </div>
      </div>

      {/* Default cost · throughput · latency — skim to compare blueprints at a glance. */}
      <PatternStatsRow stats={stats} testId={`blueprint-stats-${blueprint.id}`} />

      <div className="flex items-center justify-between">
        <span className="text-xs text-text-secondary">
          {nodeCount} {nodeCount === 1 ? "component" : "components"}
        </span>
        <Button
          data-testid="blueprint-load-button"
          size="sm"
          variant="outline"
          className="h-6 text-xs"
          onClick={() => onLoad(blueprint)}
        >
          Load
        </Button>
      </div>
    </div>
  )
}

// --- BlueprintTabInner (actual content) ---

function BlueprintTabInner() {
  const { isReady } = useLibrary()
  const [confirmingBlueprint, setConfirmingBlueprint] = useState<BlueprintFull | null>(null)
  const [hydrateError, setHydrateError] = useState<string | null>(null)
  const [advancedOpen, setAdvancedOpen] = useState(false)
  const experienceLevel = usePreferencesStore((s) => s.experienceLevel)
  const loadArchitecture = useArchitectureStore((s) => s.loadArchitecture)
  const nodes = useArchitectureStore((s) => s.nodes)

  if (!isReady) {
    return (
      <div data-testid="blueprint-tab-loading" className="space-y-3 p-3">
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-20 w-full" />
      </div>
    )
  }

  const blueprints = componentLibrary.getAllBlueprints()

  // P92/Phase D: at/below-level blueprints show; above-level ones collapse into a drawer.
  const inLevel = blueprints.filter((bp) => levelWithin(blueprintLevel(bp), experienceLevel))
  const advanced = blueprints.filter((bp) => !levelWithin(blueprintLevel(bp), experienceLevel))
  const advancedExpanded = advancedOpen || inLevel.length === 0

  if (blueprints.length === 0) {
    return (
      <div
        data-testid="blueprint-tab-empty"
        className="flex items-center justify-center p-6 text-sm text-text-secondary"
      >
        No example architectures available
      </div>
    )
  }

  const doLoad = (blueprint: BlueprintFull) => {
    const result = hydrateArchitectureSkeleton(blueprint.skeleton)
    if (result.success) {
      setHydrateError(null)
      // Every blueprint should have an explicit load origin — prepend a default Traffic Source
      // wired to its entry if it doesn't already include one.
      const { nodes, edges } = withEntryTrafficSource(result.architecture.nodes, result.architecture.edges)
      loadArchitecture(nodes, edges)
    } else {
      setHydrateError("Could not load blueprint — some components may not be available.")
      if (import.meta.env.DEV) {
        console.error("Blueprint hydration failed:", result.errors)
      }
    }
  }

  const handleLoad = (blueprint: BlueprintFull) => {
    if (nodes.length > 0) {
      setConfirmingBlueprint(blueprint)
    } else {
      doLoad(blueprint)
    }
  }

  const handleConfirm = () => {
    if (confirmingBlueprint) {
      doLoad(confirmingBlueprint)
      setConfirmingBlueprint(null)
    }
  }

  const handleCancel = () => {
    setConfirmingBlueprint(null)
  }

  return (
    <>
      {hydrateError && (
        <div
          data-testid="blueprint-load-error"
          className="mx-3 mt-2 rounded-md bg-destructive/10 px-3 py-2 text-xs text-destructive"
        >
          {hydrateError}
        </div>
      )}
      <ScrollArea data-testid="blueprint-tab" className="h-full">
        <div className="space-y-3 p-3">
          <DataSourceNote kind="blueprint" />
          {inLevel.map((bp) => (
            <BlueprintCard key={bp.id} blueprint={bp} stats={resolveBlueprintStats(bp)} onLoad={handleLoad} />
          ))}

          {advanced.length > 0 && (
            <div data-testid="advanced-blueprints">
              <button
                type="button"
                data-testid="advanced-blueprints-toggle"
                aria-expanded={advancedExpanded}
                onClick={() => setAdvancedOpen((o) => !o)}
                className="mb-2 flex w-full items-center gap-1.5 rounded px-0.5 py-0.5 hover:bg-surface"
              >
                {advancedExpanded
                  ? <ChevronDown className="h-3 w-3 shrink-0 text-text-secondary" />
                  : <ChevronRight className="h-3 w-3 shrink-0 text-text-secondary" />}
                <Sparkles className="h-3.5 w-3.5 text-text-secondary" />
                <h3 className="text-[0.6875rem] font-semibold uppercase tracking-wider text-text-secondary">
                  More advanced blueprints
                </h3>
                <span className="text-[0.625rem] text-text-secondary">({advanced.length})</span>
              </button>
              {advancedExpanded && (
                <div className="space-y-3">
                  {advanced.map((bp) => (
                    <BlueprintCard key={bp.id} blueprint={bp} stats={resolveBlueprintStats(bp)} onLoad={handleLoad} />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </ScrollArea>

      <Dialog open={confirmingBlueprint !== null} onOpenChange={(open) => { if (!open) handleCancel() }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Replace current architecture?</DialogTitle>
            <DialogDescription>
              Loading a blueprint will replace your current architecture. Continue?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={handleCancel}>
              Cancel
            </Button>
            <Button onClick={handleConfirm}>
              Load
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

// --- Public export (wrapped in ErrorBoundary) ---

export function BlueprintTab() {
  return (
    <BlueprintErrorBoundary>
      <BlueprintTabInner />
    </BlueprintErrorBoundary>
  )
}
