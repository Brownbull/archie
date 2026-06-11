import { useEffect, useState } from "react"
import { collection, getDocs } from "firebase/firestore"
import { Trophy, Star, Sparkles } from "lucide-react"
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
          })
        })
        out.sort((a, b) => b.threeStarQuests - a.threeStarQuests || b.xp - a.xp)
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
            Ranked by quests cleared at 3★, then total experience.
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
                  <th className="py-1 pr-2 text-right"><span className="inline-flex items-center gap-1"><Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />3★ quests</span></th>
                  <th className="py-1 text-right"><span className="inline-flex items-center gap-1"><Sparkles className="h-3 w-3 text-sky-300" />XP</span></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr
                    key={r.uid}
                    data-testid={`leaderboard-row-${i + 1}`}
                    className={`border-b border-archie-border/40 ${r.uid === userId ? "bg-[#c9a961]/10 font-semibold text-[#c9a961]" : "text-text-primary"}`}
                  >
                    <td className="py-1.5 pr-2 tabular-nums">{i + 1}</td>
                    <td className="py-1.5 pr-2">
                      <span className="flex items-center gap-1.5">
                        {r.avatar && <img src={r.avatar} alt="" className="h-4 w-4 rounded-full" style={{ imageRendering: "pixelated" }} />}
                        {r.name}{r.uid === userId ? " (you)" : ""}
                      </span>
                    </td>
                    <td className="py-1.5 pr-2 text-right tabular-nums">{r.threeStarQuests}</td>
                    <td className="py-1.5 text-right tabular-nums">{r.xp.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
