import { formatVariantStats } from "@/lib/formatStats"

/** The three default-variant stats we aggregate for a multi-component pattern (stack/blueprint). */
export interface VariantStats {
  monthlyCost?: number
  maxRPS?: number
  baseLatencyMs?: number
}

export interface AggregatedStats {
  /** Sum of each component's monthly cost — matches the canvas Budget HUD convention. */
  totalCost?: number
  /** Bottleneck throughput: the weakest component caps how much the whole pattern can serve. */
  minRPS?: number
  /** Cumulative request latency added by traversing the components. */
  totalLatencyMs?: number
}

/**
 * Roll a pattern's per-component default-variant stats into one comparable summary so the toolbox
 * cards read at a glance: cost adds up, throughput is gated by the slowest link, latency accumulates.
 * Any field stays undefined when no component supplied it (so the formatter omits it cleanly).
 */
export function aggregateVariantStats(variants: readonly VariantStats[]): AggregatedStats {
  let totalCost: number | undefined
  let minRPS: number | undefined
  let totalLatencyMs: number | undefined

  for (const v of variants) {
    if (typeof v.monthlyCost === "number") totalCost = (totalCost ?? 0) + v.monthlyCost
    if (typeof v.maxRPS === "number" && v.maxRPS > 0) minRPS = minRPS === undefined ? v.maxRPS : Math.min(minRPS, v.maxRPS)
    if (typeof v.baseLatencyMs === "number") totalLatencyMs = (totalLatencyMs ?? 0) + v.baseLatencyMs
  }

  return { totalCost, minRPS, totalLatencyMs }
}

/** "$120/mo · 2k rps · 45ms" — reuses the shared node/inspector formatter for consistency. */
export function formatAggregatedStats(stats: AggregatedStats): string {
  return formatVariantStats({ monthlyCost: stats.totalCost, maxRPS: stats.minRPS, baseLatencyMs: stats.totalLatencyMs })
}
