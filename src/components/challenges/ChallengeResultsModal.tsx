import { useMemo, useState, useEffect, type ReactNode } from "react"
import { Check, X as XIcon, Map, ShieldCheck } from "lucide-react"
import { metricTone } from "@/lib/metricTone"
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
import { getChallengePar } from "@/lib/challengePar"
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

function Criterion({ met, label, detail }: { met: boolean; label: string; detail: ReactNode }) {
  // A plain-string detail keeps the old met/red coloring; a ReactNode detail (the colored metric chips,
  // the colored budget figure) brings its OWN per-value color, so don't override it.
  const stringDetail = typeof detail === "string"
  return (
    <div data-testid={`result-${label.toLowerCase().replace(/\s+/g, "-")}`} data-met={met || undefined} className="flex items-center justify-between gap-3 rounded-md border border-archie-border bg-surface px-3 py-1.5">
      <div className="flex items-center gap-2">
        {met ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <XIcon className="h-3.5 w-3.5 text-red-400" />}
        <span className="text-xs text-text-primary">{label}</span>
      </div>
      <span className={`text-[0.625rem] ${stringDetail ? (met ? "text-text-secondary" : "text-red-400") : ""}`}>{detail}</span>
    </div>
  )
}

/** A measured-vs-target metric, colored by metricTone (green pass / amber near / red fail). D74. */
function MetricChip({ type, label, measured, target, unit, goodWhenLower, digits }: {
  type: string; label: string; measured: number; target: number; unit: string; goodWhenLower: boolean; digits: number
}) {
  const tone = metricTone(measured, target, goodWhenLower, digits)
  return (
    <span data-metric-type={type} data-pass={tone.pass} className="whitespace-nowrap" title={`measured ${measured.toFixed(digits)}${unit} vs target ${target}${unit}`}>
      <span className="text-text-secondary">{label} </span>
      <span className={`font-semibold ${tone.cls}`}>{measured.toFixed(digits)}{unit}</span>
      <span className="text-text-secondary">/{target}{unit}</span>
    </span>
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

  // LX3 (D74): the lean reference build's cost/nodes — a benchmark so the learner can tell a lean
  // clear from a wasteful one (the "mastered" coach says "spend less"; this gives the target).
  const par = getChallengePar(challenge.id)

  // Metrics detail (D74): every target is shown as a measured-vs-target chip, colored by metricTone
  // (green pass / amber within 10% / red fail) — uptime + p99 always; p95, cost/req, and consistency
  // only when authored. So a failing run shows EXACTLY which factor missed and by how much.
  const tm = challenge.targetMetrics
  const metricChips: Array<{ type: string; label: string; measured: number; target: number; unit: string; goodWhenLower: boolean; digits: number }> = [
    { type: "uptime", label: "uptime", measured: measured.uptimePercent, target: tm.uptimePercent, unit: "%", goodWhenLower: false, digits: 1 },
    { type: "p99", label: "p99", measured: measured.p99LatencyMs, target: tm.p99LatencyMs, unit: "ms", goodWhenLower: true, digits: 0 },
  ]
  if (tm.p95LatencyMs !== undefined && measured.p95LatencyMs !== undefined) {
    metricChips.push({ type: "p95", label: "p95", measured: measured.p95LatencyMs, target: tm.p95LatencyMs, unit: "ms", goodWhenLower: true, digits: 0 })
  }
  if (tm.costPerRequest !== undefined && measured.costPerRequest !== undefined) {
    // ED7 (D74): $ per MILLION requests at peak demand — a real, transferable cost-efficiency unit.
    metricChips.push({ type: "cost", label: "$/M-req", measured: measured.costPerRequest, target: tm.costPerRequest, unit: "", goodWhenLower: true, digits: 4 })
  }
  if (challenge.consistencyTargetMs !== undefined) {
    // EN4/ED8 (D74): worst read staleness vs the consistency budget. Unmeasured (no write/read DB on
    // the path) ⇒ Infinity ⇒ shows red — you can't claim a staleness bound you never produced.
    metricChips.push({ type: "consistency", label: "staleness", measured: measured.maxStalenessMs ?? Infinity, target: challenge.consistencyTargetMs, unit: "ms", goodWhenLower: true, digits: 0 })
  }
  const budgetTone = metricTone(measured.totalCost, challenge.budgetCap, true, 0)

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
            detail={
              <span className="flex flex-wrap justify-end gap-x-2 gap-y-0.5">
                {metricChips.map((m) => (
                  <MetricChip key={m.type} {...m} />
                ))}
              </span>
            }
          />
          {/* LX2 (D74): when metrics fail, name the culprit tier so the fix is obvious. */}
          {!result.passedMetrics && measured.bottleneck && (
            <p data-testid="result-bottleneck" className="-mt-0.5 px-3 text-[0.625rem] text-amber-400">
              ↳ {COMPONENT_TYPES.get(measured.bottleneck.typeId)?.label ?? measured.bottleneck.typeId} peaked at{" "}
              {Math.round(measured.bottleneck.capacityPercent * 100)}% capacity — scale it up or front it with a cache.
            </p>
          )}
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
            detail={
              <span data-metric-type="budget" data-pass={budgetTone.pass} className="whitespace-nowrap">
                <span className={`font-semibold ${budgetTone.cls}`}>${measured.totalCost}</span>
                <span className="text-text-secondary"> of ${challenge.budgetCap}/mo</span>
              </span>
            }
          />
          <Criterion
            met={result.cleanTopology}
            label="Well-formed"
            detail={result.cleanTopology ? "no orphaned or unreachable nodes" : `${measured.topologyIssueCount} disconnected node${measured.topologyIssueCount === 1 ? "" : "s"}`}
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
          {/* Resilient (D72): non-star recognition — a no-single-point-of-failure build (no SPOF, every
              replicated tier behind a load balancer). Not required for 3★; surfaced as a bonus badge. */}
          {result.resilient && (
            <div
              data-testid="result-resilient-badge"
              className="flex items-center gap-2 rounded-md border border-violet-500/40 bg-violet-500/10 px-3 py-1.5"
            >
              <ShieldCheck className="h-3.5 w-3.5 text-violet-300" />
              <span className="text-xs text-violet-200">Resilient</span>
              {/* restore-redundancy (D74): on a zone-outage challenge, say WHY it's resilient — the
                  redundancy demonstrably rode out the outage, not just "no SPOF in the abstract" (LX6). */}
              <span className="ml-auto text-[0.625rem] text-violet-300/80">
                {result.resilienceEarned ? "rode out the zone outage — redundancy paid off" : "no single point of failure — bonus"}
              </span>
            </div>
          )}
        </div>

        {/* LX3 (D74): lean-reference benchmark — a concrete "par" so 3★ isn't the end of the lesson. */}
        {par && (
          <div data-testid="result-par" className="rounded-md border border-archie-border bg-surface px-3 py-1.5 text-[0.6875rem] text-text-secondary">
            <span className="font-medium text-text-primary">Lean reference:</span> ${par.cost}/mo · {par.nodes} nodes
            {measured.totalCost <= par.cost
              ? <span className="ml-1 text-emerald-400">— you matched or beat it 🎯</span>
              : <span className="ml-1">— you: ${measured.totalCost}/mo · room to trim</span>}
          </div>
        )}

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
