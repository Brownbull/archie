import { Hammer, Play, Activity, TrendingUp, Trophy, type LucideIcon } from "lucide-react"
import { useChallengeCoach, type CoachMode } from "@/hooks/useChallengeCoach"

/**
 * Guided-challenge coach (P88). Shows ONE stage-aware next step inside the challenge HUD so a
 * junior architect always knows what to do now — build it, run it, improve it, experiment.
 * Self-gating: renders nothing outside challenge mode.
 */
interface ModeMeta {
  icon: LucideIcon
  chip: string
  ring: string
}

// Map (not object index) so the union lookup stays clear of object-injection lint.
const MODE_META = new Map<CoachMode, ModeMeta>([
  ["tackle", { icon: Hammer, chip: "bg-blue-500/20 text-blue-300", ring: "border-blue-500/40" }],
  ["run", { icon: Play, chip: "bg-emerald-500/20 text-emerald-300", ring: "border-emerald-500/40" }],
  ["watch", { icon: Activity, chip: "bg-sky-500/20 text-sky-300", ring: "border-sky-500/40" }],
  ["iterate", { icon: TrendingUp, chip: "bg-amber-500/20 text-amber-300", ring: "border-amber-500/40" }],
  ["mastered", { icon: Trophy, chip: "bg-yellow-500/20 text-yellow-300", ring: "border-yellow-500/40" }],
])

const FALLBACK: ModeMeta = { icon: Hammer, chip: "bg-blue-500/20 text-blue-300", ring: "border-blue-500/40" }

export function ChallengeCoach() {
  const coach = useChallengeCoach()
  if (!coach) return null

  const meta = MODE_META.get(coach.mode) ?? FALLBACK
  const Icon = meta.icon

  return (
    <div
      data-testid="challenge-coach"
      data-mode={coach.mode}
      className={`mt-2 rounded-md border ${meta.ring} bg-surface/60 p-2`}
    >
      <div className="flex items-center gap-1.5">
        <span className={`flex shrink-0 items-center gap-1 rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide ${meta.chip}`}>
          <Icon className="h-3 w-3" /> {coach.modeLabel}
        </span>
        <span data-testid="challenge-coach-headline" className="text-[11px] font-semibold leading-tight text-text-primary">
          {coach.headline}
        </span>
      </div>
      <p className="mt-1 text-[10px] leading-snug text-text-secondary">{coach.detail}</p>
    </div>
  )
}
