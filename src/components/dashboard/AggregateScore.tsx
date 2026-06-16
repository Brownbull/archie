import { Star } from "lucide-react"
import { scoreToStars, starColor } from "@/lib/metricStars"
import { aggregateScoreGloss } from "@/lib/scoreGlosses"
import { METRIC_MAX_VALUE } from "@/lib/constants"

interface AggregateScoreProps {
  score: number
  balancedScore?: number
  /** S1d: plain-language gloss names the weakest category as the bottleneck when provided. */
  weakestCategoryName?: string
}

function letterGrade(score: number): string {
  const pct = score / METRIC_MAX_VALUE
  if (pct >= 0.85) return "A"
  if (pct >= 0.7) return "B"
  if (pct >= 0.55) return "C"
  if (pct >= 0.4) return "D"
  return "F"
}

function StarDisplay({ count, size = "h-3 w-3" }: { count: number; size?: string }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          className={`${size} ${n <= count ? "fill-current" : ""}`}
          style={{ color: n <= count ? starColor(count) : "#374151" }}
        />
      ))}
    </div>
  )
}

export function AggregateScore({ score, balancedScore, weakestCategoryName }: AggregateScoreProps) {
  const stars = scoreToStars(score)
  const color = starColor(stars)
  const grade = letterGrade(score)
  const showDual = balancedScore !== undefined && balancedScore.toFixed(1) !== score.toFixed(1)
  const gloss = aggregateScoreGloss(score, weakestCategoryName)

  return (
    <div
      data-testid="aggregate-score"
      role="meter"
      aria-valuenow={score}
      aria-valuemin={0}
      aria-valuemax={METRIC_MAX_VALUE}
      className="flex flex-col items-center justify-center px-4"
    >
      <div className="flex items-baseline gap-1.5">
        <span className="text-3xl font-bold" style={{ color }}>{score.toFixed(1)}</span>
        <span data-testid="aggregate-score-grade" className="text-lg font-bold" style={{ color }}>{grade}</span>
      </div>
      <StarDisplay count={stars} />
      {showDual && (
        <span data-testid="aggregate-score-balanced" className="mt-0.5 text-[0.5625rem] text-text-secondary">
          balanced: {balancedScore.toFixed(1)}
        </span>
      )}
      <span className="text-xs text-text-secondary">Overall</span>
      <span
        data-testid="aggregate-score-gloss"
        className="mt-0.5 max-w-48 text-center text-[0.625rem] leading-tight text-text-secondary"
      >
        {gloss}
      </span>
    </div>
  )
}
