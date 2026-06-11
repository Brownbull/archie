import { Star, Wrench } from "lucide-react"
import { useUserProgressStore, spendableStars } from "@/stores/userProgressStore"
import { useCurrentUserId } from "@/hooks/useCurrentUserId"

/**
 * The player's spendable currencies, always visible in the top bar (2026-06-11 playtest):
 * ★ stars (the hint pool — total earned minus spent on hints) and the Expert wrench (earned by
 * breaking 3★ builds / surviving resilience extras; spent on required-blocks filters). XP/ranks
 * are progression, not currency — they live in the quest log and results, not here.
 */
export function CurrencyCluster() {
  const userId = useCurrentUserId()
  const stars = useUserProgressStore(spendableStars)
  const expert = useUserProgressStore((s) => s.expertCurrency)

  if (!userId) return null

  return (
    <div data-testid="currency-cluster" className="flex items-center gap-1.5">
      <span
        data-testid="currency-stars"
        title="Spendable stars — earned per quest star, spent on hints"
        className="inline-flex items-center gap-1 rounded-full border border-yellow-500/30 bg-yellow-500/10 px-2 py-0.5 text-[0.6875rem] font-semibold text-yellow-300"
      >
        <Star className="h-3 w-3 fill-current" /> {stars}
      </span>
      <span
        data-testid="currency-expert"
        title="Expert points — earned by breaking your 3★ builds (find the boundary, prove the cause) and clearing resilience extras; spent on required-blocks filters"
        className="inline-flex items-center gap-1 rounded-full border border-orange-500/40 bg-orange-500/10 px-2 py-0.5 text-[0.6875rem] font-semibold text-orange-300"
      >
        <Wrench className="h-3 w-3" /> {expert}
      </span>
    </div>
  )
}
