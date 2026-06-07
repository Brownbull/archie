/**
 * Shared green/amber/red rule for a measured metric against its target (D74). One place so the results
 * modal, the budget row, and the coach all color consistently.
 *
 * - PASS (met the target) ⇒ green. A passing value is always green, even if it's close to the line —
 *   "met" reads as met.
 * - FAIL but within ~10% of the threshold on the failing side ⇒ amber ("so close").
 * - FAIL beyond 10% ⇒ red.
 *
 * Tone is computed AFTER rounding to display precision (like DeltaChip), so a value that DISPLAYS as
 * equal to the target never reads as a contradictory color (e.g. "40/40ms" is never red).
 */
export interface MetricTone {
  cls: string
  pass: boolean
}

export function metricTone(measured: number, target: number, goodWhenLower: boolean, digits = 0): MetricTone {
  const round = (x: number) => Number(x.toFixed(digits))
  const m = round(measured)
  const t = round(target)
  const pass = goodWhenLower ? m <= t : m >= t
  if (pass) return { cls: "text-emerald-400", pass: true }
  const withinTenPercent = goodWhenLower ? m <= t * 1.1 : m >= t * 0.9
  return { cls: withinTenPercent ? "text-amber-400" : "text-red-400", pass: false }
}
