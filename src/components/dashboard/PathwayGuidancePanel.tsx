import { usePathwaySuggestions } from "@/hooks/usePathwaySuggestions"
import { COMPONENT_CATEGORIES, type ComponentCategoryId, type FitLevel } from "@/lib/constants"
import { getCategoryIcon } from "@/lib/categoryIcons"
import { Check, AlertTriangle } from "lucide-react"

const FIT_LEVEL_STYLES: Record<FitLevel, string> = {
  "great-fit": "bg-green-500/15 text-green-600",
  "good-fit": "bg-blue-500/15 text-blue-600",
  "trade-off": "bg-amber-500/15 text-amber-600",
  "poor-fit": "bg-orange-500/15 text-orange-600",
  risky: "bg-red-500/15 text-red-600",
}

export function PathwayGuidancePanel() {
  const { suggestions } = usePathwaySuggestions()

  if (suggestions.length === 0) {
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
            </div>
          </div>
        )
      })}
    </div>
  )
}
