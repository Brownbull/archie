import { useMemo, useState, useEffect } from "react"
import { Check, X as XIcon, Map } from "lucide-react"
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
import { useUiStore } from "@/stores/uiStore"
import { useUserProgressStore, type XpAwardResult } from "@/stores/userProgressStore"
import { useChallengeAutoScore } from "@/hooks/useChallengeAutoScore"
import { useChallengeSuggestion } from "@/hooks/useChallengeSuggestion"
import { useAttemptPersistence } from "@/hooks/useAttemptPersistence"
import { useProgressPersistence } from "@/hooks/useProgressPersistence"
import { useAttemptComparison } from "@/hooks/useAttemptComparison"
import { SuggestionCard } from "@/components/challenges/SuggestionCard"
import { DeltaChip } from "@/components/challenges/DeltaChip"
import { CHALLENGE_TRACKS, rankForXp, MASTERY_RANKS, RANK_XP_THRESHOLDS } from "@/lib/challengeTracks"
import { COMPONENT_TYPES } from "@/lib/componentTypes"
import { getMasteryAvatar } from "@/lib/masteryAvatars"
import starFilled from "@/assets/star-filled.png"
import starEmpty from "@/assets/star-empty.png"
import starNew from "@/assets/star-new.png"

/* eslint-disable react-hooks/purity -- decorative confetti: each particle's angle/size/color is
   intentionally randomized per render so the burst varies; determinism/caching is not wanted here. */
function Particle({ delay }: { delay: number }) {
  const angle = Math.random() * 360
  const dist = 20 + Math.random() * 30
  const size = 2 + Math.random() * 3
  const dx = Math.cos(angle * Math.PI / 180) * dist
  const dy = Math.sin(angle * Math.PI / 180) * dist
  return (
    <span
      className="absolute rounded-full"
      style={{
        width: size, height: size,
        backgroundColor: Math.random() > 0.5 ? "#facc15" : "#ff8a3d",
        top: "50%", left: "50%",
        opacity: 0,
        animation: `particle-burst 0.6s ease-out ${delay}s forwards`,
        ["--dx" as string]: `${dx}px`,
        ["--dy" as string]: `${dy}px`,
      }}
    />
  )
}
/* eslint-enable react-hooks/purity */

function AnimatedStar({ earned, isNew, index }: { earned: boolean; isNew: boolean; index: number }) {
  const src = earned ? (isNew ? starNew : starFilled) : starEmpty
  const [showParticles, setShowParticles] = useState(false)
  const delay = earned ? index * 0.35 : 0

  useEffect(() => {
    if (isNew) {
      const t = setTimeout(() => setShowParticles(true), delay * 1000)
      return () => clearTimeout(t)
    }
  }, [isNew, delay])

  return (
    <div className="relative">
      <img
        src={src} alt={earned ? "★" : "☆"}
        className="h-12 w-12"
        style={{
          imageRendering: "pixelated",
          opacity: earned ? 1 : 0.3,
          transform: earned ? "scale(1)" : "scale(0.8)",
          animation: earned ? `star-slam 0.4s ease-out ${delay}s both` : undefined,
        }}
      />
      {showParticles && isNew && (
        <>
          {Array.from({ length: 8 }).map((_, i) => (
            <Particle key={i} delay={0} />
          ))}
        </>
      )}
      <style>{`
        @keyframes star-slam {
          0% { transform: scale(0) rotate(-20deg); opacity: 0; }
          60% { transform: scale(1.3) rotate(5deg); opacity: 1; }
          100% { transform: scale(1) rotate(0deg); opacity: 1; }
        }
        @keyframes particle-burst {
          0% { transform: translate(-50%, -50%) translate(0, 0); opacity: 1; }
          100% { transform: translate(-50%, -50%) translate(var(--dx), var(--dy)); opacity: 0; }
        }
      `}</style>
    </div>
  )
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
    // Keep the sim data so the player can inspect the run afterward.
    // Only clear the challenge's scored state → back to building mode.
    selectChallenge(challenge)
  }

  const xpPerStar = challenge.rewards?.xp ? Math.ceil(challenge.rewards.xp / 3) : 0

  // Metrics detail (ISAPivot Phase 3): uptime + p99 always; p95 + cost/req only when authored as targets.
  const tm = challenge.targetMetrics
  const metricBits = [
    `uptime ${measured.uptimePercent.toFixed(1)}%/${tm.uptimePercent}%`,
    `p99 ${Math.round(measured.p99LatencyMs)}/${tm.p99LatencyMs}ms`,
  ]
  if (tm.p95LatencyMs !== undefined && measured.p95LatencyMs !== undefined) {
    metricBits.push(`p95 ${Math.round(measured.p95LatencyMs)}/${tm.p95LatencyMs}ms`)
  }
  if (tm.costPerRequest !== undefined && measured.costPerRequest !== undefined) {
    metricBits.push(`$/req ${measured.costPerRequest.toFixed(4)}/${tm.costPerRequest}`)
  }

  return (
    <Dialog open onOpenChange={(next) => !next && onClose()}>
      <DialogContent data-testid="challenge-results" className="max-w-md">
        <DialogHeader className="text-center">
          <DialogTitle>{challenge.title}</DialogTitle>
          <DialogDescription>
            {result.stars > 0 ? "Challenge passed" : "Targets not met — adjust and retry"}
          </DialogDescription>
        </DialogHeader>

        <div className="flex justify-center gap-3 py-3" data-testid="result-stars" aria-label={`${result.stars} of 3 stars`}>
          {[1, 2, 3].map((n) => (
            <div key={n} className="flex flex-col items-center gap-1">
              <AnimatedStar earned={n <= result.stars} isNew={n <= result.stars && n > prevBestStars} index={n - 1} />
              {xpPerStar > 0 && (
                <span
                  className={`text-[0.625rem] font-bold ${n <= result.stars ? "text-yellow-400" : "text-text-secondary"}`}
                  style={{ animation: n <= result.stars ? `star-slam 0.3s ease-out ${(n - 1) * 0.35 + 0.2}s both` : undefined }}
                >
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
            detail={metricBits.join(" · ")}
          />
          {challenge.requiredTypes.length > 0 && (
            <Criterion
              met={result.hasRequiredBlocks}
              label="Required blocks"
              detail={result.hasRequiredBlocks
                ? "all deployed"
                : `missing: ${challenge.requiredTypes.map((rt) => COMPONENT_TYPES.get(rt)?.label ?? rt).join(", ")}`}
            />
          )}
          {challenge.forbiddenTypes && challenge.forbiddenTypes.length > 0 && (
            <Criterion
              met={result.forbiddenTypesOk}
              label="No forbidden blocks"
              detail={result.forbiddenTypesOk
                ? "none used"
                : `forbidden: ${challenge.forbiddenTypes.map((ft) => COMPONENT_TYPES.get(ft)?.label ?? ft).join(", ")}`}
            />
          )}
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
          {challenge.requiredTopology && challenge.requiredTopology.length > 0 && (
            <Criterion
              met={result.requiredTopologyOk}
              label="Required wiring"
              detail={result.requiredTopologyOk
                ? `${challenge.requiredTopology.length} rule${challenge.requiredTopology.length === 1 ? "" : "s"} met`
                : `missing: ${challenge.requiredTopology.map((a) => a.description ?? a.ruleType).join("; ")}`}
            />
          )}
          {challenge.trafficSources?.some((s) => s.origin === "multi-region") && (
            <Criterion
              met={result.originRequirementOk}
              label="Multi-region ready"
              detail={result.originRequirementOk ? "CDN + DNS + database present" : "needs CDN + DNS + a database"}
            />
          )}
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

        <DialogFooter className="flex-col gap-2 sm:flex-row">
          <Button data-testid="result-close" variant="ghost" size="sm" onClick={onClose}>
            Close
          </Button>
          <Button data-testid="result-retry" variant="outline" size="sm" onClick={onRetry}>
            Adjust &amp; retry
          </Button>
          {result.stars > 0 && (
            <Button
              data-testid="result-next-quest"
              size="sm"
              className="gap-1.5 bg-[#c9a961] text-[#1a1410] hover:bg-[#d4b872] font-bold"
              onClick={() => {
                selectChallenge(challenge)
                useUiStore.getState().setChallengesOpen(false)
                // Open the Quest Log (journey tree) to pick the next quest.
                useUiStore.getState().setQuestLogOpen(true)
              }}
            >
              <Map className="h-3.5 w-3.5" /> Next Quest
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
