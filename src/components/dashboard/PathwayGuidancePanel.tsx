import { usePathwaySuggestions } from "@/hooks/usePathwaySuggestions"
import { useArchitectureStore } from "@/stores/architectureStore"
import { COMPONENT_CATEGORIES, type ComponentCategoryId, type FitLevel } from "@/lib/constants"
import { getCategoryIcon } from "@/lib/categoryIcons"
import { Check, AlertTriangle, Plus } from "lucide-react"

const FIT_LEVEL_STYLES: Record<FitLevel, string> = {
  "great-fit": "bg-green-500/15 text-green-600",
  "good-fit": "bg-blue-500/15 text-blue-600",
  "trade-off": "bg-amber-500/15 text-amber-600",
  "poor-fit": "bg-orange-500/15 text-orange-600",
  risky: "bg-red-500/15 text-red-600",
}

interface PathwayGuidancePanelProps {
  /** When true, render nothing instead of an empty-state message (for inline/toolbox use). */
  hideWhenEmpty?: boolean
  /** Cap the number of suggestions shown (inline/toolbox use shows a tight subset). */
  maxItems?: number
}

export function PathwayGuidancePanel({ hideWhenEmpty = false, maxItems }: PathwayGuidancePanelProps = {}) {
  const { suggestions: allSuggestions } = usePathwaySuggestions()
  const suggestions = maxItems ? allSuggestions.slice(0, maxItems) : allSuggestions
  const addNodeSmartPosition = useArchitectureStore((s) => s.addNodeSmartPosition)

  if (suggestions.length === 0) {
    if (hideWhenEmpty) return null
    return (
      <div data-testid="pathway-guidance-panel">
        <p
          data-testid="pathway-empty-state"
          className="py-4 text-center text-sm text-text-secondary"
        >
          No pathway suggestions available
        </p>
      </div>
    )
  }

  return (
    <div data-testid="pathway-guidance-panel" className="space-y-2">
      {suggestions.map((suggestion) => {
        const catMeta = suggestion.category in COMPONENT_CATEGORIES
          ? COMPONENT_CATEGORIES[suggestion.category as ComponentCategoryId]
          : null
        const IconComponent = catMeta ? getCategoryIcon(catMeta.iconName) : null

        return (
          <div
            key={suggestion.componentId}
            data-testid={`pathway-suggestion-${suggestion.componentId}`}
            className="rounded-lg border border-archie-border p-3"
          >
            <div className="mb-1.5 flex items-center gap-2">
              {IconComponent && (
                <IconComponent
                  className="h-4 w-4 shrink-0"
                  style={{ color: catMeta?.color }}
                />
              )}
              <span className="text-sm font-medium text-text-primary">
                {suggestion.componentName}
              </span>
              <span className="ml-auto text-sm font-semibold text-text-primary">
                {suggestion.weightedScore.toFixed(1)}
              </span>
            </div>

            <p className="mb-2 text-xs text-text-secondary">
              {suggestion.gapClosed}
            </p>

            <div className="flex flex-wrap items-center gap-2">
              {suggestion.isConstraintSafe ? (
                <span
                  data-testid={`constraint-safe-${suggestion.componentId}`}
                  className="flex items-center gap-1 rounded-full bg-green-500/15 px-1.5 py-0.5 text-xs text-green-600"
                >
                  <Check className="h-3 w-3" />
                  Safe
                </span>
              ) : (
                <span
                  data-testid={`constraint-warning-${suggestion.componentId}`}
                  className="flex items-center gap-1 rounded-full bg-amber-500/15 px-1.5 py-0.5 text-xs text-amber-600"
                >
                  <AlertTriangle className="h-3 w-3" />
                  {/* constraintWarning is engine-generated from constraint.label, not direct user input. React JSX escaping covers XSS. */}
                  {suggestion.constraintWarning || "Constraint warning"}
                </span>
              )}

              {suggestion.fitLevel && (
                <span
                  data-testid={`fit-level-${suggestion.componentId}`}
                  className={`rounded-full px-1.5 py-0.5 text-xs capitalize ${FIT_LEVEL_STYLES[suggestion.fitLevel]}`}
                  title={suggestion.fitExplanation}
                >
                  {suggestion.fitLevel.replaceAll("-", " ")}
                </span>
              )}

              <button
                type="button"
                data-testid={`pathway-add-${suggestion.componentId}`}
                onClick={() => addNodeSmartPosition(suggestion.componentId)}
                className="ml-auto flex items-center gap-1 rounded-md border border-archie-border bg-surface px-2 py-0.5 text-xs font-medium text-text-primary transition-colors hover:border-archie-accent/50 hover:bg-surface/80"
                title={`Add ${suggestion.componentName} to the canvas`}
              >
                <Plus className="h-3 w-3" />
                Add
              </button>
            </div>
          </div>
        )
      })}
    </div>
  )
}
