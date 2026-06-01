/**
 * Compact stat formatters shared by the canvas node, inspector, and pickers so cost, throughput,
 * and latency read consistently everywhere ("$20/mo · 1.5k rps · 25ms").
 */
export function formatRps(rps: number | undefined): string | null {
  if (rps === undefined) return null
  return rps >= 1000 ? `${+(rps / 1000).toFixed(1)}k rps` : `${rps} rps`
}

export function formatLatencyMs(ms: number | undefined): string | null {
  return ms === undefined ? null : `${ms}ms`
}

export function formatMonthlyCost(cost: number | undefined): string | null {
  if (cost === undefined) return null
  return cost === 0 ? "Free" : `$${cost}/mo`
}

/** "$20/mo · 1.5k rps · 25ms" — omits any field that's undefined. */
export function formatVariantStats(v: {
  monthlyCost?: number
  maxRPS?: number
  baseLatencyMs?: number
}): string {
  return [formatMonthlyCost(v.monthlyCost), formatRps(v.maxRPS), formatLatencyMs(v.baseLatencyMs)]
    .filter(Boolean)
    .join(" · ")
}
