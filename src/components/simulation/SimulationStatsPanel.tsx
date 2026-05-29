import { useMemo } from "react"
import { useSimulationStore } from "@/stores/simulationStore"
import { computeSimStats } from "@/lib/simulationStats"

function Stat({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="flex flex-col leading-tight">
      <span className="text-[8px] uppercase tracking-wide text-text-secondary">{label}</span>
      <span className={`text-[11px] font-semibold tabular-nums ${color ?? "text-text-primary"}`}>{value}</span>
    </div>
  )
}

function uptimeColor(pct: number): string {
  if (pct >= 99) return "text-emerald-400"
  if (pct >= 95) return "text-yellow-400"
  return "text-red-400"
}

export function SimulationStatsPanel() {
  const ticks = useSimulationStore((s) => s.ticks)
  const currentTick = useSimulationStore((s) => s.currentTick)
  const stats = useMemo(() => computeSimStats(ticks, currentTick), [ticks, currentTick])

  return (
    <div data-testid="sim-stats" className="flex items-center gap-4">
      <Stat label="Uptime" value={`${stats.uptimePercent.toFixed(1)}%`} color={uptimeColor(stats.uptimePercent)} />
      <Stat label="RPS (served/target)" value={`${Math.round(stats.servedRps)}/${Math.round(stats.currentRps)}`} />
      <Stat label="Latency" value={`${Math.round(stats.avgLatencyMs)}ms`} />
      <Stat label="p99" value={`${Math.round(stats.p99LatencyMs)}ms`} />
      <Stat label="Failed" value={`${Math.round(stats.failedRps)} rps`} color={stats.failedRps > 0 ? "text-red-400" : undefined} />
    </div>
  )
}
