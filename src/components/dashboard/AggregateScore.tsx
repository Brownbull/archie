import { getScoreColor } from "@/engine/dashboardCalculator"
import { METRIC_MAX_VALUE } from "@/lib/constants"

interface AggregateScoreProps {
  score: number
  balancedScore?: number
}

// Must stay in sync with getScoreColor() in dashboardCalculator.ts
const SCORE_TEXT_COLORS: Record<string, string> = {
  "bg-[#3fcf6a]": "text-[#3fcf6a]",
  "bg-[#3b9dff]": "text-[#3b9dff]",
  "bg-[#ff8a3d]": "text-[#ff8a3d]",
}

function bgToTextColor(bgClass: string): string {
  return SCORE_TEXT_COLORS[bgClass] ?? "text-text-primary"
}

/** Turns the 0–10 score into a familiar letter grade so a number like "7.2" reads as good/bad. */
function letterGrade(score: number): string {
  const pct = score / METRIC_MAX_VALUE
  if (pct >= 0.85) return "A"
  if (pct >= 0.7) return "B"
  if (pct >= 0.55) return "C"
  if (pct >= 0.4) return "D"
  return "F"
}

const GRADE_HELP = "Letter grade from the overall score — A ≥8.5, B ≥7, C ≥5.5, D ≥4, else F (out of 10)."

export function AggregateScore({ score, balancedScore }: AggregateScoreProps) {
  const textColor = bgToTextColor(getScoreColor(score))
  const grade = letterGrade(score)
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
          <div className="flex items-baseline gap-1.5">
            <span className={`text-3xl font-bold ${textColor}`}>
              {score.toFixed(1)}
            </span>
            <span
              data-testid="aggregate-score-grade"
              title={GRADE_HELP}
              className={`text-lg font-bold ${textColor}`}
            >
              {grade}
            </span>
          </div>
          <span className="text-xs text-text-secondary" title={GRADE_HELP}>Overall</span>
        </>
      )}
    </div>
  )
}
