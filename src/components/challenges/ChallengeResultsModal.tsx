import { Star, Check, X as XIcon } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { useChallengeStore } from "@/stores/challengeStore"
import { useSimulationStore } from "@/stores/simulationStore"
import { useChallengeAutoScore } from "@/hooks/useChallengeAutoScore"
import { useChallengeSuggestion } from "@/hooks/useChallengeSuggestion"
import { useAttemptPersistence } from "@/hooks/useAttemptPersistence"
import { useAttemptComparison } from "@/hooks/useAttemptComparison"
import { SuggestionCard } from "@/components/challenges/SuggestionCard"
import { DeltaChip } from "@/components/challenges/DeltaChip"

function Criterion({ met, label, detail }: { met: boolean; label: string; detail: string }) {
  return (
    <div data-testid={`result-${label.toLowerCase().replace(/\s+/g, "-")}`} data-met={met || undefined} className="flex items-center justify-between gap-3 rounded-md border border-archie-border bg-surface px-3 py-2">
      <div className="flex items-center gap-2">
        {met ? <Check className="h-4 w-4 text-emerald-400" /> : <XIcon className="h-4 w-4 text-red-400" />}
        <span className="text-sm text-text-primary">{label}</span>
      </div>
      <span className={`text-xs ${met ? "text-text-secondary" : "text-red-400"}`}>{detail}</span>
    </div>
  )
}

/**
 * Challenge results modal (Epic 16 Phase 4). Hosts the auto-score hook (so a finished
 * simulation is scored even when the modal isn't visible) and renders the star breakdown
 * once the attempt is "scored". Retry re-enters build mode; Close leaves challenge mode.
 * Both clear the finished simulation so the canvas is ready for the next run.
 */
export function ChallengeResultsModal() {
  useChallengeAutoScore()
  useAttemptPersistence()

  const suggestion = useChallengeSuggestion()

  const attemptState = useChallengeStore((s) => s.attemptState)
  const challenge = useChallengeStore((s) => s.activeChallenge)
  const result = useChallengeStore((s) => s.lastResult)
  const measured = useChallengeStore((s) => s.lastMeasured)
  const selectChallenge = useChallengeStore((s) => s.selectChallenge)
  const reset = useChallengeStore((s) => s.reset)
  const resetSim = useSimulationStore((s) => s.reset)

  // Solo progress loop (P4): compare this attempt to the user's best prior attempt at the
  // same challenge. Called unconditionally (hooks rule); inert until a challenge is scored.
  const priorBest = useAttemptComparison(challenge?.id ?? "", {
    stars: result?.stars ?? 0,
    totalCost: measured?.totalCost ?? 0,
    p99LatencyMs: measured?.p99LatencyMs ?? 0,
    uptimePercent: measured?.uptimePercent ?? 0,
  })

  const open = attemptState === "scored" && !!challenge && !!result && !!measured
  if (!open) return null

  const onRetry = () => {
    resetSim()
    selectChallenge(challenge) // → building, keeps bestStars
  }
  const onClose = () => {
    resetSim()
    reset()
  }

  return (
    <Dialog open onOpenChange={(next) => !next && onClose()}>
      <DialogContent data-testid="challenge-results" className="max-w-md">
        <DialogHeader>
          <DialogTitle>{challenge.title} — Results</DialogTitle>
          <DialogDescription>
            {result.stars > 0 ? "Challenge passed." : "Targets not met — adjust the architecture and retry."}
          </DialogDescription>
        </DialogHeader>

        <div className="flex justify-center gap-1.5 py-1" data-testid="result-stars" aria-label={`${result.stars} of 3 stars`}>
          {[1, 2, 3].map((n) => (
            <Star key={n} className={`h-8 w-8 ${n <= result.stars ? "fill-yellow-400 text-yellow-400" : "text-text-secondary"}`} />
          ))}
        </div>

        <div className="flex flex-col gap-1.5">
          <Criterion
            met={result.passedMetrics}
            label="Metrics"
            detail={`uptime ${measured.uptimePercent.toFixed(1)}%/${challenge.targetMetrics.uptimePercent}% · p99 ${Math.round(measured.p99LatencyMs)}/${challenge.targetMetrics.p99LatencyMs}ms`}
          />
          <Criterion
            met={result.underBudget}
            label="Under budget"
            detail={`$${measured.totalCost} of $${challenge.budgetCap}/mo`}
          />
          <Criterion
            met={result.cleanTopology}
            label="Clean topology"
            detail={measured.topologyIssueCount === 0 ? "no issues" : `${measured.topologyIssueCount} issue${measured.topologyIssueCount === 1 ? "" : "s"}`}
          />
        </div>

        {/* How stars are earned — makes the 0–3 scoring rule explicit. */}
        <p data-testid="scoring-rule" className="text-center text-[0.625rem] text-text-secondary">
          You earn 1★ for each criterion met above — all three for a perfect run.
        </p>

        {/* Solo progress: how this attempt compares to your best prior run (P4). */}
        <div data-testid="vs-past-attempts" className="rounded-md border border-archie-border bg-surface px-3 py-2">
          {priorBest ? (
            <>
              <p className="mb-1.5 text-[0.6875rem] font-medium text-text-secondary">
                vs your best ({priorBest.stars}★)
              </p>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <span data-testid="vs-stars" className="text-[0.6875rem] text-text-secondary">
                  {result.stars > priorBest.stars
                    ? `★ ${priorBest.stars} → ${result.stars} (new best!)`
                    : result.stars === priorBest.stars
                      ? `★ matched best (${result.stars})`
                      : `★ ${result.stars} (best ${priorBest.stars})`}
                </span>
                <DeltaChip testid="vs-delta-uptime" label="uptime" value={measured.uptimePercent - priorBest.uptimePercent} decimals={1} unit="pp" goodWhenNegative={false} />
                <DeltaChip testid="vs-delta-latency" label="p99" value={measured.p99LatencyMs - priorBest.p99LatencyMs} decimals={0} unit="ms" goodWhenNegative />
                <DeltaChip testid="vs-delta-cost" label="cost" value={measured.totalCost - priorBest.totalCost} decimals={0} unit="$/mo" goodWhenNegative />
              </div>
            </>
          ) : (
            <p data-testid="vs-first-attempt" className="text-[0.6875rem] text-text-secondary">
              First attempt at this challenge — sets your baseline.
            </p>
          )}
        </div>

        {suggestion && <SuggestionCard result={suggestion} />}

        <DialogFooter>
          <Button data-testid="result-close" variant="ghost" size="sm" onClick={onClose}>
            Close
          </Button>
          <Button
            data-testid="result-retry"
            size="sm"
            onClick={onRetry}
            title="Back to editing — your design is kept. Tweak it, then run the simulation again."
          >
            Adjust &amp; retry
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
