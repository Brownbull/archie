import { useEffect, useMemo, useState } from "react"
import { Star, Check, X as XIcon } from "lucide-react"
import { useAttemptsStore } from "@/stores/attemptsStore"
import { useUiStore } from "@/stores/uiStore"
import { useCurrentUserId } from "@/hooks/useCurrentUserId"
import { getChallenge } from "@/services/challengeLoader"
import type { AttemptRecord } from "@/schemas/attemptSchema"

type SortKey = "date" | "stars" | "challenge"

function titleOf(a: AttemptRecord): string {
  return getChallenge(a.challengeId)?.title ?? a.challengeId
}

function sortAttempts(attempts: AttemptRecord[], key: SortKey): AttemptRecord[] {
  const copy = [...attempts]
  if (key === "stars") return copy.sort((a, b) => b.stars - a.stars || b.createdAt - a.createdAt)
  if (key === "challenge") return copy.sort((a, b) => titleOf(a).localeCompare(titleOf(b)) || b.createdAt - a.createdAt)
  return copy.sort((a, b) => b.createdAt - a.createdAt) // date, newest first
}

function MiniStars({ stars }: { stars: number }) {
  return (
    <span className="flex gap-0.5" aria-label={`${stars} of 3 stars`}>
      {[1, 2, 3].map((n) => (
        <Star key={n} className={`h-3 w-3 ${n <= stars ? "fill-yellow-400 text-yellow-400" : "text-text-secondary"}`} />
      ))}
    </span>
  )
}

const SORTS: { key: SortKey; label: string }[] = [
  { key: "date", label: "Date" },
  { key: "stars", label: "Stars" },
  { key: "challenge", label: "Challenge" },
]

/**
 * History tab (Epic 17 Phase 5). A personal, owner-scoped submissions log of past challenge
 * attempts loaded from Firestore — each row shows pass/fail, stars, key metrics, and date.
 * Sortable by date / stars / challenge. Loads lazily when the tab mounts (and on user change).
 */
export function HistoryTab() {
  const userId = useCurrentUserId()
  const attempts = useAttemptsStore((s) => s.attempts)
  const loading = useAttemptsStore((s) => s.loading)
  const error = useAttemptsStore((s) => s.error)
  const loadAttempts = useAttemptsStore((s) => s.loadAttempts)
  const setChallengesOpen = useUiStore((s) => s.setChallengesOpen)
  const [sortKey, setSortKey] = useState<SortKey>("date")

  useEffect(() => {
    if (userId) void loadAttempts(userId)
  }, [userId, loadAttempts])

  const sorted = useMemo(() => sortAttempts(attempts, sortKey), [attempts, sortKey])

  return (
    <div data-testid="history-tab" className="flex h-full flex-col">
      <div className="flex items-center gap-1 px-3 pb-2 pt-1">
        <span className="mr-1 text-[10px] uppercase tracking-wide text-text-secondary">Sort</span>
        {SORTS.map((s) => (
          <button
            key={s.key}
            type="button"
            data-testid={`history-sort-${s.key}`}
            aria-pressed={sortKey === s.key}
            onClick={() => setSortKey(s.key)}
            className={`rounded px-1.5 py-0.5 text-[10px] ${sortKey === s.key ? "bg-blue-500/20 text-blue-300" : "text-text-secondary hover:text-text-primary"}`}
          >
            {s.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto px-3 pb-3">
        {loading ? (
          <p data-testid="history-loading" className="py-6 text-center text-xs text-text-secondary">Loading your attempts…</p>
        ) : error ? (
          <p data-testid="history-error" className="py-6 text-center text-xs text-red-400">{error}</p>
        ) : sorted.length === 0 ? (
          <div data-testid="history-empty" className="flex flex-col items-center gap-3 py-6 text-center">
            <p className="text-xs text-text-secondary">No attempts yet — play a challenge to start your history.</p>
            <button
              type="button"
              data-testid="history-start-challenge"
              onClick={() => setChallengesOpen(true)}
              className="rounded-md border border-archie-border bg-surface px-3 py-1.5 text-xs font-medium text-text-primary transition-colors hover:border-archie-accent/50 hover:bg-surface/80"
            >
              Start a challenge
            </button>
          </div>
        ) : (
          <ul className="flex flex-col gap-1.5">
            {sorted.map((a) => {
              const passed = a.stars > 0
              return (
                <li key={a.id} data-testid={`attempt-row-${a.id}`} data-passed={passed || undefined} className="rounded-md border border-archie-border bg-surface p-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      {passed ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <XIcon className="h-3.5 w-3.5 text-red-400" />}
                      <span className="truncate text-xs font-medium text-text-primary">{titleOf(a)}</span>
                    </div>
                    <MiniStars stars={a.stars} />
                  </div>
                  <div className="mt-1 flex items-center justify-between text-[10px] text-text-secondary">
                    <span>{a.uptimePercent.toFixed(1)}% · {Math.round(a.p99LatencyMs)}ms · ${a.totalCost}/mo</span>
                    <span data-testid={`attempt-date-${a.id}`}>{a.createdAt > 0 ? new Date(a.createdAt).toLocaleDateString() : "—"}</span>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}
