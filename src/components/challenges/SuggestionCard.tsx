import { Lightbulb, Check } from "lucide-react"
import type { SuggestionResult } from "@/engine/suggestionEngine"
import { DeltaChip } from "@/components/challenges/DeltaChip"

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

  const s = result.best // narrowed to ArchitectureSuggestion by the discriminated union
  return (
    <div data-testid="suggestion-card" data-kind="suggestion" className="rounded-md border border-blue-500/40 bg-blue-500/10 px-3 py-2">
      <div className="flex items-center gap-1.5 text-xs font-semibold text-blue-300">
        <Lightbulb className="h-3.5 w-3.5" /> Try this next
      </div>
      <p data-testid="suggestion-description" className="mt-1 text-[0.6875rem] text-text-primary">{s.description}</p>
      <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5">
        <DeltaChip testid="suggestion-delta-uptime" label="uptime" value={s.uptimeDelta} decimals={1} unit="pp" goodWhenNegative={false} />
        <DeltaChip testid="suggestion-delta-latency" label="p99" value={s.latencyDelta} decimals={0} unit="ms" goodWhenNegative />
        <DeltaChip testid="suggestion-delta-cost" label="cost" value={s.costDelta} decimals={0} unit="$/mo" goodWhenNegative />
      </div>
    </div>
  )
}
