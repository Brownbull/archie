import { useState } from "react"
import { Trophy, ChevronUp, ChevronDown, Check } from "lucide-react"
import { useArchitectureStore } from "@/stores/architectureStore"
import { Z_INDEX } from "@/lib/constants"

export function TierBadge() {
  const currentTier = useArchitectureStore((s) => s.currentTier)
  const [isExpanded, setIsExpanded] = useState(false)

  return (
    <div data-testid="tier-badge" className="relative flex items-center">
      {currentTier === null ? (
        <div className="flex items-center gap-1.5 px-3">
          <Trophy className="h-4 w-4 text-text-secondary opacity-40" />
          <span className="text-xs text-text-secondary">
            Add components to begin
          </span>
        </div>
      ) : (
        <>
          <button
            type="button"
            onClick={() => setIsExpanded((prev) => !prev)}
            aria-expanded={isExpanded}
            aria-controls="tier-detail-panel"
            className={`flex items-center gap-1.5 rounded px-3 py-1.5 text-xs font-medium transition-colors duration-300 ease-in-out ${currentTier.tierColor} ${currentTier.tierTextColor}`}
          >
            <Trophy className="h-4 w-4" />
            <span>{currentTier.tierName}</span>
            <span className="opacity-70">
              {currentTier.tierIndex + 1}/{currentTier.totalTiers}
            </span>
            {isExpanded ? (
              <ChevronDown className="h-3 w-3" />
            ) : (
              <ChevronUp className="h-3 w-3" />
            )}
          </button>

          {isExpanded && (
            <div
              data-testid="tier-detail"
              id="tier-detail-panel"
              className={`absolute bottom-full left-0 ${Z_INDEX.OVERLAY} mb-2 w-72 rounded-lg border border-archie-border bg-surface-primary p-3 shadow-lg`}
            >
              {currentTier.isMaxTier ? (
                <div className="flex items-center gap-2 text-sm text-green-500">
                  <Check className="h-4 w-4" />
                  <span>All tier requirements met</span>
                </div>
              ) : (
                <div>
                  <p className="mb-2 text-xs font-medium text-text-secondary">
                    Next tier requirements:
                  </p>
                  <ul className="space-y-1">
                    {currentTier.nextTierGaps.map((gap) => (
                      <li
                        key={gap.requirementDescription}
                        className="text-xs text-text-primary"
                      >
                        {gap.requirementDescription}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}
