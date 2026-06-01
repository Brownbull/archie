import { formatMonthlyCost, formatRps, formatLatencyMs } from "@/lib/formatStats"
import type { AggregatedStats } from "@/lib/aggregateStats"

interface PatternStatsRowProps {
  stats: AggregatedStats
  testId: string
}

/**
 * One scannable cost · throughput · latency line for a stack/blueprint card, derived from the
 * pattern's default variants. Same `$/mo · rps · ms` shape as the on-node stats so the numbers read
 * consistently. Renders nothing when no stats are available.
 */
export function PatternStatsRow({ stats, testId }: PatternStatsRowProps) {
  const { totalCost, minRPS, totalLatencyMs } = stats ?? {}
  const cost = formatMonthlyCost(totalCost)
  const rps = formatRps(minRPS)
  const latency = formatLatencyMs(totalLatencyMs)
  if (!cost && !rps && !latency) return null

  const rest = [rps, latency].filter(Boolean).join(" · ")
  return (
    <div
      data-testid={testId}
      className="flex items-center gap-1.5 text-xs"
      title="Defaults: total monthly cost · bottleneck throughput · cumulative latency"
    >
      <span className="font-semibold text-emerald-400">{cost ?? "—"}</span>
      {rest && <span className="text-text-secondary">·</span>}
      {rest && <span className="text-text-secondary">{rest}</span>}
    </div>
  )
}
