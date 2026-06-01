import { useMemo, useState } from "react"
import { useSimulationStore, getCurrentTickState } from "@/stores/simulationStore"
import { useArchitectureStore } from "@/stores/architectureStore"
import { useChallengeStore } from "@/stores/challengeStore"
import { computeSimStats } from "@/lib/simulationStats"
import { computeTotalArchitectureCost } from "@/stores/architectureStoreHelpers"

type BlockMetric = "rps" | "latency" | "util"
const METRICS: { id: BlockMetric; label: string }[] = [
  { id: "rps", label: "RPS" },
  { id: "latency", label: "Latency" },
  { id: "util", label: "Util" },
]

function uptimeColor(pct: number): string {
  if (pct >= 99) return "text-emerald-400"
  if (pct >= 95) return "text-yellow-400"
  return "text-red-400"
}

function Metric({ label, value, sub, color }: { label: string; value: string; sub?: string; color?: string }) {
  return (
    <div className="border-b border-archie-border/60 px-3 py-2.5">
      <div className="text-[10px] uppercase tracking-wide text-text-secondary">{label}</div>
      <div className={`text-xl font-bold tabular-nums ${color ?? "text-text-primary"}`}>{value}</div>
      {sub && <div className="text-[10px] text-text-secondary">{sub}</div>}
    </div>
  )
}

/**
 * Live STATS side panel shown on the right during a simulation (mirrors the reference app):
 * uptime, avg latency, current RPS, monthly cost vs budget, and a per-block status list with a
 * switchable metric (RPS / Latency / Util). Reuses the existing tick series + cost helper.
 */
export function SimulationStatsSidePanel() {
  const status = useSimulationStore((s) => s.status)
  const ticks = useSimulationStore((s) => s.ticks)
  const currentTick = useSimulationStore((s) => s.currentTick)
  const durationS = useSimulationStore((s) => s.durationS)
  const tickState = useSimulationStore(getCurrentTickState)
  const nodes = useArchitectureStore((s) => s.nodes)
  const budgetCap = useChallengeStore((s) => s.activeChallenge?.budgetCap ?? null)

  const [metric, setMetric] = useState<BlockMetric>("rps")

  const stats = useMemo(() => computeSimStats(ticks, currentTick), [ticks, currentTick])
  const monthlyCost = useMemo(() => computeTotalArchitectureCost(nodes), [nodes])
  const nameById = useMemo(
    () => new Map(nodes.map((n) => [n.id, n.data.componentName])),
    [nodes],
  )

  // Per-block rows, sorted by incoming RPS (busiest first).
  const blocks = useMemo(() => {
    const ns = tickState?.nodes ?? []
    return [...ns].sort((a, b) => b.incomingRps - a.incomingRps)
  }, [tickState])

  if (status === "idle" || ticks.length === 0) return null

  const lastTick = Math.max(1, ticks.length - 1)
  const elapsedS = Math.round((currentTick / lastTick) * durationS)
  const overBudget = budgetCap !== null && monthlyCost > budgetCap

  const blockValue = (b: { incomingRps: number; latencyMs: number; capacityPercent: number; overloaded: boolean }) => {
    if (metric === "rps") return `${Math.round(b.incomingRps)} rps`
    if (metric === "latency") return `${Math.round(b.latencyMs)}ms`
    return `${Math.round(b.capacityPercent * 100)}%`
  }
  const blockColor = (b: { overloaded: boolean }) => (b.overloaded ? "text-red-400" : "text-text-secondary")

  return (
    <aside
      data-testid="sim-stats-side-panel"
      className="pointer-events-auto absolute right-3 top-32 z-20 flex max-h-[calc(100%-9rem)] w-56 flex-col overflow-hidden rounded-md border border-archie-border bg-panel/95 shadow-xl backdrop-blur-sm"
    >
      <div className="flex items-center justify-between border-b border-archie-border px-3 py-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-text-secondary">Stats</span>
        <span data-testid="sim-elapsed" className="text-[10px] tabular-nums text-text-secondary">t={elapsedS}s</span>
      </div>

      <div className="overflow-y-auto">
        <Metric
          label="Uptime"
          value={`${stats.uptimePercent.toFixed(1)}%`}
          color={uptimeColor(stats.uptimePercent)}
        />
        <Metric label="Avg latency" value={`${Math.round(stats.avgLatencyMs)}ms`} sub={`p99 ${Math.round(stats.p99LatencyMs)}ms`} />
        <Metric
          label="Current RPS"
          value={`${Math.round(stats.servedRps)}`}
          sub={`served / ${Math.round(stats.currentRps)} target${stats.failedRps > 0 ? ` · ${Math.round(stats.failedRps)} failed` : ""}`}
          color={stats.failedRps > 0 ? "text-yellow-400" : undefined}
        />
        <Metric
          label="Monthly cost"
          value={monthlyCost === 0 ? "Free" : `$${monthlyCost}`}
          sub={budgetCap !== null ? `budget $${budgetCap}` : "per month"}
          color={overBudget ? "text-red-400" : "text-emerald-400"}
        />

        {/* Per-block status with a switchable metric. */}
        <div className="px-3 py-2.5">
          <div className="mb-1.5 flex items-center justify-between">
            <span className="text-[10px] uppercase tracking-wide text-text-secondary">Block status</span>
            <div className="flex gap-0.5" role="group" aria-label="Block metric">
              {METRICS.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  data-testid={`block-metric-${m.id}`}
                  aria-pressed={metric === m.id}
                  onClick={() => setMetric(m.id)}
                  className={`rounded px-1.5 py-0.5 text-[9px] font-medium ${
                    metric === m.id ? "bg-archie-accent/20 text-archie-accent" : "text-text-secondary hover:text-text-primary"
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>
          <ul data-testid="block-status-list" className="space-y-1">
            {blocks.map((b) => (
              <li key={b.nodeId} className="flex items-center justify-between gap-2 text-[11px]">
                <span className="flex items-center gap-1.5 truncate">
                  <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${b.overloaded ? "bg-red-400" : "bg-emerald-400"}`} />
                  <span className="truncate text-text-primary">{nameById.get(b.nodeId) ?? b.nodeId}</span>
                </span>
                <span className={`shrink-0 tabular-nums ${blockColor(b)}`}>{blockValue(b)}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </aside>
  )
}
