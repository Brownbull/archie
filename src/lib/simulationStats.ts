import type { TickState } from "@/lib/simulationTypes"

export interface SimulationStats {
  /** Request success rate over elapsed ticks: served / (served + failed), as a %. 100 when no traffic. */
  uptimePercent: number
  /** Mean per-tick system latency (worst node latency each tick), ms. */
  avgLatencyMs: number
  /** 99th-percentile per-tick system latency, ms. */
  p99LatencyMs: number
  /** Target RPS at the current tick. */
  currentRps: number
  /** Served RPS at the current tick. */
  servedRps: number
  /** Failed RPS at the current tick. */
  failedRps: number
  /** Cumulative served / failed request-seconds over elapsed ticks. */
  totalServed: number
  totalFailed: number
}

const EMPTY: SimulationStats = {
  uptimePercent: 100,
  avgLatencyMs: 0,
  p99LatencyMs: 0,
  currentRps: 0,
  servedRps: 0,
  failedRps: 0,
  totalServed: 0,
  totalFailed: 0,
}

function percentile(sortedAsc: number[], p: number): number {
  if (sortedAsc.length === 0) return 0
  const idx = Math.min(sortedAsc.length - 1, Math.ceil((p / 100) * sortedAsc.length) - 1)
  return sortedAsc[Math.max(0, idx)]
}

/** Per-tick "system latency" = the worst (max) node latency that tick (slowest hop dominates). */
function systemLatency(tick: TickState): number {
  let max = 0
  for (const n of tick.nodes) if (n.latencyMs > max) max = n.latencyMs
  return max
}

/**
 * Aggregates simulation stats over elapsed ticks [0..uptoTick] (Epic 15).
 * uptime = request success rate; latency = mean / p99 of per-tick worst-hop latency.
 */
export function computeSimStats(ticks: TickState[], uptoTick: number): SimulationStats {
  if (ticks.length === 0) return EMPTY
  const end = Math.max(0, Math.min(ticks.length - 1, uptoTick))
  const current = ticks[end]

  let totalServed = 0
  let totalFailed = 0
  const latencies: number[] = []
  for (let i = 0; i <= end; i++) {
    const t = ticks[i]
    totalServed += t.totalServedRps
    totalFailed += t.totalFailedRps
    latencies.push(systemLatency(t))
  }

  const totalReq = totalServed + totalFailed
  const uptimePercent = totalReq > 0 ? (totalServed / totalReq) * 100 : 100
  const avgLatencyMs = latencies.length > 0 ? latencies.reduce((a, b) => a + b, 0) / latencies.length : 0
  const p99LatencyMs = percentile([...latencies].sort((a, b) => a - b), 99)

  return {
    uptimePercent,
    avgLatencyMs,
    p99LatencyMs,
    currentRps: current.targetRps,
    servedRps: current.totalServedRps,
    failedRps: current.totalFailedRps,
    totalServed,
    totalFailed,
  }
}
