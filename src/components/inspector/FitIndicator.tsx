import { useState, useCallback } from "react"
import { Check, Minus, X, ChevronDown, ChevronUp } from "lucide-react"
import type { FitResult, FitLevel, FitCompatibility } from "@/lib/constants"

const FIT_LEVEL_LABELS: Record<FitLevel, string> = {
  "great-fit": "Great Fit",
  "good-fit": "Good Fit",
  "trade-off": "Trade-off",
  "poor-fit": "Poor Fit",
  risky: "Risky",
}

const FIT_LEVEL_COLORS: Record<FitLevel, string> = {
  "great-fit": "text-emerald-500",
  "good-fit": "text-green-500",
  "trade-off": "text-amber-500",
  "poor-fit": "text-orange-500",
  risky: "text-red-500",
}

const FIT_LEVEL_BG: Record<FitLevel, string> = {
  "great-fit": "bg-emerald-500/10",
  "good-fit": "bg-green-500/10",
  "trade-off": "bg-amber-500/10",
  "poor-fit": "bg-orange-500/10",
  risky: "bg-red-500/10",
}

function CompatibilityIcon({ compatibility, dimension }: { compatibility: FitCompatibility; dimension: string }) {
  const testId = `factor-icon-${compatibility}-${dimension}`
  switch (compatibility) {
    case "positive":
      return <Check data-testid={testId} className="h-3 w-3 text-green-500" />
    case "negative":
      return <X data-testid={testId} className="h-3 w-3 text-red-500" />
    default:
      return <Minus data-testid={testId} className="h-3 w-3 text-text-secondary" />
  }
}

interface FitIndicatorProps {
  itemId: string
  fitResult: FitResult
}

export function FitIndicator({ itemId, fitResult }: FitIndicatorProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const { level, explanation, factors } = fitResult

  const toggle = useCallback(() => setIsExpanded((prev) => !prev), [])

  return (
    <div
      data-testid={`fit-indicator-${itemId}`}
      role="button"
      tabIndex={0}
      aria-expanded={isExpanded}
      aria-label={`Fit: ${FIT_LEVEL_LABELS[level]}`}
      className="cursor-pointer"
      onClick={toggle}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggle() } }}
    >
      <div className="flex items-center gap-1">
        <span
          data-testid={`fit-badge-${itemId}`}
          className={`inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-medium ${FIT_LEVEL_COLORS[level]} ${FIT_LEVEL_BG[level]}`}
        >
          {FIT_LEVEL_LABELS[level]}
        </span>
        <span className="h-3 w-3 shrink-0">
          {isExpanded
            ? <ChevronUp className="h-3 w-3 text-text-secondary" />
            : <ChevronDown className="h-3 w-3 text-text-secondary" />}
        </span>
      </div>
      {isExpanded && (
        <div data-testid={`fit-explanation-${itemId}`} className="mt-1 space-y-1 text-xs text-text-secondary">
          <p>{explanation}</p>
          {factors.length > 0 && (
            <ul className="space-y-0.5">
              {factors.map((factor) => (
                <li key={factor.dimension} className="flex items-center gap-1">
                  <CompatibilityIcon compatibility={factor.compatibility} dimension={factor.dimension} />
                  <span className="font-medium">{factor.dimension}</span>
                  <span>— {factor.detail}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
