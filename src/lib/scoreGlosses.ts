import { METRIC_MAX_VALUE } from "@/lib/constants"

/**
 * S1d (Kane QA) — plain-language gloss for the architectural scores. Presentation-only: reads the
 * already-computed aggregate score (0–10) and turns it into one human sentence, in the same
 * action-oriented voice as the Build-Health checklist. NO engine/scoring coupling — bands are
 * fixed constants here, deliberately decoupled from Firestore MetricCategory.scoreInterpretations
 * (which stay in the per-category popover) to avoid two competing sources of truth.
 */

interface GlossBand {
  /** Inclusive lower bound on the 0–10 score. */
  min: number
  text: string
}

// Ordered high → low; first band whose `min` the score meets wins.
const AGGREGATE_BANDS: ReadonlyArray<GlossBand> = [
  { min: 8.5, text: "Excellent — a well-balanced architecture" },
  { min: 7.0, text: "Solid — a few areas could still be tightened" },
  { min: 5.5, text: "Decent, but strained — worth shoring up" },
  { min: 4.0, text: "Shaky — weak spots are dragging it down" },
  { min: 0, text: "Fragile — the fundamentals need work" },
]

function bandText(score: number): string {
  return AGGREGATE_BANDS.find((b) => score >= b.min)?.text ?? AGGREGATE_BANDS[AGGREGATE_BANDS.length - 1].text
}

/**
 * One-sentence plain-language reading of the overall score. When a weakest-category name is given
 * (and the score isn't already excellent), it points at the bottleneck — e.g.
 * "Solid — but reliability is your weakest area."
 */
export function aggregateScoreGloss(score: number, weakestCategoryName?: string): string {
  const clamped = Math.max(0, Math.min(METRIC_MAX_VALUE, score))
  const base = bandText(clamped)
  if (weakestCategoryName && clamped < 8.5) {
    return `${base.split(" — ")[0]} — ${weakestCategoryName.toLowerCase()} is your weakest area`
  }
  return base
}
