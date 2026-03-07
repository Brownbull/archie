import { getScoreColor } from "@/engine/dashboardCalculator"
import { METRIC_MAX_VALUE } from "@/lib/constants"

interface AggregateScoreProps {
  score: number
  balancedScore?: number
}

// Must stay in sync with getScoreColor() in dashboardCalculator.ts
const SCORE_TEXT_COLORS: Record<string, string> = {
  "bg-green-500": "text-green-500",
  "bg-yellow-500": "text-yellow-500",
  "bg-red-500": "text-red-500",
}

function bgToTextColor(bgClass: string): string {
  return SCORE_TEXT_COLORS[bgClass] ?? "text-text-primary"
}

export function AggregateScore({ score, balancedScore }: AggregateScoreProps) {
  const textColor = bgToTextColor(getScoreColor(score))
  const showDual =
    balancedScore !== undefined &&
    balancedScore.toFixed(1) !== score.toFixed(1)

  return (
    <div
      data-testid="aggregate-score"
      role="meter"
      aria-valuenow={score}
      aria-valuemin={0}
      aria-valuemax={METRIC_MAX_VALUE}
      className="flex flex-col items-center justify-center px-4"
    >
      {showDual ? (
        <>
          <div className="flex items-baseline gap-2">
            <span
              data-testid="aggregate-score-weighted"
              className={`text-2xl font-bold ${textColor}`}
            >
              {score.toFixed(1)}
            </span>
            <span className="text-xs text-text-secondary">|</span>
            <span
              data-testid="aggregate-score-balanced"
              className="text-lg font-medium text-text-secondary"
            >
              {balancedScore.toFixed(1)}
            </span>
          </div>
          <span className="text-xs text-text-secondary">
            Weighted | Balanced
          </span>
        </>
      ) : (
        <>
          <span className={`text-3xl font-bold ${textColor}`}>
            {score.toFixed(1)}
          </span>
          <span className="text-xs text-text-secondary">Overall</span>
        </>
      )}
    </div>
  )
}
