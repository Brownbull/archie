import { useArchitectureStore } from "@/stores/architectureStore"
import { Z_INDEX } from "@/lib/constants"
import { FileUp, LayoutTemplate, GripVertical } from "lucide-react"

const SUGGESTIONS = [
  { icon: FileUp, label: "Import a YAML file", testId: "suggestion-import" },
  { icon: LayoutTemplate, label: "Try an example from Blueprints", testId: "suggestion-example" },
  { icon: GripVertical, label: "Drag a component from the toolbox", testId: "suggestion-drag" },
] as const

export function EmptyCanvasState() {
  const nodeCount = useArchitectureStore((s) => s.nodes.length)

  if (nodeCount > 0) return null

  return (
    <div
      data-testid="canvas-empty-state"
      className={`pointer-events-none absolute inset-0 ${Z_INDEX.CANVAS_OVERLAY} flex items-center justify-center`}
    >
      <div className="pointer-events-auto rounded-lg border border-archie-border bg-panel/90 p-6 shadow-lg backdrop-blur-sm">
        <h3 className="mb-4 text-center text-sm font-semibold text-text-primary">
          Get started
        </h3>
        <div className="space-y-3">
          {SUGGESTIONS.map((suggestion) => (
            <div
              key={suggestion.testId}
              data-testid={suggestion.testId}
              className="flex items-center gap-3 rounded-md border border-archie-border bg-surface px-4 py-3"
            >
              <suggestion.icon className="h-4 w-4 shrink-0 text-archie-accent" />
              <span className="text-sm text-text-primary">{suggestion.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
