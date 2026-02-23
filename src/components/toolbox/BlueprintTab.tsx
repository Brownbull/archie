import { useState, Component, type ErrorInfo, type ReactNode } from "react"
import { componentLibrary } from "@/services/componentLibrary"
import { useLibrary } from "@/hooks/useLibrary"
import { useArchitectureStore } from "@/stores/architectureStore"
import { hydrateArchitectureSkeleton } from "@/services/yamlImporter"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import type { BlueprintFull } from "@/schemas/blueprintSchema"

// --- ErrorBoundary ---

interface ErrorBoundaryState {
  hasError: boolean
}

class BlueprintErrorBoundary extends Component<{ children: ReactNode }, ErrorBoundaryState> {
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
  onLoad: (blueprint: BlueprintFull) => void
}

function BlueprintCard({ blueprint, onLoad }: BlueprintCardProps) {
  const nodeCount = blueprint.skeleton.nodes.length
  return (
    <div
      data-testid="blueprint-card"
      className="rounded-md border border-border bg-surface-secondary p-3 space-y-2"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-text-primary truncate">{blueprint.name}</p>
          <p className="text-xs text-text-secondary line-clamp-2 mt-0.5">{blueprint.description}</p>
        </div>
      </div>
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
      loadArchitecture(result.architecture.nodes, result.architecture.edges)
    } else if (import.meta.env.DEV) {
      console.error("Blueprint hydration failed:", result.errors)
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
      <ScrollArea data-testid="blueprint-tab" className="h-full">
        <div className="space-y-3 p-3">
          {blueprints.map((bp) => (
            <BlueprintCard key={bp.id} blueprint={bp} onLoad={handleLoad} />
          ))}
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
