import { Lightbulb, Check, ArrowUp, ArrowDown, Minus } from "lucide-react"
import type { SuggestionResult } from "@/engine/suggestionEngine"

const NEUTRAL_EPS = 0.05

/** A single labelled delta chip. `goodWhenNegative` for metrics where lower is better (latency, cost). */
function DeltaChip({ testid, label, value, format, goodWhenNegative }: { testid: string; label: string; value: number; format: (v: number) => string; goodWhenNegative: boolean }) {
  const neutral = Math.abs(value) < NEUTRAL_EPS
  const improved = goodWhenNegative ? value < 0 : value > 0
  const tone = neutral ? "text-text-secondary" : improved ? "text-emerald-400" : "text-red-400"
  const Icon = neutral ? Minus : (goodWhenNegative ? (value < 0 ? ArrowDown : ArrowUp) : value > 0 ? ArrowUp : ArrowDown)
  return (
    <div data-testid={testid} data-tone={neutral ? "neutral" : improved ? "good" : "bad"} className={`flex items-center gap-1 text-[11px] ${tone}`}>
      <Icon className="h-3 w-3" />
      <span className="text-text-secondary">{label}</span>
      <span className="font-medium">{format(value)}</span>
    </div>
  )
}

const signed = (v: number, digits: number) => `${v >= 0 ? "+" : "−"}${Math.abs(v).toFixed(digits)}`

/**
 * "Try this next" card (Epic 17 Phase 2). Renders the suggestion engine's best net-positive
 * change with its uptime / latency / cost deltas, or a "well optimized" state when nothing beats
 * the current architecture.
 */
export function SuggestionCard({ result }: { result: SuggestionResult }) {
  if (result.kind === "well-optimized") {
    return (
      <div data-testid="suggestion-card" data-kind="well-optimized" className="flex items-center gap-2 rounded-md border border-archie-border bg-surface px-3 py-2">
        <Check className="h-4 w-4 shrink-0 text-emerald-400" />
        <span className="text-xs text-text-secondary">Well optimized — no single change improves on this build.</span>
      </div>
    )
  }

  const s = result.best!
  return (
    <div data-testid="suggestion-card" data-kind="suggestion" className="rounded-md border border-blue-500/40 bg-blue-500/10 px-3 py-2">
      <div className="flex items-center gap-1.5 text-xs font-semibold text-blue-300">
        <Lightbulb className="h-3.5 w-3.5" /> Try this next
      </div>
      <p data-testid="suggestion-description" className="mt-1 text-[11px] text-text-primary">{s.description}</p>
      <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5">
        <DeltaChip testid="suggestion-delta-uptime" label="uptime" value={s.uptimeDelta} format={(v) => `${signed(v, 1)} pp`} goodWhenNegative={false} />
        <DeltaChip testid="suggestion-delta-latency" label="p99" value={s.latencyDelta} format={(v) => `${signed(Math.round(v), 0)} ms`} goodWhenNegative />
        <DeltaChip testid="suggestion-delta-cost" label="cost" value={s.costDelta} format={(v) => `${signed(Math.round(v), 0)} $/mo`} goodWhenNegative />
      </div>
    </div>
  )
}
