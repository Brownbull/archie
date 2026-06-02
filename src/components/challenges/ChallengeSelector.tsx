import { useMemo, useState } from "react"
import { Trophy, Star, Lock, LogIn } from "lucide-react"
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { getAllChallenges } from "@/services/challengeLoader"
import { useChallengeStore } from "@/stores/challengeStore"
import { useArchitectureStore } from "@/stores/architectureStore"
import { useSimulationStore } from "@/stores/simulationStore"
import { usePreferencesStore } from "@/stores/preferencesStore"
import { useUserProgressStore } from "@/stores/userProgressStore"
import { useCurrentUserId } from "@/hooks/useCurrentUserId"
import { makeTrafficSourceNode, curvePeakRps } from "@/services/trafficSourceInjection"
import { useUiStore } from "@/stores/uiStore"
import { resolveTechTree } from "@/engine/techTree"
import { rankForXp, relativeLevelForTier, RELATIVE_LEVEL_COLORS, CHALLENGE_TRACKS, type RelativeLevel } from "@/lib/challengeTracks"
import type { Challenge, TechTreeNode } from "@/lib/challengeTypes"

const LEVEL_LABEL: Record<RelativeLevel, string> = {
  trivial: "Trivial",
  easy: "Easy",
  "on-level": "On Level",
  tough: "Tough",
  hard: "Hard",
  locked: "Locked",
}

function StarRow({ earned }: { earned: number }) {
  return (
    <div className="flex gap-0.5" data-testid="challenge-best-stars" aria-label={`${earned} of 3 stars`}>
      {[1, 2, 3].map((n) => (
        <Star key={n} className={`h-3 w-3 ${n <= earned ? "fill-yellow-400 text-yellow-400" : "text-text-secondary"}`} />
      ))}
    </div>
  )
}

function LevelBadge({ level }: { level: RelativeLevel }) {
  const color = RELATIVE_LEVEL_COLORS[level]
  return (
    <span
      data-testid="challenge-level-badge"
      className="rounded-full px-1.5 py-0.5 text-[0.5625rem] font-bold uppercase"
      style={{ backgroundColor: `${color}20`, color }}
    >
      {LEVEL_LABEL[level]}
    </span>
  )
}

export function ChallengeSelector({ hideTrigger = false }: { hideTrigger?: boolean } = {}) {
  const open = useUiStore((s) => s.challengesOpen)
  const setOpen = useUiStore((s) => s.setChallengesOpen)
  const challenges = getAllChallenges()
  const bestStars = useChallengeStore((s) => s.bestStars)
  const selectChallenge = useChallengeStore((s) => s.selectChallenge)
  const [pending, setPending] = useState<Challenge | null>(null)

  const userId = useCurrentUserId()
  const completedChallenges = useUserProgressStore((s) => s.completedChallenges)
  const trackXp = useUserProgressStore((s) => s.trackXp)

  const tree = useMemo(
    () => resolveTechTree(challenges, completedChallenges),
    [challenges, completedChallenges],
  )

  const startChallenge = (c: Challenge) => {
    try {
      const peak = curvePeakRps(c.trafficCurve)
      const source = makeTrafficSourceNode(peak, { x: 64, y: 240 })
      useSimulationStore.getState().reset()
      useArchitectureStore.getState().loadArchitecture(source ? [source] : [], [])
    } catch {
      // ignore
    }
    usePreferencesStore.getState().setExperienceLevel(c.difficulty)
    selectChallenge(c)
    setOpen(false)
    setPending(null)
  }

  const onPick = (c: Challenge, node: TechTreeNode | undefined) => {
    if (!userId) return
    if (node?.status === "locked") return
    if (useArchitectureStore.getState().nodes.length > 0) {
      setOpen(false)
      setPending(c)
      return
    }
    startChallenge(c)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {!hideTrigger && (
        <DialogTrigger asChild>
          <Button data-testid="open-challenges" variant="ghost" size="sm" className="gap-1.5">
            <Trophy className="h-3.5 w-3.5" />
            Challenges
          </Button>
        </DialogTrigger>
      )}
      <DialogContent data-testid="challenge-selector" className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Architecture Challenges</DialogTitle>
          <DialogDescription>Build to the brief, run the simulation, and earn up to 3 stars.</DialogDescription>
        </DialogHeader>

        {!userId ? (
          <div data-testid="challenge-login-required" className="flex flex-col items-center gap-3 py-8 text-center">
            <LogIn className="h-8 w-8 text-text-secondary" />
            <p className="text-sm text-text-secondary">Sign in to access Challenge Mode.</p>
            <p className="text-xs text-text-secondary">Your progress is saved to your account.</p>
          </div>
        ) : challenges.length === 0 ? (
          <p data-testid="challenge-empty" className="py-6 text-center text-sm text-text-secondary">
            No challenges available yet.
          </p>
        ) : (
          <div className="grid max-h-[60vh] grid-cols-1 gap-2 overflow-y-auto sm:grid-cols-2">
            {tree.ordered.map((node) => {
              const c = node.challenge
              const isLocked = node.status === "locked"
              const playerRank = c.track ? rankForXp(trackXp[c.track] ?? 0).rank : 0
              const level = c.tier ? relativeLevelForTier(playerRank, c.tier) : "on-level"
              const trackMeta = c.track ? CHALLENGE_TRACKS.get(c.track) : undefined

              return (
                <button
                  key={c.id}
                  type="button"
                  data-testid={`challenge-card-${c.id}`}
                  data-status={node.status}
                  onClick={() => onPick(c, node)}
                  disabled={isLocked}
                  className={`flex flex-col gap-1.5 rounded-md border p-3 text-left transition-colors ${
                    isLocked
                      ? "cursor-not-allowed border-archie-border/50 bg-surface/50 opacity-60"
                      : "border-archie-border bg-surface hover:border-blue-500/60"
                  }`}
                >
                  <div className="flex items-center justify-between gap-1">
                    <span className="truncate text-sm font-semibold text-text-primary">
                      {isLocked && <Lock className="mr-1 inline h-3 w-3 text-text-secondary" />}
                      {c.title}
                    </span>
                    <LevelBadge level={level} />
                  </div>

                  {trackMeta && (
                    <span className="text-[0.5625rem] text-text-secondary">
                      {trackMeta.name} · Tier {c.tier}
                    </span>
                  )}

                  <p className="line-clamp-2 text-[0.6875rem] text-text-secondary">{c.brief}</p>

                  {isLocked && node.missingRequirements.length > 0 && (
                    <p className="text-[0.5625rem] text-amber-400">
                      Requires: {node.missingRequirements.join(", ")}
                    </p>
                  )}

                  <div className="flex items-center justify-between text-[0.625rem] text-text-secondary">
                    <span>
                      ${c.budgetCap}/mo · {c.durationSeconds}s
                      {c.rewards?.xp ? ` · ${c.rewards.xp} XP` : ""}
                    </span>
                    <StarRow earned={bestStars[c.id] ?? 0} />
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </DialogContent>

      <Dialog open={pending !== null} onOpenChange={(o) => { if (!o) setPending(null) }}>
        <DialogContent data-testid="challenge-clear-confirm" className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Start &ldquo;{pending?.title}&rdquo;?</DialogTitle>
            <DialogDescription>
              Starting a challenge clears your current canvas and sets up a fresh diagram with a
              traffic source. Your in-progress work will be removed.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setPending(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              data-testid="challenge-clear-confirm-start"
              onClick={() => pending && startChallenge(pending)}
            >
              Clear &amp; start
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Dialog>
  )
}
