import { useMemo } from "react"
import { Hammer, Wrench, RotateCcw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useUserProgressStore } from "@/stores/userProgressStore"
import { useArchitectureStore } from "@/stores/architectureStore"
import { feasibleBreakDials } from "@/services/breakProbe"
import { remainingBreakAttributes, BREAK_ATTRIBUTE_LABELS, type BreaksRecord, type BreakAttribute } from "@/engine/breakDetection"
import { questBreakDials } from "@/lib/challengeBreakDials"
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
/**
 * The quest's Expert ledger, star-row style (2026-06-11 playtest): one wrench slot per traffic
 * dial — shadow when unearned, lit when collected, and the one collected THIS run slams in like
 * a star. Renders at the top of every break card so the earnable currency is always in view.
 */
function ExpertSlots({ record, freshAttribute, dials }: { record: BreaksRecord | undefined; freshAttribute: BreakAttribute | null; dials: readonly BreakAttribute[] }) {
  return (
    <div data-testid="expert-slots" className="mb-2 flex items-center justify-center gap-3">
      {dials.map((a) => {
        const earned = !!record?.[a]
        const fresh = a === freshAttribute
        return (
          <span
            key={a}
            data-testid={`expert-slot-${a}`}
            data-earned={earned || undefined}
            data-fresh={fresh || undefined}
            title={`${BREAK_ATTRIBUTE_LABELS[a]} — ${earned ? "Expert collected" : "1 Expert if this dial fells the build"}`}
            className={earned ? "text-orange-400" : "text-orange-200/20"}
            style={fresh ? { animation: "expert-slam 0.45s ease-out both" } : undefined}
          >
            <Wrench className="h-5 w-5" strokeWidth={earned ? 2.5 : 1.5} />
          </span>
        )
      })}
      <style>{`
        @keyframes expert-slam {
          0% { transform: scale(0) rotate(-30deg); opacity: 0; }
          60% { transform: scale(1.4) rotate(8deg); opacity: 1; }
          100% { transform: scale(1) rotate(0deg); opacity: 1; }
        }
      `}</style>
    </div>
  )
}

export function BreakItPanel({ challenge, stars, outcome, onResetDials, onProceed }: BreakItPanelProps) {
  const breaksRecord = useUserProgressStore((s) => s.breaksByChallenge[challenge.id])
  // Hooks live ABOVE every conditional return (hook-order invariant). The feasibility probe only
  // actually runs when the INVITE will render (3★, single-source, no outcome): ≤18 engine sims
  // against the build that just ran — the chips tell the truth about THIS build (D101 follow-up).
  const dials = questBreakDials(challenge.id)
  const willInvite = stars >= 3 && !outcome && (challenge.trafficSources?.length ?? 0) > 0
    && remainingBreakAttributes(breaksRecord, dials).length > 0
  const feasibility = useMemo(() => {
    if (!willInvite || challenge.trafficSources?.length !== 1) return null
    const { nodes, edges } = useArchitectureStore.getState()
    return feasibleBreakDials(nodes, edges, challenge)
  }, [challenge, willInvite])
  if (!challenge.trafficSources?.length) return null

  // D101: a failed credit still teaches — overshoot says "find the edge", not-causal says
  // "the load alone would've done it". Neither pays; both point at the precision game.
  if (outcome && outcome.verdict !== "collected") {
    return (
      <div data-testid={`break-${outcome.verdict}`} className="rounded-lg border border-orange-500/30 bg-orange-500/5 p-3">
        <ExpertSlots record={breaksRecord} freshAttribute={null} dials={dials} />
        <div className="flex items-center gap-2">
          <Hammer className="h-4 w-4 text-orange-400/70" />
          <span className="text-xs font-bold text-orange-200/90">
            {outcome.verdict === "overshoot" ? "Broken — but anything breaks at that load" : `Broken — but not by ${BREAK_ATTRIBUTE_LABELS[outcome.attribute]}`}
          </span>
          <span className="ml-auto text-[0.6875rem] text-orange-300/60">no Expert</span>
        </div>
        <p className="mt-1.5 text-[0.6875rem] leading-snug text-orange-200/70">
          {outcome.verdict === "overshoot"
            ? "The point pays for FINDING the failure boundary: bring the load down and hunt for where it first breaks (within 2× pays)."
            : "At this load the build falls with the authored value too. Find a level the authored setting survives — where only YOUR change makes the difference."}
        </p>
      </div>
    )
  }

  if (outcome) {
    return (
      <div data-testid="break-collected" className="rounded-lg border border-orange-500/40 bg-orange-500/10 p-3">
        <ExpertSlots record={{ ...breaksRecord, [outcome.attribute]: true }} freshAttribute={outcome.fresh ? outcome.attribute : null} dials={dials} />
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
          {outcome.boundary !== undefined && (
            <span data-testid="break-boundary" className="font-semibold text-orange-200">
              Failure boundary ≈ {outcome.boundary.toLocaleString()} rps.{" "}
            </span>
          )}
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
  const remaining = remainingBreakAttributes(breaksRecord, dials)
  if (remaining.length === 0) return null
  const collected = dials.length - remaining.length

  return (
    <div data-testid="break-invite" className="rounded-lg border border-orange-500/40 bg-orange-500/10 p-3">
      <ExpertSlots record={breaksRecord} freshAttribute={null} dials={dials} />
      <div className="flex items-center gap-2">
        <Hammer className="h-4 w-4 text-orange-400" />
        <span className="text-xs font-bold text-orange-200">Now break it</span>
        <span className="ml-auto text-[0.625rem] text-orange-300/80">{collected}/{dials.length} collected</span>
      </div>
      <p className="mt-1.5 text-[0.6875rem] leading-snug text-orange-200/80">
        Your build holds the quest's demand — now find where it shatters. The traffic dials just
        unlocked. <span className="font-semibold text-orange-200">Peak RPS</span> pays when you find
        roughly where it FIRST breaks (within 2× of the boundary — brute force pays nothing). The
        other dials pay when <span className="font-semibold text-orange-200">they</span> make the
        difference: raise the load to where the authored setting survives but your change doesn't.
      </p>
      <div className="mt-1.5 flex flex-wrap gap-1">
        {remaining.map((a) => {
          const infeasible = feasibility !== null && !feasibility[a]
          return (
            <span
              key={a}
              data-testid={`break-attr-${a}`}
              data-feasible={feasibility === null ? undefined : !infeasible}
              title={infeasible ? `This build can't be felled by ${BREAK_ATTRIBUTE_LABELS[a]} — no load makes it the deciding dial` : undefined}
              className={infeasible
                ? "rounded-full border border-orange-500/10 bg-orange-500/5 px-2 py-0.5 text-[0.625rem] text-orange-200/30 line-through"
                : "rounded-full border border-orange-500/30 bg-orange-500/15 px-2 py-0.5 text-[0.625rem] text-orange-200"}
            >
              {BREAK_ATTRIBUTE_LABELS[a]}
            </span>
          )
        })}
      </div>
      {feasibility !== null && (
        <p data-testid="break-feasible-count" className="mt-1 text-[0.625rem] text-orange-300/70">
          {(() => {
            const reachable = remaining.filter((a) => feasibility[a]).length
            return reachable === 0
              ? "None of the remaining dials can fell THIS build — it out-scales them. (A leaner build breaks more interestingly.)"
              : `${reachable} of ${remaining.length} remaining dial${remaining.length === 1 ? "" : "s"} can fell this build.`
          })()}
        </p>
      )}
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
