import { ECONOMICS_DISCLAIMER } from "@/lib/constants"
import type { NodeCostInfo } from "@/stores/architectureStoreHelpers"
import { DollarSign, Gauge, Timer } from "lucide-react"

interface EconomicsSectionProps {
  current: NodeCostInfo
  previous?: NodeCostInfo
}

interface EconRowProps {
  icon: React.ReactNode
  label: string
  value: string
  delta?: string
  deltaColor?: string
}

function formatCost(cost: number | undefined): string {
  if (cost === undefined) return "N/A"
  return cost === 0 ? "Free" : `$${cost}/mo`
}

function formatRPS(rps: number | undefined): string {
  if (rps === undefined) return "N/A"
  if (rps >= 1000) return `${(rps / 1000).toFixed(rps % 1000 === 0 ? 0 : 1)}K RPS`
  return `${rps} RPS`
}

function formatLatency(ms: number | undefined): string {
  if (ms === undefined) return "N/A"
  return ms < 1 ? `${ms}ms` : `${Math.round(ms)}ms`
}

function computeDelta(current: number | undefined, previous: number | undefined): string | undefined {
  if (current === undefined || previous === undefined) return undefined
  const diff = current - previous
  if (diff === 0) return undefined
  return diff > 0 ? `+${diff}` : `${diff}`
}

function getDeltaColor(diff: string, invertPositive: boolean): string {
  const isPositive = diff.startsWith("+")
  if (invertPositive) {
    return isPositive ? "text-red-400" : "text-emerald-400"
  }
  return isPositive ? "text-emerald-400" : "text-red-400"
}

function EconRow({ icon, label, value, delta, deltaColor }: EconRowProps) {
  return (
    <div className="flex items-center justify-between py-0.5">
      <div className="flex items-center gap-1.5">
        {icon}
        <span className="text-[10px] text-text-secondary">{label}</span>
      </div>
      <div className="flex items-center gap-1.5">
        <span className="text-xs font-medium text-text-primary">{value}</span>
        {delta && (
          <span data-testid={`econ-delta-${label.toLowerCase().replace(/\s/g, "-")}`} className={`text-[10px] font-semibold ${deltaColor}`}>
            {delta}
          </span>
        )}
      </div>
    </div>
  )
}

export function EconomicsSection({ current, previous }: EconomicsSectionProps) {
  const hasAnyData = current.monthlyCost !== undefined ||
    current.maxRPS !== undefined ||
    current.baseLatencyMs !== undefined

  if (!hasAnyData) return null

  const costDelta = computeDelta(current.monthlyCost, previous?.monthlyCost)
  const rpsDelta = computeDelta(current.maxRPS, previous?.maxRPS)
  const latencyDelta = computeDelta(current.baseLatencyMs, previous?.baseLatencyMs)

  return (
    <div data-testid="economics-section" title={ECONOMICS_DISCLAIMER}>
      <h3 className="mb-1 text-xs font-medium text-text-primary">Economics</h3>
      <div className="rounded-md border border-archie-border bg-surface p-2">
        {current.monthlyCost !== undefined && (
          <EconRow
            icon={<DollarSign className="h-3 w-3 text-emerald-400" />}
            label="Cost"
            value={formatCost(current.monthlyCost)}
            delta={costDelta}
            deltaColor={costDelta ? getDeltaColor(costDelta, true) : undefined}
          />
        )}
        {current.maxRPS !== undefined && (
          <EconRow
            icon={<Gauge className="h-3 w-3 text-blue-400" />}
            label="Throughput"
            value={formatRPS(current.maxRPS)}
            delta={rpsDelta ? `${rpsDelta}` : undefined}
            deltaColor={rpsDelta ? getDeltaColor(rpsDelta, false) : undefined}
          />
        )}
        {current.baseLatencyMs !== undefined && (
          <EconRow
            icon={<Timer className="h-3 w-3 text-amber-400" />}
            label="Latency"
            value={formatLatency(current.baseLatencyMs)}
            delta={latencyDelta ? `${latencyDelta}ms` : undefined}
            deltaColor={latencyDelta ? getDeltaColor(latencyDelta, true) : undefined}
          />
        )}
      </div>
      <p className="mt-0.5 text-[9px] text-text-secondary">~approximate values</p>
    </div>
  )
}
