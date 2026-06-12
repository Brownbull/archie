import { useEffect, useState } from "react"
import { collection, getDocs } from "firebase/firestore"
import { Trophy, Star, Sparkles, Wrench } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { db } from "@/lib/firebase"
import { useCurrentUserId } from "@/hooks/useCurrentUserId"
import { resolveAvatarSrc } from "@/lib/masteryAvatars"

interface LeaderboardRow {
  uid: string
  name: string
  avatar: string | null
  threeStarQuests: number
  xp: number
  /** D106: Experts EARNED through play — purchased packs live in the wallet, never here. */
  expertEarned: number
  /** Competition ranking: ties (same 3★ AND same XP) share a rank; next rank skips (1,1,3). */
  rank: number
}

/**
 * D105 — the leaderboard: every registered player with XP > 0, ranked by 3★-cleared quests, then
 * total experience. Reads the userProgress collection (rules: signed-in read; names are
 * self-stamped from the auth profile). Fetched fresh on every open.
 */
export function LeaderboardDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const userId = useCurrentUserId()
  const [rows, setRows] = useState<LeaderboardRow[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    let cancelled = false
    void (async () => {
      // state rides the async continuation — no synchronous setState inside the effect body
      await Promise.resolve()
      if (cancelled) return
      setRows(null)
      setError(null)
      try {
        const snap = await getDocs(collection(db, "userProgress"))
        if (cancelled) return
        const out: LeaderboardRow[] = []
        snap.forEach((d) => {
          const data = d.data()
          if (data.isTestAccount === true) return // E2E/test accounts never rank (D105b)
          const trackXp = (data.trackXp as Record<string, number>) ?? {}
          const xp = Object.values(trackXp).reduce((a, b) => a + (typeof b === "number" ? b : 0), 0)
          if (xp <= 0) return // only players with experience appear
          const best = (data.bestStarsCloud as Record<string, number>) ?? {}
          const threeStarQuests = Object.values(best).filter((v) => v === 3).length
          out.push({
            uid: d.id,
            name: (data.nickname as string) || (data.displayName as string) || "Anonymous architect",
            avatar: resolveAvatarSrc((data.equippedAvatar as string) ?? null, xp),
            threeStarQuests,
            xp,
            expertEarned: (data.expertEarned as number) ?? 0,
            rank: 0,
          })
        })
        // Owner ranking order: 1. experience, 2. Experts EARNED (weighs more than stars), 3. quests
        // at 3★ — full ties share a rank and order alphabetically within the tie.
        out.sort(
          (a, b) =>
            b.xp - a.xp ||
            b.expertEarned - a.expertEarned ||
            b.threeStarQuests - a.threeStarQuests ||
            a.name.localeCompare(b.name, undefined, { sensitivity: "base" }),
        )
        let rank = 0
        for (let i = 0; i < out.length; i++) {
          const p = out[i - 1]
          if (i === 0 || out[i].xp !== p.xp || out[i].expertEarned !== p.expertEarned || out[i].threeStarQuests !== p.threeStarQuests) {
            rank = i + 1
          }
          out[i].rank = rank
        }
        setRows(out)
      } catch {
        if (!cancelled) setError("Couldn't load the leaderboard — try again in a moment.")
      }
    })()
    return () => {
      cancelled = true
    }
  }, [open])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent data-testid="leaderboard-dialog" className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Trophy className="h-4 w-4 text-[#c9a961]" /> Leaderboard
          </DialogTitle>
          <DialogDescription>
            Ranked by experience, then Experts earned, then quests cleared at 3★.
          </DialogDescription>
        </DialogHeader>

        {error && <p className="text-xs text-red-400">{error}</p>}
        {!rows && !error && <p className="text-xs text-text-secondary">Loading…</p>}
        {rows && rows.length === 0 && (
          <p className="text-xs text-text-secondary">No ranked architects yet — clear a quest and claim the top spot.</p>
        )}
        {rows && rows.length > 0 && (
          <div className="max-h-[50vh] overflow-y-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-archie-border text-left text-[0.625rem] uppercase tracking-wide text-text-secondary">
                  <th className="py-1 pr-2">#</th>
                  <th className="py-1 pr-2">Architect</th>
                  <th className="py-1 pr-2 text-right"><span className="inline-flex items-center gap-1"><Sparkles className="h-3 w-3 text-sky-300" />XP</span></th>
                  <th className="py-1 pr-2 text-right"><span className="inline-flex items-center gap-1" title="Experts earned through play — purchased points never count here"><Wrench className="h-3 w-3 text-orange-300" />Earned</span></th>
                  <th className="py-1 text-right"><span className="inline-flex items-center gap-1"><Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />3★</span></th>
                </tr>
              </thead>
              <tbody>
                {(() => {
                  const top = rows.slice(0, 10)
                  const mine = rows.find((r) => r.uid === userId)
                  const mineOutside = mine && !top.some((r) => r.uid === userId)
                  const renderRow = (r: LeaderboardRow, key: string) => (
                    <tr
                      key={key}
                      data-testid={`leaderboard-row-${key}`}
                      className={`border-b border-archie-border/40 ${r.uid === userId ? "bg-[#c9a961]/10 font-semibold text-[#c9a961]" : "text-text-primary"}`}
                    >
                      <td className="py-1.5 pr-2 tabular-nums">{r.rank}</td>
                      <td className="py-1.5 pr-2">
                        <span className="flex items-center gap-1.5">
                          {r.avatar && <img src={r.avatar} alt="" className="h-4 w-4 rounded-full" style={{ imageRendering: "pixelated" }} />}
                          {r.name}{r.uid === userId ? " (you)" : ""}
                        </span>
                      </td>
                      <td className="py-1.5 pr-2 text-right tabular-nums">{r.xp.toLocaleString()}</td>
                      <td className="py-1.5 pr-2 text-right tabular-nums">{r.expertEarned}</td>
                      <td className="py-1.5 text-right tabular-nums">{r.threeStarQuests}</td>
                    </tr>
                  )
                  return (
                    <>
                      {top.map((r, i) => renderRow(r, String(i + 1)))}
                      {mineOutside && (
                        <>
                          <tr data-testid="leaderboard-ellipsis">
                            <td colSpan={5} className="py-1 text-center text-text-secondary">…</td>
                          </tr>
                          {renderRow(mine, "you")}
                        </>
                      )}
                    </>
                  )
                })()}
              </tbody>
            </table>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
