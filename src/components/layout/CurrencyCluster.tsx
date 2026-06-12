import { Star, Wrench, Sparkles } from "lucide-react"
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover"
import { useUserProgressStore, spendableStars } from "@/stores/userProgressStore"
import { useCurrentUserId } from "@/hooks/useCurrentUserId"
import { useChallengeStore } from "@/stores/challengeStore"
import { useUiStore } from "@/stores/uiStore"

/**
 * The player's currencies, always visible in the top bar (2026-06-11 playtest): ★ stars (the hint
 * pool), the Expert wrench, and total XP. Each chip CLICKS open an explainer — how it's earned,
 * what it's spent on (the owner's "set information about it" ask). XP is progression rather than
 * spendable, and its card says so.
 */

function CurrencyChip({ testid, icon, value, className, title, earn, spend }: {
  testid: string
  icon: React.ReactNode
  value: number | string
  className: string
  title: string
  earn: string
  spend: string
}) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          data-testid={testid}
          className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[0.6875rem] font-semibold transition-colors hover:brightness-125 ${className}`}
        >
          {icon} {value}
        </button>
      </PopoverTrigger>
      <PopoverContent data-testid={`${testid}-info`} side="bottom" align="end" className="w-72">
        <div className="space-y-2">
          <h4 className="text-sm font-semibold text-text-primary">{title}</h4>
          <div>
            <p className="text-xs font-medium text-text-primary">How to earn it</p>
            <p className="text-xs text-text-secondary">{earn}</p>
          </div>
          <div className="border-t border-archie-border pt-2">
            <p className="text-xs font-medium text-text-primary">What it's for</p>
            <p className="text-xs text-text-secondary">{spend}</p>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}

const compact = (n: number) => (n >= 10_000 ? `${Math.round(n / 1000)}k` : n >= 1000 ? `${(n / 1000).toFixed(1)}k` : `${n}`)

export function CurrencyCluster() {
  const userId = useCurrentUserId()
  const stars = useUserProgressStore(spendableStars)
  const expert = useUserProgressStore((s) => s.expertCurrency)
  const totalXp = useUserProgressStore((s) => Object.values(s.trackXp).reduce((a, b) => a + b, 0))
  // D102: in break mode (post-3★ on the active quest) the Expert chip opens the REGISTRY panel
  // instead of the explainer, and carries the count of known ways already confirmed on this quest.
  const breakMode = useChallengeStore((s) => !!s.activeChallenge && (s.bestStars[s.activeChallenge.id] ?? 0) >= 3)
  const activeQuestId = useChallengeStore((s) => s.activeChallenge?.id)
  const confirmedHere = useUserProgressStore((s) =>
    activeQuestId ? Object.values(s.breakMethods).filter((m) => m.confirmedOn[activeQuestId]).length : 0,
  )
  const setBreakRegistryOpen = useUiStore((s) => s.setBreakRegistryOpen)
  const registryOpen = useUiStore((s) => s.breakRegistryOpen)

  if (!userId) return null

  return (
    <div data-testid="currency-cluster" className="flex items-center gap-1.5">
      <CurrencyChip
        testid="currency-xp"
        icon={<Sparkles className="h-3 w-3" />}
        value={compact(totalXp)}
        className="border-sky-500/30 bg-sky-500/10 text-sky-300"
        title="Experience (XP)"
        earn="Only through play: quest stars pay the quest's XP, and every Expert earned pays bonus XP onto its quest's track. Purchased packs never grant XP — the ranking can't be bought."
        spend="Progression, not spending: total XP gates higher-tier quests (their minimum-XP requirement), and per-discipline XP climbs the mastery ranks that unlock avatars."
      />
      <CurrencyChip
        testid="currency-stars"
        icon={<Star className="h-3 w-3 fill-current" />}
        value={stars}
        className="border-yellow-500/30 bg-yellow-500/10 text-yellow-300"
        title="Stars (hint pool)"
        earn="One per star earned across quests — your best result per quest counts."
        spend="Hints: revealing a quest hint costs 1 star (the first hint on each quest is free). The pool is shared across all quests."
      />
      {breakMode ? (
        <button
          type="button"
          data-testid="currency-expert"
          title="Expert points — click to open your break registry (every way you've broken a system, probed against THIS build)"
          onClick={() => setBreakRegistryOpen(!registryOpen)}
          className="inline-flex items-center gap-1 rounded-full border border-orange-500/40 bg-orange-500/10 px-2 py-0.5 text-[0.6875rem] font-semibold text-orange-300 transition-colors hover:brightness-125"
        >
          <Wrench className="h-3 w-3" /> {expert}
          <span data-testid="currency-expert-confirmed-here" title="Known ways already confirmed against this quest" className="text-orange-300/60">
            ({confirmedHere})
          </span>
        </button>
      ) : (
      <CurrencyChip
        testid="currency-expert"
        icon={<Wrench className="h-3 w-3" />}
        value={expert}
        className="border-orange-500/40 bg-orange-500/10 text-orange-300"
        title="Expert points"
        earn="Breaking your own 3★ builds — one traffic dial at a time: find roughly where it FIRST breaks (within 2× of the boundary), or prove a Shape/Workload/Origin change is what felled it. Resilience extras (surviving authored Test conditions at 3★) also pay 1 each."
        spend="Per-quest required-blocks filter: 1 Expert reveals and filters the toolbox to a quest's required blocks."
      />
      )}
    </div>
  )
}
