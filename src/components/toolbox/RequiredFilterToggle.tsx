import { Wrench, ListFilter } from "lucide-react"
import { useUserProgressStore } from "@/stores/userProgressStore"
import { useCurrentUserId } from "@/hooks/useCurrentUserId"

interface RequiredFilterToggleProps {
  challengeId: string
  /** Whether the required-only filter is currently applied (owned quests only). */
  active: boolean
  onToggle: (next: boolean) => void
}

/**
 * The required-blocks palette filter — the expert currency's first spend (P4-S5, D94). One expert
 * unit (earned by breaking 3★ builds) permanently unlocks this filter FOR ONE QUEST; once owned it
 * toggles the palette down to just the blocks the brief grades (required types + categories).
 * Ownership persists in userProgress (requiredFilterUnlocked); the on/off state is session-local.
 */
export function RequiredFilterToggle({ challengeId, active, onToggle }: RequiredFilterToggleProps) {
  const owned = useUserProgressStore((s) => !!s.requiredFilterUnlocked[challengeId])
  const balance = useUserProgressStore((s) => s.expertCurrency)
  const unlockRequiredFilter = useUserProgressStore((s) => s.unlockRequiredFilter)
  const userId = useCurrentUserId()

  if (owned) {
    return (
      <button
        type="button"
        data-testid="required-filter-toggle"
        aria-pressed={active}
        onClick={() => onToggle(!active)}
        title="Show only the blocks this quest grades (required types + categories)"
        className={`mb-3 flex w-full items-center gap-1.5 rounded-md border px-2 py-1.5 text-[0.6875rem] transition-colors ${
          active
            ? "border-orange-500/50 bg-orange-500/15 text-orange-200"
            : "border-archie-border bg-surface text-text-secondary hover:text-text-primary"
        }`}
      >
        <ListFilter className="h-3.5 w-3.5" />
        <span className="font-medium">Required blocks only</span>
        <span className="ml-auto text-[0.625rem]">{active ? "on" : "off"}</span>
      </button>
    )
  }

  const affordable = balance >= 1 && !!userId
  return (
    <button
      type="button"
      data-testid="required-filter-unlock"
      disabled={!affordable}
      onClick={() => { if (userId) void unlockRequiredFilter(userId, challengeId) }}
      title={affordable
        ? "Spend 1 Expert point to permanently unlock the required-blocks filter for this quest"
        : "Earn Expert points by breaking your 3★ builds — one dial at a time"}
      className="mb-3 flex w-full items-center gap-1.5 rounded-md border border-archie-border bg-surface px-2 py-1.5 text-[0.6875rem] text-text-secondary transition-colors enabled:hover:border-orange-500/40 enabled:hover:text-orange-200 disabled:cursor-not-allowed disabled:opacity-50"
    >
      <ListFilter className="h-3.5 w-3.5" />
      <span className="font-medium">Required blocks only</span>
      <span data-testid="required-filter-price" className="ml-auto flex items-center gap-1 text-[0.625rem] text-orange-300">
        <Wrench className="h-3 w-3" /> 1 · you have {balance}
      </span>
    </button>
  )
}
