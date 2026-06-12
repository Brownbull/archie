import { Lightbulb, Lock, Star } from "lucide-react"
import { useChallengeStore } from "@/stores/challengeStore"
import { COMPONENT_CATEGORIES, type ComponentCategoryId } from "@/lib/constants"
import { useUserProgressStore, spendableStars } from "@/stores/userProgressStore"
import { useAuth } from "@/hooks/useAuth"

/**
 * Hint economy panel (ISAPivot Phase 5, D68). Shown in challenge mode. Reveals the challenge's
 * progressive hints ONE AT A TIME — each costs 1 spendable star (spendable = total earned stars −
 * stars already spent on hints, shared across all challenges). The last hint is the full reference
 * solution. The reveal button disables when the player is signed out, has no spendable stars, or has
 * already revealed every hint. Unlocks are permanent + persisted (userProgress.hintsUnlocked).
 */
export function HintPanel() {
  const challenge = useChallengeStore((s) => s.activeChallenge)
  const { user } = useAuth()
  const unlocked = useUserProgressStore((s) => (challenge ? s.hintsUnlocked[challenge.id] ?? 0 : 0))
  const balance = useUserProgressStore(spendableStars)
  const unlockHint = useUserProgressStore((s) => s.unlockHint)

  if (!challenge || challenge.hints.length === 0) return null

  // 2026-06-11 (owner): the REQUIRED-blocks list was a free solution leak in the HUD — it's now the
  // FIRST hint on every quest, paid like the rest (1★; the LX1 free-first perk retired with it).
  const requiredHint = `This quest grades on: ${challenge.requiredComponents
    .map((cat) => COMPONENT_CATEGORIES[cat as ComponentCategoryId]?.label ?? cat)
    .join(", ")}.`
  const ladder = [requiredHint, ...challenge.hints]
  const total = ladder.length
  const allRevealed = unlocked >= total
  const userId = user?.uid ?? null
  const canUnlock = !!userId && !allRevealed && balance >= 1
  const nextIsFinal = unlocked === total - 1
  const revealed = ladder.slice(0, unlocked)

  const onReveal = () => {
    if (userId) void unlockHint(userId, challenge.id, total)
  }

  return (
    <div className="mt-3" data-testid="hint-panel">
      <div className="flex items-center justify-between text-[0.75rem]">
        <span className="flex items-center gap-1 text-text-secondary">
          <Lightbulb className="h-3.5 w-3.5" /> Hints ({unlocked}/{total})
        </span>
        <span data-testid="hint-balance" className="flex items-center gap-0.5 font-semibold text-yellow-400" title="Spendable stars">
          <Star className="h-3 w-3 fill-yellow-400" /> {balance}
        </span>
      </div>

      {revealed.length > 0 && (
        <ol data-testid="hint-revealed" className="mt-1 list-decimal space-y-1 pl-4 text-[0.75rem] text-text-secondary">
          {revealed.map((h, i) => (
            <li key={i} data-testid={`hint-${i}`} data-final={i === total - 1 || undefined}>
              {h}
            </li>
          ))}
        </ol>
      )}

      {allRevealed ? (
        <p data-testid="hint-all-revealed" className="mt-2 text-[0.75rem] text-emerald-400">All hints revealed.</p>
      ) : (
        <>
          <button
            type="button"
            data-testid="hint-reveal-next"
            onClick={onReveal}
            disabled={!canUnlock}
            className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-md border border-archie-border bg-surface px-2 py-1.5 text-[0.75rem] font-medium text-text-primary transition-colors hover:bg-panel disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Lock className="h-3 w-3" />
            {unlocked === 0 ? "Reveal the required blocks" : nextIsFinal ? "Reveal the full solution" : "Reveal next hint"}
            <span data-testid="hint-cost" className="flex items-center gap-0.5 text-yellow-400">
              (1<Star className="h-2.5 w-2.5 fill-yellow-400" />)
            </span>
          </button>
          {!userId && (
            <p data-testid="hint-login" className="mt-1 text-[0.6875rem] text-text-secondary">Log in to unlock hints.</p>
          )}
          {userId && balance < 1 && (
            <p data-testid="hint-no-stars" className="mt-1 text-[0.6875rem] text-text-secondary">Earn stars by clearing challenges to unlock more hints.</p>
          )}
        </>
      )}
    </div>
  )
}
