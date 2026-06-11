import { Hammer, Wrench, RotateCcw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useUserProgressStore } from "@/stores/userProgressStore"
import { remainingBreakAttributes, BREAK_ATTRIBUTES, BREAK_ATTRIBUTE_LABELS } from "@/engine/breakDetection"
import type { BreakOutcome } from "@/hooks/useBreakCollection"
import type { Challenge } from "@/lib/challengeTypes"

interface BreakItPanelProps {
  challenge: Challenge
  stars: number
  outcome: BreakOutcome | null
  /** Restores the traffic dials to the authored spec and re-enters build mode. */
  onResetDials: () => void
  /** Closes the modal back to the canvas (run kept) — dials are unlocked and Rerun is waiting. */
  onProceed: () => void
}

/**
 * The break-it loop's results-modal panel (P4-S3, D94). Two states:
 * - BREAK COLLECTED — the just-scored run failed with exactly one traffic dial deviated: celebrate,
 *   show the expert payout (or the no-double-pay note), and offer the reset-dials action.
 * - INVITE — a 3★ run on a quest with authored traffic and uncollected attributes left: invite the
 *   player to break their own build, one dial at a time. The dials just unlocked (D20).
 * Renders nothing otherwise (no authored sources, all four collected, sub-3★ ordinary runs).
 */
export function BreakItPanel({ challenge, stars, outcome, onResetDials, onProceed }: BreakItPanelProps) {
  const breaksRecord = useUserProgressStore((s) => s.breaksByChallenge[challenge.id])
  if (!challenge.trafficSources?.length) return null

  if (outcome) {
    return (
      <div data-testid="break-collected" className="rounded-lg border border-orange-500/40 bg-orange-500/10 p-3">
        <div className="flex items-center gap-2">
          <Hammer className="h-4 w-4 text-orange-400" />
          <span className="text-xs font-bold text-orange-200">
            Broke it with {BREAK_ATTRIBUTE_LABELS[outcome.attribute]}!
          </span>
          <span data-testid="break-payout" className="ml-auto flex items-center gap-1 text-[0.6875rem] font-semibold text-orange-300">
            <Wrench className="h-3 w-3" />
            {outcome.fresh ? "+1 Expert" : "already collected"}
          </span>
        </div>
        <p className="mt-1.5 text-[0.6875rem] leading-snug text-orange-200/80">
          {outcome.remaining.length > 0
            ? `Your build held 3★ until this dial moved — that's the failure boundary. Still standing: ${outcome.remaining.map((a) => BREAK_ATTRIBUTE_LABELS[a]).join(", ")}.`
            : "All four dials collected — you've mapped this build's entire failure boundary."}
        </p>
        {outcome.remaining.length > 0 && (
          <Button
            data-testid="break-reset"
            variant="outline"
            size="sm"
            className="mt-2 h-7 gap-1.5 border-orange-500/40 text-[0.6875rem] text-orange-200 hover:bg-orange-500/20"
            onClick={onResetDials}
          >
            <RotateCcw className="h-3 w-3" /> Reset dials &amp; try another
          </Button>
        )}
      </div>
    )
  }

  if (stars < 3) return null
  const remaining = remainingBreakAttributes(breaksRecord)
  if (remaining.length === 0) return null
  const collected = BREAK_ATTRIBUTES.length - remaining.length

  return (
    <div data-testid="break-invite" className="rounded-lg border border-orange-500/40 bg-orange-500/10 p-3">
      <div className="flex items-center gap-2">
        <Hammer className="h-4 w-4 text-orange-400" />
        <span className="text-xs font-bold text-orange-200">Now break it</span>
        <span className="ml-auto text-[0.625rem] text-orange-300/80">{collected}/4 collected</span>
      </div>
      <p className="mt-1.5 text-[0.6875rem] leading-snug text-orange-200/80">
        Your build holds the quest's demand — now find where it shatters. The traffic dials just
        unlocked: change <span className="font-semibold text-orange-200">ONE</span> of them and
        re-run. Each dial that fells the build pays 1 Expert point.
      </p>
      <div className="mt-1.5 flex flex-wrap gap-1">
        {remaining.map((a) => (
          <span
            key={a}
            data-testid={`break-attr-${a}`}
            className="rounded-full border border-orange-500/30 bg-orange-500/15 px-2 py-0.5 text-[0.625rem] text-orange-200"
          >
            {BREAK_ATTRIBUTE_LABELS[a]}
          </span>
        ))}
      </div>
      {/* 2026-06-11 playtest: the invite needs its own CTA — "what do I press next?" Closes back
          to the canvas where the dials are unlocked and Rerun waits in the start slot. */}
      <button
        type="button"
        data-testid="break-proceed"
        onClick={onProceed}
        className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-md bg-orange-500/90 px-3 py-1.5 text-xs font-bold text-white transition-colors hover:bg-orange-500"
      >
        <Hammer className="h-3.5 w-3.5" />
        Let's break it
      </button>
    </div>
  )
}
