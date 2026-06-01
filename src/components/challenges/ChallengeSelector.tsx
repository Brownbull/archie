import { useState } from "react"
import { Trophy, Star } from "lucide-react"
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
import { makeTrafficSourceNode, curvePeakRps } from "@/services/trafficSourceInjection"
import { useUiStore } from "@/stores/uiStore"
import type { Challenge, ChallengeDifficulty } from "@/lib/challengeTypes"

const DIFFICULTY_STYLE: Record<ChallengeDifficulty, string> = {
  beginner: "bg-emerald-500/20 text-emerald-300",
  intermediate: "bg-amber-500/20 text-amber-300",
  advanced: "bg-red-500/20 text-red-300",
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

export function ChallengeSelector({ hideTrigger = false }: { hideTrigger?: boolean } = {}) {
  // Open state lives in uiStore so other surfaces (the Build menu, empty-canvas card, History tab)
  // can open the challenge picker, not just the inline trigger button. `hideTrigger` renders the
  // dialog without its own button — used by the menu bar, which opens it via setChallengesOpen.
  const open = useUiStore((s) => s.challengesOpen)
  const setOpen = useUiStore((s) => s.setChallengesOpen)
  const challenges = getAllChallenges()
  const bestStars = useChallengeStore((s) => s.bestStars)
  const selectChallenge = useChallengeStore((s) => s.selectChallenge)
  // A challenge starts on a clean canvas — confirm first if the user has work that would be wiped.
  const [pending, setPending] = useState<Challenge | null>(null)

  const startChallenge = (c: Challenge) => {
    // Clean canvas seeded with a Traffic Source sized to the challenge's target load, so the request
    // origin is already in place. Best-effort: a seeding hiccup must never block entering.
    try {
      const peak = curvePeakRps(c.trafficCurve)
      const source = makeTrafficSourceNode(peak, { x: 64, y: 240 })
      useSimulationStore.getState().reset()
      useArchitectureStore.getState().loadArchitecture(source ? [source] : [], [])
    } catch {
      // ignore — fall through and still start the challenge
    }
    // Match the global experience level to the challenge difficulty so beginners aren't shown
    // everything for a beginner brief (P86 → P89). ChallengeDifficulty and ExperienceLevel share
    // the same values; the user can still raise/lower the level from the top bar afterward.
    usePreferencesStore.getState().setExperienceLevel(c.difficulty)
    selectChallenge(c)
    setOpen(false)
    setPending(null)
  }

  const onPick = (c: Challenge) => {
    // If there's existing work on the canvas, ask before clearing it.
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
        {challenges.length === 0 ? (
          <p data-testid="challenge-empty" className="py-6 text-center text-sm text-text-secondary">
            No challenges available yet.
          </p>
        ) : (
          <div className="grid max-h-[60vh] grid-cols-1 gap-2 overflow-y-auto sm:grid-cols-2">
            {challenges.map((c) => (
              <button
                key={c.id}
                type="button"
                data-testid={`challenge-card-${c.id}`}
                onClick={() => onPick(c)}
                className="flex flex-col gap-1.5 rounded-md border border-archie-border bg-surface p-3 text-left transition-colors hover:border-blue-500/60"
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-text-primary">{c.title}</span>
                  <span className={`rounded-full px-1.5 py-0.5 text-[0.5625rem] font-bold uppercase ${DIFFICULTY_STYLE[c.difficulty]}`}>
                    {c.difficulty}
                  </span>
                </div>
                <p className="line-clamp-2 text-[0.6875rem] text-text-secondary">{c.brief}</p>
                <div className="flex items-center justify-between text-[0.625rem] text-text-secondary">
                  <span>${c.budgetCap}/mo · {c.durationSeconds}s</span>
                  <StarRow earned={bestStars[c.id] ?? 0} />
                </div>
              </button>
            ))}
          </div>
        )}
      </DialogContent>

      {/* Confirm clearing existing work before starting a challenge on a fresh canvas. */}
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
