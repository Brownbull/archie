import { useMemo } from "react"
import { Check, X as XIcon } from "lucide-react"
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
import { useUserProgressStore, type XpAwardResult } from "@/stores/userProgressStore"
import { useChallengeAutoScore } from "@/hooks/useChallengeAutoScore"
import { useChallengeSuggestion } from "@/hooks/useChallengeSuggestion"
import { useAttemptPersistence } from "@/hooks/useAttemptPersistence"
import { useProgressPersistence } from "@/hooks/useProgressPersistence"
import { useAttemptComparison } from "@/hooks/useAttemptComparison"
import { SuggestionCard } from "@/components/challenges/SuggestionCard"
import { DeltaChip } from "@/components/challenges/DeltaChip"
import { CHALLENGE_TRACKS, rankForXp, MASTERY_RANKS, RANK_XP_THRESHOLDS } from "@/lib/challengeTracks"
import { getMasteryAvatar } from "@/lib/masteryAvatars"
import starFilled from "@/assets/star-filled.png"
import starEmpty from "@/assets/star-empty.png"
import starNew from "@/assets/star-new.png"

function PixelStar({ earned, isNew }: { earned: boolean; isNew: boolean }) {
  const src = earned ? (isNew ? starNew : starFilled) : starEmpty
  return <img src={src} alt={earned ? "★" : "☆"} className="h-10 w-10" style={{ imageRendering: "pixelated" }} />
}

function Criterion({ met, label, detail }: { met: boolean; label: string; detail: string }) {
  return (
    <div data-testid={`result-${label.toLowerCase().replace(/\s+/g, "-")}`} data-met={met || undefined} className="flex items-center justify-between gap-3 rounded-md border border-archie-border bg-surface px-3 py-1.5">
      <div className="flex items-center gap-2">
        {met ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <XIcon className="h-3.5 w-3.5 text-red-400" />}
        <span className="text-xs text-text-primary">{label}</span>
      </div>
      <span className={`text-[0.625rem] ${met ? "text-text-secondary" : "text-red-400"}`}>{detail}</span>
    </div>
  )
}

function XpProgressSection({ award, track }: { award: XpAwardResult | null; track: string | undefined }) {
  const trackMeta = track ? CHALLENGE_TRACKS.get(track) : undefined
  if (!award || !trackMeta) return null

  const prevRank = rankForXp(award.prevTrackXp)
  const newRank = rankForXp(award.newTrackXp)
  const prevThreshold = RANK_XP_THRESHOLDS[prevRank.rank]
  const nextThreshold = prevRank.rank < MASTERY_RANKS.length - 1 ? RANK_XP_THRESHOLDS[prevRank.rank + 1] : prevThreshold
  const range = nextThreshold - prevThreshold || 1
  const prevPct = Math.min(100, ((award.prevTrackXp - prevThreshold) / range) * 100)
  const newPct = Math.min(100, ((award.newTrackXp - prevThreshold) / range) * 100)
  const avatar = getMasteryAvatar(newRank.rank)
  const ranked = newRank.rank > prevRank.rank

  return (
    <div data-testid="xp-progress-section" className="rounded-lg border border-archie-border bg-surface p-3">
      <div className="flex items-center gap-3">
        {avatar && (
          <img src={avatar} alt={newRank.name} className="h-12 w-12 rounded-lg" style={{ imageRendering: "pixelated" }} />
        )}
        <div className="flex-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-text-primary">{trackMeta.name}</span>
            <span className="text-xs text-text-secondary">{newRank.name}</span>
          </div>
          <div className="relative mt-1.5 h-3 w-full overflow-hidden rounded-full bg-panel">
            <div
              className="absolute inset-y-0 left-0 rounded-full bg-blue-500/30"
              style={{ width: `${newPct}%` }}
            />
            <div
              className="absolute inset-y-0 left-0 rounded-full bg-blue-500 transition-all duration-1000"
              style={{ width: `${prevPct}%`, animation: `xp-fill 1s ease-out forwards` }}
            />
            <style>{`@keyframes xp-fill { to { width: ${newPct}% } }`}</style>
          </div>
          <div className="mt-1 flex items-center justify-between">
            <span className="text-[0.625rem] font-semibold text-blue-400">+{award.xpAwarded} XP</span>
            <span className="text-[0.5625rem] text-text-secondary">{award.newTrackXp} / {nextThreshold} XP</span>
          </div>
          {ranked && (
            <div className="mt-1 rounded-full bg-yellow-500/20 px-2 py-0.5 text-center text-[0.625rem] font-bold text-yellow-300">
              Rank Up! → {newRank.name}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export function ChallengeResultsModal() {
  useChallengeAutoScore()
  useAttemptPersistence()
  useProgressPersistence()

  const suggestion = useChallengeSuggestion()
  const lastAward = useUserProgressStore((s) => s.lastAward)

  const attemptState = useChallengeStore((s) => s.attemptState)
  const challenge = useChallengeStore((s) => s.activeChallenge)
  const result = useChallengeStore((s) => s.lastResult)
  const measured = useChallengeStore((s) => s.lastMeasured)
  const selectChallenge = useChallengeStore((s) => s.selectChallenge)
  const reset = useChallengeStore((s) => s.reset)
  const resetSim = useSimulationStore((s) => s.reset)

  const priorBest = useAttemptComparison(challenge?.id ?? "", {
    stars: result?.stars ?? 0,
    totalCost: measured?.totalCost ?? 0,
    p99LatencyMs: measured?.p99LatencyMs ?? 0,
    uptimePercent: measured?.uptimePercent ?? 0,
  })

  const prevBestStars = useMemo(() => {
    if (!challenge) return 0
    return lastAward?.prevStars ?? 0
  }, [challenge, lastAward])

  const open = attemptState === "scored" && !!challenge && !!result && !!measured
  if (!open) return null

  const onRetry = () => {
    resetSim()
    selectChallenge(challenge)
  }
  const onClose = () => {
    resetSim()
    reset()
  }

  const xpPerStar = challenge.rewards?.xp ? Math.ceil(challenge.rewards.xp / 3) : 0

  return (
    <Dialog open onOpenChange={(next) => !next && onClose()}>
      <DialogContent data-testid="challenge-results" className="max-w-md">
        <DialogHeader className="text-center">
          <DialogTitle>{challenge.title}</DialogTitle>
          <DialogDescription>
            {result.stars > 0 ? "Challenge passed" : "Targets not met — adjust and retry"}
          </DialogDescription>
        </DialogHeader>

        <div className="flex justify-center gap-2 py-2" data-testid="result-stars" aria-label={`${result.stars} of 3 stars`}>
          {[1, 2, 3].map((n) => (
            <div key={n} className="flex flex-col items-center gap-0.5">
              <PixelStar earned={n <= result.stars} isNew={n <= result.stars && n > prevBestStars} />
              {xpPerStar > 0 && (
                <span className={`text-[0.5rem] font-medium ${n <= result.stars ? "text-yellow-400" : "text-text-secondary"}`}>
                  {n <= result.stars && n > prevBestStars ? `+${xpPerStar}` : n <= prevBestStars ? `${xpPerStar}` : "—"}
                </span>
              )}
            </div>
          ))}
        </div>

        <div className="flex flex-col gap-1">
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

        {challenge.origin === "builtin" && <XpProgressSection award={lastAward} track={challenge.track} />}

        {priorBest && (
          <div data-testid="vs-past-attempts" className="rounded-md border border-archie-border bg-surface px-3 py-1.5">
            <p className="mb-1 text-[0.625rem] font-medium text-text-secondary">vs your best ({priorBest.stars}★)</p>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <DeltaChip testid="vs-delta-uptime" label="uptime" value={measured.uptimePercent - priorBest.uptimePercent} decimals={1} unit="pp" goodWhenNegative={false} />
              <DeltaChip testid="vs-delta-latency" label="p99" value={measured.p99LatencyMs - priorBest.p99LatencyMs} decimals={0} unit="ms" goodWhenNegative />
              <DeltaChip testid="vs-delta-cost" label="cost" value={measured.totalCost - priorBest.totalCost} decimals={0} unit="$/mo" goodWhenNegative />
            </div>
          </div>
        )}

        {suggestion && <SuggestionCard result={suggestion} />}

        <DialogFooter>
          <Button data-testid="result-close" variant="ghost" size="sm" onClick={onClose}>
            Close
          </Button>
          <Button data-testid="result-retry" size="sm" onClick={onRetry}>
            Adjust &amp; retry
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
