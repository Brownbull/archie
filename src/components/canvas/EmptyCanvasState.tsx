import { useArchitectureStore } from "@/stores/architectureStore"
import { useUiStore } from "@/stores/uiStore"
import { usePreferencesStore } from "@/stores/preferencesStore"
import { useImportAction } from "@/components/import-export/ImportDialog"
import { FirstRunFork } from "@/components/canvas/FirstRunFork"
import { Z_INDEX } from "@/lib/constants"
import { FileUp, LayoutTemplate, Layers, GripVertical, Trophy } from "lucide-react"

type StartAction = "import" | "blueprints" | "stacks" | "components" | "challenge"

const SUGGESTIONS: ReadonlyArray<{
  icon: typeof FileUp
  label: string
  testId: string
  action: StartAction
  /** S1c (Kane QA): the beginner-friendliest path — visually emphasized as the recommended start. */
  primary?: boolean
}> = [
  { icon: LayoutTemplate, label: "Start from a Blueprint", testId: "suggestion-blueprints", action: "blueprints", primary: true },
  { icon: Layers, label: "Drop in a Stack", testId: "suggestion-stacks", action: "stacks" },
  { icon: GripVertical, label: "Browse Components", testId: "suggestion-components", action: "components" },
  { icon: Trophy, label: "Take a Challenge", testId: "suggestion-challenge", action: "challenge" },
  { icon: FileUp, label: "Import a YAML file", testId: "suggestion-import", action: "import" },
]

export function EmptyCanvasState() {
  const nodeCount = useArchitectureStore((s) => s.nodes.length)
  const firstRunChoice = usePreferencesStore((s) => s.firstRunChoice)
  const { triggerFilePicker } = useImportAction()
  const setToolboxTab = useUiStore((s) => s.setToolboxTab)
  const setChallengesOpen = useUiStore((s) => s.setChallengesOpen)

  if (nodeCount > 0) return null

  // S1 (Kane QA): brand-new user → show the novice/expert fork instead of the expert sandbox.
  if (firstRunChoice === null) return <FirstRunFork />

  const handleClick = (action: StartAction) => {
    switch (action) {
      case "import":
        triggerFilePicker()
        break
      case "blueprints":
        setToolboxTab("blueprints")
        break
      case "stacks":
        setToolboxTab("stacks")
        break
      case "components":
        setToolboxTab("components")
        break
      case "challenge":
        setChallengesOpen(true)
        break
    }
  }

  return (
    <div
      data-testid="canvas-empty-state"
      className={`pointer-events-none absolute inset-0 ${Z_INDEX.CANVAS_OVERLAY} flex items-center justify-center`}
    >
      <div className="pointer-events-auto rounded-lg border border-archie-border bg-panel/90 p-6 shadow-lg backdrop-blur-sm">
        <h3 className="mb-1 text-center text-sm font-semibold text-text-primary">
          Get started
        </h3>
        <p className="mb-4 text-center text-xs text-text-secondary">
          Load a full example, drop in a pattern, or build from scratch
        </p>
        <div className="space-y-3">
          {SUGGESTIONS.map((suggestion) => (
            <button
              key={suggestion.testId}
              data-testid={suggestion.testId}
              type="button"
              onClick={() => handleClick(suggestion.action)}
              className={`flex w-full items-center gap-3 rounded-md px-4 py-3 text-left transition-colors ${
                suggestion.primary
                  ? "border-2 border-archie-accent/50 bg-archie-accent/5 hover:border-archie-accent hover:bg-archie-accent/10"
                  : "border border-archie-border bg-surface hover:bg-surface/80 hover:border-archie-accent/50"
              }`}
            >
              <suggestion.icon className="h-4 w-4 shrink-0 text-archie-accent" />
              <span className="text-sm text-text-primary">{suggestion.label}</span>
              {suggestion.primary && (
                <span className="ml-auto rounded-full bg-archie-accent/15 px-2 py-0.5 text-[0.625rem] font-medium text-archie-accent">
                  Recommended
                </span>
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
