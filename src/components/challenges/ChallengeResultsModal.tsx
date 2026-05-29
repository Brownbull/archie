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
import { SuggestionCard } from "@/components/challenges/SuggestionCard"

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

  const suggestion = useChallengeSuggestion()

  const attemptState = useChallengeStore((s) => s.attemptState)
  const challenge = useChallengeStore((s) => s.activeChallenge)
  const result = useChallengeStore((s) => s.lastResult)
  const measured = useChallengeStore((s) => s.lastMeasured)
  const selectChallenge = useChallengeStore((s) => s.selectChallenge)
  const reset = useChallengeStore((s) => s.reset)
  const resetSim = useSimulationStore((s) => s.reset)

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
            detail={`$${measured.totalCost}/$${challenge.budgetCap}/mo`}
          />
          <Criterion
            met={result.cleanTopology}
            label="Clean topology"
            detail={measured.topologyIssueCount === 0 ? "no issues" : `${measured.topologyIssueCount} issue${measured.topologyIssueCount === 1 ? "" : "s"}`}
          />
        </div>

        {suggestion && <SuggestionCard result={suggestion} />}

        <DialogFooter>
          <Button data-testid="result-close" variant="ghost" size="sm" onClick={onClose}>
            Close
          </Button>
          <Button data-testid="result-retry" size="sm" onClick={onRetry}>
            Retry
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
