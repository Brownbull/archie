import { Trophy, Star } from "lucide-react"
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { getAllChallenges } from "@/services/challengeLoader"
import { useChallengeStore } from "@/stores/challengeStore"
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

export function ChallengeSelector() {
  // Open state lives in uiStore so other surfaces (empty-canvas card, History tab)
  // can open the challenge picker, not just the toolbar trigger button.
  const open = useUiStore((s) => s.challengesOpen)
  const setOpen = useUiStore((s) => s.setChallengesOpen)
  const challenges = getAllChallenges()
  const bestStars = useChallengeStore((s) => s.bestStars)
  const selectChallenge = useChallengeStore((s) => s.selectChallenge)

  const onPick = (c: Challenge) => {
    selectChallenge(c)
    setOpen(false)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button data-testid="open-challenges" variant="ghost" size="sm" className="gap-1.5">
          <Trophy className="h-3.5 w-3.5" />
          Challenges
        </Button>
      </DialogTrigger>
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
                  <span className={`rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase ${DIFFICULTY_STYLE[c.difficulty]}`}>
                    {c.difficulty}
                  </span>
                </div>
                <p className="line-clamp-2 text-[11px] text-text-secondary">{c.brief}</p>
                <div className="flex items-center justify-between text-[10px] text-text-secondary">
                  <span>${c.budgetCap}/mo · {c.durationSeconds}s</span>
                  <StarRow earned={bestStars[c.id] ?? 0} />
                </div>
              </button>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
